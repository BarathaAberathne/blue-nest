package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.parser.ScriptParser;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Exercises Call/Output isolation, fixture-scope caching, CatchError, and
 * ExpectFail WITHOUT any real HTTP call — all of these are pure
 * variable/control-flow behaviour, so a fake/unused {@link HttpClient} is
 * enough (none of the scripts below use a REST command).
 */
class ExecutorIntegrationTest {

    @TempDir
    Path dir;

    private void write(String relativePath, String content) throws IOException {
        Path file = dir.resolve(relativePath);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }

    private ExecutionContext newContext(ScriptRepository repo, Map<String, JsonNode> suiteCache, Map<String, JsonNode> runCache) {
        return new ExecutionContext("run1", "col1", "suite1", "case-" + System.identityHashCode(new Object()),
                new HttpClient("http://unused.invalid", 5), new RequestLedger(), repo, suiteCache, runCache);
    }

    @Test
    void callPassesInputExplicitlyAndIsolatesCallerVariables() throws IOException {
        write("utils/UTIL-ECHO-001-x.bnrest.md", """
                ---
                id: UTIL-ECHO-001
                number: U.1
                type: Test Util
                title: Echo util
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Output
                {
                  "echoed": "${input.name}"
                }
                ```
                """);
        write("cases/CASE-A-001-x.bnrest.md", """
                ---
                id: CASE-A-001
                number: 1
                type: Test Case
                title: Caller
                owner: QA
                status: Active
                tags: []
                uses: [UTIL-ECHO-001]
                ---
                ```bnrest
                Set name = "caller-own-value"
                Call ../utils/UTIL-ECHO-001-x.bnrest.md With Json Into result
                {
                  "name": "explicitly-passed-value"
                }
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-A-001");
        VariableScope scope = new VariableScope(null);
        Executor executor = new Executor();
        executor.runScript(caseScript, newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>()), scope);

        assertEquals("explicitly-passed-value", scope.resolve("result.echoed").asText(),
                "the util must use the explicitly-passed input, not the caller's own variable of the same name");
    }

    @Test
    void suiteScopedUtilIsCachedAcrossCallers() throws IOException {
        write("utils/UTIL-RAND-001-x.bnrest.md", """
                ---
                id: UTIL-RAND-001
                number: U.1
                type: Test Util
                title: Suite-cached util
                owner: QA
                status: Active
                fixtureScope: suite
                tags: []
                ---
                ```bnrest
                Output
                {
                  "token": "${random()}"
                }
                ```
                """);
        write("cases/CASE-B-001-x.bnrest.md", """
                ---
                id: CASE-B-001
                number: 1
                type: Test Case
                title: Caller B
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Call ../utils/UTIL-RAND-001-x.bnrest.md Into r
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-B-001");
        Map<String, JsonNode> suiteCache = new LinkedHashMap<>();

        VariableScope scope1 = new VariableScope(null);
        new Executor().runScript(caseScript, newContext(repo, suiteCache, new LinkedHashMap<>()), scope1);
        VariableScope scope2 = new VariableScope(null);
        new Executor().runScript(caseScript, newContext(repo, suiteCache, new LinkedHashMap<>()), scope2);

        assertEquals(scope1.resolve("r.token").asText(), scope2.resolve("r.token").asText(),
                "a suite-scoped util must run once and be reused, not re-executed per caller");
        assertEquals(1, suiteCache.size());
    }

    @Test
    void caseScopedUtilIsNotCached() throws IOException {
        write("utils/UTIL-RAND-002-x.bnrest.md", """
                ---
                id: UTIL-RAND-002
                number: U.2
                type: Test Util
                title: Case-scoped util
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Output
                {
                  "token": "${random()}"
                }
                ```
                """);
        write("cases/CASE-C-001-x.bnrest.md", """
                ---
                id: CASE-C-001
                number: 1
                type: Test Case
                title: Caller C
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Call ../utils/UTIL-RAND-002-x.bnrest.md Into r1
                Call ../utils/UTIL-RAND-002-x.bnrest.md Into r2
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-C-001");
        VariableScope scope = new VariableScope(null);
        new Executor().runScript(caseScript, newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>()), scope);

        // random() draws from 0..999999 — a collision is astronomically unlikely across two calls.
        assertNotEquals(scope.resolve("r1.token").asText(), scope.resolve("r2.token").asText());
    }

    @Test
    void catchErrorSwallowsAFailingCallAndRecordsIt() throws IOException {
        write("utils/UTIL-FAIL-001-x.bnrest.md", """
                ---
                id: UTIL-FAIL-001
                number: U.1
                type: Test Util
                title: Always fails
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Assert 1 == 2
                ```
                """);
        write("cases/CASE-D-001-x.bnrest.md", """
                ---
                id: CASE-D-001
                number: 1
                type: Test Case
                title: Caller D
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Call CatchError ../utils/UTIL-FAIL-001-x.bnrest.md
                Set afterwards = true
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-D-001");
        VariableScope scope = new VariableScope(null);
        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());

        assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, scope));
        assertTrue(ctx.result.steps.stream().anyMatch(s -> "CAUGHT_ERROR".equals(s.result)));
        assertEquals("true", scope.resolve("afterwards").asText(), "execution must continue after a CatchError'd failure");
    }

    @Test
    void expectFailPassesWhenWrappedStatementFailsAndFailsWhenItSucceeds() throws IOException {
        write("utils/UTIL-FAIL-002-x.bnrest.md", """
                ---
                id: UTIL-FAIL-002
                number: U.1
                type: Test Util
                title: Always fails
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Assert 1 == 2
                ```
                """);
        write("cases/CASE-E-001-x.bnrest.md", """
                ---
                id: CASE-E-001
                number: 1
                type: Test Case
                title: Expect the failure
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                ExpectFail Call ../utils/UTIL-FAIL-002-x.bnrest.md
                ```
                """);
        write("cases/CASE-F-001-x.bnrest.md", """
                ---
                id: CASE-F-001
                number: 2
                type: Test Case
                title: Expect a failure that never comes
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                ExpectFail Assert 1 == 1
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        ExecutionContext ctxE = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        assertDoesNotThrow(() -> new Executor().runScript(repo.byId("CASE-E-001"), ctxE, new VariableScope(null)));

        ExecutionContext ctxF = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        assertThrows(AssertionFailedException.class,
                () -> new Executor().runScript(repo.byId("CASE-F-001"), ctxF, new VariableScope(null)));
    }

    @Test
    void teardownAlwaysRunsEvenWhenBodyFails() throws IOException {
        write("cases/CASE-G-001-x.bnrest.md", """
                ---
                id: CASE-G-001
                number: 1
                type: Test Case
                title: Teardown must run despite a failing body
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Set restored = false
                Assert 1 == 2

                Teardown
                Set restored = true
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-G-001");
        VariableScope scope = new VariableScope(null);
        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());

        assertThrows(AssertionFailedException.class, () -> new Executor().runScript(caseScript, ctx, scope));
        assertEquals("true", scope.resolve("restored").asText(),
                "Teardown must run (finally-semantics) even though the body's Assert failed");
    }

    @Test
    void copyJsonExtractsOneItemFromAListByJsonPathFilter() throws IOException {
        // "branches" is pre-populated directly (as a REST response would produce it) —
        // Set/Eval only parse scalars/paths/functions, not JSON object literals, so the
        // script under test starts from CopyJson itself.
        write("cases/CASE-H-001-x.bnrest.md", """
                ---
                id: CASE-H-001
                number: 1
                type: Test Case
                title: CopyJson filter extraction
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                CopyJson branches $.data[?(@.slug=='harrow')] Into harrow
                Assert harrow.status == "active"
                Assert harrow.slug == "harrow"
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-H-001");
        VariableScope scope = new VariableScope(null);
        var branches = VariableScope.mapper().createObjectNode();
        var data = branches.putArray("data");
        data.addObject().put("slug", "borehamwood").put("status", "active");
        data.addObject().put("slug", "harrow").put("status", "active");
        scope.set("branches", branches);

        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, scope));
    }

    @Test
    void copyJsonExtractsOneItemUsingAQuotedMultiConditionJsonPathFilter() throws IOException {
        // Regression: CopyJson never unquoted its JSONPath argument (unlike
        // AssertJson), so a quoted multi-condition filter — needed the moment the
        // filter itself contains a space, e.g. "@.a=='x' && @.b=='y'" — was parsed
        // as a literal token including the surrounding quotes and always failed to
        // resolve (found while building the Child Registration suite's
        // CHILD-UTIL-001, which filters by first_name AND last_name together).
        write("cases/CASE-J-001-x.bnrest.md", """
                ---
                id: CASE-J-001
                number: 1
                type: Test Case
                title: CopyJson quoted multi-condition filter
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                CopyJson children "$.data[?(@.first_name=='QA' && @.last_name=='Reg')]" Into child
                Assert child.first_name == "QA"
                Assert child.last_name == "Reg"
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-J-001");
        VariableScope scope = new VariableScope(null);
        var children = VariableScope.mapper().createObjectNode();
        var data = children.putArray("data");
        data.addObject().put("first_name", "QA").put("last_name", "Other");
        data.addObject().put("first_name", "QA").put("last_name", "Reg");
        scope.set("children", children);

        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, scope));
    }

    @Test
    void assertJsonComparesFilterMatchCountAgainstANumber() throws IOException {
        // Jayway's own ".length()" chained after a filter predicate is unreliable
        // (found during the Branch migration — it does not return the filtered
        // count) — AssertJson must compute the count in Java instead when the
        // expected literal is numeric.
        write("cases/CASE-I-001-x.bnrest.md", """
                ---
                id: CASE-I-001
                number: 1
                type: Test Case
                title: Filter match count
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                AssertJson branches $.data[?(@.slug=='harrow')] == 1
                AssertJson branches $.data[?(@.slug=='nonexistent')] == 0
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-I-001");
        VariableScope scope = new VariableScope(null);
        var branches = VariableScope.mapper().createObjectNode();
        var data = branches.putArray("data");
        data.addObject().put("slug", "borehamwood");
        data.addObject().put("slug", "harrow");
        scope.set("branches", branches);

        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, scope));
    }

    @Test
    void assertJsonAcceptsAQuotedMultiConditionFilterWithSpaces() throws IOException {
        // A JSONPath filter with multiple conditions and multi-word string literals
        // (e.g. room names) needs spaces of its own — quoting keeps it one token
        // (found during the Room migration; unquoted, the tokenizer split it apart).
        write("cases/CASE-J-001-x.bnrest.md", """
                ---
                id: CASE-J-001
                number: 1
                type: Test Case
                title: Quoted multi-condition JSONPath filter
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                AssertJson rooms "$.data[?(@.capacity <= 0 && @.name != 'Zero Cap Test')]" == 0
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-J-001");
        VariableScope scope = new VariableScope(null);
        var rooms = VariableScope.mapper().createObjectNode();
        var data = rooms.putArray("data");
        data.addObject().put("name", "Zero Cap Test").put("capacity", 0);
        data.addObject().put("name", "Toddlers").put("capacity", 10);
        scope.set("rooms", rooms);

        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, scope));
    }

    @Test
    void templateSubstitutionTreatsAMissingFinalFieldAsNull() throws IOException {
        // A REST response's optional field (e.g. a staff record's user_id, only
        // present when a login was actually created) must not blow up Output
        // construction — found migrating STAFF-UTIL-001.
        write("cases/CASE-K-001-x.bnrest.md", """
                ---
                id: CASE-K-001
                number: 1
                type: Test Case
                title: Missing optional field in a template
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Output
                {
                  "id": "${record.id}",
                  "userId": "${record.user_id}"
                }
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-K-001");
        VariableScope scope = new VariableScope(null);
        var record = VariableScope.mapper().createObjectNode();
        record.put("id", "abc123"); // deliberately no "user_id" field
        scope.set("record", record);

        ExecutionContext ctx = newContext(repo, new LinkedHashMap<>(), new LinkedHashMap<>());
        JsonNode output = assertDoesNotThrow(() -> new Executor().runScript(caseScript, ctx, scope));
        assertEquals("abc123", output.get("id").asText());
        assertEquals("null", output.get("userId").asText());
    }

    @Test
    void callFreshBypassesTheFixtureCacheEvenForARunScopedUtil() throws IOException {
        write("utils/UTIL-RAND-003-x.bnrest.md", """
                ---
                id: UTIL-RAND-003
                number: U.1
                type: Test Util
                title: Run-scoped util
                owner: QA
                status: Active
                fixtureScope: run
                tags: []
                ---
                ```bnrest
                Output
                {
                  "token": "${random()}"
                }
                ```
                """);
        write("cases/CASE-L-001-x.bnrest.md", """
                ---
                id: CASE-L-001
                number: 1
                type: Test Case
                title: Caller using Fresh
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Call ../utils/UTIL-RAND-003-x.bnrest.md Into cached
                Call Fresh ../utils/UTIL-RAND-003-x.bnrest.md Into fresh
                ```
                """);
        ScriptRepository repo = ScriptRepository.discover(dir);
        Script caseScript = repo.byId("CASE-L-001");
        VariableScope scope = new VariableScope(null);
        Map<String, JsonNode> runCache = new LinkedHashMap<>();
        ExecutionContext ctx = new ExecutionContext("run1", "col1", "suite1", "case1",
                new HttpClient("http://unused.invalid", 5), new RequestLedger(), repo,
                new LinkedHashMap<>(), runCache);

        new Executor().runScript(caseScript, ctx, scope);

        assertNotEquals(scope.resolve("cached.token").asText(), scope.resolve("fresh.token").asText(),
                "Call Fresh must re-execute even though the target is fixtureScope: run and the cache already has an entry");
        assertEquals(1, runCache.size(), "the Fresh call must not itself pollute the shared cache");
    }
}
