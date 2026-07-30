package com.bluenest.testplatform.eval;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ExpressionEvaluatorTest {

    private final SecretResolver secrets = new SecretResolver(Map.of("MY_SECRET", "s3kr3t")::get);

    private VariableScope scopeWithLoginResponse() {
        VariableScope scope = new VariableScope(null);
        var mapper = VariableScope.mapper();
        var root = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.createObjectNode();
        var body = root.putObject("body");
        body.put("accessToken", "tok-123");
        body.putObject("user").put("role", "DIRECTOR");
        scope.set("loginResponse", root);
        return scope;
    }

    @Test
    void resolvesDottedPathsAndComparesEquality() {
        VariableScope scope = scopeWithLoginResponse();
        assertTrue(ExpressionEvaluator.evaluateBoolean(
                "loginResponse.body.accessToken != null", scope, secrets));
        assertTrue(ExpressionEvaluator.evaluateBoolean(
                "loginResponse.body.user.role == \"DIRECTOR\"", scope, secrets));
        assertFalse(ExpressionEvaluator.evaluateBoolean(
                "loginResponse.body.user.role == \"STAFF\"", scope, secrets));
    }

    @Test
    void supportsLogicalAndComparisonOperators() {
        VariableScope scope = new VariableScope(null);
        scope.setObject("n", 5);
        assertTrue(ExpressionEvaluator.evaluateBoolean("n > 3 && n < 10", scope, secrets));
        assertTrue(ExpressionEvaluator.evaluateBoolean("n >= 5", scope, secrets));
        assertFalse(ExpressionEvaluator.evaluateBoolean("n < 3 || n > 10", scope, secrets));
        assertTrue(ExpressionEvaluator.evaluateBoolean("!(n == 3)", scope, secrets));
    }

    @Test
    void undefinedVariableProducesClearError() {
        VariableScope scope = new VariableScope(null);
        var ex = assertThrows(UndefinedVariableException.class,
                () -> ExpressionEvaluator.evaluate("nope.notThere", scope, secrets));
        assertTrue(ex.getMessage().contains("nope"));
    }

    @Test
    void secretFunctionResolvesFromInjectedEnv() {
        VariableScope scope = new VariableScope(null);
        JsonNode result = ExpressionEvaluator.evaluate("secret(\"MY_SECRET\")", scope, secrets);
        assertEquals("s3kr3t", result.asText());
    }

    @Test
    void missingSecretThrowsRatherThanSilentlyResolvingEmpty() {
        VariableScope scope = new VariableScope(null);
        assertThrows(IllegalStateException.class,
                () -> ExpressionEvaluator.evaluate("secret(\"NOPE\")", scope, secrets));
    }

    @Test
    void randomAndTimestampProduceNumbers() {
        VariableScope scope = new VariableScope(null);
        assertTrue(ExpressionEvaluator.evaluate("random()", scope, secrets).isNumber());
        assertTrue(ExpressionEvaluator.evaluate("timestamp()", scope, secrets).isNumber());
    }

    @Test
    void numericTextComparesEqualToANumber() {
        // Defensive: a number that arrived as text (e.g. a JSON template that
        // accidentally quoted a numeric placeholder) must still compare equal.
        VariableScope scope = new VariableScope(null);
        scope.setObject("capacity", "10");
        assertTrue(ExpressionEvaluator.evaluateBoolean("capacity == 10", scope, secrets));
    }

    @Test
    void arrayIndexPathResolution() {
        VariableScope scope = new VariableScope(null);
        var array = VariableScope.mapper().createArrayNode();
        array.addObject().put("name", "first");
        array.addObject().put("name", "second");
        scope.set("items", array);
        assertEquals("first", ExpressionEvaluator.evaluate("items[0].name", scope, secrets).asText());
        assertEquals("second", ExpressionEvaluator.evaluate("items[1].name", scope, secrets).asText());
    }
}
