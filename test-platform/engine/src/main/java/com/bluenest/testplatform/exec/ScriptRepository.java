package com.bluenest.testplatform.exec;

import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.parser.ScriptParser;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

/** Discovers, parses, and indexes every {@code .bnrest.md} file under a tests root. */
public final class ScriptRepository {

    private final Map<Path, Script> byPath = new LinkedHashMap<>();
    private final Map<String, Script> byId = new LinkedHashMap<>();
    private final ScriptParser parser = new ScriptParser();

    public static ScriptRepository discover(Path testsRoot) {
        ScriptRepository repo = new ScriptRepository();
        try (Stream<Path> walk = Files.walk(testsRoot)) {
            walk.filter(p -> p.toString().endsWith(".bnrest.md"))
                    .sorted()
                    .forEach(repo::load);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot walk tests root " + testsRoot + ": " + e.getMessage(), e);
        }
        return repo;
    }

    private void load(Path file) {
        Script s = parser.parse(file);
        byPath.put(file.normalize(), s);
        byId.putIfAbsent(s.id(), s); // first wins; duplicate-id is a graph validation error, not silently overwritten
    }

    public Script byId(String id) {
        return byId.get(id);
    }

    public Script resolveCallTarget(Script from, String relativeTarget) {
        Path resolved = from.sourceFile.getParent().resolve(relativeTarget).normalize();
        Script found = byPath.get(resolved);
        if (found == null) {
            throw new IllegalStateException("Cannot resolve Call target '" + relativeTarget
                    + "' from " + from.sourceFile + " (looked for " + resolved + ")");
        }
        return found;
    }

    public Map<String, Script> all() {
        return byId;
    }
}
