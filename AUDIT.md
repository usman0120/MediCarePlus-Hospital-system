# MediCare Plus remediation audit

Source-code remediation and local verification, **not clinical/security certification**.
No real patient data was inspected. No remote Firebase reset, user provisioning,
rules deployment or index deployment has been performed.

## Resolved source-code findings

| Finding | Remediation |
| --- | --- |
| Public unrestricted Firestore rules | Replaced with role/identity/ownership, validation, record-locking and transaction-link rules; still must be deployed by the owner |
| Public admin registration and bundled credentials | Removed; only patient self-registration remains |
| Administrator/reception session replaced during staff creation | Isolated secondary, in-memory Auth instance; emulator connection follows the primary Auth instance |
| Paid Auth/MFA conflict | Owner explicitly changed the requirement to verified email/password for admin; no MFA, fake OTP or server verifier is added |
| Competing database exports and collections | Removed over 12,000 lines of legacy database paths; all active SDK database operations live in `src/database.js` |
| Duplicate appointment/payment/salary/EMR widgets | Consolidated into one V2 workflow and shared validated controls |
| Human accountant, pricing proposals, fake financial accounts | Removed from the UI, routes, data access and dependencies |
| Double booking and rescheduling races | Deterministic slot markers and atomic reservation/rescheduling/release |
| Payment revenue counted twice or before receipt | Revenue updates only in the receipt-confirmation transaction; paid invoices are immutable |
| Paid salary overwritten/reprocessed | Deterministic monthly records, frozen attendance and atomic payout checks |
| Fixed-divisor overpayment and invalid calendar dates | Actual calendar days and base-minus-explicit-deductions under the approved 26-day policy |
| Inventory deducted on scheduling and again on start | Deduct only at operation start, together with billing and audit |
| Transaction reads after writes / query reads masquerading as isolated transaction reads | Explicit document reads before writes; deterministic attendance document reads |
| Clinical counters changed independently | Require the corresponding lab/operation creation/completion/cancellation in the same transaction |
| Lab/reception unnecessarily reading EMR | Update only the required visit links/counters; no EMR read access for those actors |
| File payloads too large / silent corrupt downloads | Compressed Base64, conservative size caps, signatures and SHA-256 checks; download integrity verification |
| Chat duplicate sends and broken read receipts | Deterministic conversation/request IDs, atomic send/counter updates, monotonic receipts and retries of the same request |
| Doctor availability auto-reply impersonation | Explicit, server-validated automatic notice derived from the doctor's configured hours, not a fabricated doctor message |
| Invoice cancellation mutates unrelated charges | Exact original lab-line removal with matching source/counter transition |
| Token refresh destroys unsaved clinical drafts | Same-identity token refresh no longer clears the workspace; EMR revisions detect conflicting edits |
| Emergency cases forced through routine booking | Immediate assessed intake, one pending case per patient, explicit dismissal, and severity/FIFO server pagination |
| Invalid field-to-field low-stock query | Maintain `lowStock` transactionally and use actual stock/threshold values |
| Unbounded fallback scans and fake empty successes | Bounded subscriptions/pages, explicit errors and capped browser exports; reports use server aggregates |
| Duplicate PDFs and marketing/fake QR/telephone content | One jsPDF component and a factual portal landing page; unapproved legal/marketing boilerplate removed |
| Multiple auth/theme contexts and deep component folders | One `context/AuthContext.jsx`; requested shallow page/component layout |
| Fake PWA/background `/api` synchronization | Retired old worker at its original URL; no nonexistent endpoint queues or silent deletion of old offline data |
| Huge eager bundles and external font loading | Lazy role/PDF/chart loading, smaller CSS, system fonts, scoped vendor chunks |
| Unused dependencies and known vulnerabilities | Removed unused widgets/charts/crypto/email packages; pinned patched gRPC/glob leaves through tested overrides |
| Weak browser/deployment defaults | CSP, anti-framing, no-referrer, HSTS, popup-compatible COOP and restrictive permissions policy |
| Windows emulator remains running after CLI shutdown | Test runner tracks only its own exact demo-project Java process and cleans it up; refuses occupied ports without killing unrelated processes |

## Current architecture

- React/Vite, Tailwind, FontAwesome, Chart.js, jsPDF, Context API.
- Firebase Auth + Firestore client SDK; transactions and security rules.
- Collections remain the approved flat set. Settings are a typed `_settings`
  document inside `departments`; emergency case locks use `appointments`; payroll
  locks use `attendance`. No new nested collections or fake service endpoints.
- Clinical/financial documents preserve historical name/price snapshots; current
  staff/department access and pricing use authoritative IDs/catalogs.
