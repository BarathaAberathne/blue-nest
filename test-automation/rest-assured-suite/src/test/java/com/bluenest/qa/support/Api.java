package com.bluenest.qa.support;

import com.bluenest.qa.config.Env;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

import static io.restassured.RestAssured.given;

/**
 * Shared REST-Assured plumbing: base request spec, login helpers, and the
 * one-line "authenticated request" builder every suite starts a test with.
 *
 * <p>Kept deliberately dependency-free of any single suite so it can be
 * reused unmodified as coverage grows (Section 25 of the QA plan asks for
 * exactly this: one authoritative client, not one per suite).
 */
public final class Api {

    private Api() {
    }

    public static RequestSpecification spec() {
        return new RequestSpecBuilder()
                .setBaseUri(Env.BASE_URL)
                .setContentType(ContentType.JSON)
                .setAccept(ContentType.JSON)
                .build();
    }

    /** Convenience: an authenticated request spec carrying the given bearer token. */
    public static RequestSpecification authed(String token) {
        return given().spec(spec()).header("Authorization", "Bearer " + token);
    }

    /**
     * Logs in against {@code /api/v1/admin/auth/login} and returns the access
     * token. Fails the calling test (via REST-Assured's assertion, not a raw
     * exception) if login doesn't return 200 — a login failure means the
     * whole downstream suite can't run, so fail fast and loud.
     */
    public static String loginAdmin(String email, String password) {
        Response res = given().spec(spec())
                .body(new LoginRequest(email, password))
                .when().post("/api/v1/admin/auth/login")
                .then().statusCode(200)
                .extract().response();
        return res.jsonPath().getString("data.access_token");
    }

    // Shared across the whole JVM run (all suite classes), NOT re-fetched per
    // suite: the login route is deliberately rate-limited to 10/minute per IP
    // (see AuthSuite.tc_auth_003, the regression lock for that fix) — eight
    // suites each logging in fresh in their own @BeforeAll would burn through
    // that budget by itself and start failing on 429, independent of anything
    // the suite under test is actually checking. One session for the run
    // matches how a real caller (a human tester, or a legitimate client)
    // would use this API too.
    private static volatile String cachedAdminToken;

    public static synchronized String loginAsAdmin() {
        if (cachedAdminToken == null) {
            cachedAdminToken = loginAdmin(Env.ADMIN_EMAIL, Env.ADMIN_PASSWORD);
        }
        return cachedAdminToken;
    }

    /** Body shape for POST /admin/auth/login and POST /auth/login. */
    public static final class LoginRequest {
        public String email;
        public String password;

        public LoginRequest(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }
}
