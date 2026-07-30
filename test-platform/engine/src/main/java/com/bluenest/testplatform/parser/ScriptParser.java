package com.bluenest.testplatform.parser;

import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.model.Statement;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Top-level entry point: reads a {@code .bnrest.md} file, splits it into
 * front matter + fenced {@code ```bnrest} block(s), separates any
 * {@code Setup}/{@code Teardown} phase markers, and hands each phase's lines
 * to {@link StatementParser} to build the final {@link Script} AST.
 */
public final class ScriptParser {

    private final FrontMatterParser frontMatterParser = new FrontMatterParser();

    public Script parse(Path file) {
        String text;
        try {
            text = Files.readString(file);
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot read " + file + ": " + e.getMessage(), e);
        }

        FrontMatterParser.Result fm = frontMatterParser.parse(text, file.toString());
        List<String> allLines = extractFencedBnrestLines(fm.body());

        List<String> setupLines = new ArrayList<>();
        List<String> bodyLines = new ArrayList<>();
        List<String> teardownLines = new ArrayList<>();
        // "Setup"/"Teardown" are bare marker lines (spec §5), not inline statements.
        // "Body" is a small, documented extension for when a script needs all three
        // phases in one file — without it there would be no way to end a Setup
        // section and resume ordinary body statements before Teardown.
        List<String> current = bodyLines;
        for (String line : allLines) {
            String t = line.strip();
            if (t.equals("Setup")) {
                current = setupLines;
                continue;
            }
            if (t.equals("Body")) {
                current = bodyLines;
                continue;
            }
            if (t.equals("Teardown")) {
                current = teardownLines;
                continue;
            }
            current.add(line);
        }

        List<Statement> setup = new StatementParser(setupLines, file.toString()).parseAll();
        List<Statement> body = new StatementParser(bodyLines, file.toString()).parseAll();
        List<Statement> teardown = new StatementParser(teardownLines, file.toString()).parseAll();

        return new Script(fm.metadata(), file, setup, body, teardown);
    }

    /** Concatenates every ```bnrest fenced block's inner lines, in file order. */
    private static List<String> extractFencedBnrestLines(String markdownBody) {
        List<String> out = new ArrayList<>();
        String[] lines = markdownBody.split("\n", -1);
        boolean inBlock = false;
        for (String line : lines) {
            String stripped = line.strip();
            if (!inBlock && stripped.startsWith("```") && stripped.substring(3).strip().equalsIgnoreCase("bnrest")) {
                inBlock = true;
                continue;
            }
            if (inBlock && stripped.equals("```")) {
                inBlock = false;
                out.add(""); // separator between multiple blocks
                continue;
            }
            if (inBlock) {
                out.add(line);
            }
        }
        return out;
    }
}
