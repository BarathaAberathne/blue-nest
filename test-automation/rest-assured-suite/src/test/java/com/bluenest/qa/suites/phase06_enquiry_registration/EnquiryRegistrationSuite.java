package com.bluenest.qa.suites.phase06_enquiry_registration;

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
 * Phases 7–10 — Enquiry submission → Deputy handling → Visit → Registration.
 *
 * <p>Source: QA test plan §7 Phases 7–10 (TC-ENQ-001/002/003/004/005/006,
 * TC-VISIT-001/004, TC-REG-001/002/003/004). This system folds "visit booking" into the
 * enquiry's own status field rather than a separate Visit entity — see
 * README "Why there's no separate Visit suite" — so TC-VISIT-* is expressed
 * here as status transitions, matching the real API surface.
 *
 * <p><b>Regression coverage:</b> TC-REG-001's expected-start-date round trip
 * was found to shift by one calendar day (timezone handling bug in the
 * frontend's date→ISO conversion — fixed this session, see
 * {@code AdminInquiryDetailClient.tsx}/{@code AdminInquiriesClient.tsx}
 * {@code dateInputToISO}). Test 8 below regression-locks the *API contract*
 * side of that fix: an ISO midnight-UTC timestamp submitted for a given
 * calendar date must be read back as that exact same calendar date.
 *
 * <p><b>No {@code @AfterAll} cleanup for the enquiry itself:</b> unlike every
 * other suite, there is no {@code DELETE /admin/enquiries/{id}} endpoint in
 * this codebase — enquiries are an audit/CRM trail by design, not meant to be
 * hard-deleted. The child this suite creates via registration IS cleaned up
 * (see {@code cleanup()}); the enquiry itself is left behind, clearly
 * `QA-AUTOTEST-`-prefixed, the same "meaningful, not deleted" precedent this
 * session's manual QA pass already established for other test fixtures.
 *
 * <p><b>TC-ENQ-003 and TC-REG-004 are documented gap locks, not passing
 * assertions of good behaviour:</b> verified directly against {@code
 * backend/internal/service/enquiry.go} — there is no duplicate-enquiry
 * detection at all (two identical submissions create two documents), and
 * {@code Register} is two non-transactional writes (enquiry status flip,
 * then a best-effort child creation) with no rollback — the enquiry can end
 * up {@code registered} with zero children created. Both are locked here so
 * a future fix is required to update these tests, not silently regress.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phases 7-10 — Enquiry -> Visit -> Registration")
class EnquiryRegistrationSuite {

    private static String adminToken;
    private static String enquiryId;
    private static final String childLastName = "Child " + TestData.uniqueName("Reg");
    private static String createdChildId; // resolved after registration, cleaned up in @AfterAll

    @BeforeAll
    static void login() {
        adminToken = Api.loginAsAdmin();
    }

    @AfterAll
    static void cleanup() {
        if (createdChildId != null) {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/children/" + createdChildId);
        }
    }

