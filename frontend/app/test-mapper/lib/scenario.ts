import type { ScenarioPhase, ScenarioStep, StepResult } from "./types";

const REST_COMMANDS = /^(Get|Post|Put|Patch|Delete|Query|Batch|Create|Modify)\s+(\/\S+)/i;
const ASSERT_COMMANDS = /^(Assert|AssertJson|AssertStatus|AssertHeader|AssertSchema|AssertResponseTime|ExpectFail)\b/i;
const CALL_UTIL = /^Call\s+(?:Fresh\s+)?(?:CatchError\s+)?(?:ExpectFail\s+)?(?:.*\/)?([A-Z][A-Z0-9-]*)-[a-z].*\.bnrest\.md/;
const LEADING_KEYWORD = /^(Given|When|Then|And)\s+(.*)$/;

// Extracts the single fenced ```bnrest ... ``` block from a raw .bnrest.md
// file's text (the YAML front matter + prose above/below it are irrelevant
// to the Scenario view — only the executable statements are shown).
function extractFencedBlock(source: string): string {
  const match = source.match(/```bnrest\n([\s\S]*?)```/);
  return match ? match[1] : "";
}

/**
 * Parses a case's raw bnrest source into an ordered list of scenario steps,
 * classifying each into Setup / Given / When / Then / Teardown (`And`
 * continues whichever Given/When/Then keyword came before it — a plain
 * command line with no leading keyword, common inside Setup/Teardown blocks,
 * keeps the phase set by the last `Setup`/`Body`/`Teardown` marker). Multi-
 * line JSON request bodies are folded into the statement they follow rather
 * than becoming their own step.
 */
export function parseScenario(source: string): ScenarioStep[] {
  const block = extractFencedBlock(source);
  const rawLines = block.split("\n");

  const steps: ScenarioStep[] = [];
  let phase: ScenarioPhase = "when";
  let lastKeywordPhase: ScenarioPhase = "when";

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    if (line === "Setup") {
      phase = "setup";
      continue;
    }
    if (line === "Body") {
      phase = lastKeywordPhase;
      continue;
    }
    if (line === "Teardown") {
      phase = "teardown";
      continue;
    }

    // A JSON body continuation of the previous statement — fold it in
    // rather than treating it as its own step.
    if (line.startsWith("{") || line.startsWith("}") || (steps.length > 0 && isInsideJsonBody(rawLines, i))) {
      if (steps.length > 0) steps[steps.length - 1].text += "\n" + rawLines[i];
      continue;
    }

    const keywordMatch = line.match(LEADING_KEYWORD);
    let keyword: string;
    let text: string;
    if (keywordMatch) {
      keyword = keywordMatch[1];
      text = keywordMatch[2];
      if (phase !== "setup" && phase !== "teardown") {
        if (keyword !== "And") {
          phase = keyword.toLowerCase() as ScenarioPhase;
        }
        lastKeywordPhase = phase;
      }
    } else {
      keyword = line.split(/\s+/)[0] ?? "";
      text = line;
    }

    steps.push({
      phase,
      keyword,
      text,
      isRest: REST_COMMANDS.test(text) || REST_COMMANDS.test(line),
      isAssertion: ASSERT_COMMANDS.test(text) || ASSERT_COMMANDS.test(line),
    });
  }

  return steps;
}

// Heuristic: a line is a JSON-body continuation if an unmatched "{" was
// opened by a preceding line and not yet closed by this one.
function isInsideJsonBody(lines: string[], index: number): boolean {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
  }
  return depth > 0;
}

/** Extracts the util id a `Call ...some/path/UTIL-ID-slug.bnrest.md` line targets. */
export function utilIdFromCallLine(text: string): string | null {
  const m = text.match(CALL_UTIL);
  return m ? m[1] : null;
}

/**
 * Attaches runtime HTTP steps to the scenario steps that produced them.
 * `run.steps` is globally ordered by `stepNumber` for the whole case
 * (including steps issued by called Utils, tagged with `utilId`) — since
 * this DSL has no loops/branches, source order and execution order are
 * identical, so a single sequential walk correctly reassembles which
 * request(s) each source line is responsible for.
 */
export function attachRuntimeSteps(scenario: ScenarioStep[], steps: StepResult[]): ScenarioStep[] {
  const ordered = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  let cursor = 0;
  return scenario.map((s) => {
    if (s.isRest) {
      const step = ordered[cursor];
      if (step && step.utilId === null) {
        cursor++;
        return { ...s, steps: [step] };
      }
      return s;
    }
    const utilId = utilIdFromCallLine(s.text);
    if (utilId) {
      const matched: StepResult[] = [];
      while (ordered[cursor] && ordered[cursor].utilId === utilId) {
        matched.push(ordered[cursor]);
        cursor++;
      }
      if (matched.length > 0) return { ...s, steps: matched };
    }
    return s;
  });
}
