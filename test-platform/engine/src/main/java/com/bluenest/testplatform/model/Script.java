package com.bluenest.testplatform.model;

import java.nio.file.Path;
import java.util.List;

/** A fully-parsed {@code .bnrest.md} file: front matter + its statement AST. */
public final class Script {
    public final Metadata metadata;
    public final Path sourceFile;
    public final List<Statement> setup;
    public final List<Statement> body;
    public final List<Statement> teardown;

    public Script(Metadata metadata, Path sourceFile,
                   List<Statement> setup, List<Statement> body, List<Statement> teardown) {
        this.metadata = metadata;
        this.sourceFile = sourceFile;
        this.setup = setup;
        this.body = body;
        this.teardown = teardown;
    }

    public String id() {
        return metadata.id;
    }
}
