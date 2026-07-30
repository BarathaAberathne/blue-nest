package com.bluenest.testplatform.junit;

import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.exec.RunOrchestrator;
import com.bluenest.testplatform.exec.ScriptRepository;
import com.bluenest.testplatform.graph.DependencyGraph;
import com.bluenest.testplatform.graph.ValidationIssue;
import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.RunStatus;
import com.bluenest.testplatform.model.Script;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DynamicContainer;
import org.junit.jupiter.api.DynamicNode;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * JUnit 5 dynamic-test adapter (spec §11 "Prefer a JUnit 5 dynamic test
 * adapter") — so every discovered {@code .bnrest.md} suite/case shows up
 * properly in an IDE's test tree and in {@code mvn test}/CI, without
 * reimplementing discovery/execution: this wraps the exact same
 * {@link ScriptRepository}/{@link DependencyGraph}/{@link RunOrchestrator}
 * the CLI uses.
 *
 * <p>The whole selected run executes ONCE, eagerly, when this factory method
 * runs (so suite-level fixture sharing and dependency-skip logic work
 * exactly as they do for the CLI) — each {@link DynamicTest} then just
 * reports that case's already-computed {@link CaseResult}. This is a
 * deliberate trade-off documented in test-platform-architecture.md: it means
 * JUnit's per-test "start" timestamp doesn't reflect real execution order,
 * but it keeps ONE orchestration implementation instead of two.
 */
public final class BnRestTestFactory {

    @TestFactory
    List<DynamicNode> bnrestTests() {
        Path testsRoot = Path.of(System.getProperty("bnrest.testsRoot", "../tests")).toAbsolutePath().normalize();
        ScriptRepository repo = ScriptRepository.discover(testsRoot);
        DependencyGraph graph = DependencyGraph.build(repo.all().values());
        graph.validate();

        if (graph.hasErrors()) {
            String message = graph.issues.stream().filter(ValidationIssue::isError)
                    .map(Object::toString).collect(Collectors.joining("\n"));
            return List.of(DynamicTest.dynamicTest("bnrest validation", () -> {
                throw new AssertionError("bnrest validation failed:\n" + message);
            }));
        }

        String baseUrl = System.getProperty("qa.baseUrl", "http://localhost:8080");
        RunOrchestrator orchestrator = new RunOrchestrator(repo, baseUrl, java.util.UUID.randomUUID().toString());
        VariableScope runScope = new VariableScope(null);
        var config = VariableScope.newObject();
        config.put("baseUrl", baseUrl);
        runScope.set("config", config);

        Script defaultCollection = repo.byId("COL-FUNC-001");
        List<CaseResult> results = defaultCollection != null
                ? orchestrator.runCollection(defaultCollection, runScope)
                : new ArrayList<>();

        Map<String, List<CaseResult>> bySuite = new LinkedHashMap<>();
        for (CaseResult c : results) {
            bySuite.computeIfAbsent(c.suiteId == null ? "(none)" : c.suiteId, k -> new ArrayList<>()).add(c);
        }

        List<DynamicNode> containers = new ArrayList<>();
        for (var entry : bySuite.entrySet()) {
            List<DynamicNode> tests = entry.getValue().stream()
                    .map(BnRestTestFactory::toDynamicTest)
                    .collect(Collectors.toList());
            containers.add(DynamicContainer.dynamicContainer(entry.getKey(), tests));
        }
        return containers;
    }

    private static DynamicTest toDynamicTest(CaseResult c) {
        String name = c.caseId + (c.title != null ? ": " + c.title : "");
        return DynamicTest.dynamicTest(name, () -> {
            if (c.status == RunStatus.BLOCKED || c.status == RunStatus.SKIPPED) {
                Assumptions.assumeTrue(false, c.skippedReason);
            }
            if (c.status != RunStatus.PASSED) {
                throw new AssertionError(c.errorMessage != null ? c.errorMessage : "Case did not pass: " + c.status);
            }
        });
    }
}
