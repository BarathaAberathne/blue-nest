package com.bluenest.testplatform.eval;

import java.util.function.Function;

/**
 * Resolves {@code ${secret:NAME}} / {@code secret(NAME)} references. Secrets
 * come ONLY from environment variables (which is how CI secrets and Docker
 * secrets are surfaced to a process) — never from a file in the repo. See
 * spec §2/§6 and docs/testing/writing-tests.md.
 */
public final class SecretResolver {

    private final Function<String, String> envLookup;

    public SecretResolver() {
        this(System::getenv);
    }

    /** Testable constructor — inject a fake env-var lookup instead of the real environment. */
    public SecretResolver(Function<String, String> envLookup) {
        this.envLookup = envLookup;
    }

    public String resolve(String name) {
        String value = envLookup.apply(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Secret '" + name + "' is not set. Export it as an environment "
                    + "variable before running (never commit it to a script file) — see docs/testing/writing-tests.md.");
        }
        return value;
    }
}
