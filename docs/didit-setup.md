# Didit connection

The integration is deployed but stays disabled until the account is configured.

1. Register the Brazil Migration business at https://business.didit.me/ with a work email.
2. Create a sandbox application and a KYC workflow containing ID verification, passive liveness and face match (optionally device/IP). Do not add paid extras or white-label branding. Verify the actual account pricing and credits before enabling live use. From November 1, 2026, Didit announces $10/month credit (~30 full ID checks).
3. Set runtime secrets through the hosting environment: DIDIT_API_KEY and DIDIT_WORKFLOW_ID. Never place credentials in frontend code or chat. Set DIDIT_ENABLED=true only after the workflow/account pricing is checked. Do not enable automatic top-ups.
4. Test the hosted flow and decision retrieval with sandbox credentials; use a dedicated sandbox deployment/database so tests do not consume production reservations. Switch to live credentials only after successful verification.

Routes: /kyc/ (shared role-filtered UI), GET /api/kyc, POST /api/kyc/start, POST /api/kyc/refresh.

This owner-private Site uses authenticated server-side decision polling, not inbound public webhooks. Browser redirect query parameters cannot approve a person. The current version refreshes on return and via the result button; it does not synchronize results in the background when panels are closed.

30 new session reservations per UTC calendar month, shared by all panels. Each customer has one reusable session. Failed/ambiguous starts retain their reservations to prevent accidental double billing. Reconcile an ambiguous request in Didit using its local UUID/vendor_data before any manual retry. No reset button bypasses the quota. Session reservations are counted by creation month; the provider's billed completion month may differ. Provider-console usage outside this application is not included. Therefore, also maintain a free-credit-only provider account; the app cap alone is not a billing guarantee.

Admins may manage both isolated admin customer records and workspace customers, clearly labeled as separate records. Advisors/staff use existing KYC permissions and customer scope. Customers see their own sessions only. UI and other panel workflows remain separate. No document upload or handoff is automatically approved by a KYC result.

No passport images, biometric templates or full decision payloads are persisted in the app. Store session reference, status, verification URL, initiator and check timestamps only. Verification URLs are bearer links and must be shared only with the intended customer. Didit handles capture and its biometric consent flow.
