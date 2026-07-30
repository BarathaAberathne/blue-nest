package com.bluenest.testplatform.parser;

import com.bluenest.testplatform.model.Command;
import com.bluenest.testplatform.model.Statement;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns a list of raw script lines (already extracted from a single fenced
 * {@code ```bnrest} block, or a Setup/Teardown sub-section of one) into an
 * explicit {@link Statement} AST. This is the only place raw text is
 * interpreted — it recognises a fixed, closed grammar (spec §5) and throws a
 * {@link ParseException} for anything it doesn't recognise. There is no
 * fallback that executes unrecognised text.
 */
public final class StatementParser {

    public static final class ParseException extends RuntimeException {
        public ParseException(String message) {
            super(message);
        }
    }

    private final List<String> lines;
    private final String sourceFile;
    private int pos;

    public StatementParser(List<String> lines, String sourceFile) {
        this.lines = lines;
        this.sourceFile = sourceFile;
    }

    public List<Statement> parseAll() {
        List<Statement> out = new ArrayList<>();
        while (pos < lines.size()) {
            skipBlankAndComments();
            if (pos >= lines.size()) break;
            out.add(parseOne());
        }
        return out;
    }

    private void skipBlankAndComments() {
        while (pos < lines.size()) {
            String t = lines.get(pos).strip();
            if (t.isEmpty() || t.startsWith("#")) {
                pos++;
            } else {
                break;
            }
        }
    }

    private Statement parseOne() {
        int lineNo = pos + 1;
        String raw = lines.get(pos).strip();
        pos++;

        List<String> tokens = tokenize(raw);
        if (tokens.isEmpty()) {
            throw err(lineNo, raw, "empty statement");
        }

        // Strip a single Given/When/Then/And alias UNLESS this is the genuine
        // "When <expr>" conditional-guard form (spec §2/§5): that's only true
        // when the token after "When" is NOT itself a recognised command.
        String first = tokens.get(0);
        if (Command.isBddAlias(first)) {
            boolean guardForm = first.equals("When")
                    && (tokens.size() < 2 || Command.lookup(tokens.get(1)) == null);
            if (!guardForm) {
                tokens = tokens.subList(1, tokens.size());
                if (tokens.isEmpty()) {
                    throw err(lineNo, raw, "'" + first + "' must be followed by a command");
                }
                first = tokens.get(0);
            }
        }

        Command cmd = Command.lookup(first);
        if (cmd == null) {
            // Genuine "When <expr>" guard — the whole remainder is the condition,
            // and it wraps the NEXT parsed statement.
            if (first.equals("When") || raw.startsWith("When ")) {
                String exprText = raw.substring(raw.indexOf("When") + 4).strip();
                skipBlankAndComments();
                if (pos >= lines.size()) {
                    throw err(lineNo, raw, "'When <expr>' guard has no following statement to guard");
                }
                Statement guard = new Statement(Command.WHEN, lineNo, raw);
                guard.exprText = exprText;
                guard.inner = parseOne();
                return guard;
            }
            throw err(lineNo, raw, "unknown command '" + first + "'");
        }

        return build(cmd, tokens, lineNo, raw);
    }

    private Statement build(Command cmd, List<String> tokens, int lineNo, String raw) {
        Statement s = new Statement(cmd, lineNo, raw);
        int i = 1;

        if (cmd == Command.CALL) {
            // Order-independent: "Call CatchError Fresh ..." or "Call Fresh CatchError ...".
            boolean consumed = true;
            while (consumed && i < tokens.size()) {
                consumed = false;
                if (tokens.get(i).equals("CatchError")) {
                    s.catchError = true;
                    i++;
                    consumed = true;
                } else if (tokens.get(i).equals("Fresh")) {
                    s.fresh = true;
                    i++;
                    consumed = true;
                }
            }
        }

        switch (cmd) {
            case GET, POST, CREATE, PUT, PATCH, MODIFY, DELETE, QUERY, BATCH -> {
                if (i < tokens.size() && tokens.get(i).equals("CatchError")) {
                    s.catchError = true;
                    i++;
                }
                if (i >= tokens.size()) {
                    throw err(lineNo, raw, cmd + " requires a path");
                }
                s.target = tokens.get(i++);
                i = consumeInto(tokens, i, s);
                if (i < tokens.size() && tokens.get(i).equals("Using") && i + 1 < tokens.size()) {
                    s.authVar = tokens.get(i + 1);
                    i += 2;
                }
                attachOptionalBody(s);
            }
            case CALL -> {
                if (i >= tokens.size()) {
                    throw err(lineNo, raw, "Call requires a target script path");
                }
                s.target = tokens.get(i++);
                while (i < tokens.size()) {
                    if (tokens.get(i).equals("With") && i + 1 < tokens.size() && tokens.get(i + 1).equals("Json")) {
                        s.withJson = true;
                        i += 2;
                    } else if (tokens.get(i).equals("Into") && i + 1 < tokens.size()) {
                        s.intoVar = tokens.get(i + 1);
                        i += 2;
                    } else {
                        throw err(lineNo, raw, "unexpected token '" + tokens.get(i) + "' in Call statement");
                    }
                }
                if (s.withJson) {
                    attachOptionalBody(s);
                }
            }
            case OUTPUT -> {
                if (i < tokens.size()) {
                    // Bare-variable passthrough ("Output branch") — returns that
                    // variable's value unchanged (nested objects/arrays included),
                    // since JSON-template substitution only handles scalar fields.
                    s.exprText = tokens.get(i);
                } else {
                    attachOptionalBody(s);
                }
            }
            case INCLUDE -> {
                if (i >= tokens.size()) throw err(lineNo, raw, "Include requires a file path");
                s.target = tokens.get(i);
            }
            case DEPENDS_ON -> {
                if (i >= tokens.size()) throw err(lineNo, raw, "DependsOn requires a test id");
                s.target = tokens.get(i);
            }
            case SET, EVAL -> parseSetOrEval(s, tokens, lineNo, raw);
            case APPLY_JSON -> {
                requireArgs(tokens, 4, lineNo, raw, "ApplyJson <var> <jsonPath> = <expr>");
                s.subjectVar = tokens.get(1);
                s.args.add(tokens.get(2));
                int eq = tokens.indexOf("=");
                if (eq < 0) throw err(lineNo, raw, "ApplyJson requires '=' before the expression");
                s.exprText = String.join(" ", tokens.subList(eq + 1, tokens.size()));
            }
            case COPY_JSON -> {
                requireArgs(tokens, 5, lineNo, raw, "CopyJson <var> <jsonPath> Into <destVar>");
                s.subjectVar = tokens.get(1);
                // Same multi-condition-filter quoting convention as AssertJson (see
                // its case below) — a quoted JSONPath must be unwrapped before use.
                s.args.add(unquoteIfQuoted(tokens.get(2)));
                if (!tokens.get(3).equals("Into")) throw err(lineNo, raw, "CopyJson requires 'Into <destVar>'");
                s.intoVar = tokens.get(4);
            }
            case REMOVE_JSON -> {
                requireArgs(tokens, 3, lineNo, raw, "RemoveJson <var> <jsonPath>");
                s.subjectVar = tokens.get(1);
                s.args.add(tokens.get(2));
            }
            case LOAD_JSON, LOAD_CSV -> {
                requireArgs(tokens, 4, lineNo, raw, cmd + " <file> Into <var>");
                s.target = tokens.get(1);
                if (!tokens.get(2).equals("Into")) throw err(lineNo, raw, cmd + " requires 'Into <var>'");
                s.intoVar = tokens.get(3);
            }
            case ASSERT -> {
                if (tokens.size() < 2) throw err(lineNo, raw, "Assert requires an expression");
                s.exprText = String.join(" ", tokens.subList(1, tokens.size()));
            }
            case ASSERT_STATUS -> {
                requireArgs(tokens, 3, lineNo, raw, "AssertStatus <var> <code>");
                s.subjectVar = tokens.get(1);
                s.args.add(tokens.get(2));
            }
            case ASSERT_JSON -> {
                requireArgs(tokens, 5, lineNo, raw, "AssertJson <var> <jsonPath> <op> <value...>");
                s.subjectVar = tokens.get(1);
                // A JSONPath filter often needs spaces of its own (multi-condition
                // filters, string literals like 'Zero Cap Test') — wrap it in double
                // quotes to keep it one token (the tokenizer already tracks quoted
                // spans); unquoted paths (the common single-condition case) still work.
                s.args.add(unquoteIfQuoted(tokens.get(2)));
                s.args.add(tokens.get(3));
                s.args.add(String.join(" ", tokens.subList(4, tokens.size())));
            }
            case ASSERT_HEADER -> {
                requireArgs(tokens, 5, lineNo, raw, "AssertHeader <var> <headerName> <op> <value>");
                s.subjectVar = tokens.get(1);
                s.args.add(tokens.get(2));
                s.args.add(tokens.get(3));
                s.args.add(String.join(" ", tokens.subList(4, tokens.size())));
            }
            case ASSERT_SCHEMA -> {
                requireArgs(tokens, 3, lineNo, raw, "AssertSchema <var> <schemaFile>");
                s.subjectVar = tokens.get(1);
                s.args.add(tokens.get(2));
            }
            case ASSERT_RESPONSE_TIME -> {
                requireArgs(tokens, 4, lineNo, raw, "AssertResponseTime <var> <op> <ms>");
                s.subjectVar = tokens.get(1);
                s.args.add(tokens.get(2));
                s.args.add(tokens.get(3));
            }
            case EXPECT_FAIL -> {
                if (tokens.size() < 2) throw err(lineNo, raw, "ExpectFail requires a wrapped statement");
                String remainder = raw.substring(raw.indexOf("ExpectFail") + "ExpectFail".length()).strip();
                // The wrapped statement may itself need a following JSON body block (e.g.
                // ExpectFail Call ... With Json Into x), so it must see the REST of this
                // parser's lines, not just its own line in isolation.
                List<String> combined = new ArrayList<>();
                combined.add(remainder);
                combined.addAll(lines.subList(pos, lines.size()));
                StatementParser nested = new StatementParser(combined, sourceFile);
                s.inner = nested.parseOne();
                pos += (nested.pos - 1); // account for any extra lines the nested parse consumed
            }
            case PRINT -> {
                if (tokens.size() < 2) throw err(lineNo, raw, "Print requires an expression");
                s.exprText = String.join(" ", tokens.subList(1, tokens.size()));
            }
            case SETUP, TEARDOWN -> {
                // Phase markers are handled by ScriptParser before statements
                // reach here; encountering one mid-body is a structural error.
                throw err(lineNo, raw, cmd + " must be a section heading, not an inline statement");
            }
            case WHEN -> throw err(lineNo, raw, "unreachable: When guard handled in parseOne()");
        }
        return s;
    }

    private void parseSetOrEval(Statement s, List<String> tokens, int lineNo, String raw) {
        int eq = tokens.indexOf("=");
        if (eq > 0) {
            s.intoVar = tokens.get(1);
            s.exprText = String.join(" ", tokens.subList(eq + 1, tokens.size()));
            return;
        }
        int into = tokens.indexOf("Into");
        if (into > 0) {
            s.exprText = String.join(" ", tokens.subList(1, into));
            if (into + 1 >= tokens.size()) throw err(lineNo, raw, s.command + " 'Into' requires a variable name");
            s.intoVar = tokens.get(into + 1);
            return;
        }
        throw err(lineNo, raw, s.command + " requires '<var> = <expr>' or '<expr> Into <var>'");
    }

    private int consumeInto(List<String> tokens, int i, Statement s) {
        if (i < tokens.size() && tokens.get(i).equals("Into") && i + 1 < tokens.size()) {
            s.intoVar = tokens.get(i + 1);
            return i + 2;
        }
        return i;
    }

    private void attachOptionalBody(Statement s) {
        JsonBlockScanner.Result r = JsonBlockScanner.scan(lines, pos);
        if (r.json() != null) {
            s.bodyJson = r.json();
            pos += r.linesConsumed();
        }
    }

    private void requireArgs(List<String> tokens, int min, int lineNo, String raw, String usage) {
        if (tokens.size() < min) {
            throw err(lineNo, raw, "expected: " + usage);
        }
    }

    private static String unquoteIfQuoted(String token) {
        if (token.length() >= 2 && token.startsWith("\"") && token.endsWith("\"")) {
            return token.substring(1, token.length() - 1);
        }
        return token;
    }

    /** Splits on whitespace but keeps quoted substrings (for string literals in expressions) intact. */
    static List<String> tokenize(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
                cur.append(c);
            } else if (Character.isWhitespace(c) && !inQuotes) {
                if (cur.length() > 0) {
                    out.add(cur.toString());
                    cur.setLength(0);
                }
            } else {
                cur.append(c);
            }
        }
        if (cur.length() > 0) out.add(cur.toString());
        return out;
    }

    private ParseException err(int lineNo, String raw, String message) {
        return new ParseException(sourceFile + ":" + lineNo + ": " + message + " (in '" + raw + "')");
    }
}
