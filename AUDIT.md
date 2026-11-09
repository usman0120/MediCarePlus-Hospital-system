# Remediation audit

This is a source-code audit, not a production/security certification. Remote
hospital data was not inspected. Test/reset permissions do not establish Firebase
project-owner access. Findings are grouped by impact and remediation stage.

## Critical findings

| Finding | Location | Status |
| --- | --- | --- |
| Unauthenticated, unrestricted database writes/reads | `firestore.rules` | Replaced locally; **not deployed** |
| Public admin registration protected only by a bundled gate password | `src/pages/Register.jsx`, `src/auth.js` | Removed |
| Admin authorization by matching a hardcoded email | `src/context/auth/AuthProvider.jsx` | Removed; role + active status + real MFA claim |
| Browser-exposed admin credentials | `.env`, old README | Removed locally; rotate any previously deployed credentials |
| Account creation signs administrator/reception in as the new user | `src/auth.js` | Isolated in-memory secondary Auth instance |
| Registration accepts arbitrary roles and profile edits can alter roles/salary | old `src/auth.js`, legacy database exports | New registration restricted; V2 whitelists + rules; legacy consumers still need migration |
| Appointment query-check followed by an independent write allows double-booking | legacy `createAppointment` / reschedule methods | V2 deterministic slot transactions implemented; legacy UI not migrated |
| Revenue is counted on unpaid invoice creation and may be counted again on confirmation | competing legacy invoice/appointment payment flows | V2 records revenue only in confirmed payment transaction |
| Paid invoices and paid payroll can be overwritten | legacy database methods | V2 locks/transitions and deny rules; legacy consumers pending |
| Inventory deducted at scheduling and again at operation start | `database.js`, old `utils/transactions.js` | V2 deducts only at start; old transaction duplication removed |
| Transaction reads occur after writes | legacy visit completion, operation, salary and bed-transfer flows | V2 reads precede all writes |

## Data consistency and workflow issues

- `getDocs(query(...))` inside `runTransaction` is not a transaction read. Legacy
  active-visit and payroll checks therefore did not protect against concurrent edits.
- Random monthly salary IDs allow duplicates; some legacy calculations reset paid
  records to pending. V2 uses deterministic employee/month IDs and immutable totals.
- Multiplying attendance by `salary / 26` overpays a 27-day month. V2 uses full base
  salary minus explicit policy deductions; joining/leaving proration is documented.
- Attendance used invalid end dates such as February 31 and different staff sources.
  V2 reads actual dates, one staff source and explicit employment dates.
- Missing payroll policy, missing attendance, unpaid/pending/processed status aliases,
  hardcoded tax/consultation/lab prices and cash promises treated as payment caused
  inconsistent financial reporting. V2 rejects missing policy and unconfirmed money.
- Appointment statuses differ across modules (`pending`, `approved`, `scheduled`,
  `confirmed`, `completed`); V2 defines explicit transitions. UI migration is required.
- EMR field names differ (`prescriptions`, `prescription`, notes arrays/strings, `temp`
  and `temperature`). V2 uses the structured required format and revision checks.
- Bed assignment did not consistently validate patient, visit and billing linkage;
  release did not consistently settle the admission’s charges. V2 updates links and
  charges atomically, with one invoice per visit.
- Lab result upload and discharge need outstanding-work checks. V2 tracks counts;
  cancellation/completion and discharge must be tested together.
- Chat creation used query-then-create, allowing duplicate conversations. Sending,
  retries and unread counters were independent writes. V2 uses deterministic chats
  and request IDs, transaction sends and incremental receipts.
- Legacy read-receipt batches reset counters regardless of concurrent messages.
  V2 subtracts only newly seen messages; adversarial counter validation still needs
  expanded rule tests before certification.
- Legacy query `where('quantity', '<=', where('threshold'))` is invalid; Firestore
  cannot compare two document fields. V2 maintains `lowStock` transactionally.
- `getPendingPayments` and `searchAppointments` shadow SDK `doc`/`query` with local
  variables; there are runtime failures a production build cannot detect.
- Fallback queries scan entire collections and sometimes report success with empty
  data after failures. V2 returns explicit error codes and bounded query pages.
- N+1 profile reads, huge embedded arrays, no stable pagination and repeated PDF
  generators increase costs and bundle size. Migration and profiling remain.
- Login “IP address” was a device platform string. V2 explicitly records IP as
  unavailable; browser telemetry is not trusted forensic evidence.
- The cache-first service worker attempted to synchronize messages/appointments
  to nonexistent `/api` endpoints and deleted queued entries without checking
  successful settlement. Registration removed; `public/sw.js` now retires the old
  worker and removes only its own caches. No fake offline synchronization remains
  in that worker. Existing offline IndexedDB queues are not silently deleted.

## Unwanted/redundant files and modules (review before deletion)

These have **not** been broadly deleted. Existing UI imports must be migrated first.

- Human-accountant page/route and financial role (`src/pages/Accountant.jsx`). Route
  removed; automation belongs in the shared workflows, not a redundant actor.
- Separate non-system `departmentStaff`, `doctorStats`, `doctorSchedules`, `accounts`,
  `transactions`, `inventoryTransactions`, `receipts`, `budgets`, `expenses`, `config`,
  purchase-order, pricing-proposal, support and notification collections conflict
  with the requested flat schema. They are denied by the new rules.