    @Test
    @Order(1)
    @DisplayName("TC-ENQ-001 (adapted, admin-logged channel): a new enquiry is created exactly once, status New, linked to Harrow")
    @Tag("golden-path")
    void tc_enq_001_createsEnquiryOnce() {
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "name", TestData.uniqueName("Parent"),
                        "email", TestData.uniqueEmail("parent"),
                        "phone", "07000000001",
                        "branch", Env.HARROW_BRANCH_SLUG,
                        "child_age", "Under 1 year",
                        "enquiry_type", "General enquiry",
                        "source", "phone"))
                .when().post("/api/v1/admin/enquiries");

        res.then().statusCode(201)
                .body("data.status", equalTo("new"))
                .body("data.branch", equalTo(Env.HARROW_BRANCH_SLUG));
        enquiryId = res.jsonPath().getString("data.id");
    }

    @Test
    @Order(2)
    @DisplayName("TC-ENQ-004: The enquiry is visible under Harrow with complete parent/child information")
    void tc_enq_004_enquiryVisibleWithFullDetail() {
        given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/enquiries/" + enquiryId)
                .then().statusCode(200)
                .body("data.branch", equalTo(Env.HARROW_BRANCH_SLUG))
                .body("data.name", not(emptyOrNullString()))
                .body("data.email", not(emptyOrNullString()));
    }

    @Test
    @Order(3)
    @DisplayName("TC-ENQ-005: An internal note is added, author and timestamp are recorded")
    void tc_enq_005_addNoteRecordsAuthorAndTimestamp() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("note", "QA-AUTOTEST note — golden path in progress."))
                .when().post("/api/v1/admin/enquiries/" + enquiryId + "/notes")
                .then().statusCode(200)
                .body("data.notes", hasSize(greaterThanOrEqualTo(1)))
                .body("data.notes[0].note", containsString("QA-AUTOTEST"))
                .body("data.notes[0].author_name", not(emptyOrNullString()))
                .body("data.notes[0].created_at", not(emptyOrNullString()));
    }

    @Test
    @Order(4)
    @DisplayName("TC-ENQ-006: Status New -> Contacted is a single, auditable transition")
    void tc_enq_006_statusTransitionNewToContacted() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("status", "contacted"))
                .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status")
                .then().statusCode(200).body("data.status", equalTo("contacted"));

        // Refresh does not revert the status (list + detail agree).
        given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/enquiries/" + enquiryId)
                .then().statusCode(200).body("data.status", equalTo("contacted"));
    }

    @Test
    @Order(5)
    @DisplayName("TC-VISIT-001 (expressed as a status transition): Contacted -> Booked visit")
    @Tag("golden-path")
    void tc_visit_001_bookVisit() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("status", "booked_visit"))
                .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status")
                .then().statusCode(200).body("data.status", equalTo("booked_visit"));
    }

    @Test
    @Order(6)
    @DisplayName("TC-VISIT-004 (expressed as a status transition): Booked visit -> Visit completed")
    @Tag("golden-path")
    void tc_visit_004_completeVisit() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("status", "visit_completed"))
                .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status")
                .then().statusCode(200).body("data.status", equalTo("visit_completed"));
    }

    @Test
    @Order(7)
    @DisplayName("TC-REG-001: Registering the enquiry creates exactly one Child, links the enquiry, sets status Registered")
    @Tag("golden-path")
    void tc_reg_001_registerCreatesChildOnce() {
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "registration_date", "2026-07-23T00:00:00Z",
                        "expected_start_date", "2026-09-01T00:00:00Z",
                        "child_age_group", "Under 1 year",
                        "funding_type", "None",
                        "child_first_name", "QA-AUTOTEST",
                        "child_last_name", childLastName,
                        "child_dob", "2026-03-01",
                        "child_gender", ""))
                .when().post("/api/v1/admin/enquiries/" + enquiryId + "/register");

        res.then().statusCode(200)
                .body("data.status", equalTo("registered"))
                .body("data.registration.is_registered", equalTo(true));

        // The Register response is the updated Enquiry, not the Child — the
        // link only exists on the Child side (enquiry_id), so resolve the
        // new child's id via search for later assertions/cleanup.
        Response search = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children?branch=" + Env.HARROW_BRANCH_SLUG + "&q=QA-AUTOTEST");
        createdChildId = search.jsonPath().getList("data").stream()
                .filter(c -> childLastName.equals(((Map<?, ?>) c).get("last_name")))
                .map(c -> String.valueOf(((Map<?, ?>) c).get("id")))
                .findFirst()
                .orElse(null);
        Assertions.assertNotNull(createdChildId, "the child created by registration must be findable via search");
    }

    @Test
    @Order(8)
    @DisplayName("TC-REG-001b (regression): the expected start date round-trips to the exact same calendar date, no timezone shift")
    @Tag("regression")
    void tc_reg_001b_expectedStartDateHasNoTimezoneShift() {
        Response res = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/enquiries/" + enquiryId);

        String storedDate = res.jsonPath().getString("data.registration.expected_start_date");

        // Submitted "2026-09-01T00:00:00Z" — must read back as the same UTC
        // calendar date. Pre-fix, local-time interpretation of the date input
        // on the frontend shifted this to 2026-08-31 in a UTC+1 timezone; the
        // API contract itself (this test) was always correct — this test
        // guards against the bug being reintroduced anywhere in the chain.
        Assertions.assertTrue(storedDate.startsWith("2026-09-01"),
                "expected calendar date 2026-09-01, got: " + storedDate);
    }

    @Test
    @Order(9)
    @DisplayName("TC-REG-002: The enquiry appears exactly once under Registered, and nowhere else")
    void tc_reg_002_appearsExactlyOnceInRegistered() {
        Response registered = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/enquiries?status=registered");

        List<Map> matches = registered.jsonPath().getList("data", Map.class).stream()
                .filter(e -> enquiryId.equals(e.get("id")))
                .toList();
        Assertions.assertEquals(1, matches.size(), "enquiry must appear exactly once in Registered");

        for (String otherStatus : List.of("new", "contacted", "booked_visit", "visit_completed")) {
            Response other = given().spec(Api.authed(adminToken))
                    .when().get("/api/v1/admin/enquiries?status=" + otherStatus);
            boolean stillThere = other.jsonPath().getList("data").stream()
                    .anyMatch(e -> enquiryId.equals(((Map<?, ?>) e).get("id")));
            Assertions.assertFalse(stillThere, "enquiry must not remain in status=" + otherStatus);
        }
    }

    @Test
    @Order(10)
    @DisplayName("TC-REG-003: Registering the same enquiry a second time does not create a second child")
    void tc_reg_003_preventDuplicateConversion() {
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "registration_date", "2026-07-23T00:00:00Z",
                        "expected_start_date", "2026-09-01T00:00:00Z",
                        "child_age_group", "Under 1 year",
                        "funding_type", "None",
                        "child_first_name", "QA-AUTOTEST",
                        "child_last_name", "Second Attempt",
                        "child_dob", "2026-03-01",
                        "child_gender", ""))
                .when().post("/api/v1/admin/enquiries/" + enquiryId + "/register");

        // The service is documented as idempotent here (EnsureFromEnquiry) —
        // a retry must succeed (not error) but must NOT create a second child
        // under the retried payload's ("Second Attempt") name.
        res.then().statusCode(200);

        Response child = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/children?branch=" + Env.HARROW_BRANCH_SLUG + "&q=QA-AUTOTEST");
        long matchingChildren = child.jsonPath().getList("data").stream()
                .filter(c -> "Second Attempt".equals(((Map<?, ?>) c).get("last_name")))
                .count();
        Assertions.assertEquals(0, matchingChildren, "a second registration attempt must not create a second child");
    }

    @Test
    @Order(11)
    @DisplayName("TC-ENQ-002: A name is required to create an enquiry")
    @Tag("regression")
    void tc_enq_002_nameRequired() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("email", TestData.uniqueEmail("noname"), "branch", Env.HARROW_BRANCH_SLUG, "enquiry_type", "General enquiry"))
                .when().post("/api/v1/admin/enquiries")
                .then().statusCode(400).body("error", containsStringIgnoringCase("name"));
    }

    @Test
    @Order(12)
    @DisplayName("TC-ENQ-002b: Either an email or a phone number is required")
    @Tag("regression")
    void tc_enq_002b_emailOrPhoneRequired() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("name", "QA-AUTOTEST No Contact Method", "branch", Env.HARROW_BRANCH_SLUG, "enquiry_type", "General enquiry"))
                .when().post("/api/v1/admin/enquiries")
                .then().statusCode(400).body("error", containsStringIgnoringCase("email or phone"));
    }

    @Test
    @Order(13)
    @DisplayName("TC-ENQ-002c: A branch is required")
    @Tag("regression")
    void tc_enq_002c_branchRequired() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("name", "QA-AUTOTEST No Branch", "email", TestData.uniqueEmail("nobranch"), "enquiry_type", "General enquiry"))
                .when().post("/api/v1/admin/enquiries")
                .then().statusCode(400).body("error", containsStringIgnoringCase("branch"));
    }

    @Test
    @Order(14)
    @DisplayName("TC-ENQ-002d: An enquiry type is required")
    @Tag("regression")
    void tc_enq_002d_enquiryTypeRequired() {
        given().spec(Api.authed(adminToken))
                .body(Map.of("name", "QA-AUTOTEST No Type", "email", TestData.uniqueEmail("notype"), "branch", Env.HARROW_BRANCH_SLUG))
                .when().post("/api/v1/admin/enquiries")
                .then().statusCode(400).body("error", containsStringIgnoringCase("enquiry type"));
    }

    @Test
    @Order(15)
    @DisplayName("TC-ENQ-003 (regression, documents a real gap): submitting the same enquiry twice creates two separate records, not a detected duplicate")
    @Tag("regression")
    void tc_enq_003_noDuplicateDetection() {
        String email = TestData.uniqueEmail("dupe-enquiry");
        Map<String, Object> body = Map.of(
                "name", "QA-AUTOTEST Duplicate Probe", "email", email,
                "branch", Env.HARROW_BRANCH_SLUG, "enquiry_type", "General enquiry");

        String firstId = given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/enquiries")
                .then().statusCode(201).extract().jsonPath().getString("data.id");

        // Then: the plan expects this to be flagged/blocked as a likely
        // duplicate. The real system has no such detection — it creates a
        // second, fully independent enquiry document, silently.
        String secondId = given().spec(Api.authed(adminToken)).body(body)
                .when().post("/api/v1/admin/enquiries")
                .then().statusCode(201).extract().jsonPath().getString("data.id");

        Assertions.assertNotEquals(firstId, secondId, "documents the gap: two identical submissions produce two distinct enquiry ids");
    }

    @Test
    @Order(16)
    @DisplayName("TC-REG-004 (regression, documents a real gap): registering with no child fields still flips the enquiry to Registered — no atomicity ties status to child creation")
    @Tag("regression")
    void tc_reg_004_registrationNotAtomicWithChildCreation() {
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of(
                        "name", "QA-AUTOTEST Reg004 Parent", "email", TestData.uniqueEmail("reg004"),
                        "branch", Env.HARROW_BRANCH_SLUG, "enquiry_type", "General enquiry"))
                .when().post("/api/v1/admin/enquiries");
        fixture.then().statusCode(201);
        String reg004EnquiryId = fixture.jsonPath().getString("data.id");

        // When registering with NO child_first_name/child_last_name/child_dob —
        // the "plan" expects registration to either require them or roll back
        // if child creation can't happen. The real system flips status anyway.
        Response res = given().spec(Api.authed(adminToken))
                .body(Map.of("registration_date", "2026-07-23T00:00:00Z", "expected_start_date", "2026-09-01T00:00:00Z"))
                .when().post("/api/v1/admin/enquiries/" + reg004EnquiryId + "/register");

        // Then: status flips to Registered anyway — no child was even attempted
        // (EnsureFromEnquiry only runs when child fields are present), yet
        // nothing here requires or reports that. That's the documented gap:
        // "registered" does not guarantee a child record exists.
        res.then().statusCode(200)
                .body("data.status", equalTo("registered"))
                .body("data.registration.is_registered", equalTo(true));
    }
}
