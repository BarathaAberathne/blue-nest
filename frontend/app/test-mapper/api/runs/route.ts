import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import path from "path";

// Local-only dev tool (see api/source/route.ts for why this is a hard 404 in
// production): reads test-results/json/run-*.json straight off disk so the
// Runs screen always reflects the most recent local run, with no manual
// "make test-map"-style copy step needed for run history specifically.
const RESULTS_ROOT = path.resolve(process.cwd(), "..", "test-results");
const JSON_DIR = path.join(RESULTS_ROOT, "json");

interface CaseResultLite {
  caseId: string;
  suiteId: string;
  title: string;
  status: string;
  durationMs: number;
}

async function readRun(file: string) {
  const full = path.join(JSON_DIR, file);
  const raw = await readFile(full, "utf-8");
  const parsed = JSON.parse(raw);
  const fileStat = await stat(full);
  return { parsed, mtimeMs: fileStat.mtimeMs };
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available in production" }, { status: 404 });
  }

  const runId = req.nextUrl.searchParams.get("runId");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || 20, 100) : 20;

  let files: string[];
  try {
    files = (await readdir(JSON_DIR)).filter((f) => f.startsWith("run-") && f.endsWith(".json"));
  } catch {
    return NextResponse.json({ runs: [] });
  }

  if (runId) {
    const file = `run-${runId}.json`;
    if (!files.includes(file)) {
      return NextResponse.json({ error: "run not found" }, { status: 404 });
    }
    const { parsed, mtimeMs } = await readRun(file);
    return NextResponse.json({ ...parsed, fileMtimeMs: mtimeMs });
  }

  const withStats = await Promise.all(
    files.map(async (f) => ({ file: f, mtimeMs: (await stat(path.join(JSON_DIR, f))).mtimeMs }))
  );
  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const top = withStats.slice(0, limit);

  const runs = await Promise.all(
    top.map(async ({ file, mtimeMs }) => {
      const raw = await readFile(path.join(JSON_DIR, file), "utf-8");
      const parsed = JSON.parse(raw) as {
        runId: string;
        environment: string;
        baseUrl: string;
        gitCommit: string;
        startedAtEpochMs: number;
        finishedAtEpochMs: number;
        cases: CaseResultLite[];
      };
      const passed = parsed.cases.filter((c) => c.status === "PASSED").length;
      const failed = parsed.cases.filter((c) => c.status === "FAILED").length;
      const skipped = parsed.cases.filter((c) => c.status === "BLOCKED" || c.status === "SKIPPED").length;
      const suiteIds = Array.from(new Set(parsed.cases.map((c) => c.suiteId)));
      return {
        runId: parsed.runId,
        environment: parsed.environment,
        baseUrl: parsed.baseUrl,
        gitCommit: parsed.gitCommit,
        startedAtEpochMs: parsed.startedAtEpochMs || mtimeMs,
        finishedAtEpochMs: parsed.finishedAtEpochMs || mtimeMs,
        total: parsed.cases.length,
        passed,
        failed,
        skipped,
        suiteIds,
      };
    })
  );

  return NextResponse.json({ runs });
}
