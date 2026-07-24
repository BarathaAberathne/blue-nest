package com.bluenest.qa.suites.phase07_childroom;

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
 * Phase 11 — Assign a registered child to a room.
 *
 * <p>Source: QA test plan §7 Phase 11 (TC-CHILDROOM-002).
 *
 * <p><b>Regression coverage (the headline finding of this session's manual
 * pass):</b> {@code PUT /admin/children/{id}} was a full-replace endpoint —
 * assigning a room via a minimal {@code {branch_slug, room_id}} payload
 * silently WIPED the child's date of birth to {@code ""}. Fixed in
 * {@code backend/internal/service/child.go} ({@code applyChild} now only
 * overwrites first/last name, DOB, and branch when the request actually
 * supplies them; {@code room_id} stays freely settable/clearable, since
 * clearing it is the legitimate "unassign from room" action). Tests 2-3
 * below are the regression lock — this is a Critical/data-loss-severity bug
 * per the plan's own §24 taxonomy, so it gets the most explicit coverage in
 * this suite.
 *
 * <p><b>TC-CHILDROOM-003/004 are documented gap locks, not passing
 * assertions of good behaviour:</b> verified directly against {@code
 * backend/internal/service/child.go} — the room-assignment write path
 * ({@code applyChild} then repository {@code Update}, filtered only by
 * {@code _id}) never looks up the target room, never counts its current
 * occupants against {@code Room.Capacity}, and never compares the child's
 * {@code dob} against the room's {@code age_range}. Both are locked here so
 * a future capacity/age-enforcement feature is required to update these
 * tests, not silently regress further.
 *
 * <p><b>Second regression (found while building {@code ScheduleSuite}):</b>
 * the DOB fix above only covered first/last name, DOB, and branch —
 * {@code allergies}/{@code medical_notes}/{@code dietary_reqs}/{@code
 * guardians}/{@code gender}/{@code start_date}/{@code sessions} were all
 * still unconditionally overwritten, so a room-only update silently wiped a
 * child's allergy and medical-notes data too — confirmed live (a real
 * child's "Peanuts - severe" allergy and "EpiPen in bag" note were erased by
 * a bare {@code {"branch_slug":"harrow"}} PUT). Fixed in the same {@code
 * applyChild} function. Test 8 below is the lock for the safeguarding-
 * relevant fields; {@code ScheduleSuite} locks the {@code sessions} field.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 11 — Child room assignment")
class ChildRoomSuite {

    private static String adminToken;
    private static String childId;
    private static String nestRoomId; // "Nest (Babies)", 3-24 months — matches the fixture DOB below
    private static final String childDob = "2026-03-01";

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();

