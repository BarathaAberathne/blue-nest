# ── Build stage ───────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app
COPY pom.xml .
# Warm the dependency cache in its own layer so source-only changes don't
# re-download the world.
RUN mvn -q -B dependency:go-offline || true

COPY src ./src
RUN mvn -q -B package -DskipTests

# ── Runtime stage ─────────────────────────────────────────────────────────────
# (the -alpine variant has no arm64 manifest for this tag; plain -jre does)
FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=builder /app/target/testplatform-engine-1.0.0-cli.jar ./bnrest-cli.jar

# tests/ and results/ are bind-mounted at run time (docker-compose.test.yml) —
# no test scripts or secrets are baked into this image.
ENTRYPOINT ["java", "-jar", "/app/bnrest-cli.jar"]
CMD ["run", "--testsRoot=/app/tests", "--resultsRoot=/app/results"]
