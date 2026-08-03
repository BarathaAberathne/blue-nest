package com.bluenest.qa.support;

import io.restassured.response.Response;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

/**
 * Runtime fixture provisioning for the room-allocation-era suites.
 *
 * <p>These suites used to look up a hard-coded, pre-seeded Harrow room
 * ("Nest (Babies)") and set a child/staff {@code room_id} directly. Both are
 * gone: room membership is now the canonical assignment model (PR #100) —
 * {@code room_id} was dropped from the child/staff DTOs and allocation goes
 * through {@code POST /admin/{child,staff}-room-assignments}. So every room /
 * child / staff a test needs is now <b>created dynamically at run time</b>
 * (never assumes seeded branch data), carries the {@code QA-AUTOTEST-} prefix,
 * and is returned by id so the caller can delete it in {@code @AfterAll} /
 * a {@code finally} block. Reusing one room across a single suite is fine;
 * nothing here is static.
 */
public final class Fixtures {

    private Fixtures() {
    }

    // ── Rooms ────────────────────────────────────────────────────────────────

    /** Create a room with no age band (accepts any age — age is only enforced when min/max are set). */
    public static String createRoom(String token, String branch, String label, int capacity) {
        return createRoom(token, branch, label, capacity, 0, 0);
    }

    /** Create a room, optionally age-restricted (minAgeMonths/maxAgeMonths &gt; 0 enable the age check). */
    public static String createRoom(String token, String branch, String label, int capacity, int minAgeMonths, int maxAgeMonths) {
        Map<String, Object> body = new HashMap<>();
        body.put("branch_slug", branch);
        body.put("name", TestData.uniqueName(label));
        body.put("age_range", "QA-AUTOTEST " + label);
        body.put("capacity", capacity);
        if (minAgeMonths > 0 || maxAgeMonths > 0) {
            body.put("min_age_months", minAgeMonths);
            body.put("max_age_months", maxAgeMonths);
        }
        Response res = given().spec(Api.authed(token)).body(body).when().post("/api/v1/admin/rooms");
        res.then().statusCode(201);
        return res.jsonPath().getString("data.id");
    }

    public static void deleteRoom(String token, String id) {
        if (id != null) {
            given().spec(Api.authed(token)).when().delete("/api/v1/admin/rooms/" + id);
        }
    }

    // ── Children ─────────────────────────────────────────────────────────────

    /** Create a child (never with a room_id — the DTO no longer accepts one; allocate separately). */
    public static String createChild(String token, String branch, String label, String dob) {
        Response res = given().spec(Api.authed(token))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST",
                        "last_name", TestData.uniqueName(label),
                        "dob", dob,
                        "branch_slug", branch))
                .when().post("/api/v1/admin/children");
        res.then().statusCode(201);
        return res.jsonPath().getString("data.id");
    }

    public static void deleteChild(String token, String id) {
        if (id != null) {
            given().spec(Api.authed(token)).when().delete("/api/v1/admin/children/" + id);
        }
    }

    // ── Child → room allocation (canonical endpoint) ─────────────────────────

    /** Raw allocation POST — caller asserts success (201) or rejection (400). Pass a non-null reason to override a failed capacity/age check. */
    public static Response assignChildRoom(String token, String childId, String roomId, String overrideReason) {
        Map<String, Object> body = new HashMap<>();
        body.put("child_id", childId);
        body.put("room_id", roomId);
        if (overrideReason != null) {
            body.put("override_reason", overrideReason);
        }
        return given().spec(Api.authed(token)).body(body).when().post("/api/v1/admin/child-room-assignments");
    }

    /** Allocate and assert success, returning the assignment id. */
    public static String assignChildRoomOk(String token, String childId, String roomId) {
        Response res = assignChildRoom(token, childId, roomId, null);
        res.then().statusCode(201);
        return res.jsonPath().getString("data.id");
    }

    public static void endChildRoomAssignment(String token, String assignmentId) {
        if (assignmentId != null) {
            given().spec(Api.authed(token)).body(Map.of("end", true))
                    .when().patch("/api/v1/admin/child-room-assignments/" + assignmentId);
        }
    }

    // ── Staff + staff → room allocation ──────────────────────────────────────

    public static String createStaff(String token, String branch, String label, String status) {
        Response res = given().spec(Api.authed(token))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST",
                        "last_name", TestData.uniqueName(label),
                        "email", TestData.uniqueEmail(label),
                        "branch_slug", branch,
                        "status", status))
                .when().post("/api/v1/admin/staff");
        res.then().statusCode(201);
        return res.jsonPath().getString("data.id");
    }

    public static void deleteStaff(String token, String id) {
        if (id != null) {
            given().spec(Api.authed(token)).when().delete("/api/v1/admin/staff/" + id);
        }
    }

    public static Response assignStaffRoom(String token, String staffId, String roomId) {
        return given().spec(Api.authed(token))
                .body(Map.of("staff_id", staffId, "room_id", roomId))
                .when().post("/api/v1/admin/staff-room-assignments");
    }

    public static String assignStaffRoomOk(String token, String staffId, String roomId) {
        Response res = assignStaffRoom(token, staffId, roomId);
        res.then().statusCode(201);
        return res.jsonPath().getString("data.id");
    }

    public static void endStaffRoomAssignment(String token, String assignmentId) {
        if (assignmentId != null) {
            given().spec(Api.authed(token)).body(Map.of("end", true))
                    .when().patch("/api/v1/admin/staff-room-assignments/" + assignmentId);
        }
    }
}
