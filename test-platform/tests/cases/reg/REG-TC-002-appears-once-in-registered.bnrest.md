---
id: REG-TC-002
number: 1.5.3
type: Test Case
title: The enquiry appears exactly once under Registered, and nowhere else
owner: QA
mode: Standalone
status: Active
tags:
  - registration
dependsOn:
  - REG-TC-001
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Enquiry appears once under Registered, nowhere else

Replaces legacy
`EnquiryRegistrationSuite.tc_reg_002_appearsExactlyOnceInRegistered`.
`dependsOn: [REG-TC-001]` — needs the actual registration to have happened.

```bnrest
Given Get /api/v1/admin/enquiries?branch=${branch.slug}&status=registered Into registeredList Using adminSession.accessToken
Then AssertStatus registeredList 200
And AssertJson registeredList "$.body.data[?(@.id=='${enquiry.id}')]" == 1

When Get /api/v1/admin/enquiries?branch=${branch.slug}&status=new Into newList Using adminSession.accessToken
Then AssertJson newList "$.body.data[?(@.id=='${enquiry.id}')]" == 0

When Get /api/v1/admin/enquiries?branch=${branch.slug}&status=contacted Into contactedList Using adminSession.accessToken
Then AssertJson contactedList "$.body.data[?(@.id=='${enquiry.id}')]" == 0

When Get /api/v1/admin/enquiries?branch=${branch.slug}&status=booked_visit Into bookedList Using adminSession.accessToken
Then AssertJson bookedList "$.body.data[?(@.id=='${enquiry.id}')]" == 0

When Get /api/v1/admin/enquiries?branch=${branch.slug}&status=visit_completed Into visitCompletedList Using adminSession.accessToken
Then AssertJson visitCompletedList "$.body.data[?(@.id=='${enquiry.id}')]" == 0
```
