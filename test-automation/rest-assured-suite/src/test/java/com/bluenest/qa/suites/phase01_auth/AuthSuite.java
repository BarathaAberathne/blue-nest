package com.bluenest.qa.suites.phase01_auth;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Phase 1 — Authentication and Organisation Access.
 *
 * <p>Source: QA test plan §7 Phase 1 (TC-AUTH-001, TC-AUTH-002). TC-AUTH-003
 * (the login rate-limiting regression) is also part of this phase in the
 * master plan's numbering, but the test itself lives in
 * {@code SecuritySuite} — see the note at the bottom of this class for why.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 1 — Authentication")
class AuthSuite {

    /**
     * Populates {@link Api}'s shared token cache BEFORE any test method in
     * this class runs — including under {@code -Dgroups=regression}, where
     * only {@code tc_auth_003} (which deliberately burns the shared per-IP
     * rate-limit budget) would otherwise run first and leave every other
     * suite's {@code @BeforeAll} login with nothing left in the window.
     * {@code @BeforeAll} is not itself tag-filtered — it fires whenever this
     * class has at least one selected test — so this ordering holds for any
     * filter that includes anything from this suite.
     */
    @BeforeAll
    static void warmSharedTokenCache() {
        Api.loginAsAdmin();
    }

    @Test
    @Order(1)
    @DisplayName("TC-AUTH-001: Director/admin login succeeds and returns a usable session")
    @Tag("golden-path")
    void tc_auth_001_validLoginSucceeds() {
        // Given a valid admin email/password
        // When the admin logs in
        Response res = given().spec(Api.spec())
                .body(new Api.LoginRequest(Env.ADMIN_EMAIL, Env.ADMIN_PASSWORD))
                .when().post("/api/v1/admin/auth/login");

        // Then login succeeds exactly once, with both an access token and a
        // refresh token (the session-persistence bug fixed this session was
        // exactly a missing refresh_token — regression-locked here at the API
        // contract level, independent of which frontend page calls it).
        res.then()
                .statusCode(200)
                .body("data.access_token", not(emptyOrNullString()))
                .body("data.refresh_token", not(emptyOrNullString()))
                .body("data.user.email", equalToIgnoringCase(Env.ADMIN_EMAIL))
                .body("data.user.role", not(emptyOrNullString()));
    }

    @Test
    @Order(2)
    @DisplayName("TC-AUTH-001b: The returned access token is immediately usable")
    @Tag("golden-path")
    void tc_auth_001b_tokenIsUsable() {
        String token = Api.loginAsAdmin();

        given().spec(Api.authed(token))
                .when().get("/api/v1/admin/children/stats")
                .then().statusCode(200)
                .body("data.total", greaterThanOrEqualTo(0));
    }

    @Test
    @Order(3)
    @DisplayName("TC-AUTH-002: Invalid password is rejected with a safe, generic message")
    void tc_auth_002_invalidPasswordRejected() {
        // Given an incorrect password
        // When login is attempted
        Response res = given().spec(Api.spec())
                .body(new Api.LoginRequest(Env.ADMIN_EMAIL, "definitely-the-wrong-password"))
                .when().post("/api/v1/admin/auth/login");

        // Then it fails with 401 and a message that does NOT confirm/deny
        // account existence (no "user not found" vs "wrong password" split).
        res.then()
                .statusCode(401)
                .body("error", not(containsStringIgnoringCase("not found")))
                .body("data", nullValue());
    }

    @Test
    @Order(4)
    @DisplayName("TC-AUTH-002b: Login for a non-existent email returns the SAME error shape as a wrong password")
    void tc_auth_002b_noAccountEnumeration() {
        Response wrongPassword = given().spec(Api.spec())
                .body(new Api.LoginRequest(Env.ADMIN_EMAIL, "wrong-password"))
                .when().post("/api/v1/admin/auth/login");

        Response noSuchAccount = given().spec(Api.spec())
                .body(new Api.LoginRequest("no-such-user-" + System.nanoTime() + "@bluenest.test", "whatever"))
                .when().post("/api/v1/admin/auth/login");

        Assertions.assertEquals(401, wrongPassword.statusCode());
        Assertions.assertEquals(401, noSuchAccount.statusCode());
        Assertions.assertEquals(
                wrongPassword.jsonPath().getString("error"),
                noSuchAccount.jsonPath().getString("error"),
                "wrong-password and no-such-account must be indistinguishable to the caller");
    }

    // TC-AUTH-003 (the login rate-limiting regression) lives in SecuritySuite,
    // not here — it deliberately burns the shared per-IP login budget, and
    // every OTHER suite in this project needs at least one fresh (uncached)
    // login of its own (RoleSuite creates two brand-new test accounts, for
    // instance). Running the burn test first — as it did when it lived in
    // this class, which Surefire always runs first alphabetically — starved
    // every later suite's login attempts for the rest of that 1-minute
    // window, even though the whole suite finishes in a few seconds.
    // SecuritySuite runs LAST (phase09_), so the burn test lives there now:
    // see SecuritySuite.tc_auth_003_loginIsRateLimited.
}
