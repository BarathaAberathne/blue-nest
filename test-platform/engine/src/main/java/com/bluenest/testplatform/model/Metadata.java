package com.bluenest.testplatform.model;

import java.util.List;

/**
 * Parsed YAML front matter (spec §4). {@code id}, {@code number}, {@code type},
 * {@code title}, {@code owner}, {@code mode}, {@code status}, {@code tags} are
 * required; the rest are optional with documented defaults.
 */
public final class Metadata {
    public String id;
    public String number;
    public ScriptType type;
    public String title;
    public String owner;
    public Mode mode = Mode.STANDALONE;
    public String status = "Active";
    public List<String> tags = List.of();
    public List<String> dependsOn = List.of();
    public List<String> uses = List.of();
    public FixtureScope fixtureScope = FixtureScope.CASE;
    public int timeoutSeconds = 30;
    public boolean allowDuplicateRequest = false;
    /** Optional: relative path to a CSV file that drives one dynamic test per row. */
    public String dataFile;

    public void validateRequiredFields(String sourceFile) {
        StringBuilder missing = new StringBuilder();
        if (isBlank(id)) missing.append("id ");
        if (isBlank(number)) missing.append("number ");
        if (type == null) missing.append("type ");
        if (isBlank(title)) missing.append("title ");
        if (isBlank(owner)) missing.append("owner ");
        if (isBlank(status)) missing.append("status ");
        if (tags == null) missing.append("tags ");
        if (missing.length() > 0) {
            throw new IllegalArgumentException(
                    "Invalid metadata in " + sourceFile + " — missing required field(s): "
                            + missing.toString().trim());
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
