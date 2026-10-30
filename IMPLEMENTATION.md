# Brazil Migration workspace

The original marketing pages remain in public/. /panel and /partner share a server-backed workspace with Sites identity, D1 records, and private R2 uploads.

## Access

Dispatch authentication headers are trusted only in the hosted Sites runtime. Never expose the Worker directly with user-supplied identity headers. Initial owner membership is bound on first authenticated login to the existing Site owner's email and then to stable identity. Email invitations expire after 7 days and bind the invited account's stable identity on acceptance. Site audience remains owner-private; invited users also need platform access granted by the owner.

Every API request checks active membership, module permission, consultant relationship and customer scope. Bank/profile records and avatars are private to their owner. File reads are authorized before retrieving private R2 content. Customer registration binds first referral source; repeat application invoices retain the original advisor. Invoice payment confirmation records one commission entry per invoice (unique key).

## Configured behavior

- Customer applications, renewal links, support messages, appointment requests, panel notifications.
- File upload up to 10 MB: PDF/JPEG/PNG; mobile camera via capture=environment, preview and download.
- Animated local file readiness check, followed by authorized human document review. No biometric authentication or external KYC claims.
- Staff creates invoices, supplies supported Stripe/PayPal checkout links, and manually confirms externally received payment with a reference. A confirmation is not a payment capture or bank transfer.
- Staff invitations, permissions (none/read/write), assigned customer scope, disable, audit history, referral campaigns/clicks/registrations and recorded sales.
- Profile, bank/contact details, photo, language preference and translated navigation for 12 service regions.

## Connections not configured

Independent email/password login and TOTP are not available in current Sites identity; use ChatGPT sign-in and the linked account's security settings. No email is sent by this application. No payment webhook is configured. Google Calendar/Meet connector eligibility was not available; appointments are durable requests with an optional Google Calendar draft URL, not confirmed meetings or automatically generated Meet links. Content beyond navigation is not fully localized.

## Verification

node tests/authorization.mjs: in-memory SQLite/D1 adapter tests authorization and workflows, including anonymous/unknown rejection, invitations, assigned customer scope, cross-customer download rejection, readonly restrictions, disabled member rejection, origin protection, invoice commission idempotency and referral flow.
node tests/render-ui.mjs: pure UI fixture rendering. It creates ignored public/qa-panel files; remove them before building. Fixtures do not establish hosted authentication or integration verification.

Use Sites build-site.mjs and site-workflow.mjs for build/publication. Schema migrations are immutable after deployment. No browser fixture or identity bypass is included in deployed routes.
