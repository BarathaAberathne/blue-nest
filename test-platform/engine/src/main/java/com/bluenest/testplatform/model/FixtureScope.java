package com.bluenest.testplatform.model;

/** Spec §2 fixture scopes. */
public enum FixtureScope {
    CASE, SUITE, RUN;

    public static FixtureScope fromLabel(String label) {
        if (label == null) return CASE;
        return FixtureScope.valueOf(label.trim().toUpperCase());
    }
}
