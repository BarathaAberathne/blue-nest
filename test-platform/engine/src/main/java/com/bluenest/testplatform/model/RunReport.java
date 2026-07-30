package com.bluenest.testplatform.model;

import java.util.ArrayList;
import java.util.List;

public final class RunReport {
    public String runId;
    public String environment;
    public String baseUrl;
    public String gitCommit;
    public long startedAtEpochMs;
    public long finishedAtEpochMs;
    public List<CaseResult> cases = new ArrayList<>();

    public long passed() {
        return cases.stream().filter(c -> c.status == RunStatus.PASSED).count();
    }

    public long failed() {
        return cases.stream().filter(c -> c.status == RunStatus.FAILED).count();
    }

    public long skipped() {
        return cases.stream().filter(c -> c.status == RunStatus.SKIPPED
                || c.status == RunStatus.BLOCKED).count();
    }
}
