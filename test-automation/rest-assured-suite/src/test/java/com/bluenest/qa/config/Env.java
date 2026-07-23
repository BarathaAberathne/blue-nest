package com.bluenest.qa.config;

/**
 * Environment configuration, read from Maven system properties (see pom.xml
 * {@code <properties>} / {@code -Dqa.baseUrl=...} overrides) so the same
 * suite runs against local, staging, or a future CI environment without
 * code changes.
 */
public final class Env {

    public static final String BASE_URL =
            System.getProperty("qa.baseUrl", "http://localhost:8080");

    public static final String ADMIN_EMAIL =
            System.getProperty("qa.adminEmail", "admin@bluenest.uk");

    public static final String ADMIN_PASSWORD =
            System.getProperty("qa.adminPassword", "changeme-min-8-chars");

    /** The branch every suite exercises against — see README for why. */
    public static final String HARROW_BRANCH_SLUG = "harrow";

    private Env() {
    }
}
