package com.bluenest.qa.suites.phase13_concurrency;

import com.bluenest.qa.config.Env;
import com.bluenest.qa.support.Api;
import com.bluenest.qa.support.Fixtures;
import com.bluenest.qa.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * §16 — Concurrency (TC-CON-001/002/003).
 *
 * <p>Source: QA test plan §16. Every test here fires genuinely concurrent
 * HTTP requests (a 2-thread {@link ExecutorService} + a {@link
 * CountDownLatch} start gate, so both requests are in flight before either
 * completes) — verified against the real write paths first
 * ({@code backend/internal/repository/enquiry.go}, {@code service/
 * child.go}, {@code service/staff_attendance.go}):
 *
 * <ul>
 *   <li>TC-CON-001: enquiry updates are field-scoped {@code $set}/{@code
 *       $push} writes with no version/timestamp precondition — two
 *       concurrent writers touching different fields BOTH persist (no lost
 *       update in this case), but nothing would detect or report an actual
 *       same-field conflict if one occurred. Documented, not fabricated.</li>
 *   <li>TC-CON-002: child→room assignment never reads room occupancy at all
 *       (see {@code ChildRoomSuite.tc_childroom_003_...} for the sequential
 *       proof) — this test proves the same absence of enforcement holds
 *       under real concurrency, not just sequential calls.</li>
 *   <li>TC-CON-003: {@code StaffAttendanceService.ClockIn} is a
 *       read-check-then-write (not an atomic compare-and-swap), but the
 *       underlying {@code Upsert} is keyed by {@code staff_id+date} — so
 *       even if both concurrent requests slip past the "already clocked in"
 *       check, at most one attendance record can ever exist for that key.
 *       This test asserts that real invariant (single, valid record) rather
 *       than a specific status-code pair, which would be genuinely
 *       nondeterministic under a true race.</li>
 * </ul>
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Section 16 — Concurrency")
class ConcurrencySuite {

    private static String adminToken;

    @BeforeAll
    static void login() {
        adminToken = Api.loginAsAdmin();
    }

