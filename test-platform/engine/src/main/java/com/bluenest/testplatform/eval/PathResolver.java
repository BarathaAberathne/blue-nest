package com.bluenest.testplatform.eval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Navigates a dotted/indexed path (e.g. {@code loginResponse.body.user.role},
 * {@code items[0].name}) over a {@link JsonNode} tree. Every segment must
 * exist — there is no silent {@code null}-on-missing behaviour, per spec §12.
 */
public final class PathResolver {

    private static final Pattern SEGMENT = Pattern.compile("([A-Za-z_][A-Za-z0-9_]*)|\\[(\\d+)]");

    private PathResolver() {
    }

    public static JsonNode resolve(JsonNode root, String dottedPath) {
        Matcher m = SEGMENT.matcher(dottedPath);
        JsonNode current = root;
        String traversed = "";
        boolean first = true;
        while (m.find()) {
            String name = m.group(1);
            String index = m.group(2);
            if (name != null) {
                traversed = first ? name : traversed + "." + name;
                if (current == null || current.isMissingNode() || !current.has(name)) {
                    throw new UndefinedVariableException("Undefined variable/path: '" + traversed
                            + "' (in expression '" + dottedPath + "')");
                }
                current = current.get(name);
            } else {
                int idx = Integer.parseInt(index);
                traversed = traversed + "[" + idx + "]";
                if (current == null || !current.isArray() || idx >= current.size()) {
                    throw new UndefinedVariableException("Undefined variable/path: '" + traversed
                            + "' (in expression '" + dottedPath + "')");
                }
                current = current.get(idx);
            }
            first = false;
        }
        return current == null ? MissingNode.getInstance() : current;
    }
}
