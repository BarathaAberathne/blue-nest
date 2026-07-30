# Test migration map

Human-readable view of `test-platform/migration-manifest.json` (authoritative), grouped by suite.
Regenerated from the manifest so it cannot drift. Legacy room_id write-path tests were
removed during the room-allocation consolidation — the canonical assignment model is now the
single source of truth (see `docs/architecture/duplicate-implementation-audit.md`).

**Overall: 150 of 150 completed (100%), 0 deliberately not migrated.**

## SUI-ATT-001 — Attendance (19/19 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| ChildAttendanceSuite.tc_childatt_001_checkIn | TC-CHILDATT-001 | `CHILDATT-TC-001` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_001_reg_duplicateCheckinRejected | TC-CHILDATT-001-REG | `CHILDATT-TC-001-REG` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_002_checkOut | TC-CHILDATT-002 | `CHILDATT-TC-002` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_002_reg_duplicateCheckoutRejected | TC-CHILDATT-002-REG | `CHILDATT-TC-002-REG` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_003_unscheduledDayNotFlagged | TC-CHILDATT-003 | `CHILDATT-TC-003` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_004_reg_checkoutWithoutCheckinRejected | TC-CHILDATT-004-REG | `CHILDATT-TC-004-REG` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_004b_reCheckinAfterCheckoutClearsStaleCheckout | TC-CHILDATT-004b | `CHILDATT-TC-004b` | ✅ completed | verified |
| ChildAttendanceSuite.tc_childatt_004c_unknownChildRejected | TC-CHILDATT-004c | `CHILDATT-TC-004c` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_001_clockIn | TC-STAFFATT-001 | `STAFFATT-TC-001` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_001_reg_duplicateClockInRejected | TC-STAFFATT-001-REG | `STAFFATT-TC-001-REG` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_002_clockOut | TC-STAFFATT-002 | `STAFFATT-TC-002` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_003b_manualCorrectionOnExistingRecord | TC-STAFFATT-003b | `STAFFATT-TC-002` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_002_reg_clockOutWithoutClockInRejected | TC-STAFFATT-002-REG | `STAFFATT-TC-002-REG` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_002b_reg_duplicateClockOutRejected | TC-STAFFATT-002b-REG | `STAFFATT-TC-002b-REG` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_003_manualCorrectionBackfillsMissingDay | TC-STAFFATT-003 | `STAFFATT-TC-003` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_003c_missingClockOutFlaggedForPastOpenShift | TC-STAFFATT-003c | `STAFFATT-TC-003c` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_004_markAbsentClearsClockTimes | TC-STAFFATT-004 | `STAFFATT-TC-004` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_004b_summaryPayloadWellFormed | TC-STAFFATT-004b | `STAFFATT-TC-004b` | ✅ completed | verified |
| StaffAttendanceSuite.tc_staffatt_004c_unknownStaffRejected | TC-STAFFATT-004c | `STAFFATT-TC-004c` | ✅ completed | verified |

## SUI-AUDIT-001 — Audit / Activity Log (3/3 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `AUDIT-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `AUDIT-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `AUDIT-TC-003` | ✅ completed | n/a-new-coverage |

