package com.bluenest.testplatform.eval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.HashMap;
import java.util.Map;

/**
 * An isolated execution context (spec §12): a case's own variables, chained
 * to its parent (suite, then run) scope. Lookups fall through to the parent
 * when not found locally; writes always land in the local (innermost) map —
 * a case can never mutate its suite/run parent's variables, which is what
 * keeps {@code suite}/{@code run} fixture scopes safe to share.
 */
public final class VariableScope {

    private final VariableScope parent;
    private final Map<String, JsonNode> values = new HashMap<>();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public VariableScope(VariableScope parent) {
        this.parent = parent;
    }

    public void set(String name, JsonNode value) {
        values.put(name, value);
    }

    public void setObject(String name, Object value) {
        set(name, MAPPER.valueToTree(value));
    }

    /** Root variable lookup only (e.g. resolving "loginResponse" before navigating ".body.x"). */
    public JsonNode getRoot(String name) {
        if (values.containsKey(name)) {
            return values.get(name);
        }
        if (parent != null) {
            return parent.getRoot(name);
        }
        return null;
    }

    public boolean hasRoot(String name) {
        return values.containsKey(name) || (parent != null && parent.hasRoot(name));
    }

    /** Resolves a full dotted path like "loginResponse.body.accessToken" against this scope. */
    public JsonNode resolve(String dottedPath) {
        int dot = dottedPath.indexOf('.');
        int bracket = dottedPath.indexOf('[');
        int cut = (dot < 0) ? bracket : (bracket < 0 ? dot : Math.min(dot, bracket));
        String rootName = cut < 0 ? dottedPath : dottedPath.substring(0, cut);
        String rest = cut < 0 ? "" : dottedPath.substring(cut);

        JsonNode root = getRoot(rootName);
        if (root == null) {
            throw new UndefinedVariableException("Undefined variable: '" + rootName
                    + "' (in expression '" + dottedPath + "')");
        }
        if (rest.isEmpty()) {
            return root;
        }
        String rewired = rest.startsWith(".") ? rest.substring(1) : rest;
        return PathResolver.resolve(root, rewired);
    }

    public static ObjectNode newObject() {
        return MAPPER.createObjectNode();
    }

    public static JsonNode missing() {
        return MissingNode.getInstance();
    }

    public static ObjectMapper mapper() {
        return MAPPER;
    }
}
