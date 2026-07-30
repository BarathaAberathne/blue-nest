package com.bluenest.testplatform.model;

/** The five script types the bnrest format supports (spec §3). */
public enum ScriptType {
    TEST_COLLECTION("Test Collection"),
    TEST_SUITE("Test Suite"),
    TEST_CASE("Test Case"),
    TEST_UTIL("Test Util"),
    TEST_DATA("Test Data");

    public final String label;

    ScriptType(String label) {
        this.label = label;
    }

    public static ScriptType fromLabel(String label) {
        for (ScriptType t : values()) {
            if (t.label.equalsIgnoreCase(label) || t.name().equalsIgnoreCase(label)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown script type: '" + label
                + "'. Expected one of: Test Collection, Test Suite, Test Case, Test Util, Test Data");
    }

    /**
     * Enforces the call hierarchy from spec §3:
     * Collection -> Collection|Suite, Suite -> Case, Case -> Util, Data -> Util, Util -> Util.
     */
    public boolean canCall(ScriptType callee) {
        return switch (this) {
            case TEST_COLLECTION -> callee == TEST_COLLECTION || callee == TEST_SUITE;
            case TEST_SUITE -> callee == TEST_CASE;
            case TEST_CASE -> callee == TEST_UTIL;
            case TEST_DATA -> callee == TEST_UTIL;
            case TEST_UTIL -> callee == TEST_UTIL;
        };
    }
}
