package com.bluenest.qa.suites.phase05_roles;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 5 — Manager/deputy assignment and role-based access boundaries.
 *
 * <p>Source: QA test plan §7 Phase 5 (TC-ROLE-001, TC-ROLE-002, TC-ROLE-003)
 * and §14 (Role-Based Access Test Matrix). Every restricted action here is
 * tested through the API directly (a second, non-admin login), not just
 * "the button is hidden" — matching the plan's own TC-ROLE-003 principle.
 *
 * <p><b>Regression coverage (the headline finding of writing this suite):
 * a real, Critical-severity privilege-escalation vulnerability.</b> Any
 * role holding {@code staff.manage} (branch_manager, deputy_manager,
 * regional_manager, HR officer — see {@code models/permission.go}) could
 * create a brand-new staff login with {@code login_role: "super_admin"} (or
 * {@code platform_super_admin}) and mint themselves unrestricted system
 * access — confirmed live: a Deputy Manager test account created a working
 * super_admin login that could then read {@code GET /admin/users} (the
 * account-management endpoint, meant to be super_admin-only). Fixed via a
 * new {@code policy.CanGrantRole} check wired into both
 * {@code AdminStaffHandler.Create} and {@code .Update} — only an existing
 * super_admin/platform_super_admin may grant those two roles; every other
 * {@code staff.manage} holder can still manage ordinary staff logins.
 * Tests 6-7 below are the regression lock for this fix.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 5 — Roles & permissions")
class RoleSuite {

    private static String adminToken;
    private static String deputyToken;
    private static String deputyStaffId;
    private static String deputyUserId;
    private static String deputyEmail;
    private static String managerToken;
    private static String managerStaffId;
    private static String managerUserId;
    // A real enquiry the deputy is allowed to act on, proving TC-ROLE-002's
    // "CAN" list isn't just "doesn't 403" but actually performs real writes.
    private static String enquiryId;

