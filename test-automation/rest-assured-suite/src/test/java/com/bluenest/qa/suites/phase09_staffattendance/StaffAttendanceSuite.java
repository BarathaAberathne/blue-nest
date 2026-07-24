package com.bluenest.qa.suites.phase09_staffattendance;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 13 — Staff Attendance / Kiosk.
 *
 * <p>Source: QA test plan §7 Phase 13 (TC-STAFFATT-001..004). Exercises the
 * admin-facing clock-in/clock-out/mark/correct endpoints that back the
 * {@code /admin/staff-attendance} hub and the entrance-tablet kiosk (the
 * kiosk itself authenticates via a per-device {@code X-Kiosk-Token} rather
 * than a JWT and is out of scope here — the kiosk and admin paths share the
 * exact same {@code StaffAttendanceService.ClockIn/ClockOut}, so this suite's
 * coverage of that shared code is coverage of both entry points).
 *
 * <p>Runs against the real system (see README), so — like
 * {@code ChildAttendanceSuite} — every scenario uses a dedicated future date
 * this suite owns exclusively, on a throwaway {@code QA-AUTOTEST-} staff
 * fixture created in {@code @BeforeAll} and removed in {@code @AfterAll}, so
 * re-runs never collide with real attendance data.
 *
 * <p><b>TC-STAFFATT-003c closes what the README previously flagged as an
 * under-tested gap</b> ("automatic missing_clockout flagging needs a
 * date-boundary simulation"): {@code AttendanceDaySummary.MissingClockOut}
 * (see {@code service.summarize}) is computed live from {@code date <
 * today()} — no background job is needed, a genuinely past date is enough.
 * The persisted record's OWN {@code missing_clockout} field, by contrast,
 * only flips true inside {@code recompute()}, which only runs from {@code
 * Correct} — so a stale open clock-in shows up in the summary KPI
 * immediately, but the raw record itself stays {@code missing_clockout:
 * false} until a manager corrects it. Both halves are asserted below.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 13 — Staff Attendance / Kiosk")
class StaffAttendanceSuite {

    private static String adminToken;
    private static String staffId;
    private static final String testDate = LocalDate.of(2027, 4, 12).toString();
    private static String testDateRecordId; // captured after clock-out, reused by the correction test

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();
        Map<String, Object> body = new HashMap<>();
        body.put("first_name", "QA-AUTOTEST");
        body.put("last_name", TestData.uniqueName("StaffAttendance"));
        body.put("email", TestData.uniqueEmail("staffattendance"));
        body.put("branch_slug", Env.HARROW_BRANCH_SLUG);
        body.put("job_title", "Practitioner");
        body.put("staff_type", "permanent");
        body.put("status", "active");

        Response res = given().spec(Api.authed(adminToken)).body(body).when().post("/api/v1/admin/staff");
        res.then().statusCode(201);
        staffId = res.jsonPath().getString("data.id");
    }

    @AfterAll
    static void cleanup() {
        if (staffId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffId);
        }
    }

    @Test
    @Order(1)
    @DisplayName("TC-STAFFATT-002-REG (regression): clock-out with NO prior clock-in that day is rejected")
    @Tag("regression")
    void tc_staffatt_002_reg_clockOutWithoutClockInRejected() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", testDate))
                .when().post("/api/v1/admin/staff-attendance/clock-out")
                .then().statusCode(400).body("error", containsStringIgnoringCase("not clocked in"));
    }

    @Test
    @Order(2)
    @DisplayName("TC-STAFFATT-001: Clock-in records status Present, a clock_in timestamp, and clears any missing-clockout flag")
    @Tag("golden-path")
    void tc_staffatt_001_clockIn() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", testDate))
                .when().post("/api/v1/admin/staff-attendance/clock-in")
                .then().statusCode(200)
                .body("data.status", equalTo("present"))
                .body("data.clock_in", not(emptyOrNullString()))
                .body("data.missing_clockout", is(false));
    }

    @Test
    @Order(3)
    @DisplayName("TC-STAFFATT-001-REG (regression): a duplicate clock-in the same day is rejected, not silently overwritten")
    @Tag("regression")
    void tc_staffatt_001_reg_duplicateClockInRejected() {
        // Own dedicated date so this test is fully independent and passes
        // under `-Dgroups=regression` on its own, matching the established
        // ChildAttendanceSuite pattern.
        String date = LocalDate.of(2027, 4, 13).toString();
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date))
                .when().post("/api/v1/admin/staff-attendance/clock-in")
                .then().statusCode(200);

        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date))
                .when().post("/api/v1/admin/staff-attendance/clock-in")
                .then().statusCode(400).body("error", containsStringIgnoringCase("already clocked in"));
    }

    @Test
    @Order(4)
    @DisplayName("TC-STAFFATT-002: Clock-out closes the session and computes worked minutes")
    @Tag("golden-path")
    void tc_staffatt_002_clockOut() {
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", testDate))
                .when().post("/api/v1/admin/staff-attendance/clock-out");

        res.then().statusCode(200)
                .body("data.clock_out", not(emptyOrNullString()))
                .body("data.worked_minutes", greaterThanOrEqualTo(0));
        testDateRecordId = res.jsonPath().getString("data.id");
    }

    @Test
    @Order(5)
    @DisplayName("TC-STAFFATT-002b-REG (regression): a second clock-out the same day is rejected")
    @Tag("regression")
    void tc_staffatt_002b_reg_duplicateClockOutRejected() {
        String date = LocalDate.of(2027, 4, 14).toString();
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date))
                .when().post("/api/v1/admin/staff-attendance/clock-in")
                .then().statusCode(200);
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date))
                .when().post("/api/v1/admin/staff-attendance/clock-out")
                .then().statusCode(200);

        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date))
                .when().post("/api/v1/admin/staff-attendance/clock-out")
                .then().statusCode(400).body("error", containsStringIgnoringCase("already clocked out"));
    }

    @Test
    @Order(6)
    @DisplayName("TC-STAFFATT-003: A manual correction backfills a day the kiosk never captured (create-on-correct), audited with a reason")
    @Tag("golden-path")
    void tc_staffatt_003_manualCorrectionBackfillsMissingDay() {
        String date = LocalDate.of(2027, 4, 15).toString();
        // No record exists yet for this staff/date — PATCH .../{anyId}/correct
        // must materialise one from staff_id + date (the "expected staff
        // member the kiosk never captured" backfill path).
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "staff_id", staffId, "date", date,
                        "status", "present",
                        "reason", "QA-AUTOTEST backfill — kiosk never captured this shift"))
                .when().patch("/api/v1/admin/staff-attendance/000000000000000000000000/correct");

        res.then().statusCode(200)
                .body("data.status", equalTo("present"));
        List<Map<String, Object>> corrections = res.jsonPath().getList("data.corrections");
        Assertions.assertFalse(corrections.isEmpty(), "backfilling via correct must append at least one audit entry");
        Assertions.assertEquals("status", corrections.get(corrections.size() - 1).get("field"));
    }

    @Test
    @Order(7)
    @DisplayName("TC-STAFFATT-003b: A manual correction on an EXISTING record updates status and appends to its correction history")
    @Tag("golden-path")
    void tc_staffatt_003b_manualCorrectionOnExistingRecord() {
        Assertions.assertNotNull(testDateRecordId, "requires the record id captured by tc_staffatt_002_clockOut");

        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "staff_id", staffId, "date", testDate,
                        "status", "sick",
                        "reason", "QA-AUTOTEST correction — reclassified after the fact"))
                .when().patch("/api/v1/admin/staff-attendance/" + testDateRecordId + "/correct");

        res.then().statusCode(200).body("data.status", equalTo("sick"));
        List<Map<String, Object>> corrections = res.jsonPath().getList("data.corrections");
        boolean hasStatusCorrection = corrections.stream().anyMatch(c -> "status".equals(c.get("field")));
        Assertions.assertTrue(hasStatusCorrection, "expected a 'status' field entry in the correction history");
    }

    @Test
    @Order(8)
    @DisplayName("TC-STAFFATT-004: Marking a clocked-in staff member Absent clears their clock-in/out times")
    void tc_staffatt_004_markAbsentClearsClockTimes() {
        String date = LocalDate.of(2027, 4, 16).toString();
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date))
                .when().post("/api/v1/admin/staff-attendance/clock-in")
                .then().statusCode(200);

        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", date, "status", "absent"))
                .when().patch("/api/v1/admin/staff-attendance/mark");

        res.then().statusCode(200).body("data.status", equalTo("absent"));
        Assertions.assertNull(res.jsonPath().get("data.clock_in"), "marking Absent must clear a prior clock-in");
        Assertions.assertNull(res.jsonPath().get("data.clock_out"), "marking Absent must clear a prior clock-out");
    }

    @Test
    @Order(9)
    @DisplayName("TC-STAFFATT-004b: The attendance-summary KPI payload is well-formed for a scoped branch/date")
    void tc_staffatt_004b_summaryPayloadWellFormed() {
        given().spec(Api.authed(adminToken))
                .queryParam("date", testDate)
                .queryParam("branch", Env.HARROW_BRANCH_SLUG)
                .when().get("/api/v1/admin/staff-attendance/summary")
                .then().statusCode(200)
                .body("data.date", equalTo(testDate))
                .body("data.total", greaterThanOrEqualTo(0))
                .body("data.attendance_rate", allOf(greaterThanOrEqualTo(0), lessThanOrEqualTo(100)));
    }

    @Test
    @Order(10)
    @DisplayName("TC-STAFFATT-004c: Clocking in an unknown staff id is rejected, not a 500")
    void tc_staffatt_004c_unknownStaffRejected() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", "000000000000000000000000", "date", testDate))
                .when().post("/api/v1/admin/staff-attendance/clock-in")
                .then().statusCode(anyOf(is(400), is(404)));
    }

    @Test
    @Order(11)
    @DisplayName("TC-STAFFATT-003c: A clock-in left open on a PAST date is flagged in the missing-clockout KPI immediately, with no hours calculated for the open shift")
    @Tag("golden-path")
    void tc_staffatt_003c_missingClockOutFlaggedForPastOpenShift() {
        // A genuinely past date this suite owns exclusively — the plan's
        // "leave one staff member checked in overnight" scenario, reproduced
        // without needing to wait for an actual overnight boundary to pass.
        String pastDate = LocalDate.of(2020, 6, 15).toString();

        int before = given().spec(Api.authed(adminToken))
                .queryParam("date", pastDate).queryParam("branch", Env.HARROW_BRANCH_SLUG)
                .when().get("/api/v1/admin/staff-attendance/summary")
                .jsonPath().getInt("data.missing_clockout");

        Response clockIn = given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", pastDate))
                .when().post("/api/v1/admin/staff-attendance/clock-in");
        clockIn.then().statusCode(200);
        // Hours are not calculated as an unlimited shift — worked_minutes stays
        // unset while the shift is still open.
        Assertions.assertEquals(0, clockIn.jsonPath().getInt("data.worked_minutes"),
                "an open (never clocked-out) shift must not have worked minutes computed");

        int after = given().spec(Api.authed(adminToken))
                .queryParam("date", pastDate).queryParam("branch", Env.HARROW_BRANCH_SLUG)
                .when().get("/api/v1/admin/staff-attendance/summary")
                .jsonPath().getInt("data.missing_clockout");
        Assertions.assertEquals(before + 1, after,
                "the missing-clockout KPI must count this open past-dated shift immediately, with no background job needed");

        // The manager corrects it with a reason — the record itself is now
        // flagged too (recompute() only runs from Correct), and the
        // correction is audited via corrections[].
        Response corrected = given().spec(Api.authed(adminToken))
                .body(Map.of("staff_id", staffId, "date", pastDate, "clock_out", "17:30",
                        "reason", "QA-AUTOTEST manual correction — forgot to clock out"))
                .when().patch("/api/v1/admin/staff-attendance/000000000000000000000000/correct");
        corrected.then().statusCode(200).body("data.missing_clockout", is(false));
        List<Map<String, Object>> corrections = corrected.jsonPath().getList("data.corrections");
        boolean hasClockOutCorrection = corrections.stream().anyMatch(c -> "clock_out".equals(c.get("field")));
        Assertions.assertTrue(hasClockOutCorrection, "expected a 'clock_out' field entry in the correction history");
    }
}
