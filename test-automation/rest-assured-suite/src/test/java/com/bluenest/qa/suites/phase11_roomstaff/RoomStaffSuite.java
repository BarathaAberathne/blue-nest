package com.bluenest.qa.suites.phase11_roomstaff;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.Fixtures;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 6 — Assign staff to rooms.
 *
 * <p>Source: QA test plan §7 Phase 6 (TC-ROOMSTAFF-001/002/003). Migrated to
 * the canonical room-allocation model (PR #100): staff room membership is no
 * longer a plain {@code room_id} on the staff record set via {@code PUT
 * /admin/staff/{id}} — that field was dropped from the DTO. Membership now
 * goes through {@code POST /admin/staff-room-assignments} and is enforced:
 * same-branch, active staff, existing room. Two of the old cases below were
 * "gap locks" proving the ABSENCE of that validation; the refactor closed the
 * gaps, so they now lock the enforcement in place instead.
 *
 * <p>All fixtures (room + staff) are created dynamically at run time and torn
 * down after each test — nothing assumes pre-seeded branch data.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 6 — Room-staff assignment")
class RoomStaffSuite {

    private static String adminToken;
    private static String roomId;

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();
        roomId = Fixtures.createRoom(adminToken, Env.HARROW_BRANCH_SLUG, "RoomStaff", 10);
    }

    @AfterAll
    static void cleanup() {
        Fixtures.deleteRoom(adminToken, roomId);
    }

    @Test
    @Order(1)
    @DisplayName("TC-ROOMSTAFF-001: Allocating a staff member to a room links them, visible on both the staff's and the room's assignment lists")
    @Tag("golden-path")
    void tc_roomstaff_001_staffLinkedToRoom() {
        String staffId = Fixtures.createStaff(adminToken, Env.HARROW_BRANCH_SLUG, "RoomLeader", "active");
        String assignmentId = null;
        try {
            assignmentId = Fixtures.assignStaffRoomOk(adminToken, staffId, roomId);

            given().spec(Api.authed(adminToken))
                    .when().get("/api/v1/admin/staff/" + staffId + "/room-assignments")
                    .then().statusCode(200)
                    .body("data.findAll { it.room_id == '" + roomId + "' && it.status == 'active' }", hasSize(1));

            given().spec(Api.authed(adminToken))
                    .when().get("/api/v1/admin/rooms/" + roomId + "/staff")
                    .then().statusCode(200)
                    .body("data.findAll { it.staff_id == '" + staffId + "' }", hasSize(1));
        } finally {
            Fixtures.endStaffRoomAssignment(adminToken, assignmentId);
            Fixtures.deleteStaff(adminToken, staffId);
        }
    }

    @Test
    @Order(2)
    @DisplayName("TC-ROOMSTAFF-002: Multiple staff can be allocated to the same room — there is no per-room staff cap")
    @Tag("golden-path")
    void tc_roomstaff_002_multipleStaffPerRoomAllowed() {
        String staffAId = Fixtures.createStaff(adminToken, Env.HARROW_BRANCH_SLUG, "MultiA", "active");
        String staffBId = Fixtures.createStaff(adminToken, Env.HARROW_BRANCH_SLUG, "MultiB", "active");
        String a1 = null, a2 = null;
        try {
            a1 = Fixtures.assignStaffRoomOk(adminToken, staffAId, roomId);
            // A second, different staff member in the exact same room is accepted.
            a2 = Fixtures.assignStaffRoomOk(adminToken, staffBId, roomId);

            given().spec(Api.authed(adminToken))
                    .when().get("/api/v1/admin/rooms/" + roomId + "/staff")
                    .then().statusCode(200)
                    .body("data.findAll { it.staff_id == '" + staffAId + "' || it.staff_id == '" + staffBId + "' }", hasSize(2));
        } finally {
            Fixtures.endStaffRoomAssignment(adminToken, a1);
            Fixtures.endStaffRoomAssignment(adminToken, a2);
            Fixtures.deleteStaff(adminToken, staffAId);
            Fixtures.deleteStaff(adminToken, staffBId);
        }
    }

    @Test
    @Order(3)
    @DisplayName("TC-ROOMSTAFF-003 (regression): an INACTIVE staff member is rejected from a room allocation")
    @Tag("regression")
    void tc_roomstaff_003_inactiveStaffRejected() {
        String staffId = Fixtures.createStaff(adminToken, Env.HARROW_BRANCH_SLUG, "Inactive", "inactive");
        try {
            // Pre-refactor this was accepted (a documented gap). It is now enforced.
            Fixtures.assignStaffRoom(adminToken, staffId, roomId)
                    .then().statusCode(400);
        } finally {
            Fixtures.deleteStaff(adminToken, staffId);
        }
    }

    @Test
    @Order(4)
    @DisplayName("TC-ROOMSTAFF-003b (regression): allocating to a room id that doesn't exist is rejected, not accepted")
    @Tag("regression")
    void tc_roomstaff_003b_nonexistentRoomRejected() {
        String staffId = Fixtures.createStaff(adminToken, Env.HARROW_BRANCH_SLUG, "GhostRoom", "active");
        try {
            // Pre-refactor a bogus room_id was stored verbatim (a documented gap).
            // The allocation endpoint now validates room existence.
            Response res = Fixtures.assignStaffRoom(adminToken, staffId, "000000000000000000000000");
            Assertions.assertTrue(res.statusCode() >= 400 && res.statusCode() < 500,
                    "expected a client error for a nonexistent room, got: " + res.statusCode());
            Assertions.assertNotEquals(201, res.statusCode(), "a nonexistent room must not be allocatable");
        } finally {
            Fixtures.deleteStaff(adminToken, staffId);
        }
    }
}
