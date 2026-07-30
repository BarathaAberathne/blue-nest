package com.bluenest.testplatform.exec;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Iterator;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Redacts sensitive values before anything is written to
 * {@code test-results/requests|json|html} (spec §13). Redaction happens at
 * trace-recording time only — the live execution context still holds real
 * values, since it needs them to make actual HTTP calls.
 */
public final class Redactor {

    private static final Pattern SENSITIVE_KEY = Pattern.compile(
            "(?i)^(password|.*token.*|.*cookie.*|api[_-]?key|authorization|"
                    + "medical.*|.*ssn.*|national_insurance.*)$");

    private static final String MASK = "[REDACTED]";

    private Redactor() {
    }

    public static boolean isSensitiveKey(String key) {
        return key != null && SENSITIVE_KEY.matcher(key).matches();
    }

    /** Returns a deep-copied, redacted version of a JSON tree — safe to serialise into any report. */
    public static JsonNode redactTree(JsonNode node) {
        if (node == null) return null;
        JsonNode copy = node.deepCopy();
        redactInPlace(copy);
        return copy;
    }

    private static void redactInPlace(JsonNode node) {
        if (node instanceof ObjectNode obj) {
            Iterator<Map.Entry<String, JsonNode>> it = obj.fields();
            while (it.hasNext()) {
                Map.Entry<String, JsonNode> e = it.next();
                if (isSensitiveKey(e.getKey())) {
                    obj.put(e.getKey(), MASK);
                } else {
                    redactInPlace(e.getValue());
                }
            }
        } else if (node.isArray()) {
            node.forEach(Redactor::redactInPlace);
        }
    }

    public static String redactHeaders(Map<String, String> headers) {
        StringBuilder sb = new StringBuilder();
        headers.forEach((k, v) -> sb.append(k).append(": ")
                .append(isSensitiveKey(k) ? MASK : v).append("\n"));
        return sb.toString();
    }

    /** Masks a printed scalar if the last path segment looks sensitive (e.g. "...accessToken"). */
    public static String redactIfSensitivePath(String dottedPath, String value) {
        String lastSegment = dottedPath.replaceAll(".*[.\\[]", "");
        return isSensitiveKey(lastSegment) ? MASK : value;
    }
}
