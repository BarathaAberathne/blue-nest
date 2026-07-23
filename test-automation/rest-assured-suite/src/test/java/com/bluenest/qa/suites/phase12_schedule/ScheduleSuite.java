package com.bluenest.qa.suites.phase12_schedule;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 12 — Child schedule (weekly session pattern).
 *
 * <p>Source: QA test plan §7 Phase 12 (TC-SCHEDULE-001/002). Verified
 * against {@code backend/internal/models/child.go}: {@code Child.Sessions
 * []ChildSession{Day, Type}} is a real, settable field ({@code day}:
 * "Mon".."Fri", {@code type}: "full"|"am"|"pm"), and it IS live-wired into
 * {@code GET /admin/children/capacity-forecast} (unlike the {@code
 * TC-RATIO-*} gap — see {@code RatioSuite}). Both tests below use a
 * dedicated, freshly-created room so the forecast's per-day child counts are
 * unambiguous (no other child can be in it).
 *
 * <p><b>What's NOT covered (a genuine gap, verified, not a test-writing
 * gap):</b> {@code applyChild} replaces {@code Sessions} wholesale on every
 * {@code PUT} — there is no per-entry change history, no "old schedule
 * retained", and no distinct "effective date" concept (only the unrelated
 * top-level {@code start_date}). TC-SCHEDULE-002's history/effective-date
 * claims are not asserted here because nothing server-side implements them.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 12 — Child schedule")
class ScheduleSuite {

    private static String adminToken;
    private static String roomId;
    private static String childId;

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();
        Response room = given().spec(Api.authed(adminToken))
                .body(Map.of("name", TestData.uniqueName("ScheduleRoom"), "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "capacity", 10, "age_range", "QA-AUTOTEST schedule probe"))
                .when().post("/api/v1/admin/rooms");
        room.then().statusCode(201);
        roomId = room.jsonPath().getString("data.id");

        Response child = given().spec(Api.authed(adminToken))
                .body(Map.of("first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName("Schedule"),
                        "dob", "2023-01-01", "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", roomId))
                .when().post("/api/v1/admin/children");
        child.then().statusCode(201);
        childId = child.jsonPath().getString("data.id");
    }

    @AfterAll
    static void cleanup() {
        if (childId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + childId);
        }
        if (roomId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/rooms/" + roomId);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> dayEntry(String day) {
        Response forecast = given().spec(Api.authed(adminToken))
                .queryParam("branch", Env.HARROW_BRANCH_SLUG).queryParam("weeks", 1)
                .when().get("/api/v1/admin/children/capacity-forecast");
        forecast.then().statusCode(200);

        List<Map> rooms = forecast.jsonPath().getList("data.rooms", Map.class);
        Map room = (Map) rooms.stream()
                .filter(r -> roomId.equals(((Map) r).get("room_id")))
                .findFirst().orElseThrow(() -> new IllegalStateException("dedicated schedule room missing from forecast"));
        List<Map> weeks = (List<Map>) room.get("weeks");
        List<Map> days = (List<Map>) weeks.get(0).get("days");
        return days.stream().filter(d -> day.equals(d.get("day"))).findFirst()
                .orElseThrow(() -> new IllegalStateException("day " + day + " missing from forecast"));
    }

    @Test
    @Order(1)
    @DisplayName("TC-SCHEDULE-001: A Mon/Wed/Fri full-day schedule persists and is reflected in the room's capacity forecast, not Tue/Thu")
    @Tag("golden-path")
    void tc_schedule_001_mondayWednesdayFridayPattern() {
        List<Map<String, String>> sessions = List.of(
                Map.of("day", "Mon", "type", "full"),
                Map.of("day", "Wed", "type", "full"),
                Map.of("day", "Fri", "type", "full"));

        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", roomId, "sessions", sessions))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200)
                .body("data.sessions", hasSize(3));

        for (String day : List.of("Mon", "Wed", "Fri")) {
            Map<String, Object> entry = dayEntry(day);
            Assertions.assertEquals(1, ((Number) entry.get("am_children")).intValue(), day + " should show 1 child in the AM");
            Assertions.assertEquals(1, ((Number) entry.get("pm_children")).intValue(), day + " should show 1 child in the PM");
        }
        for (String day : List.of("Tue", "Thu")) {
            Map<String, Object> entry = dayEntry(day);
            Assertions.assertEquals(0, ((Number) entry.get("am_children")).intValue(), day + " should show 0 children — child is not expected");
            Assertions.assertEquals(0, ((Number) entry.get("pm_children")).intValue(), day + " should show 0 children — child is not expected");
        }
    }

    @Test
    @Order(2)
    @DisplayName("TC-SCHEDULE-002: Changing Friday to Thursday updates the schedule — Friday occupancy decreases, Thursday increases")
    @Tag("golden-path")
    void tc_schedule_002_scheduleChangeMovesOccupancy() {
        List<Map<String, String>> sessions = List.of(
                Map.of("day", "Mon", "type", "full"),
                Map.of("day", "Wed", "type", "full"),
                Map.of("day", "Thu", "type", "full")); // Fri -> Thu

        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", roomId, "sessions", sessions))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200)
                .body("data.sessions.day", containsInAnyOrder("Mon", "Wed", "Thu"));

        Map<String, Object> friday = dayEntry("Fri");
        Assertions.assertEquals(0, ((Number) friday.get("am_children")).intValue(), "Friday occupancy must decrease to 0 after the move");

        Map<String, Object> thursday = dayEntry("Thu");
        Assertions.assertEquals(1, ((Number) thursday.get("am_children")).intValue(), "Thursday occupancy must increase to 1 after the move");
    }
}
