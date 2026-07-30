package com.bluenest.testplatform.graph;

/** Edge types for the dependency graph / visual mapper (spec §14 "Edge types"). */
public enum EdgeType {
    CONTAINS, CALLS, DEPENDS_ON, USES, PRODUCES, CONSUMES, CALLS_ENDPOINT
}
