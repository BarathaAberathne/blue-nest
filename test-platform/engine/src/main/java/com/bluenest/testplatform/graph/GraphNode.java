package com.bluenest.testplatform.graph;

import com.bluenest.testplatform.model.Script;

public final class GraphNode {
    public final String id;
    public final GraphNodeType type;
    /** Null for synthetic nodes (API_ENDPOINT, FIXTURE). */
    public final Script script;

    public GraphNode(String id, GraphNodeType type, Script script) {
        this.id = id;
        this.type = type;
        this.script = script;
    }
}
