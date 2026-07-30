package com.bluenest.testplatform.graph;

public final class Edge {
    public final String from;
    public final String to;
    public final EdgeType type;

    public Edge(String from, String to, EdgeType type) {
        this.from = from;
        this.to = to;
        this.type = type;
    }

    @Override
    public String toString() {
        return from + " --" + type + "--> " + to;
    }
}
