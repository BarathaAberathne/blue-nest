---
id: EXPORT-TC-002
number: 2.28.2
type: Test Case
title: The export endpoints return Excel when ?format=xlsx and CSV by default
owner: QA
mode: Standalone
status: Active
tags:
  - export
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Excel (?format=xlsx) export dispatch

`export.Write` dispatches one call site to CSV (default) or XLSX
(`?format=xlsx|excel`). Locks the content type + attachment filename for both
paths so a format regression can't ship silently. Reads the shared
`adminSession` fixture (see `SUI-EXPORT-001`).

```bnrest
When Get /api/v1/admin/staff/export?format=xlsx Into xlsx Using adminSession.accessToken
Then AssertStatus xlsx 200
And AssertHeader xlsx Content-Type contains spreadsheetml
And AssertHeader xlsx Content-Disposition contains .xlsx

When Get /api/v1/admin/staff/export?format=excel Into excelAlias Using adminSession.accessToken
Then AssertStatus excelAlias 200
And AssertHeader excelAlias Content-Type contains spreadsheetml

When Get /api/v1/admin/staff/export Into csv Using adminSession.accessToken
Then AssertStatus csv 200
And AssertHeader csv Content-Type contains text/csv
And AssertHeader csv Content-Disposition contains .csv

When Get /api/v1/admin/leave-requests/export?format=xlsx Into leaveXlsx Using adminSession.accessToken
Then AssertStatus leaveXlsx 200
And AssertHeader leaveXlsx Content-Type contains spreadsheetml
```
