package com.bluenest.testplatform.eval;

/** Thrown for any reference to an unresolvable variable/path — spec §12 "clear errors for undefined variables". */
public final class UndefinedVariableException extends RuntimeException {
    public UndefinedVariableException(String message) {
        super(message);
    }
}
