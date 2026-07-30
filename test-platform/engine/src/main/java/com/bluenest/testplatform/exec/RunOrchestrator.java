package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.model.*;
import com.fasterxml.jackson.databind.JsonNode;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates Collection -> Suite -> Case execution (spec §8/§9): an
 * independent case's failure never stops its siblings, and a Dependent-mode
 * case whose {@code dependsOn} target failed is skipped with a clear reason
 * instead of being attempted. This is deliberately separate from
 * {@link Executor}'s generic Call handling — Suite/Collection containment is
 * used here only to discover order and grouping; each Case still gets its
 * own isolated {@link ExecutionContext}/{@link CaseResult}.
 */
public final class RunOrchestrator {

    private final ScriptRepository repository;
    private final String baseUrl;
    private final String runId;
    private final RequestLedger sharedLedger = new RequestLedger();
    private final Map<String, CaseResult> resultsById = new LinkedHashMap<>();
    private final Map<String, JsonNode> runFixtureCache = new LinkedHashMap<>();

    public RunOrchestrator(ScriptRepository repository, String baseUrl, String runId) {
        this.repository = repository;
        this.baseUrl = baseUrl;
        this.runId = runId;
    }

    public Map<String, CaseResult> resultsById() {
        return resultsById;
    }

    /** Runs a single case directly (no enclosing Suite) — e.g. `make test-case CASE=...`. */
    public List<CaseResult> runStandaloneCase(Script caseScript, VariableScope runScope) {
        return runCaseWithDataDriving(caseScript, "(none)", "(none)", new VariableScope(runScope),
                new LinkedHashMap<>());
    }

    public List<CaseResult> runCollection(Script collection, VariableScope runScope) {
        List<CaseResult> results = new ArrayList<>();
        for (Script child : calledScripts(collection)) {
            if (child.metadata.type == ScriptType.TEST_SUITE) {
                results.addAll(runSuite(child, collection.id(), runScope));
            } else if (child.metadata.type == ScriptType.TEST_COLLECTION) {
                results.addAll(runCollection(child, runScope));
            }
        }
        return results;
    }

    public List<CaseResult> runSuite(Script suite, String collectionId, VariableScope runScope) {
        List<CaseResult> results = new ArrayList<>();
        VariableScope suiteScope = new VariableScope(runScope);
        Map<String, JsonNode> suiteFixtureCache = new LinkedHashMap<>();

        // A Suite's own Setup failing (e.g. a transient network/rate-limit error)
        // must not crash the whole run — every OTHER suite still needs to report
        // its own results. Every case this suite would have run is recorded as
        // BLOCKED with the Setup's failure as the reason, instead of throwing.
        RuntimeException setupFailure = null;
        try {
            runFixture(suite, "setup", suiteScope, collectionId, suiteFixtureCache);
        } catch (RuntimeException e) {
            setupFailure = e;
        }

        for (Script caseScript : calledScripts(suite)) {
            if (caseScript.metadata.type != ScriptType.TEST_CASE) continue;
            if (setupFailure != null) {
                results.add(blockedBySetupFailure(caseScript, suite, collectionId, setupFailure));
            } else {
                results.addAll(runCaseWithDataDriving(caseScript, collectionId, suite.id(), suiteScope, suiteFixtureCache));
            }
        }

        try {
            runFixture(suite, "teardown", suiteScope, collectionId, suiteFixtureCache);
        } catch (RuntimeException e) {
            // Best-effort: Teardown likely depends on Setup's own variables, which
            // never got created — nothing more constructive to do than not crash.
            if (Boolean.getBoolean("bnrest.debug")) {
                e.printStackTrace();
            }
        }
        return results;
    }

    private CaseResult blockedBySetupFailure(Script caseScript, Script suite, String collectionId, RuntimeException setupFailure) {
        String caseId = caseScript.id();
        CaseResult blocked = new CaseResult();
        blocked.caseId = caseId;
        blocked.suiteId = suite.id();
        blocked.title = caseScript.metadata.title;
        blocked.status = RunStatus.BLOCKED;
        blocked.skippedReason = "Suite '" + suite.id() + "' Setup failed: "
                + (setupFailure.getMessage() != null ? setupFailure.getMessage() : setupFailure.toString());
        blocked.sourceFile = caseScript.sourceFile.toString();
        resultsById.put(caseId, blocked);
        return blocked;
    }

