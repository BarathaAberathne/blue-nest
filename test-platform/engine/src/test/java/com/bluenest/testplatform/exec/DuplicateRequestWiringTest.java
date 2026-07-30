package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.model.Script;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the duplicate-write detection is actually wired end-to-end
 * through {@link Executor#executeRest}, including the
 * {@code allowDuplicateRequest} front-matter opt-out (spec §13/§16) — not
 * just {@link RequestLedgerTest}'s unit-level check of the ledger alone.
 * Uses the JDK's built-in {@link HttpServer} as a real (if trivial) HTTP
 * target rather than mocking REST-Assured.
 */
class DuplicateRequestWiringTest {

    @TempDir
    Path dir;

    private HttpServer server;
    private int port;

    private void write(String relativePath, String content) throws IOException {
        Path file = dir.resolve(relativePath);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/echo", exchange -> {
            byte[] responseBytes = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            exchange.getResponseBody().write(responseBytes);
            exchange.close();
        });
        // Echoes the exact request body back, for the whole-object-passthrough test.
        server.createContext("/whole-body-echo", exchange -> {
            byte[] received = exchange.getRequestBody().readAllBytes();
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, received.length);
            exchange.getResponseBody().write(received);
            exchange.close();
        });
        server.start();
        port = server.getAddress().getPort();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private Script writeCase(String frontMatterExtra) throws IOException {
        Path file = dir.resolve("DUP-TC-001-x.bnrest.md");
        Files.writeString(file, """
                ---
                id: DUP-TC-001
                number: 1
                type: Test Case
                title: Duplicate write test
                owner: QA
                status: Active
                tags: []
                %s
                ---
                ```bnrest
                Post /echo Into r1
                { "name": "same-every-time" }

                Post /echo Into r2
                { "name": "same-every-time" }
                ```
                """.formatted(frontMatterExtra));
        return new com.bluenest.testplatform.parser.ScriptParser().parse(file);
    }

    private ExecutionContext newContext(ScriptRepository repo) {
        return new ExecutionContext("run1", "col1", "suite1", "DUP-TC-001",
                new HttpClient("http://127.0.0.1:" + port, 5), new RequestLedger(), repo,
                new LinkedHashMap<>(), new LinkedHashMap<>());
    }

    @Test
    void flagsARepeatedIdenticalWriteByDefault() throws IOException {
        Script caseScript = writeCase("");
        ScriptRepository repo = ScriptRepository.discover(dir);
        ExecutionContext ctx = newContext(repo);
        new Executor().runScript(caseScript, ctx, new VariableScope(null));

        assertTrue(ctx.result.steps.get(1).duplicateWarning,
                "the second identical POST must be flagged as a duplicate write");
    }

    @Test
    void allowDuplicateRequestSuppressesTheWarning() throws IOException {
        Script caseScript = writeCase("allowDuplicateRequest: true");
        ScriptRepository repo = ScriptRepository.discover(dir);
        ExecutionContext ctx = newContext(repo);
        new Executor().runScript(caseScript, ctx, new VariableScope(null));

        assertFalse(ctx.result.steps.get(1).duplicateWarning,
                "allowDuplicateRequest: true must suppress the duplicate-write warning");
    }

    @Test
    void stepTraceTagsWhichUtilIssuedTheRequestAndLeavesDirectCallsUntagged() throws IOException {
        // Regression: utilId was declared on StepTrace/StepResult but never
        // actually assigned anywhere, so every step — even ones issued from
        // deep inside a called Test Util — silently reported utilId=null.
        // Found while building the TestFlow UI's Scenario view, which relies
        // on utilId to reassemble which source line (a bare REST line vs. a
        // "Call <util>" line) is responsible for which HTTP request.
        write("utils/UTIL-ECHO-002-x.bnrest.md", """
                ---
                id: UTIL-ECHO-002
                number: U.1
                type: Test Util
                title: Echo util
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Post /echo Into fromUtil
                { "name": "from-the-util" }
                ```
                """);
        write("cases/CASE-K-001-x.bnrest.md", """
                ---
                id: CASE-K-001
                number: 1
                type: Test Case
                title: Direct call plus a util call
                owner: QA
                status: Active
                tags: []
                uses: [UTIL-ECHO-002]
                ---
                ```bnrest
                Post /echo Into direct
                { "name": "direct-from-the-case" }

                Call ../utils/UTIL-ECHO-002-x.bnrest.md With Json Into viaUtil
                {}
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-K-001");
        ExecutionContext ctx = new ExecutionContext("run1", "col1", "suite1", "CASE-K-001",
                new HttpClient("http://127.0.0.1:" + port, 5), new RequestLedger(), repo,
                new LinkedHashMap<>(), new LinkedHashMap<>());
        new Executor().runScript(caseScript, ctx, new VariableScope(null));

        assertEquals(2, ctx.result.steps.size());
        assertNull(ctx.result.steps.get(0).utilId, "a bare, case-level REST line must not be tagged with a util id");
        assertEquals("UTIL-ECHO-002", ctx.result.steps.get(1).utilId,
                "a request issued from inside a called Util must be tagged with that util's id");
    }

    @Test
    void wholeVariablePassthroughSendsTheExactObjectAsTheRequestBody() throws IOException {
        Path file = dir.resolve("ROUNDTRIP-TC-001-x.bnrest.md");
        Files.writeString(file, """
                ---
                id: ROUNDTRIP-TC-001
                number: 1
                type: Test Case
                title: Round-trip whole-object PUT
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Get /echo Into fetched
                Put /whole-body-echo Into echoed
                ${fetched.body}

                Assert echoed.body.ok == true
                ```
                """);
        Script caseScript = new com.bluenest.testplatform.parser.ScriptParser().parse(file);
        ScriptRepository repo = ScriptRepository.discover(dir);
        ExecutionContext ctx = newContext(repo);

        assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, new VariableScope(null)));
    }
}
