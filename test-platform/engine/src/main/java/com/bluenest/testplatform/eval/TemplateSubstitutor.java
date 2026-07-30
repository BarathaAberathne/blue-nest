package com.bluenest.testplatform.eval;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves {@code ${var.path}} / {@code ${secret:NAME}} placeholders inside
 * raw JSON template text (request bodies, Call inputs, Output payloads).
 * Placeholders always sit inside an existing JSON string's quotes in the
 * source script (see the spec's own examples), so substitution inserts the
 * resolved value's escaped text content — it never adds its own quoting.
 */
public final class TemplateSubstitutor {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\$\\{([^}]+)}");

    private final VariableScope scope;
    private final SecretResolver secretResolver;

    public TemplateSubstitutor(VariableScope scope, SecretResolver secretResolver) {
        this.scope = scope;
        this.secretResolver = secretResolver;
    }

    public String substitute(String template) {
        if (template == null) return null;
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        int last = 0;
        while (m.find()) {
            out.append(template, last, m.start());
            String ref = m.group(1).trim();
            out.append(resolveOne(ref));
            last = m.end();
        }
        out.append(template.substring(last));
        return out.toString();
    }

    private String resolveOne(String ref) {
        if (ref.startsWith("secret:")) {
            return jsonEscape(secretResolver.resolve(ref.substring("secret:".length()).trim()));
        }
        // Delegates to the same restricted evaluator Assert/Set use, so ${random()},
        // ${timestamp()}, ${secret(name)}, and plain dotted paths all work identically
        // inside a JSON template — not just inside Assert/Set expressions.
        JsonNode value;
        try {
            value = ExpressionEvaluator.evaluate(ref, scope, secretResolver);
        } catch (UndefinedVariableException e) {
            // A response field genuinely absent (e.g. a REST response's optional
            // field, like a staff record's user_id when no login was requested)
            // is not the same class of error as a typo'd variable name in an
            // Assert/Set expression — those still throw normally. Template
            // substitution specifically tolerates a missing FINAL field so an
            // Output/request body can be built even when an optional upstream
            // field wasn't present (found migrating STAFF-UTIL-001).
            return "null";
        }
        if (value.isNull() || value.isMissingNode()) return "null";
        if (value.isTextual()) return jsonEscape(value.asText());
        return value.asText();
    }

    private static String jsonEscape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
