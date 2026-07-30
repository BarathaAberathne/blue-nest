import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Local-only dev tool: reads a .bnrest.md source file straight off disk so
// the Scenario tab can render the real Given/When/Then text (the run JSON
// only carries HTTP step data, not the authored statement text). Never
// available in a production build — this repo's frontend container also
// runs in prod (blue-nest.com), and an unauthenticated arbitrary-file-read
// endpoint has no business existing there even path-constrained.
const TESTS_ROOT = path.resolve(process.cwd(), "..", "test-platform", "tests");

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available in production" }, { status: 404 });
  }

  const file = req.nextUrl.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "missing 'file' query param" }, { status: 400 });
  }

  const resolved = path.resolve(TESTS_ROOT, file.startsWith(TESTS_ROOT) ? file : path.join(TESTS_ROOT, file));
  if (resolved !== TESTS_ROOT && !resolved.startsWith(TESTS_ROOT + path.sep)) {
    return NextResponse.json({ error: "path outside test-platform/tests" }, { status: 400 });
  }

  try {
    const content = await readFile(resolved, "utf-8");
    return NextResponse.json({ path: resolved, content });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
