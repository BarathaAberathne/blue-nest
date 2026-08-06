package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.ExpressionEvaluator;
import com.bluenest.testplatform.eval.TemplateSubstitutor;
import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.model.Command;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.model.ScriptType;
import com.bluenest.testplatform.model.Statement;
import com.bluenest.testplatform.model.StepTrace;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jayway.jsonpath.JsonPath;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The bnrest interpreter. Walks a {@link Script}'s explicit AST and executes
 * it against an {@link ExecutionContext}/{@link VariableScope} — this is the
 * ONLY place a script's meaning is realised as behaviour; nothing here calls
 * into a general-purpose scripting/eval runtime (spec §5 "Do not allow
 * arbitrary code execution from test files").
 */
public final class Executor {

    private static final Pattern ID_IN_PATH = Pattern.compile("[0-9a-fA-F]{24}");

    /**
     * Executes one script's setup+body+teardown against the given scope;
     * returns its Output value, if any. Teardown always runs, even if a
     * body statement throws — {@code finally} semantics, not a plain
     * sequential loop — because cleanup/restore steps (e.g. putting a
     * shared fixture like the Harrow branch back the way it was) must not
     * be skipped just because the assertion above them failed.
     */
    public JsonNode runScript(Script script, ExecutionContext ctx, VariableScope scope) {
        JsonNode[] output = new JsonNode[1];
        for (Statement s : script.setup) executeStatement(s, script, ctx, scope, output);

        RuntimeException bodyFailure = null;
        try {
            for (Statement s : script.body) executeStatement(s, script, ctx, scope, output);
        } catch (RuntimeException e) {
            bodyFailure = e;
        }

        for (Statement s : script.teardown) {
            try {
                executeStatement(s, script, ctx, scope, output);
            } catch (RuntimeException teardownFailure) {
                if (bodyFailure == null) {
                    bodyFailure = teardownFailure;
                } else {
                    bodyFailure.addSuppressed(teardownFailure);
                }
            }
        }

        if (bodyFailure != null) {
            throw bodyFailure;
        }
        return output[0];
    }

    private void executeStatement(Statement s, Script script, ExecutionContext ctx,
                                   VariableScope scope, JsonNode[] output) {
        try {
            dispatch(s, script, ctx, scope, output);
        } catch (RuntimeException e) {
            if (s.catchError) {
                ctx.result.steps.add(errorTrace(ctx, s, e));
                return; // swallow — this statement is explicitly allowed to fail without stopping the case
            }
            throw e;
        }
    }

    private void dispatch(Statement s, Script script, ExecutionContext ctx,
                           VariableScope scope, JsonNode[] output) {
        if (Command.isRestVerb(s.command)) {
            executeRest(s, script, ctx, scope);
            return;
        }
        switch (s.command) {
            case CALL -> executeCall(s, script, ctx, scope);
            case OUTPUT -> output[0] = s.exprText != null ? scope.resolve(s.exprText) : evalJsonTemplate(s.bodyJson, scope, ctx);
            case INCLUDE -> executeInclude(s, script, ctx, scope, output);
            case DEPENDS_ON -> { /* declarative only — validated by the dependency graph */ }
            case SET, EVAL -> {
                JsonNode value = ExpressionEvaluator.evaluate(s.exprText, scope, ctx.secretResolver);
                scope.set(s.intoVar, value);
            }
            case APPLY_JSON -> applyJson(s, scope, ctx);
            case COPY_JSON -> {
                JsonNode root = scope.getRoot(s.subjectVar);
                // The JSONPath expression itself may embed ${...} placeholders (e.g. a
                // filter like "$.data[?(@.slug=='${input.slug}')]") — substitute those
                // the same way a REST path/body would be, before handing it to Jayway.
                String jsonPathExpr = new TemplateSubstitutor(scope, ctx.secretResolver).substitute(s.args.get(0));
                JsonNode value;
                try {
                    // Full JSONPath (the same Jayway engine AssertJson uses) — not just
                    // PathResolver's dotted/array-index subset — so CopyJson can pull a
                    // single item out of a list by a filter predicate, e.g.
                    // "$.body.data[?(@.slug=='harrow')]" to find one branch among many.
                    // NOTE: write the filter WITHOUT a trailing "[0]" — Jayway does not
                    // support chaining an index after a filter predicate the way you'd
                    // expect (it silently returns an empty result); a filter naturally
                    // returns a list, so a single-element match is auto-unwrapped below.
                    Object raw = com.jayway.jsonpath.JsonPath.read(
                            VariableScope.mapper().writeValueAsString(root), jsonPathExpr);
                    if (raw instanceof java.util.List<?> list && list.size() == 1) {
                        raw = list.get(0);
                    }
                    value = VariableScope.mapper().valueToTree(raw);
                } catch (Exception e) {
                    throw new IllegalStateException("CopyJson: JSONPath '" + jsonPathExpr
                            + "' did not resolve against " + s.subjectVar + ": " + e.getMessage(), e);
                }
                scope.set(s.intoVar, value);
            }
            case REMOVE_JSON -> removeJson(s, scope);
            case LOAD_JSON -> loadJson(s, script, scope, ctx);
            case LOAD_CSV -> loadCsv(s, script, scope);
            case ASSERT -> {
                boolean ok = ExpressionEvaluator.evaluateBoolean(s.exprText, scope, ctx.secretResolver);
                if (!ok) {
                    ctx.result.failedAssertion = s.raw;
                    throw new AssertionFailedException("Assertion failed: " + s.exprText);
                }
            }
            case ASSERT_STATUS -> assertStatus(s, scope, ctx);
            case ASSERT_JSON -> assertJson(s, scope, ctx);
            case ASSERT_HEADER -> assertHeader(s, scope, ctx);
            case ASSERT_SCHEMA -> assertSchema(s, script, scope, ctx);
            case ASSERT_RESPONSE_TIME -> assertResponseTime(s, scope, ctx);
            case EXPECT_FAIL -> executeExpectFail(s, script, ctx, scope, output);
            case PRINT -> executePrint(s, scope, ctx);
            case WHEN -> {
                boolean cond = ExpressionEvaluator.evaluateBoolean(s.exprText, scope, ctx.secretResolver);
                if (cond) {
                    dispatch(s.inner, script, ctx, scope, output);
                }
            }
            default -> throw new IllegalStateException("Unhandled command in executor: " + s.command);
        }
    }

    // ---- REST -----------------------------------------------------------

    private static final Pattern WHOLE_VAR_BODY = Pattern.compile("^\\$\\{([A-Za-z_][A-Za-z0-9_.\\[\\]]*)}$");

    private void executeRest(Statement s, Script script, ExecutionContext ctx, VariableScope scope) {
        String method = Command.httpMethod(s.command);
        String path = new TemplateSubstitutor(scope, ctx.secretResolver).substitute(s.target);
        String body = resolveBody(s.bodyJson, scope, ctx);

        String normalizedUrl = ID_IN_PATH.matcher(path).replaceAll("{id}").replaceAll("\\?.*$", "");
        // allowDuplicateRequest (spec §13/§16) is a case-level opt-out: a case that
        // legitimately needs to repeat an identical write (e.g. proving idempotency)
        // declares it in front matter instead of the report flagging it as a bug.
        RequestLedger.Check dup = script.metadata.allowDuplicateRequest
                ? new RequestLedger.Check(false, null)
                : ctx.requestLedger.record(method, normalizedUrl, body,
                        ctx.caseId + "#step" + (ctx.stepCounter.get() + 1));

        String bearerToken = s.authVar != null ? scope.resolve(s.authVar).asText() : ctx.bearerToken;
        HttpResponseWrapper resp = ctx.httpClient.execute(method, path, body, bearerToken, ctx.correlationId);

        ObjectNode responseNode = VariableScope.newObject();
        responseNode.put("status", resp.status);
        responseNode.put("responseTimeMs", resp.responseTimeMs);
        ObjectNode headersNode = VariableScope.newObject();
        resp.headers.forEach(headersNode::put);
        responseNode.set("headers", headersNode);
        try {
            JsonNode bodyNode = resp.bodyRaw == null || resp.bodyRaw.isBlank()
                    ? VariableScope.mapper().nullNode()
                    : VariableScope.mapper().readTree(resp.bodyRaw);
            responseNode.set("body", bodyNode);
        } catch (IOException e) {
            responseNode.put("body", resp.bodyRaw); // non-JSON response — keep raw text rather than fail silently
        }

        if (s.intoVar != null) {
            scope.set(s.intoVar, responseNode);
        }

        StepTrace trace = ctx.newTrace();
        // `script` is whichever script is directly executing this statement — when
        // that's a Test Util (not the Case/Suite itself), tag the trace with it so
        // reporting/UI consumers can tell which reusable utility issued the
        // request, instead of every step looking like a bare case-level call.
        trace.utilId = script.metadata.type == ScriptType.TEST_UTIL ? script.metadata.id : null;
        trace.httpMethod = method;
        trace.normalizedUrl = normalizedUrl;
        trace.endpointTemplate = method + " " + normalizedUrl;
        trace.responseStatus = resp.status;
        trace.responseTimeMs = resp.responseTimeMs;
        trace.requestBodyHash = RequestLedger.hash(body);
        trace.result = "OK";
        trace.duplicateWarning = dup.isDuplicate();
        trace.duplicateOfStep = dup.duplicateOfStep();
        ctx.result.steps.add(trace);
    }

    // ---- Call / Include ---------------------------------------------------

    private void executeCall(Statement s, Script script, ExecutionContext ctx, VariableScope scope) {
        Script target = ctx.repository.resolveCallTarget(script, s.target);

        JsonNode inputPayload = (s.withJson && s.bodyJson != null) ? evalJsonTemplate(s.bodyJson, scope, ctx) : null;

        // Fixture scopes (spec §2): a Util declared suite/run-scoped runs ONCE
        // and its Output is reused by every subsequent caller in that scope —
        // this is what stops e.g. every case in a suite re-running its own login.
        // "Call Fresh ..." bypasses this for one specific invocation — needed
        // when the SAME credentials must genuinely re-execute (e.g. logging in
        // again to prove a role change took effect, where the cache would
        // otherwise silently hand back the stale pre-change token — found
        // migrating ROLE-TC-010).
        Map<String, JsonNode> cache = s.fresh ? null : switch (target.metadata.fixtureScope) {
            case SUITE -> ctx.suiteFixtureCache;
            case RUN -> ctx.runFixtureCache;
            case CASE -> null;
        };
        String cacheKey = target.id() + (inputPayload == null ? "" : ":" + inputPayload);
        if (cache != null && cache.containsKey(cacheKey)) {
            JsonNode cached = cache.get(cacheKey);
            if (s.intoVar != null) scope.set(s.intoVar, cached);
            return;
        }

        // Utility inputs must be explicitly passed (spec §12): a fresh, isolated
        // scope with ONLY the parsed "With Json" payload bound as `input` — no
        // chaining to the caller's case/suite variables.
        VariableScope utilScope = new VariableScope(null);
        if (inputPayload != null) {
            utilScope.set("input", inputPayload);
        }
        JsonNode outputValue;
        try {
            outputValue = runScript(target, ctx, utilScope);
        } catch (RuntimeException e) {
            if (s.catchError) {
                ctx.result.steps.add(errorTrace(ctx, s, e));
                return;
            }
            throw e;
        }
        JsonNode finalOutput = outputValue == null ? VariableScope.missing() : outputValue;
        if (cache != null) {
            cache.put(cacheKey, finalOutput);
        }
        if (s.intoVar != null) {
            scope.set(s.intoVar, finalOutput);
        }
    }

    private void executeInclude(Statement s, Script script, ExecutionContext ctx,
                                 VariableScope scope, JsonNode[] output) {
        Script target = ctx.repository.resolveCallTarget(script, s.target);
        // Include shares the CURRENT scope (true textual-splice semantics) — unlike Call, which isolates.
        for (Statement inner : target.body) {
            dispatch(inner, target, ctx, scope, output);
        }
    }

    // ---- Assertions -------------------------------------------------------

    private void assertStatus(Statement s, VariableScope scope, ExecutionContext ctx) {
        JsonNode status = scope.resolve(s.subjectVar + ".status");
        int expected = Integer.parseInt(s.args.get(0));
        if (status.asInt() != expected) {
            ctx.result.failedAssertion = s.raw;
            throw new AssertionFailedException("AssertStatus failed: expected " + expected
                    + " but got " + status.asInt() + " (" + s.raw + ")");
        }
    }

    private void assertJson(Statement s, VariableScope scope, ExecutionContext ctx) {
        JsonNode root = scope.getRoot(s.subjectVar);
        String jsonPathExpr = new TemplateSubstitutor(scope, ctx.secretResolver).substitute(s.args.get(0));
        String op = s.args.get(1);
        String expectedLiteral = s.args.get(2);
        Object actual;
        try {
            actual = JsonPath.read(VariableScope.mapper().writeValueAsString(root), jsonPathExpr);
        } catch (Exception e) {
            throw new AssertionFailedException("AssertJson: JSONPath '" + jsonPathExpr
                    + "' did not resolve against " + s.subjectVar + ": " + e.getMessage());
        }
        // Jayway's ".length()" chained directly after a filter predicate is
        // unreliable (empirically returns a nonsense value, not the filtered
        // count — found during the Branch migration) — so write filters WITHOUT
        // ".length()" (just "$.data[?(@.slug=='x')]") and compare against a number
        // to mean "count of matches"; a numeric expected literal against a List
        // actual is resolved as the list's real size, computed in Java instead of
        // trusting Jayway's own function chaining.
        if (actual instanceof java.util.List<?> list) {
            if (isNumeric(expectedLiteral)) {
                actual = list.size();
            } else if (list.size() == 1) {
                actual = list.get(0);
            }
        }
        boolean pass = compareLiteral(actual, op, expectedLiteral);
        if (!pass) {
            ctx.result.failedAssertion = s.raw;
            throw new AssertionFailedException("AssertJson failed: " + s.subjectVar + " " + jsonPathExpr
                    + " " + op + " " + expectedLiteral + " (actual: " + actual + ")");
        }
    }

    private void assertHeader(Statement s, VariableScope scope, ExecutionContext ctx) {
        // Look the header up as a field on the headers object rather than via the
        // dotted-path resolver — header names contain hyphens ("Content-Type"),
        // which the path grammar can't express. Case-insensitive per HTTP.
        JsonNode headersNode = scope.resolve(s.subjectVar + ".headers");
        String wanted = s.args.get(0);
        JsonNode headerValue = headersNode.get(wanted);
        if (headerValue == null) {
            var names = headersNode.fieldNames();
            while (names.hasNext()) {
                String name = names.next();
                if (name.equalsIgnoreCase(wanted)) {
                    headerValue = headersNode.get(name);
                    break;
                }
            }
        }
        boolean pass = headerValue != null
                && compareLiteral(headerValue.asText(), s.args.get(1), s.args.get(2));
        if (!pass) {
            ctx.result.failedAssertion = s.raw;
            throw new AssertionFailedException("AssertHeader failed: " + s.raw
                    + (headerValue == null ? " (header not present)" : " (actual: " + headerValue.asText() + ")"));
        }
    }

    /**
     * Basic shape check (documented limitation — not full JSON-Schema, see
     * test-platform-architecture.md): the schema file is {@code {"required": ["a","b.c"]}},
     * and every listed dotted path must resolve on the subject.
     */
    private void assertSchema(Statement s, Script script, VariableScope scope, ExecutionContext ctx) {
        Path schemaPath = script.sourceFile.getParent().resolve(s.args.get(0)).normalize();
        JsonNode schema;
        try {
            schema = VariableScope.mapper().readTree(Files.readString(schemaPath));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read schema file " + schemaPath + ": " + e.getMessage(), e);
        }
        JsonNode root = scope.getRoot(s.subjectVar);
        for (JsonNode required : schema.get("required")) {
            String path = required.asText();
            try {
                com.bluenest.testplatform.eval.PathResolver.resolve(root, path);
            } catch (RuntimeException e) {
                ctx.result.failedAssertion = s.raw;
                throw new AssertionFailedException("AssertSchema failed: required field '" + path
                        + "' missing from " + s.subjectVar);
            }
        }
    }

    private void assertResponseTime(Statement s, VariableScope scope, ExecutionContext ctx) {
        JsonNode time = scope.resolve(s.subjectVar + ".responseTimeMs");
        boolean pass = compareLiteral(time.asLong(), s.args.get(0), s.args.get(1));
        if (!pass) {
            ctx.result.failedAssertion = s.raw;
            throw new AssertionFailedException("AssertResponseTime failed: " + s.raw + " (actual: " + time.asLong() + "ms)");
        }
    }

    private void executeExpectFail(Statement s, Script script, ExecutionContext ctx,
                                    VariableScope scope, JsonNode[] output) {
        boolean threw = false;
        try {
            dispatch(s.inner, script, ctx, scope, output);
        } catch (RuntimeException e) {
            threw = true;
        }
        if (!threw) {
            ctx.result.failedAssertion = s.raw;
            throw new AssertionFailedException("ExpectFail: wrapped statement was expected to fail but succeeded: "
                    + s.inner.raw);
        }
    }

    private void executePrint(Statement s, VariableScope scope, ExecutionContext ctx) {
        JsonNode value = ExpressionEvaluator.evaluate(s.exprText, scope, ctx.secretResolver);
        String text = Redactor.redactIfSensitivePath(s.exprText, value.asText());
        System.out.println("[bnrest] " + ctx.caseId + ": " + s.exprText + " = " + text);
    }

    // ---- JSON mutation helpers ---------------------------------------------

    private void applyJson(Statement s, VariableScope scope, ExecutionContext ctx) {
        JsonNode root = scope.getRoot(s.subjectVar);
        if (!(root instanceof ObjectNode obj)) {
            throw new IllegalStateException("ApplyJson requires an object variable: " + s.subjectVar);
        }
        JsonNode value = ExpressionEvaluator.evaluate(s.exprText, scope, ctx.secretResolver);
        setDottedField(obj, s.args.get(0), value);
    }

    private void removeJson(Statement s, VariableScope scope) {
        JsonNode root = scope.getRoot(s.subjectVar);
        if (!(root instanceof ObjectNode obj)) {
            throw new IllegalStateException("RemoveJson requires an object variable: " + s.subjectVar);
        }
        String path = s.args.get(0);
        int lastDot = path.lastIndexOf('.');
        if (lastDot < 0) {
            obj.remove(path);
        } else {
            JsonNode parent = com.bluenest.testplatform.eval.PathResolver.resolve(obj, path.substring(0, lastDot));
            if (parent instanceof ObjectNode parentObj) {
                parentObj.remove(path.substring(lastDot + 1));
            }
        }
    }

    private static void setDottedField(ObjectNode root, String dottedPath, JsonNode value) {
        int lastDot = dottedPath.lastIndexOf('.');
        if (lastDot < 0) {
            root.set(dottedPath, value);
            return;
        }
        JsonNode parent = com.bluenest.testplatform.eval.PathResolver.resolve(root, dottedPath.substring(0, lastDot));
        if (parent instanceof ObjectNode parentObj) {
            parentObj.set(dottedPath.substring(lastDot + 1), value);
        } else {
            throw new IllegalStateException("Cannot set '" + dottedPath + "' — parent is not an object");
        }
    }

    private void loadJson(Statement s, Script script, VariableScope scope, ExecutionContext ctx) {
        Path file = script.sourceFile.getParent().resolve(s.target).normalize();
        try {
            String raw = Files.readString(file, StandardCharsets.UTF_8);
            JsonNode node = evalJsonTemplate(raw, scope, ctx);
            scope.set(s.intoVar, node);
        } catch (IOException e) {
            throw new IllegalStateException("LoadJson: cannot read " + file + ": " + e.getMessage(), e);
        }
    }

    private void loadCsv(Statement s, Script script, VariableScope scope) {
        Path file = script.sourceFile.getParent().resolve(s.target).normalize();
        try {
            List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
            scope.set(s.intoVar, CsvLoader.toJsonArray(lines));
        } catch (IOException e) {
            throw new IllegalStateException("LoadCsv: cannot read " + file + ": " + e.getMessage(), e);
        }
    }

    // ---- shared helpers -----------------------------------------------------

    /**
     * A REST body that's ENTIRELY {@code ${varName}} (e.g. {@code ${harrow}}) is a
     * whole-object passthrough — used by round-trip tests that PUT back exactly
     * what a previous GET/util returned. Ordinary scalar interpolation (a
     * placeholder embedded inside a literal JSON object) still goes through
     * {@link TemplateSubstitutor} as usual.
     */
    private String resolveBody(String bodyJson, VariableScope scope, ExecutionContext ctx) {
        if (bodyJson == null) return null;
        Matcher whole = WHOLE_VAR_BODY.matcher(bodyJson.strip());
        if (whole.matches()) {
            JsonNode value = scope.resolve(whole.group(1));
            try {
                return VariableScope.mapper().writeValueAsString(value);
            } catch (IOException e) {
                throw new IllegalStateException("Cannot serialise " + whole.group(1) + " as a request body", e);
            }
        }
        return new TemplateSubstitutor(scope, ctx.secretResolver).substitute(bodyJson);
    }

    JsonNode evalJsonTemplate(String rawJsonTemplate, VariableScope scope, ExecutionContext ctx) {
        String substituted = new TemplateSubstitutor(scope, ctx.secretResolver).substitute(rawJsonTemplate);
        try {
            return VariableScope.mapper().readTree(substituted);
        } catch (IOException e) {
            throw new IllegalStateException("Invalid JSON after variable substitution: " + e.getMessage()
                    + "\n--- template ---\n" + rawJsonTemplate + "\n--- substituted ---\n" + substituted, e);
        }
    }

    private static boolean compareLiteral(Object actual, String op, String expectedLiteral) {
        Object expected = parseLiteral(expectedLiteral);
        if (actual instanceof Number an && expected instanceof Number en) {
            double a = an.doubleValue();
            double e = en.doubleValue();
            return switch (op) {
                case "==" -> a == e;
                case "!=" -> a != e;
                case ">" -> a > e;
                case ">=" -> a >= e;
                case "<" -> a < e;
                case "<=" -> a <= e;
                default -> throw new IllegalArgumentException("Unsupported operator: " + op);
            };
        }
        String a = String.valueOf(actual);
        String e = String.valueOf(expected);
        return switch (op) {
            case "==" -> a.equals(e);
            case "!=" -> !a.equals(e);
            // Case-insensitive, matching Hamcrest's containsStringIgnoringCase — the one
            // real need so far (asserting an error message names the right problem
            // without pinning its exact wording/casing).
            case "contains" -> a.toLowerCase().contains(e.toLowerCase());
            default -> throw new IllegalArgumentException("Operator '" + op + "' requires numeric operands");
        };
    }

    private static boolean isNumeric(String token) {
        return parseLiteral(token) instanceof Number;
    }

    private static Object parseLiteral(String token) {
        String t = token.trim();
        if (t.startsWith("\"") && t.endsWith("\"")) {
            return t.substring(1, t.length() - 1);
        }
        try {
            return Long.parseLong(t);
        } catch (NumberFormatException ignored) {
            // fall through
        }
        try {
            return Double.parseDouble(t);
        } catch (NumberFormatException ignored) {
            return t;
        }
    }

    private static StepTrace errorTrace(ExecutionContext ctx, Statement s, RuntimeException e) {
        StepTrace trace = ctx.newTrace();
        trace.result = "CAUGHT_ERROR";
        trace.endpointTemplate = s.raw;
        return trace;
    }
}
