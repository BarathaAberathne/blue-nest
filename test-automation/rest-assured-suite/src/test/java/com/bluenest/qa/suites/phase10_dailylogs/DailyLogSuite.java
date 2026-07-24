package com.bluenest.qa.suites.phase10_dailylogs;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 16 — Daily Logs (practitioner daily records).
 *
 * <p>Source: QA test plan §7 Phase 16 (TC-LOG-001..006: meal log, sleep log,
 * nappy/toileting log, activity/observation log, accident/incident record,
 * daily summary aggregation).
 *
 * <p><b>Plan-vs-system adaptation (verified directly against
 * {@code backend/internal/models/daily_record.go} — not assumed):</b> the
 * real {@code DailyRecordType} enum is only {@code observation | incident |
 * safeguarding | medication | meal} — there is no separate sleep type and no
 * nappy/toileting type anywhere server-side (no fields, no enum value, no
 * frontend route). Plan cases 002 (sleep) and 003 (nappy/toileting) are
 * therefore genuinely **N/A-by-design, not a coverage gap** — unlike
 * TC-VISIT-* in {@code EnquiryRegistrationSuite}, there is no adjacent
 * concept to express them through, so no test method exists for them (a
 * fabricated one would just be testing the {@code observation} type twice).
 * Likewise the plan's "draft/published states" for the activity/observation
 * log doesn't exist — every record type shares one {@code status} field
 * ({@code open|resolved|administered|logged}, defaulted per type on create)
 * with no draft concept; TC-LOG-004b below exercises that real status
 * lifecycle instead.
 *
 * <p><b>Documented characteristic (not a bug, not fixed here):</b> {@code
 * DELETE /admin/daily-records/{id}} is a genuine hard delete (no
 * soft-delete/archive flag exists in the model) — the plan's "no silent
 * delete" requirement is met only via the admin audit log (every delete is
 * {@code audit.Record}-ed), not by preventing or archiving the delete
 * itself. TC-LOG-005b below regression-locks exactly that: the record is
 * genuinely gone (404 after) AND the deletion is captured in {@code
 * /admin/audit-logs}.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 16 — Daily Logs")
class DailyLogSuite {

    private static String adminToken;

    @BeforeAll
    static void login() {
        adminToken = Api.loginAsAdmin();
    }

    private static Map<String, Object> baseBody(String type, String title) {
        Map<String, Object> body = new HashMap<>();
        body.put("type", type);
        body.put("title", title);
        body.put("branch_slug", Env.HARROW_BRANCH_SLUG);
        return body;
    }

    @Test
    @Order(1)
    @DisplayName("TC-LOG-001: A meal log is created with meal_type/eaten, a minted ref, and the type's default status")
    @Tag("golden-path")
    void tc_log_001_mealLogCreated() {
        Map<String, Object> body = baseBody("meal", "QA-AUTOTEST Lunch served");
        body.put("meal_type", "lunch");
        body.put("eaten", "most");

        given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/daily-records")
                .then().statusCode(201)
                .body("data.type", equalTo("meal"))
                .body("data.meal_type", equalTo("lunch"))
                .body("data.eaten", equalTo("most"))
                .body("data.status", equalTo("logged")) // meal defaults to "logged", not "open"
                .body("data.ref", matchesPattern("LOG-\\d{4}-\\d{6}"));
    }

    @Test
    @Order(2)
    @DisplayName("TC-LOG-001b (validation): a record with no title is rejected")
    @Tag("regression")
    void tc_log_001b_missingTitleRejected() {
        Map<String, Object> body = new HashMap<>();
        body.put("type", "meal");
        body.put("branch_slug", Env.HARROW_BRANCH_SLUG);

        given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/daily-records")
                .then().statusCode(400).body("error", containsStringIgnoringCase("title"));
    }

    @Test
    @Order(3)
    @DisplayName("TC-LOG-001c (validation): a record with no branch_slug is rejected")
    @Tag("regression")
    void tc_log_001c_missingBranchRejected() {
        Map<String, Object> body = new HashMap<>();
        body.put("type", "meal");
        body.put("title", "QA-AUTOTEST no branch");

        given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/daily-records")
                .then().statusCode(400).body("error", containsStringIgnoringCase("branch"));
    }

    @Test
    @Order(4)
    @DisplayName("TC-LOG-001d (regression): an unknown field in the request body is rejected, not silently ignored")
    @Tag("regression")
    void tc_log_001d_unknownFieldRejected() {
        given().spec(Api.authed(adminToken))
                .body("{\"type\":\"meal\",\"title\":\"QA-AUTOTEST unknown field\",\"branch_slug\":\"" + Env.HARROW_BRANCH_SLUG + "\",\"sleep_start\":\"12:00\"}")
                .when().post("/api/v1/admin/daily-records")
                .then().statusCode(400);
    }