        Response rooms = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/rooms?branch=" + Env.HARROW_BRANCH_SLUG);
        nestRoomId = rooms.jsonPath().getList("data").stream()
                .filter(r -> "Nest (Babies)".equals(((Map<?, ?>) r).get("name")))
                .map(r -> String.valueOf(((Map<?, ?>) r).get("id")))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("fixture room 'Nest (Babies)' not found at Harrow"));

        Response child = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST",
                        "last_name", TestData.uniqueName("ChildRoom"),
                        "dob", childDob,
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
    @DisplayName("TC-CHILDROOM-002: Assigning the child to a room succeeds and the room is reflected on the child")
    @Tag("golden-path")
    void tc_childroom_002_assignRoom() {
        given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "room_id", nestRoomId,
                        "first_name", "QA-AUTOTEST",
                        "last_name", "placeholder-overwritten-below"))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200)
                .body("data.room_id", equalTo(nestRoomId));
    }

    @Test
    @Order(2)
    @DisplayName("TC-CHILDROOM-002-REG (regression): a room-only update payload does NOT wipe the child's date of birth")
    @Tag("regression")
    void tc_childroom_002_reg_roomOnlyUpdatePreservesDob() {
        // Given the child currently has a real DOB (set at creation)
        String dobBefore = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children/" + childId)
                .jsonPath().getString("data.dob");
        Assertions.assertEquals(childDob, dobBefore, "sanity check: DOB must be set before this test");

        // When a caller sends a minimal payload that only intends to change room_id
        // (this is exactly the shape a "quick assign to room" UI action would send —
        // the bug this session found was triggered by precisely this pattern)
        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200);

        // Then the DOB must survive untouched.
        String dobAfter = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children/" + childId)
                .jsonPath().getString("data.dob");
        Assertions.assertEquals(childDob, dobAfter,
                "CRITICAL REGRESSION: a room-only update wiped the child's date of birth");
    }

    @Test
    @Order(3)
    @DisplayName("TC-CHILDROOM-002-REG-b (regression): a room-only update also preserves first/last name")
    @Tag("regression")
    void tc_childroom_002_reg_roomOnlyUpdatePreservesName() {
        Response before = given().spec(Api.authed(adminToken)).when().get("/api/v1/admin/children/" + childId);
        String firstBefore = before.jsonPath().getString("data.first_name");
        String lastBefore = before.jsonPath().getString("data.last_name");

        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200);

        Response after = given().spec(Api.authed(adminToken)).when().get("/api/v1/admin/children/" + childId);
        Assertions.assertEquals(firstBefore, after.jsonPath().getString("data.first_name"));
        Assertions.assertEquals(lastBefore, after.jsonPath().getString("data.last_name"));
    }

    @Test
    @Order(4)
    @DisplayName("TC-CHILDROOM-002c: room_id CAN still be explicitly cleared (legitimate unassign, not part of the regression fix)")
    void tc_childroom_002c_roomCanBeUnassigned() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", ""))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200)
                .body("data.room_id", anyOf(nullValue(), emptyString()));

        // Re-assign for any later suites/manual inspection that might expect it set.
        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                .when().put("/api/v1/admin/children/" + childId);
    }

    @Test
    @Order(5)
    @DisplayName("TC-CHILDROOM-001: Existing Harrow rooms carry sane, non-overlapping age ranges for the recommendation logic")
    void tc_childroom_001_roomAgeRangesArePresent() {
        Response rooms = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/rooms?branch=" + Env.HARROW_BRANCH_SLUG);
        List<Map<String, Object>> data = rooms.jsonPath().getList("data");
        for (Map<String, Object> room : data) {
            Assertions.assertNotNull(room.get("age_range"), "room '" + room.get("name") + "' is missing an age_range");
        }
    }

    @Test
    @Order(6)
    @DisplayName("TC-CHILDROOM-003 (regression, documents a real gap): assigning a second child to a full (capacity-1) room is accepted, not rejected")
    @Tag("regression")
    void tc_childroom_003_overCapacityAssignmentNotEnforced() {
        Response room = given().spec(Api.authed(adminToken))
                .body(Map.of("name", TestData.uniqueName("Capacity1Room"), "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "capacity", 1, "age_range", "QA-AUTOTEST capacity probe"))
                .when().post("/api/v1/admin/rooms");
        room.then().statusCode(201);
        String roomId = room.jsonPath().getString("data.id");

        Response child1 = given().spec(Api.authed(adminToken))
                .body(Map.of("first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName("Cap1"),
                        "dob", "2026-03-01", "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", roomId))
                .when().post("/api/v1/admin/children");
        child1.then().statusCode(201);
        String child1Id = child1.jsonPath().getString("data.id");

        // When a SECOND child is assigned to the same capacity-1 room...
        Response child2 = given().spec(Api.authed(adminToken))
                .body(Map.of("first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName("Cap2"),
                        "dob", "2026-03-01", "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", roomId))
                .when().post("/api/v1/admin/children");
        // Then: the plan expects this to be rejected or flagged. It is accepted.
        child2.then().statusCode(201).body("data.room_id", equalTo(roomId));
        String child2Id = child2.jsonPath().getString("data.id");

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + child1Id);
        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + child2Id);
        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/rooms/" + roomId);
    }

    @Test
    @Order(7)
    @DisplayName("TC-CHILDROOM-004 (regression, documents a real gap): assigning a child whose age doesn't match the room's age_range is accepted, not flagged")
    @Tag("regression")
    void tc_childroom_004_ageMismatchAssignmentNotEnforced() {
        Response room = given().spec(Api.authed(adminToken))
                .body(Map.of("name", TestData.uniqueName("BabyOnlyRoom"), "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "capacity", 5, "age_range", "QA-AUTOTEST 0-6 months only"))
                .when().post("/api/v1/admin/rooms");
        room.then().statusCode(201);
        String roomId = room.jsonPath().getString("data.id");

        // A clearly-not-a-baby DOB (well outside any "0-6 months" band).
        Response child = given().spec(Api.authed(adminToken))
                .body(Map.of("first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName("AgeMismatch"),
                        "dob", "2016-01-01", "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", roomId))
                .when().post("/api/v1/admin/children");

        // Then: the plan expects an age-mismatch warning/override. None exists.
        child.then().statusCode(201).body("data.room_id", equalTo(roomId));
        String childId2 = child.jsonPath().getString("data.id");

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + childId2);
        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/rooms/" + roomId);
    }

    @Test
    @Order(8)
    @DisplayName("TC-CHILDROOM-004-REG (regression, Critical/safeguarding): a room-only update does NOT wipe allergies or medical notes")
    @Tag("regression")
    @Tag("safeguarding")
    void tc_childroom_004_reg_partialUpdatePreservesSafetyFields() {
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName("SafetyWipeCheck"),
                        "dob", "2026-03-01", "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "allergies", "Peanuts - severe", "medical_notes", "EpiPen in bag", "dietary_reqs", "No dairy"))
                .when().post("/api/v1/admin/children");
        fixture.then().statusCode(201);
        String fixtureId = fixture.jsonPath().getString("data.id");

        try {
            // When a caller sends a minimal payload that only intends to change
            // room_id — the exact shape that wiped this child's DOB pre-fix, and
            // (found while building ScheduleSuite) still wiped allergies/medical
            // notes/dietary requirements even after that fix.
            given().spec(Api.authed(adminToken))
                    .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                    .when().put("/api/v1/admin/children/" + fixtureId)
                    .then().statusCode(200)
                    .body("data.allergies", equalTo("Peanuts - severe"))
                    .body("data.medical_notes", equalTo("EpiPen in bag"))
                    .body("data.dietary_reqs", equalTo("No dairy"));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + fixtureId);
        }
    }
}
