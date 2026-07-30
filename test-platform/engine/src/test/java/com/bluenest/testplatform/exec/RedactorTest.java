package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.VariableScope;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RedactorTest {

    @Test
    void redactsKnownSensitiveKeysButKeepsOthers() {
        ObjectNode root = VariableScope.newObject();
        root.put("password", "hunter2");
        root.put("accessToken", "abc.def.ghi");
        root.put("refresh_token", "xyz");
        root.put("Authorization", "Bearer abc");
        root.put("email", "person@example.com");
        root.putObject("user").put("apiKey", "sekrit");

        JsonNode redacted = Redactor.redactTree(root);

        assertEquals("[REDACTED]", redacted.get("password").asText());
        assertEquals("[REDACTED]", redacted.get("accessToken").asText());
        assertEquals("[REDACTED]", redacted.get("refresh_token").asText());
        assertEquals("[REDACTED]", redacted.get("Authorization").asText());
        assertEquals("[REDACTED]", redacted.get("user").get("apiKey").asText());
        assertEquals("person@example.com", redacted.get("email").asText(), "non-sensitive fields must pass through");
    }

    @Test
    void printRedactsBySensitiveLastPathSegment() {
        assertEquals("[REDACTED]", Redactor.redactIfSensitivePath("session.accessToken", "real-token-value"));
        assertEquals("actual-role", Redactor.redactIfSensitivePath("session.role", "actual-role"));
    }

    @Test
    void originalTreeIsNotMutated() {
        ObjectNode root = VariableScope.newObject();
        root.put("password", "hunter2");
        Redactor.redactTree(root);
        assertEquals("hunter2", root.get("password").asText(), "redaction must operate on a deep copy");
    }
}
