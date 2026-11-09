import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// This maintenance tool is NOT included in the browser bundle. It operates only
// with project-owner credentials, never through the application security rules.
const args = process.argv.slice(2);
const projectId = process.env.MEDICARE_FIREBASE_PROJECT;
const email = process.env.MEDICARE_ADMIN_EMAIL?.trim().toLowerCase();
if (!projectId || !email || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('Set MEDICARE_FIREBASE_PROJECT, MEDICARE_ADMIN_EMAIL and GOOGLE_APPLICATION_CREDENTIALS in your shell. Do not paste credentials into source files.');
}
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Unset emulator variables before running the owner-authorized reset tool.');
}
const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const users = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  users.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);
const collections = await db.listCollections();
console.log(JSON.stringify({ projectId, existingAuthUsers: users.length,
  collections: collections.map(item => item.id), soleAdminEmail: email, dryRun: !args.includes('--apply') }, null, 2));

if (args.includes('--apply')) {
  if (!args.includes(`--confirm-project=${projectId}`)) throw new Error('Explicit --confirm-project=<projectId> is required for deletion.');
  const password = process.env.MEDICARE_ADMIN_PASSWORD;
  if (!password || password.length < 12 || password.length > 128) throw new Error('Set MEDICARE_ADMIN_PASSWORD (12–128 characters) in your shell.');
  // Back up BEFORE any modification. These files contain sensitive data and
  // must be moved to approved encrypted storage; never upload them to Vercel.
  const backup = resolve('firebase-reset-backups', `${projectId}-${Date.now()}`);
  await mkdir(backup, { recursive: true, mode: 0o700 });
  await writeFile(resolve(backup, 'auth.json'), JSON.stringify(users.map(user => user.toJSON()), null, 2), { flag: 'wx', mode: 0o600 });
  const encode = value => {
    if (value instanceof Timestamp) return { __type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
    if (Buffer.isBuffer(value)) return { __type: 'bytes', base64: value.toString('base64') };
    if (value?.path && value?.firestore) return { __type: 'reference', path: value.path };
    if (value?.latitude != null && value?.longitude != null) return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
    if (Array.isArray(value)) return value.map(encode);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
    return value;
  };
  const documents = [];
  const backupCollection = async collection => {
    let last;
    do {
      let query = collection.orderBy('__name__').limit(200);
      if (last) query = query.startAfter(last);
      const snapshot = await query.get();
      for (const document of snapshot.docs) {
        documents.push({ path: document.ref.path, data: encode(document.data()) });
        for (const nested of await document.ref.listCollections()) await backupCollection(nested);
      }
      last = snapshot.size === 200 ? snapshot.docs.at(-1) : null;
    } while (last);
  };
  for (const collection of collections) await backupCollection(collection);
  await writeFile(resolve(backup, 'firestore.json'), JSON.stringify({ projectId, documents }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(`Backup completed: ${backup}. ${documents.length} documents. No passwords are printed.`);
  const existingAdmin = users.find(user => user.email?.toLowerCase() === email);
  const admin = existingAdmin ? await auth.updateUser(existingAdmin.uid, { password, disabled: false }) :
    await auth.createUser({ email, password, displayName: 'Hospital Administrator', emailVerified: false });
  await auth.setCustomUserClaims(admin.uid, { role: 'admin' });
  // Fail fast on any Auth deletion error; do not proceed to database deletion.
  const remove = users.filter(user => user.uid !== admin.uid).map(user => user.uid);
  for (let i = 0; i < remove.length; i += 1000) {
    const result = await auth.deleteUsers(remove.slice(i, i + 1000));
    if (result.failureCount) throw new Error('An authentication deletion failed. Stop and inspect the protected backup before retrying.');
  }
  for (const collection of collections) await db.recursiveDelete(collection);
  const now = Timestamp.now();
  const auditId = db.collection('auditLogs').doc().id;
  const batch = db.batch();
  batch.set(db.doc(`users/${admin.uid}`), {
    schemaVersion: 2, revision: 1, uid: admin.uid, email, role: 'admin', fullName: 'Hospital Administrator',
    phone: '', cnic: '', dateOfBirth: '', gender: '', address: '', emergencyContact: '', bloodGroup: '',
    accountStatus: 'active', activeVisitId: null, currentBedId: null, careTeamIds: [], departmentId: null,
    department: '', specialization: '', licenseNumber: '', baseSalaryMinor: 0,
    employmentStartDate: null, employmentEndDate: null, payrollPolicy: null,
    createdAt: now, updatedAt: now, createdBy: 'owner-provisioning', updatedBy: 'owner-provisioning', lastAuditId: auditId,
  });
  batch.set(db.doc(`auditLogs/${auditId}`), { schemaVersion: 2, actorId: 'owner-provisioning', userId: 'owner-provisioning',
    action: 'TEST_PROJECT_RESET', targetCollection: 'users', targetId: admin.uid, timestamp: now,
    details: { removedAuthUsers: remove.length, removedDocuments: documents.length, projectId } });
  await batch.commit();
  const finalUsers = await auth.listUsers(2);
  if (finalUsers.users.length !== 1 || finalUsers.users[0].uid !== admin.uid || finalUsers.pageToken) {
    throw new Error('Reset verification failed: another account exists. Review the project before use.');
  }
  console.log('Reset complete. One administrator remains. Verify its email and enroll real TOTP before using privileged features.');
}