    private void runFixture(Script suite, String phase, VariableScope suiteScope, String collectionId,
                             Map<String, JsonNode> suiteFixtureCache) {
        List<Statement> statements = phase.equals("setup") ? suite.setup : suite.teardown;
        if (statements.isEmpty()) return;
        ExecutionContext ctx = new ExecutionContext(runId, collectionId, suite.id(), suite.id() + ":" + phase,
                new HttpClient(baseUrl, suite.metadata.timeoutSeconds), sharedLedger, repository,
                suiteFixtureCache, runFixtureCache);
        Script fixtureScript = new Script(suite.metadata, suite.sourceFile, List.of(), statements, List.of());
        new Executor().runScript(fixtureScript, ctx, suiteScope);
    }

    private List<CaseResult> runCaseWithDataDriving(Script caseScript, String collectionId, String suiteId,
                                                      VariableScope suiteScope, Map<String, JsonNode> suiteFixtureCache) {
        if (caseScript.metadata.dataFile == null) {
            return List.of(runCase(caseScript, collectionId, suiteId, suiteScope, null, suiteFixtureCache));
        }
        Path csvFile = caseScript.sourceFile.getParent().resolve(caseScript.metadata.dataFile).normalize();
        List<JsonNode> rows = CsvLoader.rows(csvFile);
        List<CaseResult> out = new ArrayList<>();
        int i = 1;
        for (JsonNode row : rows) {
            out.add(runCase(caseScript, collectionId, suiteId, suiteScope, new RowContext(i++, row), suiteFixtureCache));
        }
        return out;
    }

    private record RowContext(int index, JsonNode row) {
    }

    private CaseResult runCase(Script caseScript, String collectionId, String suiteId,
                                VariableScope suiteScope, RowContext row, Map<String, JsonNode> suiteFixtureCache) {
        String caseId = row == null ? caseScript.id() : caseScript.id() + "#row" + row.index();

        if (caseScript.metadata.mode == Mode.DEPENDENT) {
            for (String dep : caseScript.metadata.dependsOn) {
                CaseResult depResult = resultsById.get(dep);
                if (depResult == null || depResult.status != RunStatus.PASSED) {
                    CaseResult skipped = new CaseResult();
                    skipped.caseId = caseId;
                    skipped.suiteId = suiteId;
                    skipped.title = caseScript.metadata.title;
                    skipped.status = RunStatus.BLOCKED;
                    skipped.skippedReason = "Dependency '" + dep + "' did not pass"
                            + (depResult == null ? " (never ran)" : " (status: " + depResult.status + ")");
                    skipped.sourceFile = caseScript.sourceFile.toString();
                    resultsById.put(caseId, skipped);
                    return skipped;
                }
            }
        }

        ExecutionContext ctx = new ExecutionContext(runId, collectionId, suiteId, caseId,
                new HttpClient(baseUrl, caseScript.metadata.timeoutSeconds), sharedLedger, repository,
                suiteFixtureCache, runFixtureCache);
        ctx.result.title = caseScript.metadata.title;
        ctx.result.sourceFile = caseScript.sourceFile.toString();

        VariableScope caseScope = new VariableScope(suiteScope);
        if (row != null) {
            caseScope.set("input", row.row());
        }

        long start = System.currentTimeMillis();
        try {
            new Executor().runScript(caseScript, ctx, caseScope);
            ctx.result.status = RunStatus.PASSED;
        } catch (RuntimeException e) {
            ctx.result.status = RunStatus.FAILED;
            ctx.result.errorMessage = e.getMessage() != null ? e.getMessage() : e.toString();
            if (Boolean.getBoolean("bnrest.debug")) {
                e.printStackTrace();
            }
        }
        ctx.result.durationMs = System.currentTimeMillis() - start;
        resultsById.put(caseId, ctx.result);
        return ctx.result;
    }

    private List<Script> calledScripts(Script parent) {
        List<Script> out = new ArrayList<>();
        for (Statement s : parent.body) {
            if (s.command == Command.CALL) {
                out.add(repository.resolveCallTarget(parent, s.target));
            }
        }
        return out;
    }
}