## SUI-AUTH-001 — Authentication (15/15 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| AuthSuite.tc_auth_001_validLoginSucceeds | TC-AUTH-001 | `AUTH-TC-001` | ✅ completed | verified |
| AuthSuite.tc_auth_001b_tokenIsUsable | TC-AUTH-001b | `AUTH-TC-001` | ✅ completed | verified |
| AuthSuite.tc_auth_002_invalidPasswordRejected | TC-AUTH-002 | `AUTH-TC-002` | ✅ completed | verified |
| AuthSuite.tc_auth_002b_noAccountEnumeration | TC-AUTH-002b | `AUTH-TC-002b` | ✅ completed | verified |
| SecuritySuite.tc_auth_003_loginIsRateLimited | TC-AUTH-003 | `AUTH-TC-003` | ✅ completed | verified |
| (new coverage) | — | `AUTH-TC-004` | ✅ completed | n/a-new-coverage |
| SecuritySuite.sec_001_noTokenRejected | SEC-001 | `SEC-TC-001` | ✅ completed | verified |
| SecuritySuite.sec_002_malformedTokenRejected | SEC-002 | `SEC-TC-002` | ✅ completed | verified |
| SecuritySuite.sec_003_operatorInjectionQueryParamsInert | SEC-003 (regression) | `SEC-TC-003` | ✅ completed | verified |
| SecuritySuite.sec_004_malformedRegexStaffSearchNoLonger500s | SEC-004 (regression) | `SEC-TC-004` | ✅ completed | verified |
| SecuritySuite.sec_004b_malformedRegexChildrenSearchNoLonger500s | SEC-004b (regression) | `SEC-TC-004b` | ✅ completed | verified |
| SecuritySuite.sec_004c_malformedRegexDailyRecordsSearchNoLonger500s | SEC-004c (regression) | `SEC-TC-004c` | ✅ completed | verified |
| SecuritySuite.sec_005_escapedSearchStillFindsRealMatches | SEC-005 | `SEC-TC-005` | ✅ completed | verified |
| SecuritySuite.sec_006_jsonTypeConfusionRejected | SEC-006 (regression) | `SEC-TC-006` | ✅ completed | verified |
| SecuritySuite.sec_007_branchFilterNeverLeaksOtherBranches | SEC-007 | `SEC-TC-007` | ✅ completed | verified |

## SUI-BLOG-001 — Blog (8/8 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `BLOG-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-003` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-004` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-005` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-006` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-007` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `BLOG-TC-008` | ✅ completed | n/a-new-coverage |

## SUI-BRANCH-001 — Harrow Branch Setup (7/7 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| BranchSuite.tc_br_001_harrowExistsCorrectly | TC-BR-001 | `BRANCH-TC-001` | ✅ completed | verified |
| BranchSuite.tc_br_001b_branchKpisAreSane | TC-BR-001b | `BRANCH-TC-001b` | ✅ completed | verified |
| BranchSuite.tc_br_002_duplicateSlugRejected | TC-BR-002 | `BRANCH-TC-002` | ✅ completed | verified |
| BranchSuite.tc_br_002b_repeatedDuplicateAttemptsBothRejected | TC-BR-002b | `BRANCH-TC-002b` | ✅ completed | verified |
| BranchSuite.tc_br_003_configFieldsRoundTrip | TC-BR-003 | `BRANCH-TC-003` | ✅ completed | verified |
| BranchSuite.tc_br_003b_invalidOpeningHoursNotValidated | TC-BR-003b | `BRANCH-TC-003b` | ✅ completed | verified |
| (new coverage) | — | `BRANCH-TC-004` | ✅ completed | n/a-new-coverage |

## SUI-CHILDROOM-001 — Child Room Allocation and Transfer (2/2 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| ChildRoomSuite.tc_childroom_001_roomAgeRangesArePresent | TC-CHILDROOM-001 | `CHILDROOM-TC-001` | ✅ completed | verified |
| ChildRoomSuite.tc_childroom_004_reg_partialUpdatePreservesSafetyFields | TC-CHILDROOM-004-REG | `CHILDROOM-TC-004-REG` | ✅ completed | verified |

