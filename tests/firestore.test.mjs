import test, { before, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, limit, Timestamp } from 'firebase/firestore';

let env;
const profile = (uid, role = 'patient') => ({ schemaVersion: 2, revision: 1, uid, role, fullName: uid,
  email: `${uid}@example.test`, phone: '', emergencyContact: '', cnic: '', dateOfBirth: '', gender: '', bloodGroup: '',
  address: '', baseSalaryMinor: 0, accountStatus: 'active', careTeamIds: [], activeVisitId: null, currentBedId: null,
  departmentId: null, department: '', specialization: '', licenseNumber: '', employmentStartDate: null,
  employmentEndDate: null, payrollPolicy: null, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  createdBy: uid, updatedBy: uid, lastAuditId: 'initial' });
const client = (uid, role = 'patient', verified = true, mfa = false) => env.authenticatedContext(uid, {
  role, email: `${uid}@example.test`, email_verified: verified, firebase: { sign_in_provider: 'password', ...(mfa ? { sign_in_second_factor: 'totp' } : {}) },
}).firestore();
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-medicare-foundation', firestore: {
    host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
  } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [uid, role] of [['patient1', 'patient'], ['patient2', 'patient'], ['doctor1', 'doctor'], ['reception1', 'receptionist'], ['admin1', 'admin'], ['disabled1', 'doctor']]) {
      await setDoc(doc(db, 'users', uid), { ...profile(uid, role), ...(uid === 'disabled1' ? { accountStatus: 'disabled' } : {}) });
    }
    await setDoc(doc(db, 'visits', 'visit1'), { patientId: 'patient1', doctorId: 'doctor1', status: 'discharged', locked: true });
    await setDoc(doc(db, 'invoices', 'paid1'), { patientId: 'patient1', doctorId: 'doctor1', status: 'paid', locked: true });
    await setDoc(doc(db, 'chats', 'chat_doctor1_patient1'), { participants: ['doctor1', 'patient1'], doctorId: 'doctor1', patientId: 'patient1' });
    await setDoc(doc(db, 'messages', 'message1'), { chatId: 'chat_doctor1_patient1', senderId: 'doctor1', recipientId: 'patient1' });
    await setDoc(doc(db, 'auditLogs', 'log1'), { actorId: 'doctor1' });
    await setDoc(doc(db, 'departments', 'cardiology'), { name: 'Cardiology' });
  });
});
after(async () => { await env?.cleanup(); });
test('unauthenticated access and unknown collections are denied', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'users', 'patient1')));
  await assertFails(setDoc(doc(db, 'users', 'attacker'), { role: 'admin' }));
  await assertFails(getDoc(doc(client('admin1', 'admin', true, true), 'accounts', 'main')));
});
test('patient can read their own profile and cannot read another patient', async () => {
  const db = client('patient1');
  await assertSucceeds(getDoc(doc(db, 'users', 'patient1')));
  await assertFails(getDoc(doc(db, 'users', 'patient2')));
  await assertFails(getDocs(query(collection(db, 'users'), limit(20))));
});
test('unverified and disabled identities cannot read clinical data', async () => {
  await assertFails(getDoc(doc(client('patient1', 'patient', false), 'visits', 'visit1')));
  await assertFails(getDoc(doc(client('disabled1', 'doctor'), 'visits', 'visit1')));
});
test('roles cannot be promoted by profile editing', async () => {
  await assertFails(updateDoc(doc(client('patient1'), 'users', 'patient1'), { role: 'admin' }));
  await assertFails(updateDoc(doc(client('doctor1', 'doctor'), 'users', 'doctor1'), { baseSalaryMinor: 99999999 }));
  await assertFails(getDoc(doc(client('patient1', 'admin', true, true), 'auditLogs', 'log1')));
});
test('paid invoices and locked medical records cannot be modified', async () => {
  await assertFails(updateDoc(doc(client('reception1', 'receptionist'), 'invoices', 'paid1'), { totalMinor: 1 }));
  await assertFails(updateDoc(doc(client('doctor1', 'doctor'), 'visits', 'visit1'), { diagnosis: 'changed' }));
  await assertFails(deleteDoc(doc(client('admin1', 'admin', true, true), 'invoices', 'paid1')));
});
test('chat access is participant-only, even for administrators and reception', async () => {
  await assertSucceeds(getDoc(doc(client('patient1'), 'messages', 'message1')));
  await assertSucceeds(getDoc(doc(client('doctor1', 'doctor'), 'chats', 'chat_doctor1_patient1')));
  await assertFails(getDoc(doc(client('patient2'), 'messages', 'message1')));
  await assertFails(getDoc(doc(client('admin1', 'admin', true, true), 'chats', 'chat_doctor1_patient1')));
  await assertFails(getDoc(doc(client('reception1', 'receptionist'), 'chats', 'chat_doctor1_patient1')));
});
test('reception cannot read EMR and patients cannot read staff payroll', async () => {
  await assertFails(getDoc(doc(client('reception1', 'receptionist'), 'visits', 'visit1')));
  await assertFails(getDoc(doc(client('patient1'), 'users', 'doctor1')));
  await assertFails(getDocs(query(collection(client('patient1'), 'salaryRecords'), limit(20))));
});
test('administrator access requires a real TOTP claim', async () => {
  await assertFails(getDoc(doc(client('admin1', 'admin'), 'auditLogs', 'log1')));
  await assertSucceeds(getDoc(doc(client('admin1', 'admin', true, true), 'auditLogs', 'log1')));
  await assertFails(updateDoc(doc(client('admin1', 'admin', true, true), 'auditLogs', 'log1'), { actorId: 'changed' }));
});
