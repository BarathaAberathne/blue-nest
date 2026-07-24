package com.bluenest.qa.suites.phase11_roomstaff;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 6 — Assign staff to rooms.
 *
 * <p>Source: QA test plan §7 Phase 6 (TC-ROOMSTAFF-001/002/003). Verified
 * directly against {@code backend/internal/models/staff.go}/{@code room.go}
 * and {@code service/staff.go}: there is no dedicated room-staff-assignment
 * entity or "room leader" concept at all — a staff member just carries a
 * plain {@code room_id} string, set generically via {@code PUT
 * /admin/staff/{id}}. No max-staff-per-room cap, no room-existence check,
 * and no active/inactive gating exist in that write path. Every test below
 * is therefore a documented gap lock (proving the absence of validation the
 * plan expects), except TC-ROOMSTAFF-001's first assertion, which confirms
 * the one real mechanism that DOES exist — the plain link itself.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 6 — Room-staff assignment")
class RoomStaffSuite {

    private static String adminToken;
    private static String nestRoomId;

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
    }

    private static String createStaff(String label, String status) {
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName(label),
                        "email", TestData.uniqueEmail(label), "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "status", status))
                .when().post("/api/v1/admin/staff");
        res.then().statusCode(201);
        return res.jsonPath().getString("data.id");
    }

    @Test
    @Order(1)
    @DisplayName("TC-ROOMSTAFF-001: Assigning a staff member's room_id links them to that room (there is no separate 'leader' designation)")
    @Tag("golden-path")
    void tc_roomstaff_001_staffLinkedToRoom() {
        String staffId = createStaff("RoomLeader", "active");
        try {
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", "Room Leader",
                            "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                    .when().put("/api/v1/admin/staff/" + staffId)
                    .then().statusCode(200).body("data.room_id", equalTo(nestRoomId));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffId);
        }
    }

    @Test
    @Order(2)
    @DisplayName("TC-ROOMSTAFF-002 (regression, documents a real gap): multiple staff can be assigned the same room with no maximum enforced")
    @Tag("regression")
    void tc_roomstaff_002_noMaxStaffPerRoomEnforced() {
        String staffAId = createStaff("MultiA", "active");
        String staffBId = createStaff("MultiB", "active");
        try {
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", "Multi A",
                            "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                    .when().put("/api/v1/admin/staff/" + staffAId)
                    .then().statusCode(200);

            // Then: a second (third, etc.) staff member can be assigned to the
            // exact same room — no cap, no warning, no conflict reported.
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", "Multi B",
                            "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId))
                    .when().put("/api/v1/admin/staff/" + staffBId)
                    .then().statusCode(200).body("data.room_id", equalTo(nestRoomId));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffAId);
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffBId);
        }
    }

    @Test
    @Order(3)
    @DisplayName("TC-ROOMSTAFF-003 (regression, documents a real gap): an INACTIVE staff member can still be assigned to a room")
    @Tag("regression")
    void tc_roomstaff_003_inactiveStaffAssignmentNotGated() {
        String staffId = createStaff("Inactive", "inactive");
        try {
            // Then: the plan expects an inactive/archived staff member to be
            // rejected from an active room assignment. Nothing checks status here.
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", "Inactive Assignee",
                            "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", nestRoomId, "status", "inactive"))
                    .when().put("/api/v1/admin/staff/" + staffId)
                    .then().statusCode(200).body("data.room_id", equalTo(nestRoomId));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffId);
        }
    }

    @Test
    @Order(4)
    @DisplayName("TC-ROOMSTAFF-003b (regression, documents a real gap): a room_id for a room that doesn't exist is accepted, not rejected")
    @Tag("regression")
    void tc_roomstaff_003b_nonexistentRoomIdAccepted() {
        String staffId = createStaff("GhostRoom", "active");
        try {
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", "Ghost Room",
                            "branch_slug", Env.HARROW_BRANCH_SLUG, "room_id", "000000000000000000000000"))
                    .when().put("/api/v1/admin/staff/" + staffId)
                    .then().statusCode(200).body("data.room_id", equalTo("000000000000000000000000"));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffId);
        }
    }
}
