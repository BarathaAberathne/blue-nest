package com.bluenest.testplatform.parser;

import com.bluenest.testplatform.model.FixtureScope;
import com.bluenest.testplatform.model.Metadata;
import com.bluenest.testplatform.model.Mode;
import com.bluenest.testplatform.model.ScriptType;
import org.yaml.snakeyaml.Yaml;

import java.util.List;
import java.util.Map;

/**
 * Parses the YAML front matter block (spec §4) from a {@code .bnrest.md}
 * file's raw text and returns both the {@link Metadata} and the remaining
 * markdown body (everything after the closing {@code ---}).
 */
public final class FrontMatterParser {

    public record Result(Metadata metadata, String body) {
    }

    private final Yaml yaml = new Yaml();

    public Result parse(String rawText, String sourceFileForErrors) {
        String trimmed = rawText.stripLeading();
        if (!trimmed.startsWith("---")) {
            throw new IllegalArgumentException(
                    "Invalid metadata in " + sourceFileForErrors
                            + " — file must start with a YAML front-matter block delimited by '---'");
        }
        int firstDelim = trimmed.indexOf("---");
        int secondDelim = trimmed.indexOf("\n---", firstDelim + 3);
        if (secondDelim < 0) {
            throw new IllegalArgumentException(
                    "Invalid metadata in " + sourceFileForErrors
                            + " — unterminated front-matter block (missing closing '---')");
        }
        String yamlText = trimmed.substring(firstDelim + 3, secondDelim).trim();
        int bodyStart = trimmed.indexOf('\n', secondDelim + 4);
        String body = bodyStart >= 0 ? trimmed.substring(bodyStart + 1) : "";

        Map<String, Object> map;
        try {
            map = yaml.load(yamlText);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Invalid metadata in " + sourceFileForErrors + " — YAML parse error: " + e.getMessage(), e);
        }
        if (map == null) {
            map = Map.of();
        }

        Metadata m = new Metadata();
        m.id = str(map, "id");
        m.number = str(map, "number");
        String typeLabel = str(map, "type");
        m.type = typeLabel == null ? null : ScriptType.fromLabel(typeLabel);
        m.title = str(map, "title");
        m.owner = str(map, "owner");
        m.mode = Mode.fromLabel(str(map, "mode"));
        m.status = str(map, "status") == null ? "Active" : str(map, "status");
        m.tags = strList(map, "tags");
        m.dependsOn = strList(map, "dependsOn");
        m.uses = strList(map, "uses");
        m.fixtureScope = FixtureScope.fromLabel(str(map, "fixtureScope"));
        Object timeout = map.get("timeoutSeconds");
        m.timeoutSeconds = timeout == null ? 30 : ((Number) timeout).intValue();
        Object allowDup = map.get("allowDuplicateRequest");
        m.allowDuplicateRequest = allowDup != null && (Boolean) allowDup;
        m.dataFile = str(map, "dataFile");

        m.validateRequiredFields(sourceFileForErrors);
        return new Result(m, body);
    }

    @SuppressWarnings("unchecked")
    private static List<String> strList(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return List.of();
        if (v instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        throw new IllegalArgumentException("Field '" + key + "' must be a YAML list");
    }

    private static String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v == null ? null : String.valueOf(v);
    }
}
