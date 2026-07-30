package com.bluenest.testplatform.model;

import java.util.ArrayList;
import java.util.List;

public final class CaseResult {
    public String caseId;
    public String suiteId;
    public String title;
    public RunStatus status = RunStatus.NOT_RUN;
    public long durationMs;
    public String skippedReason;
    public String failedAssertion;
    public String errorMessage;
    public List<StepTrace> steps = new ArrayList<>();
    public List<String> dependencyChain = new ArrayList<>();
    public String sourceFile;
}
