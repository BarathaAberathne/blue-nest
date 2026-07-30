package com.bluenest.testplatform.report;

import com.bluenest.testplatform.graph.DependencyGraph;
import com.bluenest.testplatform.graph.Edge;
import com.bluenest.testplatform.graph.EdgeType;
import com.bluenest.testplatform.graph.GraphNode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Mermaid flowchart export (spec §14 "Mermaid diagram export"). */
public final class MermaidExporter {

    public void write(DependencyGraph graph, Path outFile) {
        StringBuilder sb = new StringBuilder("flowchart TD\n");
        for (GraphNode n : graph.nodes.values()) {
            sb.append("  ").append(id(n.id)).append("[\"").append(label(n)).append("\"]\n");
        }
        for (Edge e : graph.edges) {
            if (e.type == EdgeType.CALLS_ENDPOINT) continue; // keep the diagram readable; endpoints are numerous
            sb.append("  ").append(id(e.from)).append(" -->|").append(e.type).append("| ").append(id(e.to)).append("\n");
        }
        try {
            Files.createDirectories(outFile.getParent());
            Files.writeString(outFile, sb.toString());
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot write Mermaid diagram to " + outFile + ": " + ex.getMessage(), ex);
        }
    }

    private static String id(String rawId) {
        return rawId.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private static String label(GraphNode n) {
        String title = n.script != null ? n.script.metadata.title : n.id;
        return n.id + ": " + title.replace("\"", "'");
    }
}
