package com.bluenest.testplatform.graph;

/** Node types for the dependency graph / visual mapper (spec §14 "Node types"). */
public enum GraphNodeType {
    TEST_COLLECTION, TEST_SUITE, TEST_CASE, TEST_UTIL, TEST_DATA, API_ENDPOINT, FIXTURE
}
