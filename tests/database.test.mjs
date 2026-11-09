import test, { before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { hospitalDate, encodeAttachment } from '../src/utils/transactions.js';

const projectId = 'demo-medicare-foundation';
let vite, environment, adminApp, auth, db, hospital, createHospitalDatabase;
const identities = {};
const password = 'EmulatorOnlyPassword2026';
let date;
before(async () => {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  environment = await initializeTestEnvironment({ projectId, firestore: {
    host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
  } });
  await environment.clearFirestore();
  adminApp = initializeAdminApp({ projectId }, `test-${Date.now()}`);
  const adminAuth = getAdminAuth(adminApp);
  for (const role of ['patient1', 'patient2', 'doctor', 'reception', 'lab']) {
    identities[role] = await adminAuth.createUser({ email: `${role}-${Date.now()}@example.test`, password, emailVerified: true });
  }
  const config = { VITE_FIREBASE_API_KEY: 'emulator-only', VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_MESSAGING_SENDER_ID: '123', VITE_FIREBASE_APP_ID: 'test', DEV: false, MODE: 'test' };
  vite = await createServer({ configFile: false, envDir: false,
    define: Object.fromEntries(Object.entries(config).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
    optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true } });
  ({ auth, db } = await vite.ssrLoadModule('/src/firebase.js'));
  assert.equal(auth.app.options.projectId, projectId);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  ({ hospital, createHospitalDatabase } = await vite.ssrLoadModule('/src/database.js'));
  date = hospitalDate(new Date(Date.now() + 172800000));
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    const now = Timestamp.now();
    for (const [name, identity] of Object.entries(identities)) {
      await setDoc(doc(database, 'users', identity.uid), { schemaVersion: 2, revision: 1, uid: identity.uid,
        email: identity.email, role: name.startsWith('patient') ? 'patient' : name === 'reception' ? 'receptionist' : name,
        fullName: name, phone: '', emergencyContact: '', cnic: '', dateOfBirth: '', gender: '', bloodGroup: '', address: '',
        baseSalaryMinor: 0, accountStatus: 'active', careTeamIds: [], activeVisitId: null, currentBedId: null,
        departmentId: name.startsWith('patient') ? null : 'cardiology', department: '', specialization: '', licenseNumber: '',
        employmentStartDate: '2020-01-01', employmentEndDate: null, payrollPolicy: null,
        createdAt: now, updatedAt: now, createdBy: 'fixture', updatedBy: 'fixture', lastAuditId: 'initial' });
    }
    await setDoc(doc(database, 'departments', 'cardiology'), {
      schemaVersion: 2, revision: 1, name: 'Cardiology', active: true, emergencyEnabled: false, headDoctorId: identities.doctor.uid,
      doctorIds: [identities.doctor.uid], doctorProfiles: { [identities.doctor.uid]: {
        fullName: 'Doctor fixture', specialization: 'Cardiology', active: true, consultationFeeMinor: 300000,
        schedule: { weekdays: [0, 1, 2, 3, 4, 5, 6], times: ['09:00', '09:30', '10:00'], closedDates: [] },
      } }, staffProfiles: { [identities.doctor.uid]: { fullName: 'Doctor fixture', role: 'doctor', active: true } },
      services: { cbc: { name: 'CBC', type: 'lab', priceMinor: 100000, active: true } },
      revenueMinor: 0, revenue: 0, collectedRevenue: 0, lastPaidInvoiceId: null,
      createdAt: now, updatedAt: now, createdBy: 'fixture', updatedBy: 'fixture', lastAuditId: 'initial',
    });
    await setDoc(doc(database, 'users', 'adminMfa'), { schemaVersion: 2, revision: 1, uid: 'adminMfa', role: 'admin',
      email: 'admin@example.test', fullName: 'Admin fixture', phone: '', emergencyContact: '', cnic: '', dateOfBirth: '', gender: '', bloodGroup: '', address: '',
      baseSalaryMinor: 0, accountStatus: 'active', careTeamIds: [], activeVisitId: null, currentBedId: null,
      departmentId: null, department: '', specialization: '', licenseNumber: '', employmentStartDate: null, employmentEndDate: null, payrollPolicy: null,
      createdAt: now, updatedAt: now, createdBy: 'fixture', updatedBy: 'fixture', lastAuditId: 'initial' });
  });
});
const adminClient = () => createHospitalDatabase({
  auth: { currentUser: { uid: 'adminMfa', emailVerified: true } },
  db: environment.authenticatedContext('adminMfa', { email: 'admin@example.test', email_verified: true,
    firebase: { sign_in_provider: 'password', sign_in_second_factor: 'totp' } }).firestore(),
});
test('beds and operations synchronize billing, safety checks and inventory once', async () => {
  const admin = adminClient();
  ok(await admin.createBed({ id: 'bedA', type: 'General', dailyRate: 1000 }));
  ok(await admin.createBed({ id: 'bedB', type: 'ICU', dailyRate: 2000 }));
  ok(await admin.configureService('cardiology', 'procedure', { name: 'Procedure fixture', type: 'operation', price: 1000 }));
  for (let i = 0; i < 5; i++) ok(await admin.createInventory({ id: `supply${i}`, name: `Supply ${i}`, category: 'supply', unit: 'pack', quantity: 10, threshold: 3, price: 10 }));
  await login('patient1'); ok(await book('patient1', '10:00', 'operationVisit'));
  await environment.withSecurityRulesDisabled(context => updateForCheckIn(context.firestore(), 'operationVisit'));
  await login('doctor'); ok(await hospital.startVisit('operationVisit'));
  ok(await hospital.scheduleOperation('operationVisit', 'procedure', [identities.doctor.uid],
    Array.from({ length: 5 }, (_, i) => ({ itemId: `supply${i}`, quantity: 1 })), 'operation1'));
  assert.equal((await hospital.startOperation('operation1')).code, 'checklist-incomplete');
  for (const key of ['staffConfirmed', 'equipmentConfirmed', 'consentConfirmed', 'riskAcknowledged']) ok(await hospital.confirmChecklist('operation1', key));
  ok(await hospital.startOperation('operation1')); ok(await hospital.startOperation('operation1'));
  for (let i = 0; i < 5; i++) assert.equal(ok(await hospital.getRecord('inventory', `supply${i}`)).quantity, 9);
  ok(await hospital.completeOperation('operation1', 'Recorded outcome fixture'));
  await login('reception');
  assert.equal((await hospital.getRecord('visits', 'operationVisit')).code, 'permission-denied');
  ok(await hospital.assignBed('bedA', identities.patient1.uid));
  assert.equal((await hospital.assignBed('bedB', identities.patient1.uid)).code, 'bed-unavailable');
  ok(await hospital.transferBed(identities.patient1.uid, 'bedA', 'bedB'));
  ok(await hospital.releaseBed('bedB'));
  assert.equal(ok(await hospital.getRecord('invoices', 'operationVisit')).totalMinor, 705000);
});
test('salary finalization freezes attendance and payout cannot repeat', async () => {
  const admin = adminClient();
  ok(await admin.configurePayroll(identities.doctor.uid, { baseSalary: 26000,
    policy: { workingWeekdays: [1, 2, 3, 4, 5, 6], paidLeave: true, lateDeductionDays: 0, halfDayDeductionDays: 0.5 } }));
  await login('reception');
  const days = Array.from({ length: 31 }, (_, i) => `2025-01-${String(i + 1).padStart(2, '0')}`)
    .filter(value => new Date(`${value}T00:00:00Z`).getUTCDay() !== 0);
  for (const day of days) ok(await hospital.markAttendance(identities.doctor.uid, day, 'present'));
  const salary = ok(await admin.calculateSalary(identities.doctor.uid, 1, 2025));
  assert.equal(salary.netSalaryMinor, 2600000);
  assert.equal(ok(await admin.calculateSalary(identities.doctor.uid, 1, 2025)).id, salary.id);
  assert.equal((await hospital.markAttendance(identities.doctor.uid, days[0], 'absent', 'Test correction')).code, 'payroll-locked');
  ok(await admin.paySalaries([salary.id], { method: 'bank_transfer', reference: 'SALARY-TEST-1' }));
  assert.equal((await admin.paySalaries([salary.id], { method: 'bank_transfer', reference: 'SALARY-TEST-1' })).code, 'salary-paid');
});
test('concurrent patients cannot reserve the same doctor slot', async () => {
  const patientClient = name => createHospitalDatabase({
    auth: { currentUser: { uid: identities[name].uid, emailVerified: true } },
    db: environment.authenticatedContext(identities[name].uid, { email: identities[name].email, email_verified: true,
      firebase: { sign_in_provider: 'password' } }).firestore(),
  });
  const input = name => ({ patientId: identities[name].uid, doctorId: identities.doctor.uid,
    departmentId: 'cardiology', date, time: '09:30', reason: 'Concurrent booking fixture', requestId: `concurrent_${name}` });
  const results = await Promise.all([patientClient('patient1').bookAppointment(input('patient1')),
    patientClient('patient2').bookAppointment(input('patient2'))]);
  assert.equal(results.filter(result => result.success).length, 1);
  assert.equal(results.find(result => !result.success).code, 'slot-unavailable');
});
after(async () => {
  const coverage = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:ruleCoverage`).then(response => response.json());
  await mkdir(new URL('./.generated/', import.meta.url), { recursive: true });
  await writeFile(new URL('./.generated/rule-coverage.json', import.meta.url), JSON.stringify(coverage));
  if (auth) await signOut(auth);
  await environment?.cleanup(); await vite?.close(); if (adminApp) await deleteAdminApp(adminApp);
});
const login = name => signInWithEmailAndPassword(auth, identities[name].email, password);
const ok = result => { assert.equal(result.success, true, JSON.stringify(result)); return result.data; };
const book = (patient, time, requestId) => hospital.bookAppointment({ patientId: identities[patient].uid,
  doctorId: identities.doctor.uid, departmentId: 'cardiology', date, time, reason: 'Consultation test fixture', requestId });

test('booking, cancellation, consultation, lab, payment and chat execute against real emulator rules', async () => {
  await login('patient1');
  const appointment = ok(await book('patient1', '09:00', 'flow1'));
  assert.equal(appointment.status, 'scheduled');
  const duplicate = ok(await book('patient1', '09:00', 'flow1'));
  assert.equal(duplicate.alreadyCompleted, true);
  await login('patient2');
  assert.equal((await book('patient2', '09:00', 'conflict1')).code, 'slot-unavailable');
  await login('patient1');
  ok(await hospital.transitionAppointment('flow1', 'cancelled', 'Test cancellation'));
  await login('patient2');
  ok(await book('patient2', '09:00', 'flow2'));
  await login('reception');
  ok(await hospital.transitionAppointment('flow2', 'confirmed'));
  // Check-in is deliberately restricted to the appointment day. Seed only the
  // completed reception assessment in the emulator to test downstream services.
  await environment.withSecurityRulesDisabled(context => updateForCheckIn(context.firestore(), 'flow2'));
  await login('doctor');
  const visit = ok(await hospital.startVisit('flow2'));
  assert.equal(visit.invoiceId, 'flow2');
  ok(await hospital.startVisit('flow2')); // Idempotent: no second consultation charge.
  ok(await hospital.saveEMR('flow2', { chiefComplaint: 'Consultation', symptoms: 'Recorded symptoms', diagnosis: 'Recorded diagnosis',
    vitals: { bp: '120/80', sugar: 100, heartRate: 70, temperature: 37 }, prescription: [], notes: 'Clinical fixture' }, 1));
  const stale = await hospital.saveEMR('flow2', { chiefComplaint: 'Changed', symptoms: 'Symptoms', diagnosis: 'Diagnosis' }, 1);
  assert.equal(stale.code, 'stale-record');
  ok(await hospital.requestLabTest('flow2', 'cbc', 'normal', 'lab1'));
  await login('lab');
  const pdf = await encodeAttachment(new File(['%PDF-1.4\nLab test fixture'], 'test.pdf', { type: 'application/pdf' }));
  ok(await hospital.completeLabTest('lab1', pdf, 'Completed test fixture'));
  await login('patient2');
  ok(await hospital.submitPaymentProof('flow2', pdf, 'BANK-TEST-REF'));
  assert.equal((await hospital.confirmPayment('flow2')).code, 'forbidden');
  await login('reception');
  ok(await hospital.confirmPayment('flow2'));
  ok(await hospital.confirmPayment('flow2')); // Retry must not count revenue twice.
  const department = (await getDoc(doc(db, 'departments', 'cardiology'))).data();
  assert.equal(department.revenueMinor, 400000);
  await login('doctor');
  const discharged = ok(await hospital.dischargeVisit('flow2', 'Completed visit fixture'));
  assert.equal(discharged.total, 4000);
  await login('patient2');
  const chatId = `chat_${identities.doctor.uid}_${identities.patient2.uid}`;
  ok(await hospital.sendMessage(chatId, { text: 'Hello doctor' }, 'message1'));
  ok(await hospital.sendMessage(chatId, { text: 'Hello doctor' }, 'message1'));
  await login('doctor');
  ok(await hospital.acknowledgeMessages(chatId, ['message1']));
  const chat = (await getDoc(doc(db, 'chats', chatId))).data();
  assert.equal(chat.unreadCount[identities.doctor.uid], 0);
});
async function updateForCheckIn(database, id) {
  const ref = doc(database, 'appointments', id);
  const snapshot = await getDoc(ref);
  await setDoc(ref, { ...snapshot.data(), status: 'checked-in' });
}
