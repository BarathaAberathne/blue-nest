package com.bluenest.testplatform.model;

public enum Mode {
    STANDALONE, DEPENDENT;

    public static Mode fromLabel(String label) {
        if (label == null) return STANDALONE;
        return Mode.valueOf(label.trim().toUpperCase());
    }
}
