package com.bluenest.testplatform.report;

import com.bluenest.testplatform.graph.DependencyGraph;
import com.bluenest.testplatform.graph.GraphNode;
import com.bluenest.testplatform.model.CaseResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Exports the dependency graph as JSON for the visual mapper (spec §14
 * "JSON graph export"). Node/edge shape is deliberately simple — plain
 * objects, no custom binary format — so the frontend mapper (or any other
 * tool) can consume it without a shared schema library.
 */
public final class GraphJsonExporter {

    private static final ObjectMapper MAPPER = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

    public void write(DependencyGraph graph, Map<String, CaseResult> latestResults, Path outFile) {
        ObjectNode root = MAPPER.createObjectNode();
        ArrayNode nodes = root.putArray("nodes");
        for (GraphNode n : graph.nodes.values()) {
            ObjectNode node = nodes.addObject();
            node.put("id", n.id);
            node.put("type", n.type.name());
            if (n.script != null) {
                node.put("number", n.script.metadata.number);
                node.put("title", n.script.metadata.title);
                node.put("owner", n.script.metadata.owner);
                node.put("status", n.script.metadata.status);
                ArrayNode tags = node.putArray("tags");
                n.script.metadata.tags.forEach(tags::add);
                node.put("sourceFile", n.script.sourceFile.toString());
                CaseResult result = latestResults.get(n.id);
                node.put("lastExecutionStatus", result == null ? "NOT_RUN" : result.status.name());
                node.put("durationMs", result == null ? 0 : result.durationMs);
                node.put("callers", (int) graph.edges.stream()
                        .filter(e -> e.to.equals(n.id) && (e.type == com.bluenest.testplatform.graph.EdgeType.CALLS
                                || e.type == com.bluenest.testplatform.graph.EdgeType.CONTAINS))
                        .count());
                node.put("endpointCalls", (int) graph.edges.stream()
                        .filter(e -> e.from.equals(n.id) && e.type == com.bluenest.testplatform.graph.EdgeType.CALLS_ENDPOINT)
                        .count());
            }
        }
        ArrayNode edges = root.putArray("edges");
        for (var e : graph.edges) {
            ObjectNode edge = edges.addObject();
            edge.put("from", e.from);
            edge.put("to", e.to);
            edge.put("type", e.type.name());
        }
        ArrayNode issues = root.putArray("issues");
        for (var issue : graph.issues) {
            ObjectNode i = issues.addObject();
            i.put("severity", issue.severity.name());
            i.put("code", issue.code);
            i.put("message", issue.message);
        }
        try {
            Files.createDirectories(outFile.getParent());
            Files.writeString(outFile, MAPPER.writeValueAsString(root));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write graph JSON to " + outFile + ": " + e.getMessage(), e);
        }
    }
}
