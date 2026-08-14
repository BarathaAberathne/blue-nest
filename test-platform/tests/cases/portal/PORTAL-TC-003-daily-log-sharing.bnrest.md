---
id: PORTAL-TC-003
number: 2.34.3
type: Test Case
title: Daily-log sharing lifecycle — internal by default, Send to Parent, sanitised, withdrawable, audited, never duplicated
owner: QA
mode: Standalone
status: Active
tags: [portal, regression]
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Sharing lifecycle

```bnrest
Setup
# Admin creates an observation (pending approval, internal).
Post /api/v1/admin/daily-records Into log Using adminSession.accessToken
{ "type": "observation", "child_id": "${child.id}", "branch_slug": "${branch.slug}", "date": "${today()}", "title": "QA-AUTOTEST shared obs", "detail": "Built a tall tower with careful balance." }
AssertStatus log 201

Body
# 1. Freshly created (pending) → parent sees NOTHING.
When Get /api/v1/portal/children/${child.id}/daily-records Into before Using parentToken
Then AssertStatus before 200
And AssertJson before "$.body.data[?(@.id=='${log.body.data.id}')]" == 0

# 2. Manager approves (different user from the admin submitter) → STILL invisible:
#    approval alone never shares.
When Post /api/v1/admin/daily-records/${log.body.data.id}/approve Into approved Using mgrSession.accessToken
Then AssertStatus approved 200

When Get /api/v1/portal/children/${child.id}/daily-records Into afterApprove Using parentToken
Then AssertJson afterApprove "$.body.data[?(@.id=='${log.body.data.id}')]" == 0

# 3. Send to Parent → visible, with the share attribution recorded.
When Post /api/v1/admin/daily-records/${log.body.data.id}/share Into shared Using mgrSession.accessToken
Then AssertStatus shared 200
And Assert shared.body.data.parent_shared == true
And Assert shared.body.data.parent_shared_by != null
And Assert shared.body.data.parent_shared_at != null

When Get /api/v1/portal/children/${child.id}/daily-records Into visible Using parentToken
Then AssertStatus visible 200
And AssertJson visible "$.body.data[?(@.id=='${log.body.data.id}')]" == 1

# 4. NO duplicate record was created — the staff list has exactly one.
When Get /api/v1/admin/daily-records?child_id=${child.id} Into staffList Using adminSession.accessToken
Then AssertJson staffList "$.body.data[?(@.title=='QA-AUTOTEST shared obs')]" == 1

# 5. Sanitisation: approval/staff internals are stripped from the parent view.
When Get /api/v1/portal/children/${child.id}/daily-records Into sanit Using parentToken
Then AssertJson sanit "$.body.data[?(@.id=='${log.body.data.id}' && (@.approved_by || @.submitted_by || @.witnesses))]" == 0

# 6. Withdraw → invisible again; record + share history survive on the staff side.
When Post /api/v1/admin/daily-records/${log.body.data.id}/unshare Into withdrawn Using mgrSession.accessToken
Then AssertStatus withdrawn 200

When Get /api/v1/portal/children/${child.id}/daily-records Into afterWithdraw Using parentToken
Then AssertJson afterWithdraw "$.body.data[?(@.id=='${log.body.data.id}')]" == 0

When Get /api/v1/admin/daily-records/${log.body.data.id} Into kept Using adminSession.accessToken
Then AssertStatus kept 200
And Assert kept.body.data.parent_shared_by != null

# 7. Audit trail: share + unshare events recorded.
When Get /api/v1/admin/audit-logs?entity_type=daily_record&action=share_with_parent&limit=20 Into auditShare Using adminSession.accessToken
Then AssertJson auditShare "$.body.data[?(@.entity_id=='${log.body.data.id}')].length()" >= 1

When Get /api/v1/admin/audit-logs?entity_type=daily_record&action=unshare_from_parent&limit=20 Into auditUnshare Using adminSession.accessToken
Then AssertJson auditUnshare "$.body.data[?(@.entity_id=='${log.body.data.id}')].length()" >= 1

Teardown
Delete /api/v1/admin/daily-records/${log.body.data.id} Using adminSession.accessToken
```
