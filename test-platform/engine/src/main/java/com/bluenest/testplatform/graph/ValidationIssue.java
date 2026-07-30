package com.bluenest.testplatform.graph;

public final class ValidationIssue {
    public enum Severity { ERROR, WARNING, INFO }

    public final Severity severity;
    public final String code;
    public final String message;

    public ValidationIssue(Severity severity, String code, String message) {
        this.severity = severity;
        this.code = code;
        this.message = message;
    }

    public boolean isError() {
        return severity == Severity.ERROR;
    }

    @Override
    public String toString() {
        return "[" + severity + " " + code + "] " + message;
    }
}
