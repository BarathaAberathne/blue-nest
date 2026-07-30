package com.bluenest.testplatform.report;

import com.bluenest.testplatform.graph.DependencyGraph;
import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.RunReport;
import com.bluenest.testplatform.model.RunStatus;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.parser.ScriptParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ReportWritersTest {

    @TempDir
    Path dir;

    private RunReport sampleReport() {
        RunReport report = new RunReport();
        report.runId = "run-xyz";
        report.environment = "test";
        report.baseUrl = "http://localhost:8080";
        report.gitCommit = "abc1234";

        CaseResult passed = new CaseResult();
        passed.caseId = "AUTH-TC-001";
        passed.suiteId = "SUI-AUTH-001";
        passed.title = "Login succeeds";
        passed.status = RunStatus.PASSED;
        passed.durationMs = 42;

        CaseResult failed = new CaseResult();
        failed.caseId = "AUTH-TC-999";
        failed.suiteId = "SUI-AUTH-001";
        failed.title = "Something broke";
        failed.status = RunStatus.FAILED;
        failed.errorMessage = "boom";
        failed.durationMs = 7;

        report.cases = List.of(passed, failed);
        return report;
    }

    @Test
    void jsonReportRoundTripsCaseData() {
        RunReport report = sampleReport();
        Path out = dir.resolve("json/run.json");
        new JsonReportWriter().write(report, out);
        assertTrue(Files.exists(out));
        String content = readOrFail(out);
        assertTrue(content.contains("AUTH-TC-001"));
        assertTrue(content.contains("FAILED"));
    }

    @Test
    void junitXmlIncludesFailureElementForFailedCase() {
        RunReport report = sampleReport();
        Path junitDir = dir.resolve("junit");
        new JUnitXmlWriter().write(report, junitDir);
        Path file = junitDir.resolve("TEST-SUI-AUTH-001.xml");
        assertTrue(Files.exists(file));
        String xml = readOrFail(file);
        assertTrue(xml.contains("tests=\"2\""));
        assertTrue(xml.contains("failures=\"1\""));
        assertTrue(xml.contains("<failure"));
    }

    @Test
    void htmlReportEmbedsRunIdAndCaseTable() {
        RunReport report = sampleReport();
        Path out = dir.resolve("html/index.html");
        new HtmlReportWriter().write(report, out);
        String html = readOrFail(out);
        assertTrue(html.contains("run-xyz"));
        assertTrue(html.contains("AUTH-TC-001"));
        assertTrue(html.contains("<table"));
    }

    @Test
    void graphJsonAndMermaidExportContainNodesAndEdges() throws IOException {
        Path file = dir.resolve("SAMPLE-TC-001-x.bnrest.md");
        Files.writeString(file, """
                ---
                id: SAMPLE-TC-001
                number: 1
                type: Test Case
                title: Sample
                owner: QA
                status: Active
                tags: []
                ---
                ```bnrest
                Get /api/v1/admin/children/stats Into r
                ```
                """);
        Script s = new ScriptParser().parse(file);
        DependencyGraph graph = DependencyGraph.build(List.of(s));

        Path graphJson = dir.resolve("graphs/graph.json");
        new GraphJsonExporter().write(graph, Map.of(), graphJson);
        String json = readOrFail(graphJson);
        assertTrue(json.contains("SAMPLE-TC-001"));
        assertTrue(json.contains("CALLS_ENDPOINT"));

        Path mermaid = dir.resolve("graphs/graph.mmd");
        new MermaidExporter().write(graph, mermaid);
        assertTrue(readOrFail(mermaid).startsWith("flowchart TD"));
    }

    private static String readOrFail(Path p) {
        try {
            return Files.readString(p);
        } catch (IOException e) {
            throw new AssertionError(e);
        }
    }
}
