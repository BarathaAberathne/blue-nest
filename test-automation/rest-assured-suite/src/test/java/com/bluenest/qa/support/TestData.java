package com.bluenest.qa.support;

import java.time.Instant;

/**
 * Unique-identifier generation for records a test CREATES against the real
 * system (this suite runs against real Harrow data, not a disposable
 * per-test database — see README "Why no test-database reset"). Every
 * fixture name/email carries the {@code QA-AUTOTEST-} prefix plus a run-
 * unique suffix so:
 *
 * <ul>
 *   <li>repeat runs never collide with each other (the duplicate-name/
 *       duplicate-email validation this suite is partly regression-testing
 *       would otherwise fail the *second* run for the wrong reason);</li>
 *   <li>anyone auditing the database can immediately recognise and safely
 *       remove anything with this prefix if a suite run is ever interrupted
 *       before its own {@code @AfterAll} cleanup runs.</li>
 * </ul>
 */
public final class TestData {

    private static final String RUN_ID = Long.toString(Instant.now().toEpochMilli(), 36);

    public static String uniqueName(String label) {
        return "QA-AUTOTEST-" + label + "-" + RUN_ID;
    }

    public static String uniqueEmail(String label) {
        return "qa-autotest-" + label.toLowerCase().replace(' ', '-') + "-" + RUN_ID + "@bluenest.test";
    }

    private TestData() {
    }
}
