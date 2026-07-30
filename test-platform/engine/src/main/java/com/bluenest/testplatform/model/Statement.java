package com.bluenest.testplatform.model;

import java.util.ArrayList;
import java.util.List;

/**
 * One explicit AST node. Every field is populated by the parser from a
 * closed grammar (see {@code parser.StatementParser}) — there is no field
 * here that holds "raw code to execute"; {@code bodyJson}/{@code exprText}
 * are structured templates evaluated by {@code eval.ExpressionEvaluator} /
 * the executor's JSON-template substitution, never passed to a scripting
 * runtime.
 */
public final class Statement {
    public final Command command;
    public final int lineNumber;
    public final String raw;

    /** REST: path template. Call: target script path (relative to this file). */
    public String target;
    /** REST/Call: variable name results are stored Into. */
    public String intoVar;
    /**
     * REST only: optional {@code Using <dottedPath>} clause resolving to a
     * bearer token for this call (e.g. {@code Using session.accessToken}).
     * Not part of the spec's literal command list — the spec doesn't define
     * its own header-attachment construct, so this is a small, documented
     * grammar extension reusing the same trailing-clause style as
     * {@code Into}/{@code With Json}. See docs/testing/writing-tests.md.
     */
    public String authVar;
    /** REST request body / Call "With Json" payload / Output payload — raw JSON template text. */
    public String bodyJson;
    /** Assert/Set/Eval/Print/When: expression text. */
    public String exprText;
    /** Assert*: the variable the assertion is about (e.g. AssertStatus's first arg). */
    public String subjectVar;
    /** Extra positional tokens (AssertJson's jsonpath/op/value, AssertHeader's name/op/value, etc.). */
    public List<String> args = new ArrayList<>();
    public boolean catchError;
    public boolean withJson;
    /**
     * Call only: bypasses the target Util's fixtureScope cache for this one
     * invocation — needed when the SAME credentials/input must genuinely
     * re-execute (e.g. logging in again after a role change, where the
     * cached pre-change token would otherwise be silently reused).
     */
    public boolean fresh;
    /** ExpectFail / When-guard: the wrapped statement. */
    public Statement inner;

    public Statement(Command command, int lineNumber, String raw) {
        this.command = command;
        this.lineNumber = lineNumber;
        this.raw = raw;
    }

    @Override
    public String toString() {
        return "Statement{" + command + " @L" + lineNumber + ": " + raw + "}";
    }
}
