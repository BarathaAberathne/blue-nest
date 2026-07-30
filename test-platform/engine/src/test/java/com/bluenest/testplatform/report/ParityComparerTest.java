package com.bluenest.testplatform.report;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ParityComparerTest {

    private final ParityComparer comparer = new ParityComparer();

    @Test
    void matchesWhenCoverageIsMaintainedAndAllPass() {
        var result = comparer.compare(4, 4, 7, 7);
        assertTrue(result.matches());
    }

    @Test
    void doesNotMatchWhenNewSuiteCoversFewerCasesThanLegacy() {
        var result = comparer.compare(10, 10, 4, 4);
        assertFalse(result.matches());
        assertTrue(result.summary().contains("REGRESSED"));
    }

    @Test
    void doesNotMatchWhenAnythingIsFailing() {
        var result = comparer.compare(4, 3, 4, 4);
        assertFalse(result.matches(), "a legacy failure must not be silently considered at parity");
    }
}
