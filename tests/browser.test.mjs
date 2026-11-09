import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { hospitalDate } from '../src/utils/transactions.js';

test('real browser: login, booking, reception, EMR PDF, payment and discharge', { timeout: 180000 }, async () => {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  const projectId = 'demo-medicare-foundation';
  const env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  const app = initializeApp({ projectId }, `browser-${Date.now()}`);
  let server, browser;
  try {
    await env.clearFirestore();
    const auth = getAuth(app); const database = getFirestore(app); const password = 'BrowserFixturePassword2026'; const actors = {};
    for (const role of ['patient', 'doctor', 'receptionist']) actors[role] = await auth.createUser({ email: `${role}-${Date.now()}@example.test`, password, emailVerified: true });
    const now = Timestamp.now();
    for (const [role, actor] of Object.entries(actors)) await database.doc(`users/${actor.uid}`).set({ schemaVersion: 2, revision: 1, uid: actor.uid, email: actor.email, role, fullName: `Browser ${role}`, fullNameSearch: `browser ${role}`,
      phone: '', cnic: '', dateOfBirth: '', gender: '', address: '', emergencyContact: '', bloodGroup: '', baseSalaryMinor: 0, accountStatus: 'active', careTeamIds: [], treatedDoctorIds: [], activeVisitId: null, currentBedId: null,
      departmentId: role === 'patient' ? null : 'clinic', department: role === 'patient' ? '' : 'Clinic', specialization: role === 'doctor' ? 'General medicine' : '', licenseNumber: role === 'doctor' ? 'PMDC-FIXTURE' : '',
      employmentStartDate: '2020-01-01', employmentEndDate: null, payrollPolicy: null, createdAt: now, updatedAt: now, createdBy: 'fixture', updatedBy: 'fixture', lastAuditId: 'initial' });
    await database.doc('departments/clinic').set({ schemaVersion: 2, revision: 1, kind: 'department', name: 'Clinic', active: true, emergencyEnabled: false, headDoctorId: actors.doctor.uid, doctorIds: [actors.doctor.uid],
      doctorProfiles: { [actors.doctor.uid]: { fullName: 'Browser doctor', specialization: 'General medicine', consultationFeeMinor: 300000, active: true, messagingHours: null, schedule: { weekdays: [0, 1, 2, 3, 4, 5, 6], times: ['11:00'], closedDates: [] } } },
      staffProfiles: { [actors.doctor.uid]: { fullName: 'Browser doctor', role: 'doctor', active: true } }, services: {}, revenueMinor: 0, revenue: 0, collectedRevenue: 0, lastPaidInvoiceId: null,
      createdAt: now, updatedAt: now, createdBy: 'fixture', updatedBy: 'fixture', lastAuditId: 'initial' });
    const values = { VITE_FIREBASE_API_KEY: 'emulator-only', VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`, VITE_FIREBASE_PROJECT_ID: projectId,
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123', VITE_FIREBASE_APP_ID: 'test', VITE_USE_FIREBASE_EMULATORS: 'true', VITE_ENABLE_PHONE_AUTH: 'false' };
    server = await createServer({ configFile: false, envDir: false, plugins: [react()], define: Object.fromEntries(Object.entries(values).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])), server: { host: '127.0.0.1', port: 4173, strictPort: true } });
    await server.listen();
    await mkdir(new URL('./.generated/browser/', import.meta.url), { recursive: true });
    browser = await chromium.launchPersistentContext(fileURLToPath(new URL(`./.generated/browser/profile-${Date.now()}`, import.meta.url)), {
      channel: process.env.MEDICARE_BROWSER_CHANNEL || 'chrome', headless: true, acceptDownloads: true,
    });
    await browser.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort();
    });
    const page = await browser.newPage(); const failures = []; page.on('pageerror', error => failures.push(error.message)); page.setDefaultTimeout(20000);
    const login = async role => {
      await page.goto('http://127.0.0.1:4173/login'); await page.getByLabel('Email', { exact: true }).fill(actors[role].email); await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    };
    const logout = async () => { await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.getByLabel('Email', { exact: true }).waitFor(); };
    await login('patient'); await page.getByRole('heading', { name: 'Patient portal', exact: true }).waitFor();
    await page.getByLabel('Department', { exact: true }).selectOption('clinic'); await page.getByLabel('Doctor', { exact: true }).selectOption(actors.doctor.uid);
    await page.getByLabel('Date (Pakistan time)', { exact: true }).fill(hospitalDate(new Date(Date.now() + 172800000)));
    await page.locator('select[name="time"] option[value="11:00"]').waitFor({ state: 'attached' }); await page.getByLabel('Available slot', { exact: true }).selectOption('11:00');
    await page.getByLabel('Reason', { exact: true }).fill('Clinical browser workflow fixture'); await page.getByRole('button', { name: 'Reserve appointment', exact: true }).click();
    await page.getByRole('cell', { name: 'scheduled', exact: true }).waitFor(); await logout();
    await login('receptionist'); await page.getByRole('heading', { name: 'Reception workspace', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Confirm appointment', exact: true }).click(); await page.getByRole('cell', { name: 'confirmed', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Check in', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'Check-in must be on the appointment date.' }).first().waitFor();
    const saved = await database.collection('appointments').where('kind', '==', 'appointment').where('patientId', '==', actors.patient.uid).get(); assert.equal(saved.size, 1);
    const id = saved.docs[0].id;
    // A reception assessment is seeded only in the emulator to exercise the
    // downstream same-day workflow without falsifying the browser's clock.
    await database.doc(`appointments/${id}`).update({ status: 'checked-in' }); await logout();
    await login('doctor'); await page.getByRole('heading', { name: 'Doctor workspace', exact: true }).waitFor(); await page.getByRole('button', { name: 'Start consultation', exact: true }).click();
    await page.getByLabel('Chief complaint', { exact: true }).fill('Recorded complaint'); await page.getByLabel('Symptoms', { exact: true }).fill('Recorded symptoms'); await page.getByLabel('Diagnosis', { exact: true }).fill('Recorded diagnosis');
    await page.getByLabel('Blood pressure', { exact: true }).fill('120/80'); await page.getByRole('button', { name: 'Add medicine', exact: true }).click();
    for (const [key, value] of Object.entries({ name: 'Fixture medicine', dose: 'One tablet', frequency: 'Daily', duration: 'Three days', instructions: 'Recorded instructions' })) await page.getByLabel(key, { exact: true }).fill(value);
    await page.getByRole('button', { name: 'Save structured EMR', exact: true }).click(); await page.getByText('Clinical record saved.', { exact: true }).waitFor();
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Generate PDF from saved prescription', exact: true }).click();
    const download = await downloadPromise; const bytes = await readFile(await download.path()); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-'); assert.ok(bytes.length > 1000);
    const visit = (await database.doc(`visits/${id}`).get()).data(); assert.equal(visit.prescription.length, 1); assert.equal(visit.prescriptionPdf.encoding, 'gzip-base64');
    await logout(); await login('receptionist'); await page.getByRole('heading', { name: 'Reception workspace', exact: true }).waitFor(); await page.getByRole('button', { name: 'Payments', exact: true }).click();
    await page.getByRole('button', { name: 'Review invoice', exact: true }).click(); await page.getByLabel('Cash received (PKR)', { exact: true }).fill('3000'); await page.getByLabel('Counter receipt reference', { exact: true }).fill('BROWSER-CASH-1');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Confirm actual cash receipt', exact: true }).click(); await page.getByRole('cell', { name: 'paid', exact: true }).waitFor();
    const invoice = (await database.doc(`invoices/${id}`).get()).data(); assert.equal(invoice.locked, true); assert.equal((await database.doc('departments/clinic').get()).data().revenueMinor, 300000);
    await logout(); await login('doctor'); await page.getByRole('heading', { name: 'Doctor workspace', exact: true }).waitFor(); await page.getByRole('button', { name: 'Open visit', exact: true }).click();
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Discharge patient', exact: true }).click(); await page.getByText('Visit discharged and locked.', { exact: true }).waitFor();
    assert.equal((await database.doc(`visits/${id}`).get()).data().locked, true); assert.deepEqual(failures, []);
  } catch (error) {
    if (browser) { const page = browser.pages().at(-1); if (page) { await page.screenshot({ path: fileURLToPath(new URL('./.generated/browser-failure.png', import.meta.url)), fullPage: true }); } }
    throw error;
  } finally {
    await browser?.close(); await server?.close(); await getFirestore(app).terminate(); await deleteApp(app); await env.cleanup();
  }
});
