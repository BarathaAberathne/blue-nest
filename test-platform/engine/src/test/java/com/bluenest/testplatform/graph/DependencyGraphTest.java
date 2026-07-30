package com.bluenest.testplatform.graph;

import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.parser.ScriptParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DependencyGraphTest {

    @TempDir
    Path dir;

    private Script write(String relativePath, String content) throws IOException {
        Path file = dir.resolve(relativePath);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
        return new ScriptParser().parse(file);
    }

    private String caseFrontMatter(String id, String number) {
        return "---\nid: " + id + "\nnumber: " + number
                + "\ntype: Test Case\ntitle: t\nowner: QA\nstatus: Active\ntags: []\n---\n";
    }

    @Test
    void detectsDuplicateIds() throws IOException {
        Script a = write("a.bnrest.md", caseFrontMatter("DUP-TC-001", "1") + "```bnrest\nAssert 1 == 1\n```\n");
        Script b = write("b.bnrest.md", caseFrontMatter("DUP-TC-001", "2") + "```bnrest\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(a, b));
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("DUPLICATE_ID")));
    }

    @Test
    void detectsDuplicateNumbers() throws IOException {
        Script a = write("a.bnrest.md", caseFrontMatter("DUPNUM-TC-001", "9") + "```bnrest\nAssert 1 == 1\n```\n");
        Script b = write("b.bnrest.md", caseFrontMatter("DUPNUM-TC-002", "9") + "```bnrest\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(a, b));
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("DUPLICATE_NUMBER")));
    }

    @Test
    void detectsMissingReference() throws IOException {
        Script suite = write("suite.bnrest.md",
                "---\nid: SUI-X-001\nnumber: 1\ntype: Test Suite\ntitle: s\nowner: QA\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nCall ./nonexistent-case.bnrest.md\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(suite));
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("MISSING_REFERENCE")));
    }

    @Test
    void rejectsInvalidCallHierarchy() throws IOException {
        // A Test Case may only Call a Test Util — calling a Test Suite is invalid.
        // File names follow the id-prefix convention (docs/testing/test-numbering.md)
        // that Call-target resolution relies on.
        Script suite = write("SUI-Y-001-suite.bnrest.md",
                "---\nid: SUI-Y-001\nnumber: 1\ntype: Test Suite\ntitle: s\nowner: QA\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nAssert 1 == 1\n```\n");
        Script badCase = write("BAD-TC-001-case.bnrest.md",
                caseFrontMatter("BAD-TC-001", "2") + "```bnrest\nCall ./SUI-Y-001-suite.bnrest.md\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(suite, badCase));
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("INVALID_CALL_HIERARCHY")));
    }

    @Test
    void setupAndTeardownFixtureCallsAreExemptFromTheHierarchyCheck() throws IOException {
        // Spec §2/§8: Setup/Teardown are a fixture mechanism — a Suite (or any
        // script type) may Call a Util there for setup/cleanup, unlike Body's
        // strict containment hierarchy (found while building SUI-STAFF-001,
        // which needs its own Setup to log in and create shared fixtures).
        Script util = write("FIX-UTIL-001-x.bnrest.md",
                "---\nid: FIX-UTIL-001\nnumber: U.1\ntype: Test Util\ntitle: u\nowner: QA\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nAssert 1 == 1\n```\n");
        Script suite = write("SUI-FIX-001-suite.bnrest.md",
                "---\nid: SUI-FIX-001\nnumber: 1\ntype: Test Suite\ntitle: s\nowner: QA\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nSetup\nCall ./FIX-UTIL-001-x.bnrest.md\n\nBody\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(util, suite));
        g.validate();
        assertTrue(g.issues.stream().noneMatch(i -> i.code.equals("INVALID_CALL_HIERARCHY")),
                "a Setup-phase Call to a Util must not be flagged as an invalid Suite->Util Body call");
    }

    @Test
    void detectsCircularDependency() throws IOException {
        Script a = write("a.bnrest.md",
                "---\nid: CYC-TC-001\nnumber: 1\ntype: Test Case\ntitle: a\nowner: QA\nstatus: Active\ntags: []\n"
                        + "dependsOn: [CYC-TC-002]\n---\n```bnrest\nAssert 1 == 1\n```\n");
        Script b = write("b.bnrest.md",
                "---\nid: CYC-TC-002\nnumber: 2\ntype: Test Case\ntitle: b\nowner: QA\nstatus: Active\ntags: []\n"
                        + "dependsOn: [CYC-TC-001]\n---\n```bnrest\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(a, b));
        g.validate();
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("CIRCULAR_DEPENDENCY")));
    }

    @Test
    void topologicalSortOrdersDependenciesBeforeDependents() throws IOException {
        Script a = write("a.bnrest.md",
                "---\nid: ORD-TC-001\nnumber: 1\ntype: Test Case\ntitle: a\nowner: QA\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nAssert 1 == 1\n```\n");
        Script b = write("b.bnrest.md",
                "---\nid: ORD-TC-002\nnumber: 2\ntype: Test Case\ntitle: b\nowner: QA\nstatus: Active\ntags: []\n"
                        + "dependsOn: [ORD-TC-001]\n---\n```bnrest\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(b, a)); // deliberately out of order
        List<String> order = g.topologicalOrder();
        assertTrue(order.indexOf("ORD-TC-001") < order.indexOf("ORD-TC-002"));
    }

    @Test
    void detectsOrphanCaseAndEmptySuite() throws IOException {
        Script orphanCase = write("orphan.bnrest.md",
                caseFrontMatter("ORPHAN-TC-001", "1") + "```bnrest\nAssert 1 == 1\n```\n");
        Script emptySuite = write("empty-suite.bnrest.md",
                "---\nid: SUI-EMPTY-001\nnumber: 2\ntype: Test Suite\ntitle: s\nowner: QA\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(orphanCase, emptySuite));
        g.validate();
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("ORPHAN_TEST_CASE")));
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("EMPTY_SUITE")));
    }

    @Test
    void flagsDependentModeWithNoDeclaredDependency() throws IOException {
        Script hidden = write("hidden.bnrest.md",
                "---\nid: HIDDEN-TC-001\nnumber: 1\ntype: Test Case\ntitle: h\nowner: QA\nmode: Dependent\nstatus: Active\ntags: []\n---\n"
                        + "```bnrest\nAssert 1 == 1\n```\n");
        DependencyGraph g = DependencyGraph.build(List.of(hidden));
        g.validate();
        assertTrue(g.issues.stream().anyMatch(i -> i.code.equals("HIDDEN_GLOBAL_STATE")));
    }
}
