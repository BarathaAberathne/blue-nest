package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.eval.VariableScope;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

/**
 * A minimal CSV parser (documented limitation — no quoted-comma escaping,
 * see test-platform-architecture.md) used by {@code LoadCsv} and by the
 * data-driven case runner ({@code dataFile} front-matter field).
 */
public final class CsvLoader {

    private CsvLoader() {
    }

    public static ArrayNode toJsonArray(List<String> lines) {
        ArrayNode array = VariableScope.mapper().createArrayNode();
        if (lines.isEmpty()) return array;
        String[] headers = lines.get(0).split(",", -1);
        for (int i = 1; i < lines.size(); i++) {
            if (lines.get(i).isBlank()) continue;
            String[] cells = lines.get(i).split(",", -1);
            ObjectNode row = VariableScope.mapper().createObjectNode();
            for (int c = 0; c < headers.length && c < cells.length; c++) {
                row.put(headers[c].trim(), cells[c].trim());
            }
            array.add(row);
        }
        return array;
    }

    public static List<JsonNode> rows(java.nio.file.Path csvFile) {
        try {
            List<String> lines = java.nio.file.Files.readAllLines(csvFile);
            ArrayNode array = toJsonArray(lines);
            return java.util.stream.StreamSupport.stream(array.spliterator(), false).toList();
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Cannot read CSV " + csvFile + ": " + e.getMessage(), e);
        }
    }
}