## SUI-ENQUIRY-001 — Enquiry Lifecycle (10/10 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| EnquiryRegistrationSuite.tc_enq_001_createsEnquiryOnce | TC-ENQ-001 | `ENQUIRY-TC-001` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_002_nameRequired | TC-ENQ-002 | `ENQUIRY-TC-002` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_002b_emailOrPhoneRequired | TC-ENQ-002b | `ENQUIRY-TC-002b` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_002c_branchRequired | TC-ENQ-002c | `ENQUIRY-TC-002c` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_002d_enquiryTypeRequired | TC-ENQ-002d | `ENQUIRY-TC-002d` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_003_duplicateSubmissionMerges | TC-ENQ-003 | `ENQUIRY-TC-003` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_003b_newEnquiryAfterRegisteredIsNotMerged | TC-ENQ-003b | `ENQUIRY-TC-003b` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_004_enquiryVisibleWithFullDetail | TC-ENQ-004 | `ENQUIRY-TC-004` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_005_addNoteRecordsAuthorAndTimestamp | TC-ENQ-005 | `ENQUIRY-TC-005` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_enq_006_statusTransitionNewToContacted | TC-ENQ-006 | `ENQUIRY-TC-006` | ✅ completed | verified |

## SUI-KEYPERSON-001 — Key Person Allocation (5/5 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `KEY-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `KEY-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `KEY-TC-003` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `KEY-TC-004` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `KEY-TC-005` | ✅ completed | n/a-new-coverage |

## SUI-KIOSK-001 — Kiosk (Entrance Tablet) (3/3 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `KIOSK-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `KIOSK-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `KIOSK-TC-003` | ✅ completed | n/a-new-coverage |

## SUI-KPI-001 — KPI Reconciliation (2/2 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| ScheduleSuite.tc_schedule_001_mondayWednesdayFridayPattern | TC-SCHEDULE-001 | `SCHEDULE-TC-001` | ✅ completed | verified |
| ScheduleSuite.tc_schedule_002_scheduleChangeMovesOccupancy | TC-SCHEDULE-002 | `SCHEDULE-TC-002` | ✅ completed | verified |

## SUI-LOG-001 — Daily Logs (10/10 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| DailyLogSuite.tc_log_001_mealLogCreated | TC-LOG-001 | `LOG-TC-001` | ✅ completed | verified |
| DailyLogSuite.tc_log_001b_missingTitleRejected | TC-LOG-001b | `LOG-TC-001b` | ✅ completed | verified |
| DailyLogSuite.tc_log_001c_missingBranchRejected | TC-LOG-001c | `LOG-TC-001c` | ✅ completed | verified |
| DailyLogSuite.tc_log_001d_unknownFieldRejected | TC-LOG-001d | `LOG-TC-001d` | ✅ completed | verified |
| DailyLogSuite.tc_log_004_observationWithEyfsAreas | TC-LOG-004 | `LOG-TC-004` | ✅ completed | verified |
| DailyLogSuite.tc_log_004b_statusLifecycle | TC-LOG-004b | `LOG-TC-004b` | ✅ completed | verified |
| DailyLogSuite.tc_log_005_incidentRecordCreated | TC-LOG-005 | `LOG-TC-005` | ✅ completed | verified |
| DailyLogSuite.tc_log_005b_deleteIsHardButAudited | TC-LOG-005b | `LOG-TC-005b` | ✅ completed | verified |
| DailyLogSuite.tc_log_006_dailySummaryWellFormed | TC-LOG-006 | `LOG-TC-006` | ✅ completed | verified |
| DailyLogSuite.tc_log_006b_unknownRecordRejected | TC-LOG-006b | `LOG-TC-006b` | ✅ completed | verified |

## SUI-NET-001 — Network and Endpoint Validation (2/2 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| ChildRoomSuite.tc_exitcriteria_duplicateChildRejected | Exit Criteria §6 (regression) | `CHILDROOM-TC-EXIT6` | ✅ completed | verified |
| DailyLogSuite.tc_exitcriteria_duplicateDailyRecordDebounced | Exit Criteria §6 (regression) | `LOG-TC-EXIT6` | ✅ completed | verified |

## SUI-PROCUREMENT-001 — Procurement (Supply Requests, Catalogue, Purchase Orders, Suppliers, Analytics, Templates) (11/11 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `PROC-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-003` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-004` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-005` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-006` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-007` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-008` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-009` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-010` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `PROC-TC-011` | ✅ completed | n/a-new-coverage |

