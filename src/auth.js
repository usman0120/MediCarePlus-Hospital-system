import { deleteApp, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, setPersistence,
  createUserWithEmailAndPassword, deleteUser, getAuth, signInWithEmailAndPassword, signOut,
  sendEmailVerification, sendPasswordResetEmail, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier,
  PhoneAuthProvider, linkWithCredential, reload, getIdToken, getIdTokenResult, connectAuthEmulator,
} from 'firebase/auth';
import { app, auth } from './firebase.js';
import { hospital } from './database.js';
import { assert, WorkflowError, requireText } from './utils/transactions.js';

const validEmail = email => {
  const value = requireText(email, 'email', 254).toLowerCase();
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'validation', 'Enter a valid email address.');
  return value;
};
const passwordCheck = password => {
  assert(typeof password === 'string' && password.length >= 12 && password.length <= 128,
    'validation', 'Use a password containing 12–128 characters.');
  return password;
};
const settings = () => ({ url: `${window.location.origin}/login`, handleCodeInApp: true });
const errors = {
  'auth/invalid-credential': 'Invalid email or password.', 'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account already exists for this email. Sign in or reset your password.',
  'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
  'auth/network-request-failed': 'Network error. Check your connection and retry.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.', 'auth/invalid-verification-code': 'The verification code is invalid.',
  'auth/operation-not-allowed': 'This authentication provider is not enabled in Firebase.',
  'auth/requires-recent-login': 'Sign in again before making this security change.',
};
const authResult = async work => {
  try { return await work(); }
  catch (error) {
    if (error.code === 'auth/multi-factor-auth-required') {
      return { success: false, code: error.code,
        error: 'This account still has MFA enrolled in Firebase. The project owner must remove enrollment to use the approved password-only policy.' };
    }
    return { success: false, code: error.code || 'unexpected',
      error: error instanceof WorkflowError ? error.message : errors[error.code] || 'Authentication failed. Please retry or contact support.' };
  }
};
const finishLogin = async user => {
  await reload(user); await getIdToken(user, true);
  const profile = await hospital.getRecord('users', user.uid);
  if (!profile.success) {
    await signOut(auth);
    return { success: false, code: profile.code, error: 'Your hospital profile could not be loaded. Contact reception; do not create another account.' };
  }
  if (profile.data.accountStatus !== 'active') {
    await signOut(auth); return { success: false, code: 'account-disabled', error: 'Your account has been disabled.' };
  }
  if (!user.emailVerified) {
    // Keep the session for resend/reload; ProtectedRoute and rules deny clinical access.
    return { success: false, code: 'email-unverified', verificationRequired: true,
      error: 'Verify your email before using the hospital system.', user };
  }
  if (profile.data.role === 'admin' && (await getIdTokenResult(user)).claims.firebase?.sign_in_provider !== 'password') {
    await signOut(auth);
    return { success: false, code: 'admin-password-required', error: 'Administrators must sign in with verified email and password.' };
  }
  const audit = await hospital.recordAuthEvent('USER_LOGIN');
  if (!audit.success) { await signOut(auth); return audit; }
  return { success: true, user, role: profile.data.role, redirect: `/${profile.data.role}`, profile: profile.data };
};

export const registerWithEmail = (email, password, userData) => authResult(async () => {
  assert(!auth.currentUser, 'already-authenticated', 'Sign out before creating another patient account.');
  assert(!userData.role || userData.role === 'patient', 'forbidden', 'Only patients can self-register.');
  const credentials = await createUserWithEmailAndPassword(auth, validEmail(email), passwordCheck(password));
  const profile = await hospital.createProfile(credentials.user, { ...userData, role: 'patient' });
  if (!profile.success) {
    // Compensate Auth creation if Firestore registration failed; they are separate services.
    try { await deleteUser(credentials.user); }
    catch { return { ...profile, recoveryRequired: true, error: 'Profile creation failed and the authentication account could not be removed. Contact support before retrying.' }; }
    return profile;
  }
  let verificationSent = true;
  try { await sendEmailVerification(credentials.user, settings()); }
  catch { verificationSent = false; }
  return { success: true, user: credentials.user, verificationSent,
    message: verificationSent ? 'Account created. Verify your email before signing in.' : 'Account created, but verification email could not be sent. Use Resend verification on the login page.' };
});

export const loginWithEmail = (email, password, remember = false) => authResult(async () => {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credentials = await signInWithEmailAndPassword(auth, validEmail(email), password);
  return finishLogin(credentials.user);
});

export const loginWithGoogle = () => authResult(async () => {
  await setPersistence(auth, browserSessionPersistence);
  const credentials = await signInWithPopup(auth, new GoogleAuthProvider());
  const existing = await hospital.getRecord('users', credentials.user.uid);
  if (existing.code === 'not-found') {
    const profile = await hospital.createProfile(credentials.user, { role: 'patient', fullName: credentials.user.displayName });
    if (!profile.success) { await signOut(auth); return profile; }
  } else if (!existing.success) { await signOut(auth); return existing; }
  return finishLogin(credentials.user);
});

