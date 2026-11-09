# MediCare Plus

Repository: https://github.com/usman0120/MediCarePlus-Hospital-system

Existing preview: https://medicareplushospital.vercel.app (not approved for real patient data).
For support, create an issue in the repository. Never commit the `.env` file.

React + Vite hospital management application using Firebase Authentication,
Firestore, Tailwind CSS, Chart.js, FontAwesome and jsPDF.

## Current status

**Under staged remediation, not approved for clinical production use.**

The authoritative V2 data API is the `hospital` export in `src/database.js`.
It includes appointment-slot transactions, structured visits, invoice/payment
transactions, bed billing/transfers, lab requests, operation/inventory transactions,
attendance, fixed-26 payroll, participant-only chat and audit records.

The older dashboard exports below this API remain during migration. They are **not
compatible with the new rules/schema** and must be replaced before deployment.
See [AUDIT.md](AUDIT.md) for outstanding issues, limitations and migration work.

## Local development

1. Use Node.js 22.12+ and `npm ci`.
2. Copy `.env.example` to `.env` and provide your Firebase web configuration.
3. Enable Email/Password and Google providers and configure authorized domains.
4. Run `npm run dev`.

There are no default passwords or public administrator/staff registration forms.
Patients must verify their email. Shared-device sessions use session persistence;
remembering a session is opt-in. Medical data is not deliberately persisted to disk.

## Verification

```sh
npm test
npm run test:rules
npm run lint
npm run build
```

The rules tests require Firebase CLI and Java. They use only the local
`demo-medicare-foundation` emulator project, with synthetic test fixtures.
They do not seed application data or connect to the live hospital project.

## Sole administrator provisioning / test-data reset

`scripts/reset-firebase.mjs` uses the Firebase Admin SDK **only as an owner-run
maintenance tool**, not as a deployed backend. It does not need Cloud Functions.

Set these **server-only shell variables**:

- `GOOGLE_APPLICATION_CREDENTIALS`: absolute path to a service account for the
  intended project. Keep the JSON file outside the repository.
- `MEDICARE_FIREBASE_PROJECT`: the exact project ID.
- `MEDICARE_ADMIN_EMAIL`: the administrator email requested by the project owner.
- `MEDICARE_ADMIN_PASSWORD`: the password, provided securely in the local shell.

Never use a `VITE_` prefix for administrator credentials; Vite values are public.

Run `npm run firebase:reset` first. This is read-only and reports the target,
account count and collections. After reviewing that output, apply explicitly:

```sh
npm run firebase:reset -- --apply --confirm-project=YOUR_EXACT_PROJECT_ID
```

Applying first creates a protected local backup, then removes test accounts and
Firestore data, retaining/provisioning one admin. Auth and Firestore cannot share
one atomic transaction; stop and review the backup if maintenance fails.
Run only while the project is offline to avoid concurrent registrations/writes.
Protect backups with OS access controls and approved encryption, then move them
outside the workspace. Password hashes may be present in the Auth backup.

The current CLI account has not been shown to have access to `fyp2-175ea`.
No remote reset, admin creation, index deployment or rules deployment has run.

## Administrator MFA

The rules require Firebase's real `sign_in_second_factor: totp` token claim for
administrator privileges. **The owner has declined paid Auth features**, so
`VITE_ENABLE_TOTP=false` and privileged admin access intentionally remains blocked.
No paid Auth configuration has been enabled. A secure, free verification alternative
requires a separate architecture decision; a browser-only simulation is not one.
The login page supports authenticators and gated enrollment;
there is no simulated OTP fallback. Firebase Identity Platform/TOTP configuration
and any associated billing must be approved before enabling administrator access.
First sign in, verify email, enroll an authenticator and sign in again with MFA.

Phone OTP helpers support linking a verified phone to an email-verified account;
SMS sending is disabled by default (`VITE_ENABLE_PHONE_AUTH=false`) under the
owner's no-paid-Auth decision. No SMS configuration has been enabled.
phone-only identity does not meet the mandatory verified-email policy. SMS quotas
and billing depend on Firebase's plan and country configuration.

## Financial and clinical policies

- Money is stored in integer PKR paisa (`*Minor`). Display values are derived.
- A slot is reserved before payment; reception checks in the patient, and the
  assigned doctor opens the visit and consultation invoice.
- Patients submit proof; only reception/admin confirms money received. Confirmation
  locks the invoice and updates department revenue in the same transaction.
- Additional services require an unpaid invoice. Pending proof must be rejected
  before more charges can be added. Paid invoices are immutable; amendments/refunds
  require a separately designed policy, not silent changes to paid records.
- Bed charges use the documented rolling-24-hour, minimum-one-day policy on release.
  This policy needs hospital approval before use.
- Salary uses a 26-day deduction divisor. The owner-approved default is Monday–Saturday,
  Sunday off, paid approved leave, no lateness deduction and a half-day deduction
  of 0.5 daily salary. This remains configurable per staff member. Missing attendance blocks finalization.
  Finalized payroll freezes attendance; salary payout cannot be repeated.
- No tax, overtime, discounts or fees are invented. Approve those policies before
  extending the financial schema.

## Files and platform limits

Files are gzip-compressed client-side into Base64 with size metadata and SHA-256
checksums. Supported files are PDF/JPEG/PNG/WebP. Compressed Base64 must be at most
600,000 characters, and the complete application document is capped conservatively
at 900,000 bytes. Some PDFs/images do not compress enough and are rejected.

Base64 is **not encryption**. Client checksums are integrity checks, not malware
scanning or proof of payment authenticity. Firestore rules cannot decompress files.
No Cloud Functions, Firebase Storage or fake background automation is used.
Scheduled work, trustworthy IP/login telemetry, payment settlement, immutable external
audit trails and point-in-time backups cannot be guaranteed by a browser-only app.

## Deployment

Do not deploy until the dashboard migration, positive/negative workflow tests,
dependency review and hospital-policy approval are complete. Then deploy the rules
and indexes to the approved project and use Vercel for the Vite build. Never send
service account JSON, administrator passwords or maintenance backups to Vercel.