    @BeforeAll
    static void setup() {
        adminToken = Api.loginAsAdmin();

        deputyEmail = TestData.uniqueEmail("role-deputy");
        Response deputy = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Role Deputy",
                        "email", deputyEmail, "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "job_title", "Deputy Manager", "status", "active",
                        "enable_login", true, "login_role", "deputy_manager",
                        "login_password", "RoleSuiteDeputy2026!"))
                .when().post("/api/v1/admin/staff");
        deputy.then().statusCode(201);
        deputyStaffId = deputy.jsonPath().getString("data.id");
        deputyUserId = deputy.jsonPath().getString("data.user_id");
        deputyToken = Api.loginAdmin(deputyEmail, "RoleSuiteDeputy2026!");

        String managerEmail = TestData.uniqueEmail("role-manager");
        Response manager = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Role Manager",
                        "email", managerEmail, "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "job_title", "Branch Manager", "status", "active",
                        "enable_login", true, "login_role", "branch_manager",
                        "login_password", "RoleSuiteManager2026!"))
                .when().post("/api/v1/admin/staff");
        manager.then().statusCode(201);
        managerStaffId = manager.jsonPath().getString("data.id");
        managerUserId = manager.jsonPath().getString("data.user_id");
        managerToken = Api.loginAdmin(managerEmail, "RoleSuiteManager2026!");

        Response enquiry = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "name", TestData.uniqueName("RoleTestParent"),
                        "email", TestData.uniqueEmail("role-test-parent"),
                        "phone", "07000000099",
                        "branch", Env.HARROW_BRANCH_SLUG,
                        "enquiry_type", "General enquiry",
                        "source", "phone"))
                .when().post("/api/v1/admin/enquiries");
        enquiry.then().statusCode(201);
        enquiryId = enquiry.jsonPath().getString("data.id");
    }

    @AfterAll
    static void cleanup() {
        // Best-effort — a staff.manage caller can delete their own branch's
        // staff, but the linked user account cleanup needs the admin token
        // (DELETE /admin/users is super_admin-only, matching CLAUDE.md's
        // "super_admin is the only role behind SuperAdminOnly").
        if (deputyStaffId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + deputyStaffId);
        }
        if (deputyUserId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/users/" + deputyUserId);
        }
        if (managerStaffId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + managerStaffId);
        }
        if (managerUserId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/users/" + managerUserId);
        }
    }

    // ── TC-ROLE-001 — Branch Manager ────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("TC-ROLE-001: A Branch Manager sees Harrow operational data and is rejected for another branch")
    void tc_role_001_branchManagerScopedToOwnBranch() {
        given().spec(Api.authed(managerToken))
                .queryParam("branch", Env.HARROW_BRANCH_SLUG)
                .when().get("/api/v1/admin/enquiries")
                .then().statusCode(200);

        given().spec(Api.authed(managerToken))
                .queryParam("branch", "pinner")
                .when().get("/api/v1/admin/enquiries")
                .then().statusCode(403);
    }

    @Test
    @Order(2)
    @DisplayName("TC-ROLE-001b: A Branch Manager cannot create or archive a branch (lifecycle is super-admin only)")
    void tc_role_001b_branchManagerCannotDoBranchLifecycle() {
        given().spec(Api.authed(managerToken))
                .body(Map.of("name", "Should Not Exist", "slug", "should-not-exist", "capacity", 10))
                .when().post("/api/v1/admin/branches")
                .then().statusCode(403);

        given().spec(Api.authed(managerToken))
                .when().post("/api/v1/admin/branches/" + Env.HARROW_BRANCH_SLUG + "/archive")
                .then().statusCode(403);
    }

    // ── TC-ROLE-002 — Deputy Manager ────────────────────────────────────────

    @Test
    @Order(3)
    @DisplayName("TC-ROLE-002: A Deputy Manager CAN view Harrow enquiries, update status, and add notes")
    @Tag("golden-path")
    void tc_role_002_deputyCanOperateOnEnquiries() {
        given().spec(Api.authed(deputyToken))
                .queryParam("branch", Env.HARROW_BRANCH_SLUG)
                .when().get("/api/v1/admin/enquiries")
                .then().statusCode(200);

        given().spec(Api.authed(deputyToken))
                .body(Map.of("status", "contacted"))
                .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status")
                .then().statusCode(200);

        given().spec(Api.authed(deputyToken))
                .body(Map.of("note", "QA-AUTOTEST — deputy permission check"))
                .when().post("/api/v1/admin/enquiries/" + enquiryId + "/notes")
                .then().statusCode(200);
    }

    @Test
    @Order(4)
    @DisplayName("TC-ROLE-002b: A Deputy Manager CANNOT view org-wide user/account management")
    void tc_role_002b_deputyCannotViewUsers() {
        given().spec(Api.authed(deputyToken))
                .when().get("/api/v1/admin/users")
                .then().statusCode(403);
    }

    @Test
    @Order(5)
    @DisplayName("TC-ROLE-002c: A Deputy Manager CANNOT access another branch's enquiries")
    void tc_role_002c_deputyCannotAccessAnotherBranch() {
        given().spec(Api.authed(deputyToken))
                .queryParam("branch", "pinner")
                .when().get("/api/v1/admin/enquiries")
                .then().statusCode(403);
    }

    @Test
    @Order(6)
    @DisplayName("TC-ROLE-002d-REG (regression, CRITICAL): A Deputy Manager CANNOT grant themselves or anyone else super_admin")
    @Tag("regression")
    @Tag("security")
    void tc_role_002d_reg_deputyCannotEscalateToSuperAdmin() {
        // Given a staff.manage holder (deputy_manager) attempting to create a
        // new login with the highest-privilege role
        Response res = given().spec(Api.authed(deputyToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Escalation Attempt",
                        "email", TestData.uniqueEmail("escalation-attempt"),
                        "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "enable_login", true,
                        "login_role", "super_admin",
                        "login_password", "EscalationAttempt2026!"))
                .when().post("/api/v1/admin/staff");

        // Then it is rejected...
        res.then().statusCode(403).body("error", containsStringIgnoringCase("cannot grant"));

        // ...and platform_super_admin is blocked identically.
        given().spec(Api.authed(deputyToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Platform Escalation Attempt",
                        "email", TestData.uniqueEmail("platform-escalation-attempt"),
                        "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "enable_login", true,
                        "login_role", "platform_super_admin",
                        "login_password", "EscalationAttempt2026!"))
                .when().post("/api/v1/admin/staff")
                .then().statusCode(403);

        // ...and no such account was actually created.
        Response check = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/users");
        boolean anyEscalated = check.jsonPath().getList("data", Map.class).stream()
                .anyMatch(u -> "Escalation Attempt".equals(u.get("last_name"))
                        || "Platform Escalation Attempt".equals(u.get("last_name")));
        Assertions.assertFalse(anyEscalated, "an escalated account must never actually be created");
    }

    @Test
    @Order(7)
    @DisplayName("TC-ROLE-002e-REG (regression): the SAME escalation attempt via UPDATE (upgrading an existing login) is also rejected")
    @Tag("regression")
    @Tag("security")
    void tc_role_002e_reg_deputyCannotEscalateViaUpdate() {
        // Given an ordinary staff login the deputy is allowed to manage
        String email = TestData.uniqueEmail("upgrade-target");
        Response fixture = given().spec(Api.authed(deputyToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Upgrade Target",
                        "email", email, "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "enable_login", true, "login_role", "staff",
                        "login_password", "UpgradeTarget2026!"))
                .when().post("/api/v1/admin/staff");
        fixture.then().statusCode(201);
        String fixtureId = fixture.jsonPath().getString("data.id");
        String fixtureUserId = fixture.jsonPath().getString("data.user_id");

        // When the deputy tries to upgrade that same login to super_admin via update
        given().spec(Api.authed(deputyToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Upgrade Target",
                        "email", email, "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "enable_login", true, "login_role", "super_admin",
                        "login_password", "UpgradeTarget2026!"))
                .when().put("/api/v1/admin/staff/" + fixtureId)
                .then().statusCode(403);

        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + fixtureId);
        given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/users/" + fixtureUserId);
    }

    @Test
    @Order(8)
    @DisplayName("TC-ROLE-002f: super_admin itself CAN still grant super_admin (the fix blocks escalation, not legitimate admin work)")
    void tc_role_002f_superAdminCanStillGrantSuperAdmin() {
        String email = TestData.uniqueEmail("legit-super-admin-grant");
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Legit Grant",
                        "email", email, "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "enable_login", true, "login_role", "super_admin",
                        "login_password", "LegitGrant2026!"))
                .when().post("/api/v1/admin/staff");

        res.then().statusCode(201);
        given().spec(Api.authed(adminToken))
                .when().delete("/api/v1/admin/staff/" + res.jsonPath().getString("data.id"));
        given().spec(Api.authed(adminToken))
                .when().delete("/api/v1/admin/users/" + res.jsonPath().getString("data.user_id"));
    }

    // ── TC-ROLE-003 — Permission change propagation ─────────────────────────

    @Test
    @Order(9)
    @DisplayName("TC-ROLE-003: an already-issued access token keeps its OLD role's permissions until it's refreshed (documented session policy)")
    void tc_role_003_activeSessionKeepsOldRoleUntilRefresh() {
        // Given a deputy manager with an active session (deputyToken, issued in @BeforeAll)
        given().spec(Api.authed(deputyToken))
                .when().get("/api/v1/admin/enquiries?branch=" + Env.HARROW_BRANCH_SLUG)
                .then().statusCode(200);

        // When their role is downgraded to "staff" (a role with none of deputy_manager's permissions)
        given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "first_name", "QA-AUTOTEST", "last_name", "Role Deputy",
                        "email", deputyEmail, "branch_slug", Env.HARROW_BRANCH_SLUG,
                        "enable_login", true, "login_role", "staff",
                        "login_password", "RoleSuiteDeputy2026!"))
                .when().put("/api/v1/admin/staff/" + deputyStaffId)
                .then().statusCode(200);

        // Then the OLD, still-unexpired token continues to work — role/permission
        // claims are baked into the JWT at issuance (see middleware/auth.go:
        // `role, _ := claims["role"].(string)`), not re-checked against the DB
        // per request. This is a real, documented characteristic of this
        // system's session policy: a permission downgrade takes effect on the
        // user's NEXT login/refresh, not instantly for an open session.
        given().spec(Api.authed(deputyToken))
                .when().get("/api/v1/admin/enquiries?branch=" + Env.HARROW_BRANCH_SLUG)
                .then().statusCode(200);
    }

    @Test
    @Order(10)
    @DisplayName("TC-ROLE-003b: logging back in AFTER the downgrade correctly reflects the NEW, reduced permissions")
    void tc_role_003b_freshLoginReflectsNewRole() {
        // A fresh login (new token) must pick up the role change made in the
        // previous test — this is the "log out and log back in, retry" step
        // the plan itself calls for.
        String freshToken = Api.loginAdmin(deputyEmail, "RoleSuiteDeputy2026!");

        given().spec(Api.authed(freshToken))
                .when().get("/api/v1/admin/enquiries?branch=" + Env.HARROW_BRANCH_SLUG)
                .then().statusCode(403); // "staff" role has none of deputy_manager's permissions
    }
}