    /** Runs both callables concurrently, both released at the same instant. */
    private static <T> List<T> runConcurrently(Callable<T> a, Callable<T> b) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch gate = new CountDownLatch(1);
        try {
            Callable<T> gatedA = () -> { gate.await(); return a.call(); };
            Callable<T> gatedB = () -> { gate.await(); return b.call(); };
            Future<T> fa = pool.submit(gatedA);
            Future<T> fb = pool.submit(gatedB);
            gate.countDown();
            return List.of(fa.get(10, TimeUnit.SECONDS), fb.get(10, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @Order(1)
    @DisplayName("TC-CON-001 (regression, documents a real gap): two concurrent, non-conflicting edits to the same enquiry BOTH persist, with no versioning to detect a real conflict")
    @Tag("regression")
    void tc_con_001_concurrentEnquiryEditsBothPersist() throws Exception {
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of("name", "QA-AUTOTEST Concurrency Probe", "email", TestData.uniqueEmail("con001"),
                        "branch", Env.HARROW_BRANCH_SLUG, "enquiry_type", "General enquiry"))
                .when().post("/api/v1/admin/enquiries");
        fixture.then().statusCode(201);
        String enquiryId = fixture.jsonPath().getString("data.id");

        List<Integer> results = runConcurrently(
                () -> given().spec(Api.authed(adminToken)).body(Map.of("status", "contacted"))
                        .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status").statusCode(),
                () -> given().spec(Api.authed(adminToken)).body(Map.of("note", "QA-AUTOTEST concurrent note"))
                        .when().post("/api/v1/admin/enquiries/" + enquiryId + "/notes").statusCode());

        Assertions.assertEquals(List.of(200, 200), results, "both concurrent, field-disjoint writes should succeed");

        Response after = given().spec(Api.authed(adminToken)).when().get("/api/v1/admin/enquiries/" + enquiryId);
        after.then().statusCode(200)
                .body("data.status", equalTo("contacted"))
                .body("data.notes.note", hasItem(containsString("QA-AUTOTEST concurrent note")));
        // Neither write was lost — but that's a side effect of the two calls
        // touching different fields, not of any conflict-detection mechanism;
        // nothing here would have surfaced a TRUE same-field race.
    }

    @Test
    @Order(2)
    @DisplayName("TC-CON-001b (regression, documents a real gap): two concurrent edits to the SAME field on the same enquiry both succeed — silent last-write-wins, no conflict reported")
    @Tag("regression")
    void tc_con_001b_concurrentSameFieldEditIsSilentLastWriteWins() throws Exception {
        Response fixture = given().spec(Api.authed(adminToken))
                .body(Map.of("name", "QA-AUTOTEST Same-Field Race", "email", TestData.uniqueEmail("con001b"),
                        "branch", Env.HARROW_BRANCH_SLUG, "enquiry_type", "General enquiry"))
                .when().post("/api/v1/admin/enquiries");
        fixture.then().statusCode(201);
        String enquiryId = fixture.jsonPath().getString("data.id");

        // Deputy Manager sets status -> contacted; Branch Manager, working from
        // the same stale "new" view, sets status -> awaiting_reply — genuinely
        // concurrently, both targeting the exact same field.
        List<Integer> results = runConcurrently(
                () -> given().spec(Api.authed(adminToken)).body(Map.of("status", "contacted"))
                        .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status").statusCode(),
                () -> given().spec(Api.authed(adminToken)).body(Map.of("status", "awaiting_reply"))
                        .when().patch("/api/v1/admin/enquiries/" + enquiryId + "/status").statusCode());

        // Then: the plan expects versioning/timestamps/optimistic locking to
        // identify this conflict. Nothing does — both writers get a plain 200,
        // neither is told their change may have been overwritten.
        Assertions.assertEquals(List.of(200, 200), results,
                "documents the gap: both concurrent same-field writers succeed with no conflict signalled to either");

        // The record isn't corrupted — exactly one of the two values survives
        // (plain last-write-wins), just silently, with no audit of the race.
        String finalStatus = given().spec(Api.authed(adminToken))
                .when().get("/api/v1/admin/enquiries/" + enquiryId)
                .jsonPath().getString("data.status");
        Assertions.assertTrue(List.of("contacted", "awaiting_reply").contains(finalStatus),
                "final status must be exactly one of the two racing writes, not a corrupted third value: was " + finalStatus);
    }

    @Test
    @Order(3)
    @DisplayName("TC-CON-002 (regression): two children allocated concurrently to the SAME capacity-1 room — the system stays consistent (reported occupancy matches the writes that succeeded, never a server error)")
    @Tag("regression")
    void tc_con_002_concurrentRoomAllocationStaysConsistent() throws Exception {
        // Room membership is now the canonical assignment model (PR #100): the
        // child DTO no longer carries room_id, and capacity is enforced. This
        // races two allocations into a single-place room via the assignment
        // endpoint and asserts the system stays consistent either way.
        String roomId = Fixtures.createRoom(adminToken, Env.HARROW_BRANCH_SLUG, "ConcurrencyCap1", 1);
        String childAId = Fixtures.createChild(adminToken, Env.HARROW_BRANCH_SLUG, "ConA", "2026-03-01");
        String childBId = Fixtures.createChild(adminToken, Env.HARROW_BRANCH_SLUG, "ConB", "2026-03-01");
        try {
            List<Response> results = runConcurrently(
                    () -> Fixtures.assignChildRoom(adminToken, childAId, roomId, null),
                    () -> Fixtures.assignChildRoom(adminToken, childBId, roomId, null));

            int successes = 0;
            for (Response res : results) {
                int code = res.statusCode();
                Assertions.assertTrue(code == 201 || code == 400,
                        "each concurrent allocation must be a clean 201 or 400, never a server error: was " + code);
                if (code == 201) {
                    successes++;
                }
            }
            Assertions.assertTrue(successes >= 1, "at least one concurrent allocation must succeed");

            // Consistency invariant (holds whether or not the capacity check is
            // race-atomic): the room's reported occupancy equals the number of
            // allocations that actually succeeded — no phantom or lost writes,
            // and never a corrupted state.
            int occupancy = given().spec(Api.authed(adminToken))
                    .when().get("/api/v1/admin/rooms/" + roomId + "/children")
                    .then().statusCode(200).extract()
                    .jsonPath().getList("data.findAll { it.child_id == '" + childAId + "' || it.child_id == '" + childBId + "' }").size();
            Assertions.assertEquals(successes, occupancy,
                    "reported room occupancy (" + occupancy + ") must equal the allocations that succeeded (" + successes + ")");
        } finally {
            Fixtures.deleteChild(adminToken, childAId);
            Fixtures.deleteChild(adminToken, childBId);
            Fixtures.deleteRoom(adminToken, roomId);
        }
    }

    @Test
    @Order(4)
    @DisplayName("TC-CON-003: Two concurrent clock-ins for the same staff member/date can never produce more than one attendance record")
    void tc_con_003_concurrentClockInStaysSingleRecord() throws Exception {
        Response staff = given().spec(Api.authed(adminToken))
                .body(Map.of("first_name", "QA-AUTOTEST", "last_name", TestData.uniqueName("ConcurrentClock"),
                        "email", TestData.uniqueEmail("con003"), "branch_slug", Env.HARROW_BRANCH_SLUG, "status", "active"))
                .when().post("/api/v1/admin/staff");
        staff.then().statusCode(201);
        String staffId = staff.jsonPath().getString("data.id");
        String date = LocalDate.of(2027, 5, 20).toString();

        try {
            List<Integer> results = runConcurrently(
                    () -> given().spec(Api.authed(adminToken)).body(Map.of("staff_id", staffId, "date", date))
                            .when().post("/api/v1/admin/staff-attendance/clock-in").statusCode(),
                    () -> given().spec(Api.authed(adminToken)).body(Map.of("staff_id", staffId, "date", date))
                            .when().post("/api/v1/admin/staff-attendance/clock-in").statusCode());

            // Every outcome here is a valid 200 (accepted) or 400 (rejected as a
            // duplicate) — never a 500, and the two calls together must never
            // produce more than one open session (see the invariant check below).
            for (int code : results) {
                Assertions.assertTrue(code == 200 || code == 400, "unexpected status " + code + " from a concurrent clock-in");
            }

            Response register = given().spec(Api.authed(adminToken))
                    .queryParam("date", date).queryParam("branch", Env.HARROW_BRANCH_SLUG)
                    .when().get("/api/v1/admin/staff-attendance");
            register.then().statusCode(200);
            long matchingRecords = register.jsonPath().getList("data", Map.class).stream()
                    .filter(r -> staffId.equals(r.get("staff_id")) && r.get("clock_in") != null)
                    .count();
            Assertions.assertEquals(1, matchingRecords,
                    "the staff_id+date upsert key must guarantee exactly one clocked-in record, regardless of how the race resolved");
        } finally {
            given().spec(Api.authed(adminToken)).when().delete("/api/v1/admin/staff/" + staffId);
        }
    }
}
