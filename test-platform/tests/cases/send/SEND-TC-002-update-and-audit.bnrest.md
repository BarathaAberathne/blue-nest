---
id: SEND-TC-002
number: 2.32.2
type: Test Case
title: Updating SEND support changes the status, syncs the child marker and writes an audit record
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: [SEND-TC-001]
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Update + audit

```bnrest
Body
When Put /api/v1/admin/children/${child.id}/send-support Into updated Using adminSession.accessToken
{ "status": "ehcp", "summary": "EHCP issued; 1:1 support mornings", "categories": ["communication_interaction", "sensory_physical"], "send_lead_staff_id": "${senco.id}", "plan_status": "active", "review_date": "${today("+12w")}", "start_date": "${today("-4w")}", "end_date": "" }
Then AssertStatus updated 200
And Assert updated.body.data.status == "ehcp"
And AssertJson updated "$.body.data.categories" contains "sensory_physical"
And Assert updated.body.data.send_lead_name != null

When Get /api/v1/admin/children/${child.id} Into rec Using adminSession.accessToken
Then Assert rec.body.data.send_status == "ehcp"

# Audit: the change is recorded against the child with prev→new status.
When Get /api/v1/admin/audit-logs?entity_type=child&action=send_support_update&limit=20 Into audit Using adminSession.accessToken
Then AssertStatus audit 200
And AssertJson audit "$.body.data[?(@.entity_id=='${child.id}' && @.action=='send_support_update')].length()" >= 1
```