## SUI-REG-001 — Child Registration (5/5 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| EnquiryRegistrationSuite.tc_reg_001_registerCreatesChildOnce | TC-REG-001 | `REG-TC-001` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_reg_001b_expectedStartDateHasNoTimezoneShift | TC-REG-001b | `REG-TC-001b` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_reg_002_appearsExactlyOnceInRegistered | TC-REG-002 | `REG-TC-002` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_reg_003_preventDuplicateConversion | TC-REG-003 | `REG-TC-003` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_reg_004_registrationNotAtomicWithChildCreation | TC-REG-004 | `REG-TC-004` | ✅ completed | verified |

## SUI-ROOM-001 — Room Setup (7/7 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| RoomSuite.tc_room_001_existingRoomsAreValid | TC-ROOM-001 | `ROOM-TC-001` | ✅ completed | verified |
| RoomSuite.tc_room_001b_createValidRoom | TC-ROOM-001b | `ROOM-TC-002` | ✅ completed | verified |
| RoomSuite.tc_room_002_zeroCapacityRejected | TC-ROOM-002 | `ROOM-TC-003` | ✅ completed | verified |
| RoomSuite.tc_room_002_negativeCapacityRejected | TC-ROOM-002 | `ROOM-TC-004` | ✅ completed | verified |
| RoomSuite.tc_room_002_duplicateNameSameBranchRejected | TC-ROOM-002 | `ROOM-TC-005` | ✅ completed | verified |
| RoomSuite.tc_room_002b_sameNameDifferentBranchAllowed | TC-ROOM-002b | `ROOM-TC-006` | ✅ completed | verified |
| RoomSuite.tc_room_002c_missingNameRejected | TC-ROOM-002c | `ROOM-TC-007` | ✅ completed | verified |

## SUI-SHIFTS-001 — Rota / Shift Scheduling (6/6 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `SHIFTS-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `SHIFTS-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `SHIFTS-TC-003` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `SHIFTS-TC-004` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `SHIFTS-TC-005` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `SHIFTS-TC-006` | ✅ completed | n/a-new-coverage |

## SUI-STAFF-001 — Staff and Role Setup (16/16 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| RoleSuite.tc_role_001_branchManagerScopedToOwnBranch | TC-ROLE-001 | `ROLE-TC-001` | ✅ completed | verified |
| RoleSuite.tc_role_001b_branchManagerCannotDoBranchLifecycle | TC-ROLE-001b | `ROLE-TC-002` | ✅ completed | verified |
| RoleSuite.tc_role_002_deputyCanOperateOnEnquiries | TC-ROLE-002 | `ROLE-TC-003` | ✅ completed | verified |
| RoleSuite.tc_role_002b_deputyCannotViewUsers | TC-ROLE-002b | `ROLE-TC-004` | ✅ completed | verified |
| RoleSuite.tc_role_002c_deputyCannotAccessAnotherBranch | TC-ROLE-002c | `ROLE-TC-005` | ✅ completed | verified |
| RoleSuite.tc_role_002d_reg_deputyCannotEscalateToSuperAdmin | TC-ROLE-002d-REG | `ROLE-TC-006` | ✅ completed | verified |
| RoleSuite.tc_role_002e_reg_deputyCannotEscalateViaUpdate | TC-ROLE-002e-REG | `ROLE-TC-007` | ✅ completed | verified |
| RoleSuite.tc_role_002f_superAdminCanStillGrantSuperAdmin | TC-ROLE-002f | `ROLE-TC-008` | ✅ completed | verified |
| RoleSuite.tc_role_003_activeSessionKeepsOldRoleUntilRefresh | TC-ROLE-003 | `ROLE-TC-009` | ✅ completed | verified |
| RoleSuite.tc_role_003b_freshLoginReflectsNewRole | TC-ROLE-003b | `ROLE-TC-010` | ✅ completed | verified |
| StaffSuite.tc_staff_001_createsStaffOnce | TC-STAFF-001 | `STAFF-TC-001` | ✅ completed | verified |
| StaffSuite.tc_staff_001b_invalidStatusRejected | TC-STAFF-001b | `STAFF-TC-002` | ✅ completed | verified |
| StaffSuite.tc_staff_003_duplicateEmailOnCreateRejected | TC-STAFF-003 | `STAFF-TC-003` | ✅ completed | verified |
| StaffSuite.tc_staff_003b_duplicateEmailOnUpdateRejected | TC-STAFF-003b | `STAFF-TC-004` | ✅ completed | verified |
| StaffSuite.tc_staff_003c_updatingOwnUnchangedEmailIsAllowed | TC-STAFF-003c | `STAFF-TC-005` | ✅ completed | verified |
| StaffSuite.tc_staff_004_reg_partialUpdatePreservesContactFields | TC-STAFF-004-REG | `STAFF-TC-006` | ✅ completed | verified |

