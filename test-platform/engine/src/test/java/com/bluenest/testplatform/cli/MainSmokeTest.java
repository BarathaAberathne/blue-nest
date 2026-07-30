package com.bluenest.testplatform.cli;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Smoke-tests the CLI entrypoint every {@code make test-*} target wraps
 * (spec §16/§20 "Make command behaviour") — exercised at this layer rather
 * than by shelling out to `make`, since that's where the actual logic lives.
 * Deliberately does NOT exercise the `validate`-with-errors or `run` paths
 * here: both call {@code System.exit}, which would kill the test JVM: those
 * are covered directly against {@code DependencyGraph}/{@code RunOrchestrator}
 * in {@link com.bluenest.testplatform.graph.DependencyGraphTest} and
 * {@link com.bluenest.testplatform.exec.ExecutorIntegrationTest} instead.
 */
class MainSmokeTest {

    @TempDir
    Path dir;

    private final ByteArrayOutputStream captured = new ByteArrayOutputStream();
    private PrintStream originalOut;

    @BeforeEach
    void redirectStdout() {
        originalOut = System.out;
        System.setOut(new PrintStream(captured));
    }

    @AfterEach
    void restoreStdout() {
        System.setOut(originalOut);
    }

    private void writeValidCase() throws IOException {
        Files.writeString(dir.resolve("SMOKE-TC-001-x.bnrest.md"), """
                ---
                id: SMOKE-TC-001
                number: 1
                type: Test Case
                title: Smoke case
                owner: QA
                status: Active
                tags:
                  - smoke
                ---
                ```bnrest
                Assert 1 == 1
                ```
                """);
    }

    @Test
    void discoverListsEveryScript() throws IOException {
        writeValidCase();
        Main.main(new String[]{"discover", "--testsRoot=" + dir});
        String output = captured.toString();
        assertTrue(output.contains("SMOKE-TC-001"));
        assertTrue(output.contains("1 scripts discovered"));
    }

    @Test
    void validateReportsNoErrorsForAWellFormedTestSet() throws IOException {
        writeValidCase();
        // A lone case with no enclosing Suite legitimately gets an ORPHAN_TEST_CASE
        // WARNING (spec §9) — validate() only exits non-zero on ERRORs, so this
        // checks for the absence of errors rather than the absence of all issues.
        Main.main(new String[]{"validate", "--testsRoot=" + dir});
        String output = captured.toString();
        assertTrue(output.contains("0 error(s)") || output.contains("OK — no validation issues"));
    }
}
