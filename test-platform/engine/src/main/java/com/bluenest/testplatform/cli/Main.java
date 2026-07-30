package com.bluenest.testplatform.cli;

import com.bluenest.testplatform.discovery.TestSelector;
import com.bluenest.testplatform.eval.VariableScope;
import com.bluenest.testplatform.exec.RunOrchestrator;
import com.bluenest.testplatform.exec.ScriptRepository;
import com.bluenest.testplatform.graph.DependencyGraph;
import com.bluenest.testplatform.graph.ValidationIssue;
import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.RunReport;
import com.bluenest.testplatform.model.RunStatus;
import com.bluenest.testplatform.model.Script;
import com.bluenest.testplatform.report.GraphJsonExporter;
import com.bluenest.testplatform.report.HtmlReportWriter;
import com.bluenest.testplatform.report.JUnitXmlWriter;
import com.bluenest.testplatform.report.JsonReportWriter;
import com.bluenest.testplatform.report.MermaidExporter;

import java.io.IOException;
import java.nio.file.Path;
import java.util.*;

/**
 * The single CLI entrypoint every {@code make test-*} target wraps (spec
 * §16) — one authoritative implementation of discover/validate/run/report/
 * graph, not 19 bespoke scripts.
 */
public final class Main {

    public static void main(String[] args) {
        if (args.length == 0) {
            printUsage();
            System.exit(1);
        }
        String sub = args[0];
        Map<String, String> opts = parseOpts(args);

        Path testsRoot = Path.of(opts.getOrDefault("testsRoot", "../tests")).toAbsolutePath().normalize();
        Path resultsRoot = Path.of(opts.getOrDefault("resultsRoot", "../../test-results")).toAbsolutePath().normalize();

        ScriptRepository repo = ScriptRepository.discover(testsRoot);
        DependencyGraph graph = DependencyGraph.build(repo.all().values());
        graph.validate();

        switch (sub) {
            case "discover" -> discover(repo);
            case "validate" -> validate(graph);
            case "run" -> run(repo, graph, opts, resultsRoot);
            case "graph" -> exportGraph(graph, resultsRoot, loadLatestResults(resultsRoot));
            case "report" -> System.out.println("Use 'run' — reports are generated as part of every run.");
            default -> {
                System.err.println("Unknown subcommand: " + sub);
                printUsage();
                System.exit(1);
            }
        }
    }

    private static void discover(ScriptRepository repo) {
        repo.all().values().stream()
                .sorted(Comparator.comparing(Script::id))
                .forEach(s -> System.out.printf("%-8s %-20s %-6s %s%n",
                        s.metadata.type.name(), s.id(), s.metadata.number, s.metadata.title));
        System.out.println(repo.all().size() + " scripts discovered.");
    }

    private static void validate(DependencyGraph graph) {
        if (graph.issues.isEmpty()) {
            System.out.println("OK — no validation issues.");
            return;
        }
        for (ValidationIssue issue : graph.issues) {
            System.out.println(issue);
        }
        long errors = graph.issues.stream().filter(ValidationIssue::isError).count();
        System.out.println(graph.issues.size() + " issue(s), " + errors + " error(s).");
        if (graph.hasErrors()) {
            System.exit(1);
        }
    }

    private static void run(ScriptRepository repo, DependencyGraph graph, Map<String, String> opts, Path resultsRoot) {
        if (graph.hasErrors()) {
            System.err.println("Refusing to run — validation errors present:");
            graph.issues.stream().filter(ValidationIssue::isError).forEach(System.err::println);
            System.exit(1);
            return;
        }

        String baseUrl = opts.getOrDefault("baseUrl", System.getenv().getOrDefault("QA_BASE_URL", "http://localhost:8080"));
        String runId = UUID.randomUUID().toString();
        RunOrchestrator orchestrator = new RunOrchestrator(repo, baseUrl, runId);

        VariableScope runScope = new VariableScope(null);
        var config = VariableScope.newObject();
        config.put("baseUrl", baseUrl);
        config.putObject("users").putObject("director").put("email", opts.getOrDefault("adminEmail",
                System.getenv().getOrDefault("QA_ADMIN_EMAIL", "admin@bluenest.uk")));
        runScope.set("config", config);

        long startedAt = System.currentTimeMillis();
        List<CaseResult> results = selectAndRun(repo, graph, opts, orchestrator, runScope);
        long finishedAt = System.currentTimeMillis();

        RunReport report = new RunReport();
        report.runId = runId;
        report.environment = opts.getOrDefault("env", "local");
        report.baseUrl = baseUrl;
        report.gitCommit = gitCommit();
        report.startedAtEpochMs = startedAt;
        report.finishedAtEpochMs = finishedAt;
        report.cases = results;

        writeReports(report, graph, resultsRoot);

        System.out.printf("Run %s: %d passed, %d failed, %d skipped/blocked (of %d)%n",
                runId, report.passed(), report.failed(), report.skipped(), report.cases.size());
        for (CaseResult c : report.cases) {
            if (c.status == RunStatus.FAILED) {
                System.out.println("  FAILED " + c.caseId + ": " + c.errorMessage);
            } else if (c.status == RunStatus.BLOCKED) {
                System.out.println("  SKIPPED " + c.caseId + ": " + c.skippedReason);
            }
        }
        if (report.failed() > 0) {
            System.exit(1);
        }
    }

