package com.bluenest.testplatform.eval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.BooleanNode;
import com.fasterxml.jackson.databind.node.NullNode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A restricted, allowlisted expression evaluator (spec §5/§12). Grammar:
 *
 * <pre>
 *   orExpr    := andExpr ( '||' andExpr )*
 *   andExpr   := equality ( '&&' equality )*
 *   equality  := comparison ( ('=='|'!=') comparison )?
 *   comparison:= unary ( ('>'|'>='|'<'|'<=') unary )?
 *   unary     := '!' unary | primary
 *   primary   := 'true' | 'false' | 'null' | number | "string" | funcCall | path | '(' orExpr ')'
 *   funcCall  := ('random'|'timestamp'|'secret') '(' [arg] ')'
 * </pre>
 *
 * There is no identifier that reaches a Java/shell/JS runtime — only the
 * three named functions above, dotted-path variable lookups, and literals.
 */
public final class ExpressionEvaluator {

    private static final Pattern TOKEN = Pattern.compile(
            "\\s*(\"(?:[^\"\\\\]|\\\\.)*\"|&&|\\|\\||==|!=|>=|<=|[()><!,]|[A-Za-z_][A-Za-z0-9_.\\[\\]]*|-?\\d+(?:\\.\\d+)?)");

    private final List<String> tokens = new ArrayList<>();
    private final VariableScope scope;
    private final SecretResolver secretResolver;
    private final Random random = new Random();
    private int pos;
    private final String original;

    public ExpressionEvaluator(String expr, VariableScope scope, SecretResolver secretResolver) {
        this.original = expr;
        this.scope = scope;
        this.secretResolver = secretResolver;
        tokenize(expr);
    }

    public static JsonNode evaluate(String expr, VariableScope scope, SecretResolver secretResolver) {
        return new ExpressionEvaluator(expr, scope, secretResolver).parseOr();
    }

    public static boolean evaluateBoolean(String expr, VariableScope scope, SecretResolver secretResolver) {
        JsonNode result = evaluate(expr, scope, secretResolver);
        if (result.isBoolean()) return result.asBoolean();
        throw new IllegalArgumentException("Expression did not evaluate to a boolean: '" + expr + "'");
    }

    private void tokenize(String expr) {
        Matcher m = TOKEN.matcher(expr);
        int last = 0;
        while (m.find(last)) {
            if (m.start() == m.end()) break;
            tokens.add(m.group(1));
            last = m.end();
        }
        if (last < expr.length() && !expr.substring(last).isBlank()) {
            throw new IllegalArgumentException("Cannot parse expression near '" + expr.substring(last)
                    + "' in '" + expr + "'");
        }
    }

    private String peek() {
        return pos < tokens.size() ? tokens.get(pos) : null;
    }

    private String next() {
        return tokens.get(pos++);
    }

    private JsonNode parseOr() {
        JsonNode left = parseAnd();
        while ("||".equals(peek())) {
            next();
            JsonNode right = parseAnd();
            left = BooleanNode.valueOf(asBool(left) || asBool(right));
        }
        return left;
    }

    private JsonNode parseAnd() {
        JsonNode left = parseEquality();
        while ("&&".equals(peek())) {
            next();
            JsonNode right = parseEquality();
            left = BooleanNode.valueOf(asBool(left) && asBool(right));
        }
        return left;
    }

    private JsonNode parseEquality() {
        JsonNode left = parseComparison();
        if ("==".equals(peek()) || "!=".equals(peek())) {
            String op = next();
            JsonNode right = parseComparison();
            boolean eq = jsonEquals(left, right);
            return BooleanNode.valueOf(op.equals("==") == eq);
        }
        return left;
    }

    private JsonNode parseComparison() {
        JsonNode left = parseUnary();
        String next = peek();
        if (next != null && List.of(">", ">=", "<", "<=").contains(next)) {
            String op = next();
            JsonNode right = parseUnary();
            double a = left.asDouble();
            double b = right.asDouble();
            boolean result = switch (op) {
                case ">" -> a > b;
                case ">=" -> a >= b;
                case "<" -> a < b;
                default -> a <= b;
            };
            return BooleanNode.valueOf(result);
        }
        return left;
    }

    private JsonNode parseUnary() {
        if ("!".equals(peek())) {
            next();
            return BooleanNode.valueOf(!asBool(parseUnary()));
        }
        return parsePrimary();
    }

