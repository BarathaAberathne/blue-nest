package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.SecretResolver;
import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.StepTrace;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/** Everything one Test Case's execution needs, shared with any Utils it Calls. */
public final class ExecutionContext {
    public final String runId;
    public final String collectionId;
    public final String suiteId;
    public final String caseId;
    public final String correlationId;
    public final HttpClient httpClient;
    public final RequestLedger requestLedger; // shared across the whole run — catches cross-suite duplicates too
    public final SecretResolver secretResolver = new SecretResolver();
    public final ScriptRepository repository;
    public final AtomicInteger stepCounter = new AtomicInteger(0);
    public final CaseResult result;
    /** The last-obtained bearer token, if any REST call's response carried one — used by subsequent calls in the same case. */
    public String bearerToken;
    /**
     * Fixture-scope caches (spec §2): a Util called with {@code fixtureScope: suite}
     * runs once and its Output is shared read-only by every case in that suite;
     * {@code run} shares across the whole run. Both maps are the SAME instance
     * across every case's ExecutionContext within their scope — that's what makes
     * the sharing (and the avoided duplicate-login problem) actually work.
     */
    public final Map<String, JsonNode> suiteFixtureCache;
    public final Map<String, JsonNode> runFixtureCache;

    public ExecutionContext(String runId, String collectionId, String suiteId, String caseId,
                             HttpClient httpClient, RequestLedger requestLedger, ScriptRepository repository,
                             Map<String, JsonNode> suiteFixtureCache, Map<String, JsonNode> runFixtureCache) {
        this.runId = runId;
        this.collectionId = collectionId;
        this.suiteId = suiteId;
        this.caseId = caseId;
        this.correlationId = UUID.randomUUID().toString();
        this.httpClient = httpClient;
        this.requestLedger = requestLedger;
        this.repository = repository;
        this.suiteFixtureCache = suiteFixtureCache;
        this.runFixtureCache = runFixtureCache;
        this.result = new CaseResult();
        this.result.caseId = caseId;
        this.result.suiteId = suiteId;
    }

    public StepTrace newTrace() {
        StepTrace t = new StepTrace();
        t.runId = runId;
        t.collectionId = collectionId;
        t.suiteId = suiteId;
        t.caseId = caseId;
        t.correlationId = correlationId;
        t.stepNumber = stepCounter.incrementAndGet();
        return t;
    }
}
