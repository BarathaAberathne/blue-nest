package com.bluenest.qa.suites.phase07_childroom;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.Fixtures;
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
 * <p>Source: QA test plan §7 Phase 11 (TC-CHILDROOM-002). Migrated to the
 * canonical room-allocation model (PR #100): a child no longer carries a
 * settable {@code room_id} — that field was dropped from the create/update
 * DTOs and {@code room_id}/{@code room_name} survive only as a read-time
 * projection of the child's active assignment. Allocation now goes through
 * {@code POST /admin/child-room-assignments} (end via {@code PATCH
 * .../{id}} {@code {"end":true}}).
 *
 * <p>All fixtures (room + child) are created dynamically at run time and torn
 * down afterwards — nothing assumes a pre-seeded Harrow room.
 *
 * <p><b>Partial-update regression locks (tests 2, 3, 8):</b> {@code
 * PUT /admin/children/{id}} was once a full-replace that wiped unspecified
 * fields (DOB, name, then allergies/medical notes) to empty. {@code
 * applyChild} now only overwrites fields the request actually supplies. These
 * tests fire a minimal {@code {branch_slug}} PUT and assert the untouched
 * fields survive — the room_id trigger they originally used is gone, but the
 * partial-update guarantee they lock is unchanged.
 *
 * <p><b>Enforcement locks (tests 6, 7):</b> these were "gap locks" proving
 * capacity and age were NOT enforced on assignment. The room-allocation
 * refactor closed both gaps, so they now lock the enforcement in place:
 * a full room / an out-of-age child is rejected (400) and only allocatable
 * with an {@code override_reason}.
 *
 * <p><b>Duplicate-child lock (test 9):</b> a second child with the same
 * name+DOB+branch is rejected, not silently duplicated.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 11 — Child room assignment")
class ChildRoomSuite {

    private static String adminToken;
    private static String childId;
    private static String roomId;
    private static String assignmentId;
    private static final String childDob = "2026-03-01";

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();
        roomId = Fixtures.createRoom(adminToken, Env.HARROW_BRANCH_SLUG, "ChildRoom", 10);
        childId = Fixtures.createChild(adminToken, Env.HARROW_BRANCH_SLUG, "ChildRoom", childDob);
    }

    @AfterAll
    static void cleanup() {
        Fixtures.endChildRoomAssignment(adminToken, assignmentId);
        Fixtures.deleteChild(adminToken, childId);
        Fixtures.deleteRoom(adminToken, roomId);
    }

    @Test
    @Order(1)
    @DisplayName("TC-CHILDROOM-002: Allocating the child to a room succeeds and is reflected as the child's current room")
    @Tag("golden-path")
    void tc_childroom_002_assignRoom() {
        assignmentId = Fixtures.assignChildRoomOk(adminToken, childId, roomId);

        given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children/" + childId)
                .then().statusCode(200)
                .body("data.room_id", equalTo(roomId));
    }

    @Test
    @Order(2)
    @DisplayName("TC-CHILDROOM-002-REG (regression): a minimal partial update does NOT wipe the child's date of birth")
    @Tag("regression")
    void tc_childroom_002_reg_partialUpdatePreservesDob() {
        String dobBefore = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children/" + childId)
                .jsonPath().getString("data.dob");
        Assertions.assertEquals(childDob, dobBefore, "sanity check: DOB must be set before this test");

        // A minimal payload (only branch_slug) must not clear the other fields.
        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200);

        String dobAfter = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children/" + childId)
                .jsonPath().getString("data.dob");
        Assertions.assertEquals(childDob, dobAfter,
                "CRITICAL REGRESSION: a partial update wiped the child's date of birth");
    }

    @Test
    @Order(3)
    @DisplayName("TC-CHILDROOM-002-REG-b (regression): a minimal partial update also preserves first/last name")
    @Tag("regression")
    void tc_childroom_002_reg_partialUpdatePreservesName() {
        Response before = given().spec(Api.authed(adminToken)).when().get("/api/v1/admin/children/" + childId);
        String firstBefore = before.jsonPath().getString("data.first_name");
        String lastBefore = before.jsonPath().getString("data.last_name");

        given().spec(Api.authed(adminToken))
                .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().put("/api/v1/admin/children/" + childId)
                .then().statusCode(200);

        Response after = given().spec(Api.authed(adminToken)).when().get("/api/v1/admin/children/" + childId);
        Assertions.assertEquals(firstBefore, after.jsonPath().getString("data.first_name"));
        Assertions.assertEquals(lastBefore, after.jsonPath().getString("data.last_name"));
    }

    @Test
    @Order(4)
    @DisplayName("TC-CHILDROOM-002c: ending the assignment unallocates the child (legitimate unassign)")
    void tc_childroom_002c_roomCanBeUnassigned() {
        // End the active placement from test 1.
        Fixtures.endChildRoomAssignment(adminToken, assignmentId);

        given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children/" + childId)
                .then().statusCode(200)
                .body("data.room_id", anyOf(nullValue(), emptyString()));

        // Re-allocate so later inspection/cleanup has a live placement to end.
        assignmentId = Fixtures.assignChildRoomOk(adminToken, childId, roomId);
    }

    @Test
    @Order(5)
    @DisplayName("TC-CHILDROOM-001: Rooms carry an age_range for the recommendation logic")
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
    @DisplayName("TC-CHILDROOM-003 (regression): a second child into a full (capacity-1) room is blocked without an override, allowed with one")
    @Tag("regression")
    void tc_childroom_003_overCapacityEnforced() {
        String tinyRoom = Fixtures.createRoom(adminToken, Env.HARROW_BRANCH_SLUG, "Capacity1", 1);
        String filler = Fixtures.createChild(adminToken, Env.HARROW_BRANCH_SLUG, "CapFill", "2026-03-01");
        String blocked = Fixtures.createChild(adminToken, Env.HARROW_BRANCH_SLUG, "CapBlocked", "2026-03-01");
        String fillAssign = null, overrideAssign = null;
        try {
            fillAssign = Fixtures.assignChildRoomOk(adminToken, filler, tinyRoom); // room now full

            // Without an override: rejected.
            Fixtures.assignChildRoom(adminToken, blocked, tinyRoom, null).then().statusCode(400);

            // With an override reason: allowed.
            Response overridden = Fixtures.assignChildRoom(adminToken, blocked, tinyRoom, "manager approved extra place");
            overridden.then().statusCode(201);
            overrideAssign = overridden.jsonPath().getString("data.id");
        } finally {
            Fixtures.endChildRoomAssignment(adminToken, fillAssign);
            Fixtures.endChildRoomAssignment(adminToken, overrideAssign);
            Fixtures.deleteChild(adminToken, filler);
            Fixtures.deleteChild(adminToken, blocked);
            Fixtures.deleteRoom(adminToken, tinyRoom);
        }
    }

    @Test
    @Order(7)
    @DisplayName("TC-CHILDROOM-004 (regression): a child outside the room's age range is blocked without an override, allowed with one")
    @Tag("regression")
    void tc_childroom_004_ageMismatchEnforced() {
        // A 4–5 year room (48–60 months).
        String ageRoom = Fixtures.createRoom(adminToken, Env.HARROW_BRANCH_SLUG, "Preschool", 10, 48, 60);
        // A clearly-too-young child (born 2024 → ~2yr).
        String youngChild = Fixtures.createChild(adminToken, Env.HARROW_BRANCH_SLUG, "TooYoung", "2024-01-01");
        String overrideAssign = null;
        try {
            Fixtures.assignChildRoom(adminToken, youngChild, ageRoom, null).then().statusCode(400);

            Response overridden = Fixtures.assignChildRoom(adminToken, youngChild, ageRoom, "SENCo approved early transition");
            overridden.then().statusCode(201);
            overrideAssign = overridden.jsonPath().getString("data.id");
        } finally {
            Fixtures.endChildRoomAssignment(adminToken, overrideAssign);
            Fixtures.deleteChild(adminToken, youngChild);
            Fixtures.deleteRoom(adminToken, ageRoom);
        }
    }

    @Test
    @Order(8)
    @DisplayName("TC-CHILDROOM-004-REG (regression, Critical/safeguarding): a minimal partial update does NOT wipe allergies or medical notes")
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
            // A minimal payload (only branch_slug) must preserve the safeguarding fields.
            given().spec(Api.authed(adminToken))
                    .body(Map.of("branch_slug", Env.HARROW_BRANCH_SLUG))
                    .when().put("/api/v1/admin/children/" + fixtureId)
                    .then().statusCode(200)
                    .body("data.allergies", equalTo("Peanuts - severe"))
                    .body("data.medical_notes", equalTo("EpiPen in bag"))
                    .body("data.dietary_reqs", equalTo("No dairy"));
        } finally {
            Fixtures.deleteChild(adminToken, fixtureId);
        }
    }

    @Test
    @Order(9)
    @DisplayName("Exit Criteria §6 (regression): a second child with the same name and date of birth at the same branch is rejected, not silently duplicated")
    @Tag("regression")
    void tc_exitcriteria_duplicateChildRejected() {
        String lastName = TestData.uniqueName("DupeChild");
        String dob = "2023-05-01";

        Response first = given().spec(Api.authed(adminToken))
                .body(Map.of("first_name", "QA-AUTOTEST", "last_name", lastName, "dob", dob, "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/children");
        first.then().statusCode(201);
        String firstId = first.jsonPath().getString("data.id");

        try {
            // Then: an identical name+DOB+branch is rejected, not duplicated.
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", lastName, "dob", dob, "branch_slug", Env.HARROW_BRANCH_SLUG))
                    .when().post("/api/v1/admin/children")
                    .then().statusCode(400).body("error", containsStringIgnoringCase("already exists"));

            // A DIFFERENT date of birth for the same name is NOT a duplicate.
            Response secondChild = given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", lastName, "dob", "2024-01-01", "branch_slug", Env.HARROW_BRANCH_SLUG))
                    .when().post("/api/v1/admin/children");
            secondChild.then().statusCode(201);
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + secondChild.jsonPath().getString("data.id"));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + firstId);
        }
    }
}