export const sendMagicLink = email => authResult(async () => {
  const normalizedEmail = validEmail(email);
  await sendSignInLinkToEmail(auth, normalizedEmail, settings());
  window.sessionStorage.setItem('medicare.signInEmail', normalizedEmail);
  return { success: true, message: 'Check your email for a sign-in link.' };
});
export const completeMagicLinkSignIn = email => authResult(async () => {
  assert(isSignInWithEmailLink(auth, window.location.href), 'validation', 'Invalid sign-in link.');
  const address = validEmail(email || window.sessionStorage.getItem('medicare.signInEmail'));
  const credential = await signInWithEmailLink(auth, address, window.location.href);
  window.sessionStorage.removeItem('medicare.signInEmail');
  return finishLogin(credential.user);
});
export const resendVerificationEmail = (user = auth.currentUser) => authResult(async () => {
  assert(user && !user.emailVerified, 'validation', 'Sign in to an unverified account first.');
  await sendEmailVerification(user, settings()); return { success: true, message: 'Verification email sent.' };
});
export const checkEmailVerified = (user = auth.currentUser) => authResult(async () => {
  assert(user, 'unauthenticated', 'Sign in first.');
  await reload(user); await getIdToken(user, true);
  return { success: true, verified: user.emailVerified };
});
export const resetPassword = email => authResult(async () => {
  try { await sendPasswordResetEmail(auth, validEmail(email), { url: `${window.location.origin}/login` }); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  return { success: true, message: 'If this email is registered, you will receive password reset instructions.' };
});
export const resetStaffPassword = resetPassword;
export const logoutUser = () => authResult(async () => {
  let audit = { success: true };
  try { if (auth.currentUser?.emailVerified) audit = await hospital.recordAuthEvent('USER_LOGOUT'); }
  finally { await signOut(auth); }
  // Never trap a user in a session when logout audit is unavailable.
  return { success: true, auditRecorded: audit.success };
});

const provisionUser = (data, createdBy, role) => authResult(async () => {
  assert(auth.currentUser?.uid === createdBy, 'forbidden', 'Invalid account creator.');
  const creator = await hospital.getRecord('users', createdBy);
  assert(creator.success && creator.data.accountStatus === 'active' &&
    (creator.data.role === 'admin' || (creator.data.role === 'receptionist' && role === 'patient')),
  'forbidden', 'Only authorized staff may provision this account.');
  assert(['patient', 'doctor', 'receptionist', 'lab'].includes(role), 'forbidden', 'Administrator registration is disabled.');
  // A separate, in-memory Auth instance preserves the creator’s session.
  const secondary = initializeApp(app.options, `provision-${crypto.randomUUID()}`);
  const secondaryAuth = getAuth(secondary);
  if (auth.emulatorConfig) connectAuthEmulator(secondaryAuth, `http://${auth.emulatorConfig.host}:${auth.emulatorConfig.port}`, { disableWarnings: true });
  let user;
  try {
    await setPersistence(secondaryAuth, inMemoryPersistence);
    const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    user = (await createUserWithEmailAndPassword(secondaryAuth, validEmail(data.email), randomPassword)).user;
    const profile = await hospital.createProfile(user, { ...data, role }, createdBy);
    if (!profile.success) {
      try { await deleteUser(user); } catch { return { ...profile, recoveryRequired: true }; }
      return profile;
    }
    const delivery = await Promise.allSettled([
      Promise.resolve().then(() => sendEmailVerification(user, settings())),
      Promise.resolve().then(() => sendPasswordResetEmail(secondaryAuth, data.email, { url: `${window.location.origin}/login` })),
    ]);
    const emailsSent = delivery.every(item => item.status === 'fulfilled');
    return { success: true, data: profile.data, emailsSent,
      message: emailsSent ? 'Account created. Verification and password setup emails sent.' : 'Account created; an email delivery failed. Resend verification/password setup before first use.' };
  } finally {
    try { await signOut(secondaryAuth); } finally { await deleteApp(secondary); }
  }
});
export const createStaffUser = (data, createdBy) => provisionUser(data, createdBy, data.role);
export const registerPatient = (data, createdBy) => data.email ? provisionUser(data, createdBy, 'patient') : hospital.registerWalkIn(data, createdBy);
export const createAppointmentFromRegistration = input => hospital.bookAppointment(input);

// Phone OTP is linked to an email-verified identity. Phone-only login cannot
// satisfy the mandatory verified-email policy. SMS quotas/billing are external.
export const createPhoneVerifier = elementId => new RecaptchaVerifier(auth, elementId, { size: 'normal' });
export const sendPhoneVerification = (phone, verifier) => authResult(async () => {
  assert(import.meta.env.VITE_ENABLE_PHONE_AUTH === 'true', 'phone-auth-unavailable', 'SMS authentication is disabled; no paid Auth features are enabled.');
  assert(auth.currentUser?.emailVerified, 'email-unverified', 'Verify your email before linking a phone.');
  assert(/^\+923\d{9}$/.test(phone), 'validation', 'Use +923XXXXXXXXX.');
  const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber(phone, verifier);
  return { success: true, verificationId };
});
export const confirmPhoneVerification = (verificationId, code) => authResult(async () => {
  await linkWithCredential(auth.currentUser, PhoneAuthProvider.credential(verificationId, code));
  return { success: true };
});
