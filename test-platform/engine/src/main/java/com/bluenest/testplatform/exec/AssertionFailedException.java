package com.bluenest.testplatform.exec;

public final class AssertionFailedException extends RuntimeException {
    public AssertionFailedException(String message) {
        super(message);
    }
}
