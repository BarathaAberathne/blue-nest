package com.bluenest.testplatform.parser;

import com.bluenest.testplatform.model.Command;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.model.Statement;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class ScriptParserTest {

    @TempDir
    Path tempDir;

    private Script parse(String content) throws IOException {
        Path file = tempDir.resolve("sample.bnrest.md");
        Files.writeString(file, content);
        return new ScriptParser().parse(file);
    }

    @Test
    void parsesSetupBodyAndTeardownPhases() throws IOException {
        Script s = parse("""
                ---
                id: SAMPLE-TC-010
                number: 1
                type: Test Case
                title: Setup/teardown split
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Setup
                Set a = 1

                Body
                Set b = 2

                Teardown
                Set c = 3
                ```
                """);
        assertEquals(1, s.setup.size());
        assertEquals(1, s.body.size());
        assertEquals(1, s.teardown.size());
        assertEquals("a", s.setup.get(0).intoVar);
        assertEquals("b", s.body.get(0).intoVar);
        assertEquals("c", s.teardown.get(0).intoVar);
    }

    @Test
    void parsesRestStatementWithBodyAndInto() throws IOException {
        Script s = parse("""
                ---
                id: SAMPLE-TC-011
                number: 2
                type: Test Case
                title: REST with body
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Post /api/x Into resp
                {
                  "a": 1,
                  "b": "${input.name}"
                }

                AssertStatus resp 200
                ```
                """);
        assertEquals(2, s.body.size());
        Statement post = s.body.get(0);
        assertEquals(Command.POST, post.command);
        assertEquals("/api/x", post.target);
        assertEquals("resp", post.intoVar);
        assertNotNull(post.bodyJson);
        assertTrue(post.bodyJson.contains("\"a\": 1"));
        Statement assertStatus = s.body.get(1);
        assertEquals(Command.ASSERT_STATUS, assertStatus.command);
        assertEquals("resp", assertStatus.subjectVar);
        assertEquals("200", assertStatus.args.get(0));
    }

    @Test
    void parsesCallWithJsonAndBddAliases() throws IOException {
        Script s = parse("""
                ---
                id: SAMPLE-TC-012
                number: 3
                type: Test Case
                title: Call with aliases
                owner: QA
                status: Active
                tags: []
                uses: [SAMPLE-UTIL-001]
                ---
                ```bnrest
                Given Call ../utils/SAMPLE-UTIL-001-x.bnrest.md With Json Into session
                {
                  "email": "${input.email}"
                }

                Then Assert session.token != null
                And Assert session.token == "abc"
                ```
                """);
        assertEquals(3, s.body.size());
        Statement call = s.body.get(0);
        assertEquals(Command.CALL, call.command);
        assertTrue(call.withJson);
        assertEquals("session", call.intoVar);
        assertNotNull(call.bodyJson);
        assertEquals(Command.ASSERT, s.body.get(1).command);
        assertEquals(Command.ASSERT, s.body.get(2).command);
    }

    @Test
    void expectFailWrapsAStatementWithItsOwnJsonBody() throws IOException {
        Script s = parse("""
                ---
                id: SAMPLE-TC-013
                number: 4
                type: Test Case
                title: ExpectFail wrapping Call+body
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                ExpectFail Call ../utils/SAMPLE-UTIL-001-x.bnrest.md With Json Into session
                {
                  "email": "bad"
                }
                ```
                """);
        assertEquals(1, s.body.size());
        Statement expectFail = s.body.get(0);
        assertEquals(Command.EXPECT_FAIL, expectFail.command);
        assertNotNull(expectFail.inner);
        assertEquals(Command.CALL, expectFail.inner.command);
        assertNotNull(expectFail.inner.bodyJson, "the wrapped Call must still capture its JSON body");
        assertTrue(expectFail.inner.bodyJson.contains("bad"));
    }

    @Test
    void whenGuardWrapsTheFollowingStatement() throws IOException {
        Script s = parse("""
                ---
                id: SAMPLE-TC-014
                number: 5
                type: Test Case
                title: When guard
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Set flag = true
                When flag == true
                Assert 1 == 1
                ```
                """);
        assertEquals(2, s.body.size());
        Statement when = s.body.get(1);
        assertEquals(Command.WHEN, when.command);
        assertEquals("flag == true", when.exprText);
        assertEquals(Command.ASSERT, when.inner.command);
    }

    @Test
    void unknownCommandIsRejected() {
        var ex = assertThrows(StatementParser.ParseException.class, () -> parse("""
                ---
                id: SAMPLE-TC-015
                number: 6
                type: Test Case
                title: Bad command
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Frobnicate something
                ```
                """));
        assertTrue(ex.getMessage().contains("unknown command"));
    }
}
