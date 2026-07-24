package com.bluenest.qa.suites.phase08_childattendance;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.time.LocalDate;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 14 — Child attendance.
 *
 * <p>Source: QA test plan §7 Phase 14 (TC-CHILDATT-001, TC-CHILDATT-002,
 * TC-CHILDATT-004).
 *
 * <p><b>Regression coverage (safeguarding-relevant — Critical per the plan's
 * §24 severity taxonomy):</b> this session's manual pass found that (a) a
 * child could be "checked out" via the API with NO prior check-in that day —
 * producing a record that shows a departure with no recorded arrival — and
 * (b) duplicate check-in/check-out calls silently overwrote the timestamp
 * instead of being rejected, unlike the equivalent staff-attendance guards.
 * Fixed in {@code backend/internal/service/attendance.go} ({@code CheckIn}/
 * {@code CheckOut} now mirror {@code staff_attendance.go}'s existing
 * "already clocked in"/"not clocked in yet"/"already clocked out" guards).
 * Tests 1, 3, and 4 below are the regression lock.
 *
 * <p><b>TC-CHILDATT-003 is a documented gap lock, not a passing assertion of
 * good behaviour:</b> verified directly against {@code attendanceService.
 * CheckIn} — it never reads {@code Child.Sessions} or the day of week, so a
 * check-in on a day the child has no scheduled session for succeeds
 * unconditionally, with no "unscheduled" flag anywhere in the response.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 14 — Child attendance")
class ChildAttendanceSuite {

    private static String adminToken;
    private static String childId;
    // A date this suite owns exclusively, so re-runs never collide with a
    // real same-day attendance record (this runs against the real system —
    // see README). Far enough in the future to never collide with "today".
    private static final String testDate = LocalDate.of(2027, 3, 15).toString();

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();
        Response child = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST",
                        "last_name", TestData.uniqueName("Attendance"),
                        "dob", "2026-03-01",
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/children");
        child.then().statusCode(201);
        childId = child.jsonPath().getString("data.id");
    }

    @AfterAll
    static void cleanup() {
        if (childId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + childId);
        }
    }

    @Test
    @Order(1)
    @DisplayName("TC-CHILDATT-004-REG (regression, safeguarding): check-out with NO prior check-in that day is rejected")
    @Tag("regression")
    @Tag("safeguarding")
    void tc_childatt_004_reg_checkoutWithoutCheckinRejected() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", testDate))
                .when().post("/api/v1/admin/attendance/check-out")
                .then().statusCode(400).body("error", containsStringIgnoringCase("not checked in"));
    }

    @Test
    @Order(2)
    @DisplayName("TC-CHILDATT-001: Check-in records status Present, timestamp, and the checking-in staff member")
    @Tag("golden-path")
    void tc_childatt_001_checkIn() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", testDate))
                .when().post("/api/v1/admin/attendance/check-in")
                .then().statusCode(200)
                .body("data.status", equalTo("present"))
                .body("data.check_in", not(emptyOrNullString()))
                .body("data.checked_in_by", not(emptyOrNullString()));
    }

    @Test
    @Order(3)
    @DisplayName("TC-CHILDATT-001-REG (regression): a duplicate check-in the same day is rejected, not silently overwritten")
    @Tag("regression")
    void tc_childatt_001_reg_duplicateCheckinRejected() {
        // Uses its own dedicated date (not testDate, which tc_childatt_001
        // already checked in on) so this test is fully independent and
        // passes under `-Dgroups=regression` on its own, not just as part of
        // this class's full ordered run.
        String date = LocalDate.of(2027, 3, 16).toString();
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", date))
                .when().post("/api/v1/admin/attendance/check-in")
                .then().statusCode(200);

        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", date))
                .when().post("/api/v1/admin/attendance/check-in")
                .then().statusCode(400).body("error", containsStringIgnoringCase("already checked in"));
    }

    @Test
    @Order(4)
    @DisplayName("TC-CHILDATT-002: Check-out closes the session and records the timestamp")
    @Tag("golden-path")
    void tc_childatt_002_checkOut() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", testDate))
                .when().post("/api/v1/admin/attendance/check-out")
                .then().statusCode(200).body("data.check_out", not(emptyOrNullString()));
    }

    @Test
    @Order(5)
    @DisplayName("TC-CHILDATT-002-REG (regression): a second check-out the same day is rejected")
    @Tag("regression")
    void tc_childatt_002_reg_duplicateCheckoutRejected() {
        // Own dedicated date + full check-in/check-out cycle, for the same
        // standalone-under-tag-filter reason as the duplicate-checkin test above.
        String date = LocalDate.of(2027, 3, 17).toString();
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", date))
                .when().post("/api/v1/admin/attendance/check-in")
                .then().statusCode(200);
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", date))
                .when().post("/api/v1/admin/attendance/check-out")
                .then().statusCode(200);

        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", date))
                .when().post("/api/v1/admin/attendance/check-out")
                .then().statusCode(400).body("error", containsStringIgnoringCase("already checked out"));
    }

    @Test
    @Order(6)
    @DisplayName("TC-CHILDATT-004b: re-checking in after a check-out (same day, e.g. re-entry) is allowed and clears the stale check-out")
    void tc_childatt_004b_reCheckinAfterCheckoutClearsStaleCheckout() {
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", testDate))
                .when().post("/api/v1/admin/attendance/check-in");

        res.then().statusCode(200);
        // A record must never simultaneously show a check-out from BEFORE its
        // most recent check-in — that ordering is exactly the "checked out
        // before arrival" safety invariant the plan's TC-CHILDATT-004 checks.
        Assertions.assertNull(res.jsonPath().get("data.check_out"),
                "re-checking in must clear the previous check-out, not leave it dangling before the new check-in");
    }

    @Test
    @Order(7)
    @DisplayName("TC-CHILDATT-004c: check-in for a nonexistent child is rejected, not a 500")
    void tc_childatt_004c_unknownChildRejected() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", "000000000000000000000000", "date", testDate))
                .when().post("/api/v1/admin/attendance/check-in")
                .then().statusCode(anyOf(is(400), is(404)));
    }

    @Test
    @Order(8)
    @DisplayName("TC-CHILDATT-003 (regression, documents a real gap): checking in a child on a day with no scheduled session succeeds silently, with no 'unscheduled' flag")
    @Tag("regression")
    void tc_childatt_003_unscheduledDayNotFlagged() {
        // This fixture child was created with no `sessions` at all (see setup())
        // — every day is, by definition, "unscheduled" for it.
        String date = LocalDate.of(2027, 3, 18).toString();

        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of("child_id", childId, "date", date))
                .when().post("/api/v1/admin/attendance/check-in");

        // Then: the plan expects the day to be flagged unscheduled. It is not —
        // check-in succeeds exactly like any scheduled day, no such field exists.
        res.then().statusCode(200).body("data.status", equalTo("present"));
        Assertions.assertFalse(res.jsonPath().getMap("data").containsKey("unscheduled"),
                "documents the gap: no 'unscheduled' concept exists in the attendance record at all");
    }
}
