# Current endpoint coverage (legacy REST-Assured suite) — baseline snapshot

Built from static analysis of every `.get/.post/.put/.patch/.delete(...)`
call in `test-automation/rest-assured-suite/src/test/java/com/bluenest/qa/suites`
(all literal-string call sites; a handful of calls build the path with
string concatenation, e.g. `"/api/v1/admin/rooms/" + roomId` — these are
grouped under their base resource below). The bnrest engine's own AST-based
endpoint extraction (see `test-platform-architecture.md`) supersedes this
grep-based snapshot for anything migrated going forward — this document is
the Phase A **starting point**, not a permanent source of truth. For the
full, current, up-to-date coverage picture across BOTH suites, see
`endpoint-inventory.md`.

| Method | Endpoint | Covered by | Roles used |
|---|---|---|---|
| POST | `/api/v1/admin/auth/login` | `AuthSuite`, `SecuritySuite` | anonymous → super_admin |
| GET | `/api/v1/admin/branches` | `BranchSuite`, `RoleSuite` | super_admin |
| POST | `/api/v1/admin/branches` | `BranchSuite`, `RoleSuite` | super_admin |
| PUT | `/api/v1/admin/branches/{id}` | `BranchSuite` | super_admin |
| POST | `/api/v1/admin/branches/{id}/...` (settings/assignment) | `RoleSuite` | super_admin |
| POST | `/api/v1/admin/rooms` | `RoomSuite`, `ChildRoomSuite`, `ScheduleSuite`, `ConcurrencySuite`, `SecuritySuite` | super_admin |
| GET | `/api/v1/admin/rooms?branch=` | `RoomSuite`, `ChildRoomSuite`, `RoomStaffSuite` | super_admin |
| DELETE | `/api/v1/admin/rooms/{id}` | `RoomSuite`, `ChildRoomSuite`, `ScheduleSuite`, `ConcurrencySuite` | super_admin |
| POST | `/api/v1/admin/staff` | `StaffSuite`, `RoleSuite`, `StaffAttendanceSuite`, `RoomStaffSuite`, `ConcurrencySuite`, `SecuritySuite` | super_admin |
| GET | `/api/v1/admin/staff` | `SecuritySuite` | super_admin, branch_manager (IDOR probes) |
| PUT | `/api/v1/admin/staff/{id}` | `StaffSuite`, `RoleSuite`, `RoomStaffSuite` | super_admin |
| DELETE | `/api/v1/admin/staff/{id}` | `StaffSuite`, `RoleSuite`, `StaffAttendanceSuite`, `RoomStaffSuite`, `ConcurrencySuite` | super_admin |
| GET | `/api/v1/admin/users` | `RoleSuite` | super_admin |
| DELETE | `/api/v1/admin/users/{id}` | `RoleSuite` | super_admin |
| POST | `/api/v1/admin/enquiries` | `EnquiryRegistrationSuite`, `RoleSuite`, `ConcurrencySuite` | super_admin, anonymous (public contact form path) |
| GET | `/api/v1/admin/enquiries[?status=][?branch=]` | `EnquiryRegistrationSuite`, `RoleSuite` | super_admin, branch_manager |
| GET | `/api/v1/admin/enquiries/{id}` | `EnquiryRegistrationSuite`, `ConcurrencySuite` | super_admin |
| PATCH | `/api/v1/admin/enquiries/{id}` (status) | `EnquiryRegistrationSuite`, `RoleSuite`, `ConcurrencySuite` | super_admin, admissions |
| POST | `/api/v1/admin/enquiries/{id}/...` (notes/register/reply/follow-up/assign) | `EnquiryRegistrationSuite`, `RoleSuite` | super_admin, admissions |
| POST | `/api/v1/admin/children` | `ChildRoomSuite`, `ChildAttendanceSuite`, `ScheduleSuite`, `ConcurrencySuite` | super_admin |
| GET | `/api/v1/admin/children?branch=` | `EnquiryRegistrationSuite` | super_admin |
| GET | `/api/v1/admin/children/{id}` | `ChildRoomSuite` | super_admin |
| PUT | `/api/v1/admin/children/{id}` | `ChildRoomSuite`, `ScheduleSuite` | super_admin |
| DELETE | `/api/v1/admin/children/{id}` | `ChildRoomSuite`, `ChildAttendanceSuite`, `ScheduleSuite`, `ConcurrencySuite`, `EnquiryRegistrationSuite` | super_admin |
| GET | `/api/v1/admin/children/stats` | `AuthSuite`, `BranchSuite` | super_admin |
| GET | `/api/v1/admin/children/capacity-forecast` | `ScheduleSuite` | super_admin |
| POST | `/api/v1/admin/attendance/check-in` | `ChildAttendanceSuite` | super_admin |
| POST | `/api/v1/admin/attendance/check-out` | `ChildAttendanceSuite` | super_admin |
| POST | `/api/v1/admin/staff-attendance/clock-in` | `StaffAttendanceSuite`, `ConcurrencySuite` | super_admin |
| POST | `/api/v1/admin/staff-attendance/clock-out` | `StaffAttendanceSuite` | super_admin |
| GET | `/api/v1/admin/staff-attendance` | `ConcurrencySuite` | super_admin |
| GET | `/api/v1/admin/staff-attendance/summary` | `StaffAttendanceSuite` | super_admin |
| PATCH | `/api/v1/admin/staff-attendance/mark` | `StaffAttendanceSuite` | super_admin |
| PATCH | `/api/v1/admin/staff-attendance/{id}/correct` | `StaffAttendanceSuite` | super_admin |
| POST | `/api/v1/admin/daily-records` | `DailyLogSuite` | super_admin |
| GET | `/api/v1/admin/daily-records[?...]` | `DailyLogSuite`, `SecuritySuite` | super_admin |
| GET | `/api/v1/admin/daily-records/{id}` | `DailyLogSuite` | super_admin |
| PATCH | `/api/v1/admin/daily-records/{id}` | `DailyLogSuite` | super_admin |
| DELETE | `/api/v1/admin/daily-records/{id}` | `DailyLogSuite` | super_admin |
| GET | `/api/v1/admin/daily-records/stats` | `DailyLogSuite` | super_admin |
| GET | `/api/v1/admin/audit-logs` | `DailyLogSuite` | super_admin |

**39 distinct endpoint+method combinations** exercised by 109 tests across
14 domains. Every write endpoint (`POST`/`PUT`/`PATCH`/`DELETE`) has at
least one negative/rejection test alongside its golden-path test, per the
legacy suite's own `README.md` coverage matrix (see that file for the exact
plan-`TC-ID` cross-reference, including the 27 "partially covered" and 6
"N/A by design" cases carried into `test-migration-map.md`).

## Endpoints the legacy suite never covered

Store/checkout/orders, blog, purchase-carts/procurement, order-requests,
suppliers, catalogue, organisation/tenancy admin, dashboard layouts, kiosk
endpoints, and the MD Command Centre's live-data reads were never in scope
for the original legacy suite — a pre-existing gap, not something the
migration introduces. All of these are now covered by the bnrest platform
instead (`SUI-STORE-001`, `SUI-BLOG-001`, `SUI-PROCUREMENT-001`,
`SUI-USERACCOUNT-001`, `SUI-KIOSK-001` — see `endpoint-inventory.md`); the
MD Command Centre's live-data reads remain untested by either suite.
