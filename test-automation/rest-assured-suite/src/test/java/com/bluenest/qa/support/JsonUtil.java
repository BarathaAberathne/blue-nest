package com.bluenest.qa.support;

import java.util.List;
import java.util.Map;

/**
 * Single, reviewed home for the unchecked casts that reading nested JSON out
 * of a REST-Assured {@code JsonPath} genuinely requires (an {@code Object}
 * value known — from the API contract, not guessed — to actually be a
 * {@code Map}/{@code List<Map>}). Suite classes should never declare a raw
 * {@code Map}/{@code List<Map>} or their own {@code @SuppressWarnings}
 * themselves; call these instead, so every unsafe cast in the whole suite is
 * grep-able in one file.
 */
public final class JsonUtil {

    private JsonUtil() {
    }

    /** Casts a JSON object value (already retrieved, e.g. via {@code map.get(key)}) to a typed map. */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> asMap(Object value) {
        return (Map<String, Object>) value;
    }

    /** Casts a JSON array value (already retrieved, e.g. via {@code map.get(key)}) to a typed list of maps. */
    @SuppressWarnings("unchecked")
    public static List<Map<String, Object>> asMapList(Object value) {
        return (List<Map<String, Object>>) value;
    }
}