- `PricingControlsModal.jsx`, `PricingApprovals.jsx`, `PricingControls`/approval
  exports: competing pricing sources instead of department-owned catalog pricing.
- `HospitalHistoryModal.jsx`, `UserHistoryModal.jsx`, `PatientHistoryModal.jsx`,
  `PatientHistory`/full-history functions: overlapping history aggregators/PDFs.
- `ConsultationNotesModal.jsx`, `ViewConsultationNotes.jsx`, `EMRForm.jsx`: competing
  medical-record shapes. Consolidate into structured EMR, not three note formats.
- `PaymentModal.jsx`, `PaymentVerificationModal.jsx`, `Invoice.jsx`, payment/receipt
  and transaction-history code: replace competing flows with one invoice workflow.
- Nested `components/appointments/`, `context/auth/`, compatibility hooks and duplicate
  theme-provider files do not match the desired compact structure. Consolidate once
  their consumers are updated.
- `.eslintrc.cjs` beside `eslint.config.js`: potentially obsolete configuration.
- `dist/` is generated output, not source; `node_modules/` is installed dependencies.
- `API_ENDPOINTS` describes nonexistent HTTP endpoints and is not this architecture.
- Hardcoded department lists, consultation fee tables, example telephone numbers,
  fake QR-code rectangles, marketing statistics/testimonials and assertions of
  production readiness must be removed or replaced with hospital-approved content.
- Chart.js plus Recharts and duplicate FontAwesome major families increase the
  dependency/bundle footprint. Retain the required chart/icon stack after migration.
- EmailJS, crypto-js, emoji-picker, datepicker, phone/select widgets should be retained
  only if needed by the approved final UX. Base64/crypto-js is not a substitute for
  trusted access control or a clinical data-protection policy.

## Deployment blockers

1. Project-owner access for `fyp2-175ea`, protected backup, offline reset and sole-admin
   provisioning. These remote operations have not run.
2. The owner declined paid Auth features. TOTP enrollment is disabled by default
   and privileged administrator access remains blocked pending an approved secure
   alternative. No billing/Identity Platform configuration was changed. Never weaken
   rules to a simulated OTP to work around this constraint.
3. Patient/doctor/reception/admin dashboard migration onto `hospital` V2; remove
   legacy Firestore exports and direct component database writes afterward.
4. Strict adversarial testing of clinical counters, full prescription schemas,
   inventory consumption, payment line sources and chat receipt accounting.
5. Successful operation/bed/payroll and concurrent-edit integration tests, in
   addition to authorization-denial and basic workflow tests.
6. Full PDF component integration, compression-before-upload and download checksum
   validation for all consumers. The legacy generators are not yet consolidated.
7. The approved payroll default is Mon–Sat, paid leave, no lateness deduction,
   half-day deduction 0.5, divisor 26. Joining/leaving proration, tax,
   overtime, cancellation/refund, equipment vs consumable, bed-day and emergency
   admission policies approved by the hospital.
8. V2 analytics/search/notifications/messaging-hours UI and configurable alerts.
   A browser-only app must not pretend to run unattended scheduled jobs.
9. Dependency vulnerability fixes and retests. Initial installed dependency audit
   reported 26 advisories, including two critical. Compatible dependency fixes
   reduced this to 11 (six moderate/five high), with no critical advisories in the
   last audit. The remaining Firebase 12 Node gRPC pin and Admin SDK transitive
   advisories need review; no forced Firebase downgrade was applied.
10. CSP/XSS review, shared-device session/cache review, permissions, backup/restore
    drill, access revocation, Firestore region and Pakistan clinical/legal privacy
    review before storing any real patient records.

## Verification notes

`npm test` covers money, invoice arithmetic, dates, payroll and compressed-file
integrity. `npm run test:rules` uses local Firebase emulators and includes both
unauthorized-request tests and actual V2 API workflow tests. A build/lint pass is
not proof of real hospital correctness. Record final test results after all fixes.

### Latest verified foundation pass

- `npm test`: **8 passed**.
- `npm run test:rules`: **12 passed**, including concurrent bookings, operation
  consumption/billing, bed transfer/release, payroll freezing/payout, clinical
  ownership, payment confirmation, chat receipts and cross-role access denial.
- `npm run lint`: passed, including maintenance/test `.mjs` files.
- `npm run build`: passed; legacy bundle-size/dynamic-import warnings remain.
- `node --check scripts/reset-firebase.mjs` and `git diff --check`: passed.
- `npm audit`: 11 remaining advisories (six moderate, five high, zero critical).

Some malformed denial fixtures still reach Firestore's 1,000-expression evaluation
limit before rejection. Requests are denied, but this remains a rule-budget and
boundary-testing issue—not a production certification. Valid tested transactions,
including the five-consumable operation case, passed.

The installed Java 27 / Firebase CLI combination also left an owned Firestore test
emulator listening after CLI shutdown. Only the agent-started, exact demo-project
process was cleaned up. Use a supported Java LTS and review repeat-run cleanup
before relying on unattended CI. No live Firebase process or data was stopped.
