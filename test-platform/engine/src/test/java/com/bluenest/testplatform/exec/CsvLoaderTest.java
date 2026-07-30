package com.bluenest.testplatform.exec;

import com.fasterxml.jackson.databind.node.ArrayNode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CsvLoaderTest {

    @Test
    void parsesHeaderAndRowsIntoObjects() {
        ArrayNode array = CsvLoader.toJsonArray(List.of(
                "email,password,description",
                "a@example.com,,empty password",
                "b@example.com,wrong,wrong password"));
        assertEquals(2, array.size());
        assertEquals("a@example.com", array.get(0).get("email").asText());
        assertEquals("", array.get(0).get("password").asText());
        assertEquals("wrong password", array.get(1).get("description").asText());
    }

    @Test
    void blankLinesAreSkipped() {
        ArrayNode array = CsvLoader.toJsonArray(List.of("a,b", "1,2", "", "3,4"));
        assertEquals(2, array.size());
    }

    @Test
    void emptyInputProducesEmptyArray() {
        assertEquals(0, CsvLoader.toJsonArray(List.of()).size());
    }
}