## SUI-STORE-001 — Store (Products, Categories, Cart, Checkout, Orders) (9/9 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `STORE-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-003` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-004` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-005` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-006` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-007` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-008` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `STORE-TC-009` | ✅ completed | n/a-new-coverage |

## SUI-USERACCOUNT-001 — User Account Management (Users, Roles, Org Self-Service, Platform Organisations, Dashboards) (8/8 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| (new coverage) | — | `USER-TC-001` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-002` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-003` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-004` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-005` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-006` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-007` | ✅ completed | n/a-new-coverage |
| (new coverage) | — | `USER-TC-008` | ✅ completed | n/a-new-coverage |

## SUI-VISIT-001 — Visit Booking (2/2 migrated)

| Legacy class.method | Legacy ID | New test ID | Status | Parity |
|---|---|---|---|---|
| EnquiryRegistrationSuite.tc_visit_001_bookVisit | TC-VISIT-001 | `VISIT-TC-001` | ✅ completed | verified |
| EnquiryRegistrationSuite.tc_visit_004_completeVisit | TC-VISIT-004 | `VISIT-TC-004` | ✅ completed | verified |

## Suite-grouping rationale

The spec's 12-suite Harrow lifecycle (`SUI-AUTH-001` … `SUI-NET-001`) has
fewer target suites than the legacy suite has classes (14), so a few legacy
classes fold together:

- `RoleSuite` → `SUI-STAFF-001` (role/permission setup is staff-adjacent;
  there's no separate `SUI-ROLE-*` in the spec's named lifecycle).
- `ScheduleSuite` → `SUI-KPI-001` (session-schedule + capacity-forecast is
  the closest existing behaviour to "KPI Reconciliation").
- `ConcurrencySuite` → `SUI-NET-001` (concurrent-write/duplicate-call
  behaviour is exactly what "Network and Endpoint Validation" covers).
- `SecuritySuite` → `SUI-AUTH-001` (rate-limiting + auth-adjacent IDOR
  probes; the spec has no separate security suite in the 12-suite list).

