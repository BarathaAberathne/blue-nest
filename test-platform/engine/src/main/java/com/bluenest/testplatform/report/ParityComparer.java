package com.bluenest.testplatform.report;

/**
 * Compares a legacy suite's result counts against the bnrest replacement's
 * (spec §18 Phase E "Compare endpoint, request, response and assertions" /
 * §21 "Legacy and replacement parity is documented"). This intentionally
 * only compares counts/outcomes — endpoint and assertion equivalence is a
 * human judgement recorded in the migration manifest and parity report, not
 * something inferred automatically from two different test frameworks.
 */
public final class ParityComparer {

    public record ParityResult(boolean matches, String summary) {
    }

    public ParityResult compare(int legacyTotal, int legacyPassed, int newTotal, int newPassed) {
        boolean sameCoverage = newTotal >= legacyTotal;
        boolean allPass = legacyPassed == legacyTotal && newPassed == newTotal;
        boolean matches = sameCoverage && allPass;
        String summary = String.format(
                "legacy: %d/%d passed; new: %d/%d passed; coverage %s",
                legacyPassed, legacyTotal, newPassed, newTotal,
                sameCoverage ? "maintained or increased" : "REGRESSED (new suite covers fewer cases)");
        return new ParityResult(matches, summary);
    }
}
