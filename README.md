# MediCare Plus

Repository: https://github.com/usman0120/MediCarePlus-Hospital-system

Existing preview: https://medicareplushospital.vercel.app (not approved for real patient data).
For support, create an issue in the repository. Never commit the `.env` file.

React + Vite hospital management application using Firebase Authentication,
Firestore, Tailwind CSS, Chart.js, FontAwesome and jsPDF.

## Status

**Under remediation, not approved for clinical production use.** See [AUDIT.md](AUDIT.md)
for verified changes and remaining deployment blockers. Passing a build is not a
security or clinical certification.

## Development

1. Use Node.js 22.12+ and `npm ci`.
2. Copy `.env.example` to `.env` and provide Firebase web configuration.
3. Enable Email/Password and Google providers and configure authorized domains.
4. Run `npm run dev`.

There are no default passwords or public administrator/staff registration forms.
Patients must verify email. Shared-device sessions use session persistence;
remembering a session is opt-in. Medical records are not deliberately persisted to disk.

## Verification

```sh
npm test
npm run test:rules
npm run lint
npm run build
```

Emulator tests use only the local `demo-medicare-foundation` project and synthetic
test fixtures. They do not seed data or connect to the live hospital project.
Use a supported Java LTS and Firebase CLI for emulator tests.

## Sole administrator / demo-data reset

`scripts/reset-firebase.mjs` is an owner-run Firebase Admin SDK maintenance tool,
not a deployed backend. No Cloud Functions are used.

Set these server-only variables in your local shell:

- `GOOGLE_APPLICATION_CREDENTIALS`: service-account JSON outside the repository.
- `MEDICARE_FIREBASE_PROJECT`: exact intended project ID.
- `MEDICARE_ADMIN_EMAIL`: the owner-approved administrator email.
- `MEDICARE_ADMIN_PASSWORD`: supplied securely in your shell, never in source code.

Never prefix administrator credentials with `VITE_`; those values are public.

Run `npm run firebase:reset` for a read-only preview. Applying requires explicit confirmation:

```sh
npm run firebase:reset -- --apply --confirm-project=YOUR_EXACT_PROJECT_ID
```

The tool backs up data before retaining/provisioning one admin and removing demo
accounts/documents. Auth and Firestore cannot share an atomic transaction. Stop
and inspect the backup if maintenance fails. Run only while registrations/writes
are disabled. Protect backups with OS controls and approved encryption; move them
outside the workspace. Auth backups may contain password hashes.

Project-owner access to `fyp2-175ea` has not been established. No remote reset,
administrator creation, index deployment or rules deployment has run.

## Administrator verification and SMS

The owner has declined paid Auth features. `VITE_ENABLE_TOTP=false` and
`VITE_ENABLE_PHONE_AUTH=false` keep enrollment and SMS sending disabled. Privileged
admin access requires a real password-plus-TOTP Firebase token and intentionally
remains blocked until an approved secure alternative exists. A browser flag,
hardcoded code or simulated OTP is not an alternative.

TOTP helpers require Identity Platform configuration and approval of any associated
costs. Phone helpers link a phone to an email-verified identity; phone-only identity
does not satisfy the mandatory verified-email policy. No paid provider was enabled.

## Financial and clinical policies

- Store money as integer PKR paisa (`*Minor`); display amounts are derived.
- Reserve a doctor slot atomically before payment. Reception confirms/checks in;
  the assigned doctor starts the visit and consultation invoice.
- Patients submit proof. Only reception/admin confirms actual receipt of money.
  Confirmation locks the invoice and updates revenue in the same transaction.
- New charges require an unpaid invoice. Pending proof must be rejected before
  adding charges. Paid invoices cannot be rewritten; refunds need an approved
  separate workflow.
- Bed billing uses rolling 24-hour periods, minimum one day, settled on release.
  Hospital approval of this policy remains required.
- Approved payroll default: divisor 26, Monday–Saturday, paid approved leave,
  no lateness deduction, half-day deduction 0.5 daily salary. It is configurable
  per employee. Missing attendance prevents finalization. Finalization freezes
  attendance, and payout cannot be repeated.
- No tax, overtime, discounts, appointment fees or simulated settlements are invented.
- Discharge locks medical records. Only authorized administration can unlock a
  record for an audited amendment.

## Files and platform constraints

Files are compressed client-side into gzip Base64 with size metadata and SHA-256
checksums. Supported types: PDF/JPEG/PNG/WebP. Encoded files must fit 600,000
characters and the entire document must remain below the conservative 900,000-byte
application limit. Incompressible PDFs/photos may need to be reduced before upload.

Base64 is not encryption. Checksums are integrity checks, not malware scanning or
proof of payment authenticity. Firestore rules cannot decompress uploaded files.
There is no Firebase Storage, Cloud Function or fake background synchronization.

A browser-only application cannot guarantee unattended scheduled jobs, trustworthy
IP/login telemetry, external payment settlement, immutable external audit trails or
point-in-time backups. Browser data exports are not point-in-time disaster recovery.

## Deployment

Do not deploy to real clinical use until workflow/rule tests, dependency review,
owner provisioning and hospital policy/privacy approval are complete. Vercel hosts
the Vite build; deploy rules/indexes separately to the approved Firebase project.
Never upload service-account JSON, administrator passwords or backups to Vercel.

Pushing `main` can trigger an existing Vercel integration. The preview must remain
restricted to evaluation/staging while deployment blockers remain.