These are documented choices, not silent guesses — if a future session
prefers dedicated `SUI-ROLE-001`/`SUI-SECURITY-001` suites instead, this is
the file to update (the manifest's `plannedSuite` field is free-form).

## Generic-architecture retrofit (complete for all migrated suites)

Per the "Critical Architecture Correction" — suites describe **functional
areas**, never a named branch; branches are runtime data via dynamic
fixtures (`BRANCH-FIX-001`/`002`), not the architecture itself. Retrofitted:
`SUI-BRANCH-001` (`BRANCH-TC-002/002b/004` now use throwaway branches),
`SUI-ROOM-001` (`ROOM-TC-002..007` all use their own throwaway branch;
`ROOM-TC-006` genuinely fixed to test real cross-branch behaviour with two
independent dynamic branches, instead of the legacy test's
same-branch-twice pattern), and `SUI-STAFF-001` (all 16 `STAFF-TC-*`/
`ROLE-TC-*` cases — each `STAFF-TC-*` creates its own throwaway branch;
the suite's shared `Setup` creates **two** dynamic branches, `branch` +
`branchB`, so `ROLE-TC-001`/`ROLE-TC-005` can genuinely prove cross-branch
rejection instead of hardcoding the real `pinner` branch as "the other
one"). `BRANCH-TC-001/001b/003/003b` and `ROOM-TC-001` are kept testing
the real, live Harrow branch on purpose — they verify actual
environment/pre-existing state (parity with the legacy suite), which is a
genuinely different thing from generic behaviour (see
`test-platform-architecture.md`'s "Exceptions"). `SUI-REG-001` (Child
Registration) and `SUI-KEYPERSON-001` (Key Person Allocation) were built
generic **from the start** — no retrofit needed — using the same
`BRANCH-FIX-001`/`002` dynamic-branch fixtures plus the new
`ENQUIRY-UTIL-001`/`CHILD-UTIL-001..003`/`KEY-UTIL-001..002` utilities.
**Every suite migrated so far is now fully generic** — none of the
remaining, not-yet-migrated suites have a branch-specific retrofit debt to
carry forward.

## Rollout order for the remaining suites

`SUI-AUTH-001`, `SUI-BRANCH-001`, `SUI-ROOM-001`, `SUI-STAFF-001`,
`SUI-REG-001`, `SUI-KEYPERSON-001` and `SUI-ENQUIRY-001` are done (55 of
116 manifest entries `completed` — see
`test-results/migration/parity-report.md`).

The architecture correction's "child registration + key person" pivot
(its own named first two example behaviours, `CHILD-TC-001`/`KEY-TC-001`)
landed as **`SUI-REG-001`** and **`SUI-KEYPERSON-001`** rather than new
`SUI-CHILD-001`/`SUI-KEY-001` ids: the manifest already had a
`plannedSuite: SUI-REG-001` ("Child Registration") mapping
`EnquiryRegistrationSuite.tc_reg_001..004` — an already-generic name (no
branch reference) from earlier session work — so those legacy tests were
migrated into it directly rather than duplicated under a new id.
`SUI-KEYPERSON-001` is new (no legacy equivalent existed to slot into), all
5 cases tracked as `n/a-new-coverage`. The illustrative Gherkin in the
correction assumed a separate atomic "register child" step and a literal
"registered children KPI" field — neither exists: registration and child
creation are already one call
(`POST /admin/enquiries/{id}/register` with `child_*` fields →
`AdminEnquiryHandler.Register` → `childService.EnsureFromEnquiry`, verified
in `internal/handler/admin/enquiries.go`), and `ChildStats` has no
"registered" counter distinct from `total`/`active` — `REG-TC-001` asserts
the real contract instead (`enquiry.status == "registered"` +
`registration.is_registered == true` + the child is findable by search),
matching the legacy suite's own actual assertions.

Recommended next, in dependency order (each needs the previous suite's
utilities):
`SUI-VISIT-001` → `SUI-ASSIGN-001` (child+staff→room) →
`SUI-ATT-001` (child+staff attendance) → `SUI-LOG-001` → `SUI-KPI-001` →
`SUI-NET-001`. The architecture correction additionally calls for: two E2E
journey collections (`COL-E2E-001`/`002`), a `COL-CONFIG-001` for the
environment-specific tests called out above, and a `PROFILE=`
test-data-profile mechanism — none of which exist yet (see
`test-platform-architecture.md`'s "Deliberate scope decisions" for the
full list). Each new suite follows the same pattern proven by
`SUI-AUTH-001`/`SUI-BRANCH-001`/`SUI-ROOM-001`/`SUI-REG-001`: extract one
authoritative `*-UTIL-*`/`*-FIX-*` per repeated operation, one bnrest case
per legacy `@Test` method (or new generic case), the suite file, then a
parity run before marking `migrationStatus: completed`.

**No legacy test is deleted until every entry in this table is `completed`
+ `verified`** (Phase F, `test-platform-architecture.md`).
