package com.bluenest.testplatform.model;

/** Spec §14 run/report statuses. */
public enum RunStatus {
    NOT_RUN, QUEUED, RUNNING, PASSED, FAILED, SKIPPED, BLOCKED, INVALID
}
