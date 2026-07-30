package com.bluenest.testplatform.report;

import com.bluenest.testplatform.model.RunReport;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Writes the run's full result set as JSON (spec §15 {@code test-results/json/}). */
public final class JsonReportWriter {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    public void write(RunReport report, Path outFile) {
        try {
            Files.createDirectories(outFile.getParent());
            Files.writeString(outFile, MAPPER.writeValueAsString(report));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write JSON report to " + outFile + ": " + e.getMessage(), e);
        }
    }

    /** Per-case request trace, redacted, one file per case (spec §15 {@code test-results/requests/}). */
    public void writeRequestTraces(RunReport report, Path requestsDir) {
        try {
            Files.createDirectories(requestsDir);
            // StepTrace only ever carries status/timing/hash metadata — never a raw
            // request/response body — so there is nothing further to redact here;
            // see Redactor and StepTrace for where sensitive values are kept out in
            // the first place.
            for (var c : report.cases) {
                String safeName = c.caseId.replaceAll("[^A-Za-z0-9._-]", "_");
                Files.writeString(requestsDir.resolve(safeName + ".json"),
                        MAPPER.writeValueAsString(c.steps));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write request traces to " + requestsDir + ": " + e.getMessage(), e);
        }
    }
}
