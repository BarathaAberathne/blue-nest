package com.bluenest.testplatform.model;

import java.util.Map;

/**
 * The explicit, closed set of executable script commands (spec §5). There is
 * no "arbitrary expression" or "raw code" command — anything not in this enum
 * is a parse error, not a silently-ignored no-op.
 */
public enum Command {
    // REST
    GET, POST, CREATE, PUT, PATCH, MODIFY, DELETE, QUERY, BATCH,
    // Reuse / orchestration
    CALL, OUTPUT, INCLUDE, SETUP, TEARDOWN, DEPENDS_ON,
    // Variables and data
    SET, EVAL, APPLY_JSON, COPY_JSON, REMOVE_JSON, LOAD_JSON, LOAD_CSV,
    // Validation
    ASSERT, ASSERT_JSON, ASSERT_STATUS, ASSERT_HEADER, ASSERT_SCHEMA,
    ASSERT_RESPONSE_TIME, EXPECT_FAIL, PRINT,
    // Conditional guard (spec §2 "When") — distinct from the Given/When/Then/And
    // readability aliases, which are stripped before reaching this enum.
    WHEN;

    private static final Map<String, Command> KEYWORDS = Map.ofEntries(
            Map.entry("Get", GET), Map.entry("Post", POST), Map.entry("Create", CREATE),
            Map.entry("Put", PUT), Map.entry("Patch", PATCH), Map.entry("Modify", MODIFY),
            Map.entry("Delete", DELETE), Map.entry("Query", QUERY), Map.entry("Batch", BATCH),
            Map.entry("Call", CALL), Map.entry("Output", OUTPUT), Map.entry("Include", INCLUDE),
            Map.entry("Setup", SETUP), Map.entry("Teardown", TEARDOWN), Map.entry("DependsOn", DEPENDS_ON),
            Map.entry("Set", SET), Map.entry("Eval", EVAL), Map.entry("ApplyJson", APPLY_JSON),
            Map.entry("CopyJson", COPY_JSON), Map.entry("RemoveJson", REMOVE_JSON),
            Map.entry("LoadJson", LOAD_JSON), Map.entry("LoadCsv", LOAD_CSV),
            Map.entry("Assert", ASSERT), Map.entry("AssertJson", ASSERT_JSON),
            Map.entry("AssertStatus", ASSERT_STATUS), Map.entry("AssertHeader", ASSERT_HEADER),
            Map.entry("AssertSchema", ASSERT_SCHEMA), Map.entry("AssertResponseTime", ASSERT_RESPONSE_TIME),
            Map.entry("ExpectFail", EXPECT_FAIL), Map.entry("Print", PRINT)
            // "When" is deliberately NOT registered here: it is always either a
            // Given/When/Then/And readability alias (stripped before lookup) or the
            // genuine conditional-guard form, both handled specially in
            // StatementParser#parseOne — never resolved as an ordinary keyword.
    );

    /** Readability aliases (spec §5) — stripped before the real command is looked up. */
    private static final java.util.Set<String> BDD_ALIASES = java.util.Set.of("Given", "When", "Then", "And");

    public static boolean isRestVerb(Command c) {
        return switch (c) {
            case GET, POST, CREATE, PUT, PATCH, MODIFY, DELETE, QUERY, BATCH -> true;
            default -> false;
        };
    }

    /** Maps aliased REST verbs onto their real HTTP method. */
    public static String httpMethod(Command c) {
        return switch (c) {
            case GET, QUERY -> "GET";
            case POST, CREATE -> "POST";
            case PUT -> "PUT";
            case PATCH, MODIFY -> "PATCH";
            case DELETE -> "DELETE";
            case BATCH -> "BATCH";
            default -> throw new IllegalArgumentException(c + " is not a REST verb");
        };
    }

    /**
     * Resolves a leading token to a {@link Command}, stripping a single
     * Given/When/Then/And alias first. Returns null (not an exception) when the
     * token isn't a recognised keyword at all, so the caller can decide whether
     * that's a conditional-guard "When &lt;expr&gt;" vs. a genuine parse error.
     */
    public static Command lookup(String token) {
        return KEYWORDS.get(token);
    }

    public static boolean isBddAlias(String token) {
        return BDD_ALIASES.contains(token);
    }
}