    private JsonNode parsePrimary() {
        String t = peek();
        if (t == null) {
            throw new IllegalArgumentException("Unexpected end of expression: '" + original + "'");
        }
        if ("(".equals(t)) {
            next();
            JsonNode v = parseOr();
            expect(")");
            return v;
        }
        if ("true".equals(t) || "false".equals(t)) {
            next();
            return BooleanNode.valueOf(Boolean.parseBoolean(t));
        }
        if ("null".equals(t)) {
            next();
            return NullNode.getInstance();
        }
        if (t.startsWith("\"")) {
            next();
            return VariableScope.mapper().getNodeFactory().textNode(unquote(t));
        }
        if (t.matches("-?\\d+(?:\\.\\d+)?")) {
            next();
            return VariableScope.mapper().getNodeFactory().numberNode(Double.parseDouble(t));
        }
        if (t.matches("[A-Za-z_][A-Za-z0-9_.\\[\\]]*")) {
            next();
            if ("(".equals(peek())) {
                return parseFunctionCall(t);
            }
            return scope.resolve(t);
        }
        throw new IllegalArgumentException("Cannot parse token '" + t + "' in expression '" + original + "'");
    }

    private JsonNode parseFunctionCall(String name) {
        expect("(");
        String arg = null;
        if (!")".equals(peek())) {
            String t = next();
            arg = t.startsWith("\"") ? unquote(t) : t;
        }
        expect(")");
        return switch (name) {
            case "random" -> VariableScope.mapper().getNodeFactory().numberNode(Math.abs(random.nextInt(1_000_000)));
            case "timestamp" -> VariableScope.mapper().getNodeFactory().numberNode(Instant.now().toEpochMilli());
            case "secret" -> VariableScope.mapper().getNodeFactory().textNode(secretResolver.resolve(arg));
            case "today" -> VariableScope.mapper().getNodeFactory().textNode(applyDateOffset(java.time.LocalDate.now(), arg, name));
            case "monday" -> VariableScope.mapper().getNodeFactory().textNode(
                    applyDateOffset(java.time.LocalDate.now().with(java.time.DayOfWeek.MONDAY), arg, name));
            default -> throw new IllegalArgumentException(
                    "Unknown function '" + name + "()' — only random(), timestamp(), secret(name), today(offset), monday(offset) are allowed");
        };
    }

    // applyDateOffset renders a base date as YYYY-MM-DD, optionally shifted by
    // a signed compound offset like "+2y", "-30d", "+3m", "+30w+3d" — so
    // date-sensitive tests (future DOBs, expected start dates, leave ranges)
    // express dates RELATIVE to the run day instead of hardcoding a calendar
    // date that silently rots when the calendar catches up with it. today()
    // anchors on the run day; monday() anchors on the current week's Monday so
    // weekday-sensitive tests (working-day counts, session-day checks) stay on
    // the intended weekday whatever day the suite runs.
    private static String applyDateOffset(java.time.LocalDate base, String offset, String fn) {
        java.time.LocalDate d = base;
        if (offset != null && !offset.isBlank()) {
            String o = offset.trim();
            if (!o.matches("^([+-]\\d+[dwmy])+$")) {
                throw new IllegalArgumentException(
                        fn + "() offset must be segments like +2y, -30d, +3m, +30w+3d — got '" + offset + "'");
            }
            var m = java.util.regex.Pattern.compile("([+-])(\\d+)([dwmy])").matcher(o);
            while (m.find()) {
                int n = Integer.parseInt(m.group(2)) * ("-".equals(m.group(1)) ? -1 : 1);
                d = switch (m.group(3)) {
                    case "d" -> d.plusDays(n);
                    case "w" -> d.plusWeeks(n);
                    case "m" -> d.plusMonths(n);
                    default -> d.plusYears(n);
                };
            }
        }
        return d.toString();
    }

    private void expect(String tok) {
        if (!tok.equals(peek())) {
            throw new IllegalArgumentException("Expected '" + tok + "' in expression '" + original + "'");
        }
        next();
    }

    private static String unquote(String quoted) {
        String inner = quoted.substring(1, quoted.length() - 1);
        return inner.replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private static boolean asBool(JsonNode n) {
        if (n.isBoolean()) return n.asBoolean();
        if (n.isMissingNode() || n.isNull()) return false;
        throw new IllegalArgumentException("Expected a boolean value, got: " + n);
    }

    private static boolean jsonEquals(JsonNode a, JsonNode b) {
        boolean aNull = a == null || a.isNull() || a.isMissingNode();
        boolean bNull = b == null || b.isNull() || b.isMissingNode();
        if (aNull || bNull) return aNull && bNull;
        if (a.isNumber() && b.isNumber()) return a.asDouble() == b.asDouble();
        // Defensive: a numeric field that got quoted somewhere upstream (e.g. a JSON
        // template like "capacity": "${x}" instead of "capacity": ${x}) shouldn't
        // silently break a supposedly-equivalent Assert — compare numerically if
        // both sides parse as numbers, even when one arrived as text.
        if (isNumericText(a) && isNumericText(b)) {
            return Double.parseDouble(a.asText()) == Double.parseDouble(b.asText());
        }
        return a.asText().equals(b.asText());
    }

    private static boolean isNumericText(JsonNode n) {
        if (n.isNumber()) return true;
        if (!n.isTextual()) return false;
        try {
            Double.parseDouble(n.asText());
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
