package com.bluenest.testplatform.model;

/**
 * One recorded API call (spec §13). Values here are already redacted by the
 * time they're attached to a report — see {@code exec.Redactor}.
 */
public final class StepTrace {
    public String runId;
    public String collectionId;
    public String suiteId;
    public String caseId;
    public int stepNumber;
    public String utilId;
    public String httpMethod;
    public String normalizedUrl;
    public String endpointTemplate;
    public long requestTimeEpochMs;
    public int responseStatus;
    public long responseTimeMs;
    public String requestBodyHash;
    public String correlationId;
    public int retryCount;
    public String result;
    public boolean duplicateWarning;
    public String duplicateOfStep;
}
