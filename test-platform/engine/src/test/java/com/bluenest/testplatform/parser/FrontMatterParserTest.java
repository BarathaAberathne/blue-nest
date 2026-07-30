package com.bluenest.testplatform.parser;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FrontMatterParserTest {

    private final FrontMatterParser parser = new FrontMatterParser();

    @Test
    void parsesAllRequiredAndOptionalFields() {
        String raw = """
                ---
                id: SAMPLE-TC-001
                number: 1.2.3
                type: Test Case
                title: Sample
                owner: QA
                mode: Dependent
                status: Active
                tags:
                  - smoke
                  - regression
                dependsOn:
                  - SAMPLE-TC-000
                uses:
                  - SAMPLE-UTIL-001
                fixtureScope: suite
                timeoutSeconds: 45
                allowDuplicateRequest: true
                ---
                # Body

                ```bnrest
                Assert 1 == 1
                ```
                """;
        var result = parser.parse(raw, "test.bnrest.md");
        assertEquals("SAMPLE-TC-001", result.metadata().id);
        assertEquals("1.2.3", result.metadata().number);
        assertEquals(com.bluenest.testplatform.model.ScriptType.TEST_CASE, result.metadata().type);
        assertEquals(com.bluenest.testplatform.model.Mode.DEPENDENT, result.metadata().mode);
        assertEquals(java.util.List.of("smoke", "regression"), result.metadata().tags);
        assertEquals(java.util.List.of("SAMPLE-TC-000"), result.metadata().dependsOn);
        assertEquals(java.util.List.of("SAMPLE-UTIL-001"), result.metadata().uses);
        assertEquals(com.bluenest.testplatform.model.FixtureScope.SUITE, result.metadata().fixtureScope);
        assertEquals(45, result.metadata().timeoutSeconds);
        assertTrue(result.metadata().allowDuplicateRequest);
        assertTrue(result.body().contains("Assert 1 == 1"));
    }

    @Test
    void missingRequiredFieldIsRejected() {
        String raw = """
                ---
                id: SAMPLE-TC-002
                type: Test Case
                title: Missing number/owner
                status: Active
                ---
                body
                """;
        var ex = assertThrows(IllegalArgumentException.class, () -> parser.parse(raw, "test.bnrest.md"));
        assertTrue(ex.getMessage().contains("number"));
        assertTrue(ex.getMessage().contains("owner"));
    }

    @Test
    void missingFrontMatterDelimiterIsRejected() {
        String raw = "# Just markdown, no front matter\n";
        assertThrows(IllegalArgumentException.class, () -> parser.parse(raw, "test.bnrest.md"));
    }

    @Test
    void defaultsApplyWhenOptionalFieldsAbsent() {
        String raw = """
                ---
                id: SAMPLE-UTIL-001
                number: U.1
                type: Test Util
                title: A util
                owner: QA
                status: Active
                tags: []
                ---
                body
                """;
        var result = parser.parse(raw, "test.bnrest.md");
        assertEquals(com.bluenest.testplatform.model.Mode.STANDALONE, result.metadata().mode);
        assertEquals(com.bluenest.testplatform.model.FixtureScope.CASE, result.metadata().fixtureScope);
        assertEquals(30, result.metadata().timeoutSeconds);
        assertFalse(result.metadata().allowDuplicateRequest);
    }
}