    @Test
    @Order(5)
    @DisplayName("TC-LOG-004: An activity/observation log persists its EYFS areas and next steps")
    @Tag("golden-path")
    void tc_log_004_observationWithEyfsAreas() {
        Map<String, Object> body = baseBody("observation", "QA-AUTOTEST Independent mark-making");
        body.put("detail", "Drew shapes unprompted during free play");
        body.put("eyfs_areas", List.of("Literacy", "Physical Development"));
        body.put("next_steps", "Offer more mark-making tools");

        given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/daily-records")
                .then().statusCode(201)
                .body("data.eyfs_areas", containsInAnyOrder("Literacy", "Physical Development"))
                .body("data.next_steps", equalTo("Offer more mark-making tools"))
                .body("data.status", equalTo("logged")); // observation also defaults to "logged" — no draft state exists
    }

    @Test
    @Order(6)
    @DisplayName("TC-LOG-004b: An observation's status can be moved through its real lifecycle (logged -> resolved)")
    void tc_log_004b_statusLifecycle() {
        Response created = given().spec(Api.authed(adminToken))
                .body(baseBody("observation", "QA-AUTOTEST status lifecycle"))
                .when().post("/api/v1/admin/daily-records");
        created.then().statusCode(201);
        String id = created.jsonPath().getString("data.id");

        given().spec(Api.authed(adminToken))
                .body(Map.of("status", "resolved"))
                .when().patch("/api/v1/admin/daily-records/" + id + "/status")
                .then().statusCode(200).body("data.status", equalTo("resolved"));

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/daily-records/" + id);
    }

    @Test
    @Order(7)
    @DisplayName("TC-LOG-005: An incident/accident record defaults to status Open and keeps its severity")
    @Tag("golden-path")
    @Tag("safeguarding")
    void tc_log_005_incidentRecordCreated() {
        Map<String, Object> body = baseBody("incident", "QA-AUTOTEST Minor trip in garden");
        body.put("detail", "Grazed knee, cleaned and plaster applied. Parent notified.");
        body.put("severity", "low");

        given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/daily-records")
                .then().statusCode(201)
                .body("data.type", equalTo("incident"))
                .body("data.status", equalTo("open")) // incident defaults to "open", unlike meal/observation
                .body("data.severity", equalTo("low"));
    }

    @Test
    @Order(8)
    @DisplayName("TC-LOG-005b (regression, safeguarding): deleting an incident is a real, non-recoverable delete — but is captured in the audit log")
    @Tag("regression")
    @Tag("safeguarding")
    void tc_log_005b_deleteIsHardButAudited() {
        Response created = given().spec(Api.authed(adminToken))
                .body(baseBody("incident", "QA-AUTOTEST delete-and-audit check"))
                .when().post("/api/v1/admin/daily-records");
        created.then().statusCode(201);
        String id = created.jsonPath().getString("data.id");

        given().spec(Api.authed(adminToken))
                .when().delete("/api/v1/admin/daily-records/" + id)
                .then().statusCode(204);

        // Then the record is genuinely gone (a hard delete, not an archive)...
        given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/daily-records/" + id)
                .then().statusCode(404);

        // ...but the deletion itself left an audit trail, so it's traceable
        // even though it isn't reversible or blocked.
        Response audit = given().spec(Api.authed(adminToken))
                .queryParam("entity_type", "daily_record")
                .queryParam("action", "delete")
                .queryParam("limit", "50")
                .when().get("/api/v1/admin/audit-logs");
        audit.then().statusCode(200);
        List<Map<String, Object>> entries = audit.jsonPath().getList("data");
        boolean found = entries.stream().anyMatch(e -> id.equals(e.get("entity_id")));
        Assertions.assertTrue(found, "expected an audit_logs entry for the deleted daily_record id " + id);
    }

    @Test
    @Order(9)
    @DisplayName("TC-LOG-006: The daily summary aggregation is well-formed and includes a by_type breakdown")
    void tc_log_006_dailySummaryWellFormed() {
        given().spec(Api.authed(adminToken))
                .queryParam("branch", Env.HARROW_BRANCH_SLUG)
                .when().get("/api/v1/admin/daily-records/stats")
                .then().statusCode(200)
                .body("data.date", not(emptyOrNullString()))
                .body("data.meals_served", greaterThanOrEqualTo(0))
                .body("data.by_type", not(empty()))
                .body("data.by_type.label", hasItems("meal", "incident", "observation"));
    }

    @Test
    @Order(10)
    @DisplayName("TC-LOG-006b: Fetching a nonexistent daily record is rejected with 404, not a 500")
    void tc_log_006b_unknownRecordRejected() {
        given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/daily-records/000000000000000000000000")
                .then().statusCode(404);
    }
}
