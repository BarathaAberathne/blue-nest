package com.bluenest.qa.suites.phase04_staff;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 4 — Staff creation and employment records.
 *
 * <p>Source: QA test plan §7 Phase 4 (TC-STAFF-001, TC-STAFF-003).
 *
 * <p><b>Regression coverage:</b> TC-STAFF-003's duplicate-email case was
 * found to be silently ACCEPTED (a second Staff document with an identical
 * email was created without error) during this session's manual pass — fixed
 * in {@code backend/internal/service/staff.go} ({@code staffService.Create/
 * Update} now reject a case-insensitive duplicate email). TC-STAFF-002
 * (Deputy Manager / Room Leader / Practitioner roles) is not re-implemented
 * here since it's the identical code path as TC-STAFF-001 with a different
 * {@code login_role} value — see README "What's intentionally not
 * duplicated".
 *
 * <p><b>Second regression (found while building {@code RoomStaffSuite}):</b>
 * {@code applyStaff} unconditionally overwrote {@code email}/{@code phone}/
 * {@code job_title}/DBS/First-Aid fields on every {@code PUT}, so a
 * "room-only" update (send only {@code first_name/last_name/branch_slug/
 * room_id}) silently wiped them to empty — the exact same data-loss pattern
 * already fixed for children's {@code applyChild}, just never applied to
 * staff. Fixed in {@code backend/internal/service/staff.go} (now mirrors
 * {@code applyChild}: only overwrite when the request supplies a non-empty
 * value; {@code room_id} stays unconditional, since clearing it is the
 * legitimate "unassign from room" action). Test 6 below is the lock.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 4 — Staff")
class StaffSuite {

    private static String adminToken;
    private static String createdStaffId; // cleaned up in @AfterAll

    @BeforeAll
    static void login() {
        adminToken = Api.loginAsAdmin();
    }

    @AfterAll
    static void cleanup() {
        if (createdStaffId != null) {
            given().spec(Api.authed(adminToken))
                    .when().delete("/api/v1/admin/staff/" + createdStaffId);
        }
    }

    @Test
    @Order(1)
    @DisplayName("TC-STAFF-001: A new staff member is created exactly once, linked to Harrow, status active")
    @Tag("golden-path")
    void tc_staff_001_createsStaffOnce() {
        String email = TestData.uniqueEmail("staff1");
        Map<String, Object> body = new HashMap<>();
        body.put("first_name", "QA");
        body.put("last_name", "AutoTest Staff");
        body.put("email", email);
        body.put("branch_slug", Env.HARROW_BRANCH_SLUG);
        body.put("job_title", "Practitioner");
        body.put("staff_type", "permanent");
        body.put("status", "active");

        Response res = given().spec(Api.authed(adminToken)).body(body).when().post("/api/v1/admin/staff");

        res.then().statusCode(201)
                .body("data.branch_slug", equalTo(Env.HARROW_BRANCH_SLUG))
                .body("data.status", equalTo("active"))
                .body("data.email", equalToIgnoringCase(email))
                .body("data.ref", matchesPattern("STF-\\d{4}-\\d{6}")); // human ref minted once, never reused

        createdStaffId = res.jsonPath().getString("data.id");
    }

    @Test
    @Order(2)
    @DisplayName("TC-STAFF-001b: An invalid status value is rejected")
    @Tag("regression") // regression for the Child/Staff status-whitelist gap closed this session
    void tc_staff_001b_invalidStatusRejected() {
        given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "Invalid Status",
                        "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "status", "definitely_not_a_real_status"))
                .when().post("/api/v1/admin/staff")
                .then().statusCode(400).body("error", containsStringIgnoringCase("status"));
    }

