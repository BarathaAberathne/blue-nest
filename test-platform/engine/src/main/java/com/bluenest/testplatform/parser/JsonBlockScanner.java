package com.bluenest.testplatform.parser;

import java.util.List;

/**
 * Scans forward from a line index looking for a balanced {@code { ... }} or
 * {@code [ ... ]} JSON block (brace/bracket-depth aware, string-aware so
 * literal braces inside JSON string values don't confuse the scan). Used to
 * find the request/util-input/output body that follows a REST/Call/Output
 * statement line.
 */
final class JsonBlockScanner {

    record Result(String json, int linesConsumed) {
    }

    private JsonBlockScanner() {
    }

    static Result scan(List<String> lines, int start) {
        int i = start;
        while (i < lines.size() && lines.get(i).isBlank()) {
            i++;
        }
        if (i >= lines.size()) {
            return new Result(null, i - start);
        }
        String firstLine = lines.get(i).stripLeading();
        // A bare "${varName}" line is a whole-object passthrough body (e.g. PUT-ing
        // back exactly what a prior GET/util returned) — not balanced-brace JSON, so
        // it's returned verbatim as its own one-line "block" rather than scanned.
        if (firstLine.strip().matches("\\$\\{[A-Za-z_][A-Za-z0-9_.\\[\\]]*}")) {
            return new Result(firstLine.strip(), i - start + 1);
        }
        if (!(firstLine.startsWith("{") || firstLine.startsWith("["))) {
            return new Result(null, i - start);
        }

        StringBuilder sb = new StringBuilder();
        boolean inString = false;
        boolean escape = false;
        int depth = 0;
        boolean started = false;
        int consumedTo = i;

        for (; i < lines.size(); i++) {
            String line = lines.get(i);
            for (int c = 0; c < line.length(); c++) {
                char ch = line.charAt(c);
                sb.append(ch);
                if (escape) {
                    escape = false;
                    continue;
                }
                if (ch == '\\' && inString) {
                    escape = true;
                    continue;
                }
                if (ch == '"') {
                    inString = !inString;
                    continue;
                }
                if (inString) {
                    continue;
                }
                if (ch == '{' || ch == '[') {
                    depth++;
                    started = true;
                } else if (ch == '}' || ch == ']') {
                    depth--;
                }
            }
            sb.append('\n');
            consumedTo = i + 1;
            if (started && depth == 0) {
                break;
            }
        }
        return new Result(sb.toString().trim(), consumedTo - start);
    }
}
