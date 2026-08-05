---
id: EMAILTPL-TC-001
number: 2.27.1
type: Test Case
title: An email template can be customised and reverted to default
owner: QA
mode: Standalone
status: Active
tags:
  - email-templates
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Customise + revert an email template

The catalogue lists the enquiry acknowledgement with its default copy; an admin
can override subject/body (marked customized) and revert to the default. Reads
the shared `adminSession` fixture (see `SUI-EMAILTPL-001`).

```bnrest
When Get /api/v1/admin/email-templates Into before Using adminSession.accessToken
Then AssertStatus before 200
And AssertJson before "$.body.data[?(@.key=='enquiry_acknowledgement' && @.customized==false)]" == 1

When Put /api/v1/admin/email-templates/enquiry_acknowledgement Into updated Using adminSession.accessToken
{ "subject": "QA custom subject", "body": "Hi {{name}}, thanks for your {{type}} enquiry." }
Then AssertStatus updated 200
And Assert updated.body.data.subject == "QA custom subject"

When Get /api/v1/admin/email-templates Into after Using adminSession.accessToken
Then AssertStatus after 200
And AssertJson after "$.body.data[?(@.key=='enquiry_acknowledgement' && @.customized==true)]" == 1

When Delete /api/v1/admin/email-templates/enquiry_acknowledgement Into reverted Using adminSession.accessToken
Then AssertStatus reverted 204

When Get /api/v1/admin/email-templates Into final Using adminSession.accessToken
Then AssertStatus final 200
And AssertJson final "$.body.data[?(@.key=='enquiry_acknowledgement' && @.customized==false)]" == 1
```
