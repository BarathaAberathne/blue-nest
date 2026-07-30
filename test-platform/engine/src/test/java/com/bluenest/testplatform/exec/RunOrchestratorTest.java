package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.RunStatus;
import com.bluenest.testplatform.model.Script;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * A Suite's own {@code Setup} failing (e.g. a transient network error) must
 * not crash the whole run — every other suite still needs to report its own
 * results (found while building {@code SUI-STAFF-001}, whose Setup logs in
 * and creates shared fixtures — exactly the kind of step that can fail
 * transiently).
 */
class RunOrchestratorTest {

    @TempDir
    Path dir;

    private void write(String relativePath, String content) throws IOException {
        Path file = dir.resolve(relativePath);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }

    @Test
    void aFailingSuiteSetupBlocksItsOwnCasesWithoutCrashingTheRun() throws IOException {
        write("suites/SUI-BAD-001-x.bnrest.md", """
                ---
                id: SUI-BAD-001
                number: 1
                type: Test Suite
                title: Suite whose Setup always fails
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Setup
                Assert 1 == 2

                Body
                Call CatchError ../cases/BAD-TC-001-x.bnrest.md
                ```
                """);
        write("cases/BAD-TC-001-x.bnrest.md", """
                ---
                id: BAD-TC-001
                number: 1.1
                type: Test Case
                title: Never actually runs
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Assert 1 == 1
                ```
                """);
        write("suites/SUI-GOOD-001-x.bnrest.md", """
                ---
                id: SUI-GOOD-001
                number: 2
                type: Test Suite
                title: A healthy, unrelated suite
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Call CatchError ../cases/GOOD-TC-001-x.bnrest.md
                ```
                """);
        write("cases/GOOD-TC-001-x.bnrest.md", """
                ---
                id: GOOD-TC-001
                number: 2.1
                type: Test Case
                title: Passes normally
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Assert 1 == 1
                ```
                """);
        write("collections/COL-BAD-001-x.bnrest.md", """
                ---
                id: COL-BAD-001
                number: 1
                type: Test Collection
                title: Collection with one bad suite and one good one
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Call CatchError ../suites/SUI-BAD-001-x.bnrest.md
                Call CatchError ../suites/SUI-GOOD-001-x.bnrest.md
                ```
                """);

        ScriptRepository repo = ScriptRepository.discover(dir);
        RunOrchestrator orchestrator = new RunOrchestrator(repo, "http://unused.invalid", UUID.randomUUID().toString());
        VariableScope runScope = new VariableScope(null);

        List<CaseResult> results = assertDoesNotThrow(
                () -> orchestrator.runCollection(repo.byId("COL-BAD-001"), runScope),
                "a failing Suite Setup must not throw out of runCollection");

        CaseResult badCase = results.stream().filter(r -> r.caseId.equals("BAD-TC-001")).findFirst().orElseThrow();
        assertEquals(RunStatus.BLOCKED, badCase.status);
        assertTrue(badCase.skippedReason.contains("Setup failed"));

        CaseResult goodCase = results.stream().filter(r -> r.caseId.equals("GOOD-TC-001")).findFirst().orElseThrow();
        assertEquals(RunStatus.PASSED, goodCase.status, "the unrelated healthy suite must still run and pass normally");
    }
}
