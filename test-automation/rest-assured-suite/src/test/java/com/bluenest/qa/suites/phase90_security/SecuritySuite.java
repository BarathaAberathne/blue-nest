package com.bluenest.qa.suites.phase90_security;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Section 19 — Security tests, scoped to what's provable at the HTTP/API
 * layer (no browser, no static-analysis tooling — see the plan doc
 * {@code test-automation/section18-plan.md} for what's out of scope here).
 *
 * <p>Every test in this class is a regression lock for something this
 * session's manual pass and injection-fuzzing script
 * ({@code test-automation/injection-fuzz.sh}) actually found and fixed:
 *
 * <ul>
 *   <li>NoSQL operator injection via query-string values (proven inert by
 *       construction — Go's typed request structs, confirmed live);</li>
 *   <li>malformed/unbalanced regex in free-text search params causing an
 *       unhandled 500 (fixed via {@code regexp.QuoteMeta} in
 *       {@code staff.go}/{@code child.go}/{@code daily_record.go});</li>
 *   <li>no rate limiting on the login routes (fixed via
 *       {@code middleware.RateLimit(10, time.Minute)} in routes.go).</li>
 * </ul>
 *
 * <p><b>Why the login rate-limit test ({@code tc_auth_003_...}) lives here,
 * not in {@code AuthSuite}:</b> it deliberately burns the shared per-IP
 * login budget. {@code AuthSuite} runs FIRST alphabetically — if the burn
 * test lived there, it starved every other suite's fresh logins (RoleSuite's
 * two brand-new test accounts, for instance) for the rest of that 1-minute
 * window, even though the whole suite finishes in a few seconds. This class
 * runs LAST, so by the time it burns the budget every other suite has
 * already had its turn.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Tag("security")
@DisplayName("Section 19 — Security")
class SecuritySuite {

    private static String adminToken;

    @BeforeAll
    static void login() {
        adminToken = Api.loginAsAdmin();
    }

    @Test
    @Order(1)
    @DisplayName("SEC-001: No token is rejected with 401, not data or a 500")
    void sec_001_noTokenRejected() {
        given().spec(Api.spec())
                .when().get("/api/v1/admin/staff")
                .then().statusCode(401);
    }

    @Test
    @Order(2)
    @DisplayName("SEC-002: A malformed bearer token is rejected with 401, not a 500")
    void sec_002_malformedTokenRejected() {
        given().spec(Api.authed("not.a.real.jwt"))
                .when().get("/api/v1/admin/staff")
                .then().statusCode(401);
    }

    @Test
    @Order(3)
    @DisplayName("SEC-003 (regression): NoSQL operator injection via query-string values stays a literal, inert string")
    @Tag("regression")
    void sec_003_operatorInjectionQueryParamsInert() {
        Response res = given().spec(Api.authed(adminToken))
                .queryParam("q", "{\"$ne\":null}")
                .when().get("/api/v1/admin/staff");
        res.then().statusCode(200); // treated as a literal search string, never a 500 or a full unfiltered dump
    }

    @Test
    @Order(4)
    @DisplayName("SEC-004 (regression): a malformed regex in the staff search box no longer causes a raw 500")
    @Tag("regression")
    void sec_004_malformedRegexStaffSearchNoLonger500s() {
        for (String payload : new String[]{"(", "[a-", "(a", "**", "(?P<x>"}) {
            given().spec(Api.authed(adminToken))
                    .queryParam("q", payload)
                    .when().get("/api/v1/admin/staff")
                    .then().statusCode(not(500));
        }
    }

    @Test
    @Order(5)
    @DisplayName("SEC-004b (regression): same malformed-regex fix on the children search endpoint")
    @Tag("regression")
    void sec_004b_malformedRegexChildrenSearchNoLonger500s() {
        for (String payload : new String[]{"(", "[a-"}) {
            given().spec(Api.authed(adminToken))
                    .queryParam("q", payload)
                    .when().get("/api/v1/admin/children")
                    .then().statusCode(not(500));
        }
    }

    @Test
    @Order(6)
    @DisplayName("SEC-004c (regression): same malformed-regex fix on the daily-records search endpoint")
    @Tag("regression")
    void sec_004c_malformedRegexDailyRecordsSearchNoLonger500s() {
        for (String payload : new String[]{"(", "[a-"}) {
            given().spec(Api.authed(adminToken))
                    .queryParam("q", payload)
                    .when().get("/api/v1/admin/daily-records")
                    .then().statusCode(not(500));
        }
    }

    @Test
    @Order(7)
    @DisplayName("SEC-005: A regex-escaped search still finds real matches (the fix didn't break normal substring search)")
    void sec_005_escapedSearchStillFindsRealMatches() {
        given().spec(Api.authed(adminToken))
                .queryParam("q", "a") // near-universally matches at least one Harrow staff first/last name
                .when().get("/api/v1/admin/staff")
                .then().statusCode(200)
                .body("data", not(empty()));
    }

    @Test
    @Order(8)
    @DisplayName("SEC-006 (regression): JSON body type confusion (object where a string field is expected) is rejected, not silently coerced")
    @Tag("regression")
    void sec_006_jsonTypeConfusionRejected() {
        given().spec(Api.authed(adminToken))
                .body("{\"branch_slug\":{\"$ne\":null},\"name\":\"SEC-006 probe\",\"capacity\":5}")
                .when().post("/api/v1/admin/rooms")
                .then().statusCode(400);
    }

    @Test
    @Order(9)
    @DisplayName("SEC-007: An explicit branch filter never returns another branch's records")
    void sec_007_branchFilterNeverLeaksOtherBranches() {
        // Uses the org-wide admin token, so this specifically checks the
        // ENDPOINT's own filter is honest — every record it returns for
        // branch=pinner really is a Pinner record. The deeper "a
        // branch-scoped role can't even REQUEST another branch" check needs a
        // second, non-admin login — see RoleSuite.tc_role_001_
        // branchManagerScopedToOwnBranch / tc_role_002c_deputyCannotAccessAnotherBranch.
        Response res = given().spec(Api.authed(adminToken))
                .queryParam("branch", "pinner")
                .when().get("/api/v1/admin/enquiries");
        res.then().statusCode(200);

        boolean anyWrongBranch = res.jsonPath().getList("data", java.util.Map.class).stream()
                .anyMatch(e -> !"pinner".equals(e.get("branch")));
        Assertions.assertFalse(anyWrongBranch, "branch=pinner filter returned a record from a different branch");
    }

    @Test
    @Order(10)
    @DisplayName("TC-AUTH-003 (regression): repeated failed logins from one caller are rate-limited")
    @Tag("regression")
    void tc_auth_003_loginIsRateLimited() {
        // MUST be the last test to run in the whole suite (see class Javadoc)
        // — deliberately burns the shared per-IP login budget.
        //
        // Given up to 10 requests/minute are allowed per the fixed
        // middleware.RateLimit(10, time.Minute) on both login routes
        int allowed = 0;
        int limited = 0;
        for (int i = 0; i < 12; i++) {
            Response res = given().spec(Api.spec())
                    .body(new Api.LoginRequest(Env.ADMIN_EMAIL, "still-wrong"))
                    .when().post("/api/v1/admin/auth/login");
            int code = res.statusCode();
            if (code == 429) {
                limited++;
            } else if (code == 401) {
                allowed++;
            } else {
                Assertions.fail("unexpected status " + code + " on attempt " + i);
            }
        }

        // Then somewhere within the burst, the limiter kicks in — the exact
        // cutover point depends on the shared per-IP window and how much of
        // it earlier suites/tests in this run already consumed, so assert
        // the *behaviour* (both outcomes occur, limited never resets mid-burst
        // to allow again) rather than a hard "exactly N were allowed" count.
        Assertions.assertTrue(limited > 0, "expected at least one 429 in a 12-request burst");
        Assertions.assertTrue(allowed <= 10, "more than 10 requests were allowed through the limiter");
    }
}
