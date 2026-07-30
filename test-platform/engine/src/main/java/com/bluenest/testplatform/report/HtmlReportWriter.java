package com.bluenest.testplatform.report;

import com.bluenest.testplatform.model.CaseResult;
import com.bluenest.testplatform.model.RunReport;
import com.bluenest.testplatform.model.RunStatus;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * A single, dependency-free static HTML file (inline JSON + vanilla JS, no
 * build step) for CI artifacts (spec §14/§15) — deliberately separate from
 * the Next.js visual mapper, which needs `npm run dev` to view.
 */
public final class HtmlReportWriter {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public void write(RunReport report, Path outFile) {
        try {
            Files.createDirectories(outFile.getParent());
            Files.writeString(outFile, render(report));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write HTML report to " + outFile + ": " + e.getMessage(), e);
        }
    }

    private String render(RunReport report) throws IOException {
        String dataJson = MAPPER.writeValueAsString(report);
        long passed = report.passed();
        long failed = report.failed();
        long skipped = report.skipped();

        StringBuilder rows = new StringBuilder();
        for (CaseResult c : report.cases) {
            String statusClass = switch (c.status) {
                case PASSED -> "pass";
                case FAILED -> "fail";
                case BLOCKED, SKIPPED -> "skip";
                default -> "other";
            };
            String reason = c.status == RunStatus.FAILED ? nullToEmpty(c.errorMessage)
                    : c.status == RunStatus.BLOCKED ? nullToEmpty(c.skippedReason) : "";
            rows.append("<tr class=\"").append(statusClass).append("\"><td>").append(esc(c.caseId))
                    .append("</td><td>").append(esc(c.suiteId)).append("</td><td>").append(esc(c.title))
                    .append("</td><td>").append(c.status).append("</td><td>").append(c.durationMs)
                    .append("ms</td><td>").append(esc(reason)).append("</td></tr>\n");
        }

        return "<!doctype html><html><head><meta charset=\"utf-8\"><title>BlueNest TestFlow report — " + esc(report.runId) + "</title>"
                + "<style>"
                + "body{font-family:system-ui,sans-serif;margin:2rem;color:#1a1a1a}"
                + "table{border-collapse:collapse;width:100%}"
                + "td,th{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:14px}"
                + "tr.pass{background:#eafaf0}tr.fail{background:#fdecea}tr.skip{background:#fff8e6}"
                + ".summary{display:flex;gap:1.5rem;margin-bottom:1rem}"
                + ".chip{padding:.4rem .8rem;border-radius:999px;font-weight:600}"
                + ".chip.pass{background:#d7f5e3}.chip.fail{background:#fbdcd8}.chip.skip{background:#fdf1cf}"
                + "</style></head><body>"
                + "<h1>BlueNest TestFlow report</h1>"
                + "<p>Run <code>" + esc(report.runId) + "</code> — " + esc(report.environment)
                + " @ " + esc(report.baseUrl) + " — commit <code>" + esc(report.gitCommit) + "</code></p>"
                + "<div class=\"summary\">"
                + "<span class=\"chip pass\">" + passed + " passed</span>"
                + "<span class=\"chip fail\">" + failed + " failed</span>"
                + "<span class=\"chip skip\">" + skipped + " skipped/blocked</span>"
                + "</div>"
                + "<table><thead><tr><th>Case</th><th>Suite</th><th>Title</th><th>Status</th><th>Duration</th><th>Reason</th></tr></thead>"
                + "<tbody>\n" + rows + "</tbody></table>"
                + "<script type=\"application/json\" id=\"bnrest-data\">" + dataJson.replace("</script", "<\\/script") + "</script>"
                + "</body></html>";
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
