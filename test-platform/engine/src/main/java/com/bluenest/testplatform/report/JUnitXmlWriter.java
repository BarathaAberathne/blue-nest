package com.bluenest.testplatform.report;

import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.RunReport;
import com.bluenest.testplatform.model.RunStatus;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Standard JUnit XML so existing CI tooling can read bnrest results (spec §15/§21). */
public final class JUnitXmlWriter {

    public void write(RunReport report, Path junitDir) {
        try {
            Files.createDirectories(junitDir);
            Map<String, List<CaseResult>> bySuite = new LinkedHashMap<>();
            for (CaseResult c : report.cases) {
                bySuite.computeIfAbsent(c.suiteId == null ? "(none)" : c.suiteId, k -> new java.util.ArrayList<>()).add(c);
            }
            for (var entry : bySuite.entrySet()) {
                Path file = junitDir.resolve("TEST-" + safe(entry.getKey()) + ".xml");
                Files.writeString(file, render(entry.getKey(), entry.getValue()));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write JUnit XML to " + junitDir + ": " + e.getMessage(), e);
        }
    }

    private String render(String suiteId, List<CaseResult> cases) {
        long failures = cases.stream().filter(c -> c.status == RunStatus.FAILED).count();
        long skipped = cases.stream().filter(c -> c.status == RunStatus.BLOCKED || c.status == RunStatus.SKIPPED).count();
        double totalTimeSeconds = cases.stream().mapToLong(c -> c.durationMs).sum() / 1000.0;

        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append(String.format(
                "<testsuite name=\"%s\" tests=\"%d\" failures=\"%d\" errors=\"0\" skipped=\"%d\" time=\"%.3f\">\n",
                esc(suiteId), cases.size(), failures, skipped, totalTimeSeconds));
        for (CaseResult c : cases) {
            sb.append(String.format("  <testcase name=\"%s\" classname=\"%s\" time=\"%.3f\">\n",
                    esc(c.title == null ? c.caseId : c.title), esc(suiteId), c.durationMs / 1000.0));
            if (c.status == RunStatus.FAILED) {
                sb.append("    <failure message=\"").append(esc(String.valueOf(c.errorMessage))).append("\">")
                        .append(esc(String.valueOf(c.failedAssertion))).append("</failure>\n");
            } else if (c.status == RunStatus.BLOCKED || c.status == RunStatus.SKIPPED) {
                sb.append("    <skipped message=\"").append(esc(String.valueOf(c.skippedReason))).append("\"/>\n");
            }
            sb.append("  </testcase>\n");
        }
        sb.append("</testsuite>\n");
        return sb.toString();
    }

    private static String safe(String s) {
        return s.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