- Patient/doctor/reception/lab/admin screens call the V2 API, not legacy exports.
- Chat is participant-only, including against admin/reception access.
- Browser export deliberately excludes chat/messages. Owner maintenance backup is
  a separately privileged, offline operation and is not deployed as a backend.

## Approved policy changes

1. **Admin: verified email/password only.** The owner removed MFA from the requirement.
   This is weaker than MFA and must not be described as MFA-protected.
2. No paid Auth provider or Firebase file storage was enabled. Phone SMS sending
   remains disabled unless the owner later approves/configures it.
3. Payroll: Monday–Saturday, paid approved leave, no late deduction, half-day
   deduction 0.5, fixed divisor 26. Missing attendance prevents finalization.
4. Routine appointments reserve a real configured slot before payment. Emergency
   intake bypasses routine slots and records the reception assessment.

## Deployment and operational blockers

- Establish project-owner access to `fyp2-175ea`; review a protected backup, then
  run the explicitly confirmed demo reset/sole-admin tool if desired. Current
  owner credentials have not been supplied. Code changes do not grant access.
- Deploy the new rules/indexes and Vercel environment configuration together in
  staging. Existing remote rules may still be permissive. Do not assume a Git push
  deploys Firebase rules. Existing Vercel integration may deploy `main` automatically.
- Rotate credentials previously published in Git history or deployed bundles.
  Removing current plaintext does not erase historical copies.
- Set Firebase's server-side password policy, authorized domains and provider
  configuration. Browser password length checks are not a replacement for Auth
  console policy. Live Google/email delivery/verification must be smoke-tested.
- Existing data with old schemas or missing search fields requires an owner-run
  migration/reset; the app does not fabricate missing metadata or silently mutate
  old clinical/financial records.
- Obtain hospital approval for bed-day rounding, employment proration, tax,
  overtime, leave authorization, refunds/partial payments, equipment/staff resource
  scheduling, unidentified-patient intake, and linking offline walk-ins to a portal.
  Payroll currently covers the three approved staff access roles; support employees
  without portal access need an explicitly agreed model.
- Uploaded proofs/reports are not malware-scanned. Firestore rules cannot decompress
  a file or authenticate bank settlement. Receipt confirmation remains the authorized
  staff member's actual external verification, not a simulated payment gateway.
- Multilingual PDF fonts need hospital-approved installation/embedding. The PDF
  generator refuses covered unsupported scripts rather than save unreadable output;
  original structured data remains intact. No language support is falsely claimed.
- The fully server-validated prescription is bounded to eight medicine entries
  under Firestore's 1,000-expression rule budget. Larger prescriptions are rejected,
  never partially saved/truncated; an approved validation/schema extension is needed
  before clinical workflows requiring more entries can be accepted.
- Global doctor search is fuzzy; patient search uses indexed authorized prefixes
  with fuzzy ranking of bounded candidates. It is not an unlimited full-text engine.
  Recent/frequent patient lookups are memory-only and reset on identity changes.
- Browser automation runs only while the admin screen is open. Server aggregates
  measure actual receipts/assessments/acquisition value; acquisition is not bank
  settlement. No unattended jobs or trustworthy failed-login/IP forensics are claimed.
- Browser exports are capped and not atomic point-in-time backups. Perform an
  encrypted backup/restore drill, access-revocation drill, quota/cost review,
  regional/legal privacy review and independent security/clinical acceptance test.
- Enforce/verify CSP with the live Google provider and Vercel deployment. Local
  browser tests use emulators and do not establish production provider behavior.

## Verification

`npm test` covers pure money/calendar/payroll/file validation. `npm run test:rules`
starts only `demo-medicare-foundation` emulators and executes both real SDK/rule
tests and a real Chrome browser workflow. Synthetic fixtures are never app data.
Tests cover concurrency, clinical ownership, invoice/revenue synchronization,
inventory/bed workflows, monthly payroll locking, chat receipts, emergency intake,
actual prescription PDF creation and the password-only admin policy.

### Final verified pass

- `npm test`: **8 passed**.
- `npm run test:rules`: **17 passed**, including the real Chrome workflow and
  the eight-entry prescription boundary, invalid medicine type rejection,
  missing clinical partner rejection, eight-message delivered/seen batches,
  staff-session preservation and actual server aggregate totals.
- `npm run lint`: passed.
- `npm run build`: passed without mixed-import or oversized-chunk warnings.
- `npm audit`: **0 known vulnerabilities** at verification time.
- `git diff --check`: passed. `.env`, maintenance backups and generated browser
  profiles/downloads are ignored and are not published.

Some intentionally malformed denial fixtures still report Firestore's expression
budget before rejection. They are denied; all tested valid boundary transactions
pass. Additional independent adversarial/load testing is still required before
clinical certification. These checks do not imply remote deployment, live OAuth
configuration, bank settlement validation or clinical/privacy approval.
