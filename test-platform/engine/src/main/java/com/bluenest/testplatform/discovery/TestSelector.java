package com.bluenest.testplatform.discovery;

import com.bluenest.testplatform.graph.DependencyGraph;
import com.bluenest.testplatform.graph.EdgeType;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.model.ScriptType;

import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Implements the filter dimensions behind {@code make test-suite/test-case/
 * test-collection/test-tag/test-owner/test-file} (spec §16) — one
 * authoritative filtering implementation shared by every Make target rather
 * than 19 bespoke scripts.
 */
public final class TestSelector {

    public static Set<String> byTag(Map<String, Script> all, String tag) {
        Set<String> out = new LinkedHashSet<>();
        all.forEach((id, s) -> { if (s.metadata.tags.contains(tag)) out.add(id); });
        return out;
    }

    public static Set<String> byOwner(Map<String, Script> all, String owner) {
        Set<String> out = new LinkedHashSet<>();
        all.forEach((id, s) -> { if (owner.equalsIgnoreCase(s.metadata.owner)) out.add(id); });
        return out;
    }

    public static Set<String> byFile(Map<String, Script> all, Path file) {
        Set<String> out = new LinkedHashSet<>();
        Path normalized = file.normalize().toAbsolutePath();
        all.forEach((id, s) -> { if (s.sourceFile.normalize().toAbsolutePath().equals(normalized)) out.add(id); });
        return out;
    }

    /** Every Test Case contained (directly or transitively) by the given Suite id. */
    public static Set<String> casesOfSuite(DependencyGraph graph, String suiteId) {
        Set<String> out = new LinkedHashSet<>();
        for (var e : graph.edges) {
            if (e.from.equals(suiteId) && e.type == EdgeType.CONTAINS
                    && graph.nodes.containsKey(e.to)
                    && graph.nodes.get(e.to).type.name().equals(ScriptType.TEST_CASE.name())) {
                out.add(e.to);
            }
        }
        return out;
    }

    /** Every Test Case reachable under the given Collection id (via its Suites). */
    public static Set<String> casesOfCollection(DependencyGraph graph, String collectionId) {
        Set<String> out = new LinkedHashSet<>();
        for (var e : graph.edges) {
            if (e.from.equals(collectionId) && e.type == EdgeType.CONTAINS && graph.nodes.containsKey(e.to)) {
                var target = graph.nodes.get(e.to);
                if (target.type.name().equals("TEST_SUITE")) {
                    out.addAll(casesOfSuite(graph, e.to));
                } else if (target.type.name().equals("TEST_COLLECTION")) {
                    out.addAll(casesOfCollection(graph, e.to));
                }
            }
        }
        return out;
    }
}
