package com.bluenest.testplatform.exec;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Detects duplicate WRITE requests within one case run (spec §13/§9):
 * {@code method + normalized URL + request-body hash} seen more than once
 * without {@code allowDuplicateRequest: true} is flagged — catching repeated
 * setup execution, retry-after-success, duplicate utility calls, and
 * suite+case fixtures both logging in.
 */
public final class RequestLedger {

    private final Map<String, Integer> seenCount = new LinkedHashMap<>();
    private final Map<String, String> firstSeenAtStep = new LinkedHashMap<>();

    public record Check(boolean isDuplicate, String duplicateOfStep) {
    }

    public Check record(String method, String normalizedUrl, String requestBody, String stepLabel) {
        if (!isWrite(method)) {
            return new Check(false, null);
        }
        String key = method + " " + normalizedUrl + " " + hash(requestBody);
        int count = seenCount.merge(key, 1, Integer::sum);
        if (count == 1) {
            firstSeenAtStep.put(key, stepLabel);
            return new Check(false, null);
        }
        return new Check(true, firstSeenAtStep.get(key));
    }

    private static boolean isWrite(String method) {
        return method.equals("POST") || method.equals("PUT") || method.equals("PATCH") || method.equals("DELETE");
    }

    static String hash(String body) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((body == null ? "" : body).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