    @Test
    @Order(3)
    @DisplayName("TC-STAFF-003 (regression): duplicate email on create is rejected")
    @Tag("regression")
    void tc_staff_003_duplicateEmailOnCreateRejected() {
        // Given a staff member with a known email — created inline (not
        // reusing createdStaffId from TC-STAFF-001) so this test is fully
        // independent and passes under `-Dgroups=regression` on its own.
        String existingEmail = TestData.uniqueEmail("staff003fixture");
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "TC-STAFF-003 fixture",
                        "email", existingEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/staff");
        fixture.then().statusCode(201);
        String fixtureId = fixture.jsonPath().getString("data.id");

        // When a second staff record is created re-using that email
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "Duplicate Attempt",
                        "email", existingEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/staff");

        // Then it is rejected, and the existing record is untouched.
        res.then().statusCode(400).body("error", containsStringIgnoringCase("already exists"));

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + fixtureId);
    }

    @Test
    @Order(4)
    @DisplayName("TC-STAFF-003b (regression): duplicate email on UPDATE (renaming someone else onto an existing email) is rejected")
    @Tag("regression")
    void tc_staff_003b_duplicateEmailOnUpdateRejected() {
        // Given two distinct staff members — both created inline so this test
        // is fully independent of TC-STAFF-001's class-level fixture.
        String firstEmail = TestData.uniqueEmail("staff003b-first");
        Response first = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "TC-STAFF-003b First",
                        "email", firstEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/staff");
        first.then().statusCode(201);
        String firstId = first.jsonPath().getString("data.id");

        String secondEmail = TestData.uniqueEmail("staff2");
        Response second = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "Second Staff",
                        "email", secondEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/staff");
        second.then().statusCode(201);
        String secondId = second.jsonPath().getString("data.id");

        // When the second staff member's email is changed to collide with the first
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "Second Staff",
                        "email", firstEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().put("/api/v1/admin/staff/" + secondId);

        // Then it is rejected.
        res.then().statusCode(400).body("error", containsStringIgnoringCase("already exists"));

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + firstId);
        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + secondId);
    }

    @Test
    @Order(5)
    @DisplayName("TC-STAFF-003c: Updating a staff member's OWN email to its own current value is allowed (not a false-positive duplicate)")
    void tc_staff_003c_updatingOwnUnchangedEmailIsAllowed() {
        // Independent fixture — this class-level createdStaffId dependency is
        // deliberately avoided here too, for the same standalone-under-tag-
        // filter reason as TC-STAFF-003/003b above.
        String ownEmail = TestData.uniqueEmail("staff003c");
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "TC-STAFF-003c fixture",
                        "email", ownEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/staff");
        fixture.then().statusCode(201);
        String fixtureId = fixture.jsonPath().getString("data.id");

        given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA", "last_name", "AutoTest Staff Renamed",
                        "email", ownEmail,
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().put("/api/v1/admin/staff/" + fixtureId)
                .then().statusCode(200);

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + fixtureId);
    }

    @Test
    @Order(6)
    @DisplayName("TC-STAFF-004-REG (regression, Critical/data-loss): a room-only update does NOT wipe email, phone, or job title")
    @Tag("regression")
    void tc_staff_004_reg_partialUpdatePreservesContactFields() {
        String email = TestData.uniqueEmail("staff004wipecheck");
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "WipeCheck",
                        "email", email, "phone", "07123456789", "job_title", "Practitioner",
                        "branch_slug", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/staff");
        fixture.then().statusCode(201);
        String fixtureId = fixture.jsonPath().getString("data.id");

        try {
            // When a caller sends a minimal payload that only intends to change
            // room_id (exactly the pattern that wiped a child's DOB — this is
            // the same bug class, found while building RoomStaffSuite)
            given().spec(Api.authed(adminToken))
                    .body(Map.of("first_name", "QA-AUTOTEST", "last_name", "WipeCheck", "branch_slug", Env.HARROW_BRANCH_SLUG))
                    .when().put("/api/v1/admin/staff/" + fixtureId)
                    .then().statusCode(200)
                    .body("data.email", equalToIgnoringCase(email))
                    .body("data.phone", equalTo("07123456789"))
                    .body("data.job_title", equalTo("Practitioner"));
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + fixtureId);
        }
    }
}