    private static List<CaseResult> selectAndRun(ScriptRepository repo, DependencyGraph graph,
                                                  Map<String, String> opts, RunOrchestrator orchestrator,
                                                  VariableScope runScope) {
        if (opts.containsKey("case")) {
            Script s = repo.byId(opts.get("case"));
            requireFound(s, opts.get("case"));
            return orchestrator.runStandaloneCase(s, runScope);
        }
        if (opts.containsKey("suite")) {
            Script s = repo.byId(opts.get("suite"));
            requireFound(s, opts.get("suite"));
            return orchestrator.runSuite(s, "(direct)", runScope);
        }
        if (opts.containsKey("collection")) {
            Script s = repo.byId(opts.get("collection"));
            requireFound(s, opts.get("collection"));
            return orchestrator.runCollection(s, runScope);
        }
        if (opts.containsKey("tag") || opts.containsKey("owner") || opts.containsKey("file")) {
            Set<String> ids = new LinkedHashSet<>();
            if (opts.containsKey("tag")) ids.addAll(TestSelector.byTag(repo.all(), opts.get("tag")));
            if (opts.containsKey("owner")) ids.addAll(TestSelector.byOwner(repo.all(), opts.get("owner")));
            if (opts.containsKey("file")) ids.addAll(TestSelector.byFile(repo.all(), Path.of(opts.get("file"))));
            List<CaseResult> out = new ArrayList<>();
            for (String id : ids) {
                Script s = repo.byId(id);
                if (s != null && s.metadata.type == com.bluenest.testplatform.model.ScriptType.TEST_CASE) {
                    out.addAll(orchestrator.runStandaloneCase(s, runScope));
                }
            }
            return out;
        }
        // Default: the Harrow lifecycle collection if it exists, else every discovered case.
        Script defaultCollection = repo.byId("COL-FUNC-001");
        if (defaultCollection != null) {
            return orchestrator.runCollection(defaultCollection, runScope);
        }
        List<CaseResult> out = new ArrayList<>();
        repo.all().values().stream()
                .filter(s -> s.metadata.type == com.bluenest.testplatform.model.ScriptType.TEST_CASE)
                .sorted(Comparator.comparing(Script::id))
                .forEach(s -> out.addAll(orchestrator.runStandaloneCase(s, runScope)));
        return out;
    }

    private static void requireFound(Script s, String id) {
        if (s == null) {
            System.err.println("No such test id: '" + id + "'");
            System.exit(1);
        }
    }

    private static void writeReports(RunReport report, DependencyGraph graph, Path resultsRoot) {
        new JsonReportWriter().write(report, resultsRoot.resolve("json/run-" + report.runId + ".json"));
        new JsonReportWriter().writeRequestTraces(report, resultsRoot.resolve("requests"));
        new JUnitXmlWriter().write(report, resultsRoot.resolve("junit"));
        new HtmlReportWriter().write(report, resultsRoot.resolve("html/index.html"));

        Map<String, CaseResult> latest = new LinkedHashMap<>();
        report.cases.forEach(c -> latest.put(c.caseId, c));
        exportGraph(graph, resultsRoot, latest);
    }

    /**
     * The standalone {@code graph} subcommand (e.g. {@code make test-map} run
     * on its own, not right after a {@code run}) needs to reflect the last
     * known results rather than blanking every node back to NOT_RUN — loads
     * the most recently modified {@code run-*.json} under {@code json/}, if any.
     */
    private static Map<String, CaseResult> loadLatestResults(Path resultsRoot) {
        Path jsonDir = resultsRoot.resolve("json");
        if (!java.nio.file.Files.isDirectory(jsonDir)) {
            return Map.of();
        }
        try (var files = java.nio.file.Files.list(jsonDir)) {
            Optional<Path> latestFile = files
                    .filter(p -> p.getFileName().toString().startsWith("run-") && p.toString().endsWith(".json"))
                    .max(Comparator.comparingLong(p -> p.toFile().lastModified()));
            if (latestFile.isEmpty()) {
                return Map.of();
            }
            RunReport report = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(latestFile.get().toFile(), RunReport.class);
            Map<String, CaseResult> byId = new LinkedHashMap<>();
            report.cases.forEach(c -> byId.put(c.caseId, c));
            return byId;
        } catch (IOException e) {
            System.err.println("Warning: could not load previous run results for the graph export: " + e.getMessage());
            return Map.of();
        }
    }

    private static void exportGraph(DependencyGraph graph, Path resultsRoot, Map<String, CaseResult> latest) {
        new GraphJsonExporter().write(graph, latest, resultsRoot.resolve("graphs/graph.json"));
        new MermaidExporter().write(graph, resultsRoot.resolve("graphs/graph.mmd"));
    }

    private static String gitCommit() {
        try {
            Process p = new ProcessBuilder("git", "rev-parse", "--short", "HEAD").start();
            String out = new String(p.getInputStream().readAllBytes()).trim();
            p.waitFor();
            return out.isBlank() ? "unknown" : out;
        } catch (IOException | InterruptedException e) {
            return "unknown";
        }
    }

    private static Map<String, String> parseOpts(String[] args) {
        Map<String, String> opts = new LinkedHashMap<>();
        for (int i = 1; i < args.length; i++) {
            String a = args[i];
            if (a.startsWith("--")) {
                String kv = a.substring(2);
                int eq = kv.indexOf('=');
                if (eq >= 0) {
                    opts.put(kv.substring(0, eq), kv.substring(eq + 1));
                } else if (i + 1 < args.length) {
                    opts.put(kv, args[++i]);
                } else {
                    opts.put(kv, "true");
                }
            }
        }
        return opts;
    }

    private static void printUsage() {
        System.out.println("""
                Usage: bnrest <discover|validate|run|graph> [--testsRoot=DIR] [--resultsRoot=DIR]
                                [--baseUrl=URL] [--suite=ID] [--case=ID] [--collection=ID]
                                [--tag=TAG] [--owner=OWNER] [--file=PATH]
                """);
    }
}
