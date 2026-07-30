package com.bluenest.testplatform.graph;

import com.bluenest.testplatform.model.Command;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.model.ScriptType;
import com.bluenest.testplatform.model.Statement;

import java.nio.file.Path;
import java.util.*;

/**
 * Builds and validates the directed graph described in spec §9: containment,
 * {@code dependsOn}/{@code uses}, {@code Call} edges, and REST-endpoint
 * edges, then runs every required structural check before any script is
 * allowed to execute.
 */
public final class DependencyGraph {

    public final Map<String, GraphNode> nodes = new LinkedHashMap<>();
    public final List<Edge> edges = new ArrayList<>();
    public final List<ValidationIssue> issues = new ArrayList<>();

    public static DependencyGraph build(Collection<Script> scripts) {
        DependencyGraph g = new DependencyGraph();
        g.addScriptNodes(scripts);
        g.addEndpointAndFixtureNodes(scripts);
        g.addEdges(scripts);
        return g;
    }

    // ---- construction -------------------------------------------------

    private void addScriptNodes(Collection<Script> scripts) {
        Map<String, List<Script>> byId = new LinkedHashMap<>();
        Map<String, List<Script>> byNumber = new LinkedHashMap<>();
        for (Script s : scripts) {
            byId.computeIfAbsent(s.id(), k -> new ArrayList<>()).add(s);
            byNumber.computeIfAbsent(s.metadata.number, k -> new ArrayList<>()).add(s);
        }
        for (var entry : byId.entrySet()) {
            if (entry.getValue().size() > 1) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.ERROR, "DUPLICATE_ID",
                        "Duplicate test id '" + entry.getKey() + "' used by: "
                                + entry.getValue().stream().map(s -> s.sourceFile.toString()).toList()));
            }
        }
        for (var entry : byNumber.entrySet()) {
            if (entry.getValue().size() > 1) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.ERROR, "DUPLICATE_NUMBER",
                        "Duplicate number '" + entry.getKey() + "' used by: "
                                + entry.getValue().stream().map(Script::id).toList()));
            }
        }
        for (Script s : scripts) {
            // First script wins the id slot; duplicates are already reported above.
            nodes.putIfAbsent(s.id(), new GraphNode(s.id(), toNodeType(s.metadata.type), s));
        }
    }

    private static GraphNodeType toNodeType(ScriptType t) {
        return switch (t) {
            case TEST_COLLECTION -> GraphNodeType.TEST_COLLECTION;
            case TEST_SUITE -> GraphNodeType.TEST_SUITE;
            case TEST_CASE -> GraphNodeType.TEST_CASE;
            case TEST_UTIL -> GraphNodeType.TEST_UTIL;
            case TEST_DATA -> GraphNodeType.TEST_DATA;
        };
    }

    private void addEndpointAndFixtureNodes(Collection<Script> scripts) {
        for (Script s : scripts) {
            for (Statement st : all(s)) {
                if (Command.isRestVerb(st.command) && st.target != null) {
                    String endpointId = "ENDPOINT:" + Command.httpMethod(st.command) + " " + normalize(st.target);
                    nodes.putIfAbsent(endpointId, new GraphNode(endpointId, GraphNodeType.API_ENDPOINT, null));
                }
            }
            if (!s.setup.isEmpty()) {
                String fid = s.id() + ":setup";
                nodes.putIfAbsent(fid, new GraphNode(fid, GraphNodeType.FIXTURE, null));
            }
            if (!s.teardown.isEmpty()) {
                String fid = s.id() + ":teardown";
                nodes.putIfAbsent(fid, new GraphNode(fid, GraphNodeType.FIXTURE, null));
            }
        }
    }

    private void addEdges(Collection<Script> scripts) {
        for (Script s : scripts) {
            for (String dep : s.metadata.dependsOn) {
                requireExists(dep, s, "dependsOn");
                edges.add(new Edge(s.id(), dep, EdgeType.DEPENDS_ON));
            }
            for (String use : s.metadata.uses) {
                requireExists(use, s, "uses");
                edges.add(new Edge(s.id(), use, EdgeType.USES));
            }
            if (!s.setup.isEmpty()) edges.add(new Edge(s.id(), s.id() + ":setup", EdgeType.CONTAINS));
            if (!s.teardown.isEmpty()) edges.add(new Edge(s.id(), s.id() + ":teardown", EdgeType.CONTAINS));

            // Setup/Teardown are a fixture mechanism (spec §2/§8) — ANY script type
            // may Call a Util there for setup/cleanup purposes, unlike Body's strict
            // containment hierarchy (Suite->Case only, etc.). Only Body calls are
            // checked against the full hierarchy.
            for (Statement st : s.setup) addStatementEdges(s, st, false);
            for (Statement st : s.body) addStatementEdges(s, st, true);
            for (Statement st : s.teardown) addStatementEdges(s, st, false);
        }
    }

    /**
     * @param enforceHierarchy false for Setup/Teardown statements — spec §2/§8
     *                         fixture calls are exempt from the Body containment
     *                         hierarchy (any script type may Call a Util there).
     */
    private void addStatementEdges(Script s, Statement st, boolean enforceHierarchy) {
        if (Command.isRestVerb(st.command) && st.target != null) {
            String endpointId = "ENDPOINT:" + Command.httpMethod(st.command) + " " + normalize(st.target);
            edges.add(new Edge(s.id(), endpointId, EdgeType.CALLS_ENDPOINT));
        }
        if (st.command == Command.CALL && st.target != null) {
            String targetId = resolveCallTarget(st.target);
            if (!requireExists(targetId, s, "Call")) {
                return;
            }
            GraphNode to = nodes.get(targetId);
            if (enforceHierarchy && to != null && to.script != null
                    && !s.metadata.type.canCall(to.script.metadata.type)) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.ERROR, "INVALID_CALL_HIERARCHY",
                        s.id() + " (" + s.metadata.type.label + ") cannot Call " + targetId
                                + " (" + to.script.metadata.type.label + ") — allowed: "
                                + "Collection->Collection|Suite, Suite->Case, Case->Util, Data->Util, Util->Util"));
            }
            boolean containment = enforceHierarchy && ((s.metadata.type == ScriptType.TEST_COLLECTION)
                    || (s.metadata.type == ScriptType.TEST_SUITE));
            edges.add(new Edge(s.id(), targetId, containment ? EdgeType.CONTAINS : EdgeType.CALLS));
            if (st.intoVar != null) {
                edges.add(new Edge(s.id(), targetId, EdgeType.CONSUMES));
            }
        }
        if (st.inner != null) {
            addStatementEdges(s, st.inner, enforceHierarchy);
        }
    }

    /** Call targets are relative file paths; resolve to the id of the script at that path. */
    private String resolveCallTarget(String relativePath) {
        String fileName = Path.of(relativePath).getFileName().toString();
        String baseName = fileName.endsWith(".bnrest.md")
                ? fileName.substring(0, fileName.length() - ".bnrest.md".length())
                : fileName;
        // Convention: file names start with the test id (see docs/testing/test-numbering.md).
        for (String id : nodes.keySet()) {
            if (baseName.equals(id) || baseName.startsWith(id + "-")) {
                return id;
            }
        }
        return baseName; // will fail requireExists() below with a clear message
    }

    private boolean requireExists(String id, Script from, String via) {
        if (!nodes.containsKey(id)) {
            issues.add(new ValidationIssue(ValidationIssue.Severity.ERROR, "MISSING_REFERENCE",
                    from.id() + " references unknown test id '" + id + "' via " + via));
            return false;
        }
        return true;
    }

    private static List<Statement> all(Script s) {
        List<Statement> all = new ArrayList<>(s.setup);
        all.addAll(s.body);
        all.addAll(s.teardown);
        return all;
    }

    private static String normalize(String path) {
        return path.replaceAll("[0-9a-fA-F]{24}", "{id}").replaceAll("\\?.*$", "");
    }

    // ---- validation -----------------------------------------------------

    /** Runs every remaining structural check (cycles, orphans, hierarchy already checked during build). */
    public List<ValidationIssue> validate() {
        detectCycles();
        detectOrphanCases();
        detectEmptySuites();
        detectHiddenGlobalState();
        return issues;
    }

    private void detectCycles() {
        Map<String, List<String>> adjacency = new HashMap<>();
        for (Edge e : edges) {
            if (e.type == EdgeType.CALLS || e.type == EdgeType.CONTAINS
                    || e.type == EdgeType.DEPENDS_ON || e.type == EdgeType.USES) {
                if (nodes.containsKey(e.to) && nodes.get(e.to).script != null) {
                    adjacency.computeIfAbsent(e.from, k -> new ArrayList<>()).add(e.to);
                }
            }
        }
        Set<String> visited = new HashSet<>();
        Set<String> stack = new LinkedHashSet<>();
        for (String id : nodes.keySet()) {
            if (nodes.get(id).script == null) continue;
            if (!visited.contains(id)) {
                dfsCycle(id, adjacency, visited, stack);
            }
        }
    }

    private void dfsCycle(String node, Map<String, List<String>> adjacency, Set<String> visited, Set<String> stack) {
        visited.add(node);
        stack.add(node);
        for (String next : adjacency.getOrDefault(node, List.of())) {
            if (stack.contains(next)) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.ERROR, "CIRCULAR_DEPENDENCY",
                        "Circular dependency: " + String.join(" -> ", stack) + " -> " + next));
            } else if (!visited.contains(next)) {
                dfsCycle(next, adjacency, visited, stack);
            }
        }
        stack.remove(node);
    }

    private void detectOrphanCases() {
        Set<String> containedCases = new HashSet<>();
        for (Edge e : edges) {
            if (e.type == EdgeType.CONTAINS && nodes.containsKey(e.to)
                    && nodes.get(e.to).type == GraphNodeType.TEST_CASE) {
                containedCases.add(e.to);
            }
        }
        for (GraphNode n : nodes.values()) {
            if (n.type == GraphNodeType.TEST_CASE && !containedCases.contains(n.id)) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.WARNING, "ORPHAN_TEST_CASE",
                        n.id + " is not contained by any Test Suite"));
            }
        }
    }

    private void detectEmptySuites() {
        Map<String, Long> caseCountBySuite = new HashMap<>();
        for (Edge e : edges) {
            if (e.type == EdgeType.CONTAINS && nodes.containsKey(e.to)
                    && nodes.get(e.to).type == GraphNodeType.TEST_CASE) {
                caseCountBySuite.merge(e.from, 1L, Long::sum);
            }
        }
        for (GraphNode n : nodes.values()) {
            if (n.type == GraphNodeType.TEST_SUITE && caseCountBySuite.getOrDefault(n.id, 0L) == 0) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.WARNING, "EMPTY_SUITE",
                        n.id + " contains zero Test Cases"));
            }
        }
    }

    /**
     * Heuristic (documented, not full data-flow analysis — see
     * test-platform-architecture.md "Deliberate scope decisions"): a
     * Dependent-mode case that declares no dependsOn/uses is relying on
     * something not expressed in the graph at all.
     */
    private void detectHiddenGlobalState() {
        for (GraphNode n : nodes.values()) {
            if (n.script == null) continue;
            if (n.script.metadata.mode == com.bluenest.testplatform.model.Mode.DEPENDENT
                    && n.script.metadata.dependsOn.isEmpty() && n.script.metadata.uses.isEmpty()) {
                issues.add(new ValidationIssue(ValidationIssue.Severity.WARNING, "HIDDEN_GLOBAL_STATE",
                        n.id + " is mode=Dependent but declares no dependsOn/uses — "
                                + "it may rely on undeclared shared state"));
            }
        }
    }

    // ---- ordering ---------------------------------------------------------

    /** Kahn's algorithm topological sort over CALLS+CONTAINS+DEPENDS_ON edges. Assumes {@link #validate()} found no cycles. */
    public List<String> topologicalOrder() {
        Map<String, Integer> inDegree = new HashMap<>();
        Map<String, List<String>> adjacency = new HashMap<>();
        for (String id : nodes.keySet()) inDegree.put(id, 0);
        for (Edge e : edges) {
            if (!nodes.containsKey(e.to) || !nodes.containsKey(e.from)) continue;
            if (e.type == EdgeType.CALLS || e.type == EdgeType.CONTAINS) {
                // Container/caller naturally runs before callee — edge direction as-is.
                adjacency.computeIfAbsent(e.from, k -> new ArrayList<>()).add(e.to);
                inDegree.merge(e.to, 1, Integer::sum);
            } else if (e.type == EdgeType.DEPENDS_ON) {
                // "from dependsOn to" means "to" must run BEFORE "from" — the edge
                // points from dependent to dependency, the OPPOSITE of execution
                // order, so it must be reversed here (unlike CALLS/CONTAINS above).
                adjacency.computeIfAbsent(e.to, k -> new ArrayList<>()).add(e.from);
                inDegree.merge(e.from, 1, Integer::sum);
            }
        }
        Deque<String> queue = new ArrayDeque<>();
        inDegree.forEach((id, deg) -> { if (deg == 0) queue.add(id); });
        List<String> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            String n = queue.poll();
            order.add(n);
            for (String next : adjacency.getOrDefault(n, List.of())) {
                inDegree.merge(next, -1, Integer::sum);
                if (inDegree.get(next) == 0) queue.add(next);
            }
        }
        return order;
    }

    public Set<String> reusableUtilities() {
        Map<String, Long> callCount = new HashMap<>();
        for (Edge e : edges) {
            if (e.type == EdgeType.CALLS && nodes.containsKey(e.to)
                    && nodes.get(e.to).type == GraphNodeType.TEST_UTIL) {
                callCount.merge(e.to, 1L, Long::sum);
            }
        }
        Set<String> reused = new LinkedHashSet<>();
        callCount.forEach((id, count) -> { if (count > 1) reused.add(id); });
        return reused;
    }

    public boolean hasErrors() {
        return issues.stream().anyMatch(ValidationIssue::isError);
    }
}
