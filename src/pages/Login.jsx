import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  loginWithEmail, loginWithGoogle, resendVerificationEmail, checkEmailVerified,
  completeTotpLogin, beginTotpEnrollment, finishTotpEnrollment, logoutUser,
  sendMagicLink, completeMagicLinkSignIn,
} from '../auth.js';

export default function Login() {
  const { currentUser, userDetails, isAuthenticated, mfaVerified } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resolver, setResolver] = useState(null);
  const [secret, setSecret] = useState(null);
  const [method, setMethod] = useState('password');
  const [email, setEmail] = useState('');
  const totpEnabled = import.meta.env.VITE_ENABLE_TOTP === 'true';
  const adminEnrollment = userDetails?.role === 'admin' && currentUser?.emailVerified && !mfaVerified && !resolver;
  const verificationRequired = currentUser && !currentUser.emailVerified;
  const hasSignInLink = window.location.href.includes('mode=signIn');
  useEffect(() => {
    if (isAuthenticated && (userDetails?.role !== 'admin' || mfaVerified)) navigate(`/${userDetails.role}`, { replace: true });
  }, [isAuthenticated, userDetails, mfaVerified, navigate]);
  async function perform(operation) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await operation();
      if (result.requiresMfa) setResolver(result.resolver);
      else if (!result.success) setError(result.error);
      else if (result.secret) setSecret(result.secret);
      else if (result.message) setMessage(result.message);
      if (result.success && result.redirect) navigate(result.redirect, { replace: true });
      return result;
    } catch { setError('Unable to complete sign-in. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (resolver) return perform(() => completeTotpLogin(resolver, values.code));
    if (secret) {
      const result = await perform(() => finishTotpEnrollment(secret, values.code));
      if (result?.success) {
        await logoutUser(); setSecret(null); setMessage('Authenticator enrolled. Sign in again using your password and authenticator code.');
      }
      return;
    }
    if (hasSignInLink) return perform(() => completeMagicLinkSignIn(email));
    if (method === 'link') return perform(() => sendMagicLink(email));
    return perform(() => loginWithEmail(email, values.password, values.remember === 'on'));
  }
  return <main className="min-h-screen bg-blue-50 dark:bg-gray-950 p-4 flex items-center justify-center">
    <section className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 dark:text-white p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-4">MediCare Plus · Sign in</h1>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-100 text-red-900 p-3">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-lg bg-green-100 text-green-900 p-3">{message}</p>}
      {verificationRequired ? <div className="space-y-3">
        <p>Verify your email to access hospital services.</p>
        <button disabled={busy} onClick={() => perform(() => resendVerificationEmail())} className="text-blue-600 underline">Resend verification</button>
        <button disabled={busy} onClick={async () => {
          const result = await perform(() => checkEmailVerified());
          if (result?.success && !result.verified) setMessage('Email is not verified yet. Open the verification link and check again.');
        }} className="block rounded-lg bg-blue-600 text-white p-3">I have verified my email</button>
        <button onClick={() => perform(logoutUser)} disabled={busy} className="underline">Sign out</button>
      </div> : <>
        {adminEnrollment && !secret && <div className="mb-4 rounded-lg bg-amber-50 text-amber-950 p-3">
          <p>{totpEnabled ? 'Administrator access requires a real authenticator. No simulated OTP is accepted.' :
            'Privileged administrator access is currently disabled. Paid Auth features are not enabled; a secure verification alternative must be agreed before access can be enabled.'}</p>
          {totpEnabled && <button className="mt-2 underline" disabled={busy} onClick={() => perform(beginTotpEnrollment)}>Set up authenticator</button>}
          <button className="ml-3 underline" disabled={busy} onClick={() => perform(logoutUser)}>Sign out</button>
        </div>}
        {secret && <div className="mb-4"><p>Enter this setup key into your authenticator app. Keep it private.</p><code className="block break-all bg-gray-100 dark:bg-gray-800 p-3">{secret.secretKey}</code></div>}
        <form onSubmit={submit} className="space-y-4">
          {resolver || secret ? <label className="block">Authenticator code<input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-800" /></label> : <>
            <label className="block">Email<input type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required maxLength={254} className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-800" /></label>
            {method === 'password' && !hasSignInLink && <>
              <label className="block">Password<input type="password" name="password" required autoComplete="current-password" maxLength={128} className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-800" /></label>
              <label className="flex gap-2 text-sm"><input type="checkbox" name="remember" />Remember me on this private device only</label>
            </>}
          </>}
          <button disabled={busy} className="w-full rounded-lg bg-blue-600 text-white p-3 disabled:opacity-50">{busy ? 'Please wait…' : resolver || secret ? 'Verify authenticator' : hasSignInLink ? 'Complete email-link sign-in' : method === 'link' ? 'Send sign-in link' : 'Sign in'}</button>
        </form>
        {!resolver && !secret && !hasSignInLink && <div className="mt-4 space-y-3">
          <button disabled={busy} className="w-full rounded-lg border p-3" onClick={() => perform(loginWithGoogle)}>Sign in with Google</button>
          <button disabled={busy} className="text-blue-600 underline" onClick={() => setMethod(method === 'password' ? 'link' : 'password')}>{method === 'password' ? 'Use an email sign-in link' : 'Use password'}</button>
        </div>}
      </>}
      <p className="mt-5 text-sm"><Link className="text-blue-600 underline" to="/forgot-password">Reset password</Link> · <Link className="text-blue-600 underline" to="/register">Patient registration</Link> · <Link to="/">Home</Link></p>
    </section>
  </main>;
}
