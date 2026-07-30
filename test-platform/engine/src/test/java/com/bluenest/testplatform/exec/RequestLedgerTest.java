package com.bluenest.testplatform.exec;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RequestLedgerTest {

    @Test
    void flagsARepeatedWriteWithTheSameBody() {
        RequestLedger ledger = new RequestLedger();
        var first = ledger.record("POST", "/admin/staff", "{\"name\":\"a\"}", "case#1");
        var second = ledger.record("POST", "/admin/staff", "{\"name\":\"a\"}", "case#2");
        assertFalse(first.isDuplicate());
        assertTrue(second.isDuplicate());
        assertEquals("case#1", second.duplicateOfStep());
    }

    @Test
    void differentBodiesAreNotFlaggedAsDuplicates() {
        RequestLedger ledger = new RequestLedger();
        var first = ledger.record("POST", "/admin/staff", "{\"name\":\"a\"}", "case#1");
        var second = ledger.record("POST", "/admin/staff", "{\"name\":\"b\"}", "case#2");
        assertFalse(first.isDuplicate());
        assertFalse(second.isDuplicate());
    }

    @Test
    void readsAreNeverFlaggedAsDuplicateWrites() {
        RequestLedger ledger = new RequestLedger();
        ledger.record("GET", "/admin/staff", null, "case#1");
        var second = ledger.record("GET", "/admin/staff", null, "case#2");
        assertFalse(second.isDuplicate(), "GET is a read, not a write — repeats are normal polling, not a bug");
    }
}
