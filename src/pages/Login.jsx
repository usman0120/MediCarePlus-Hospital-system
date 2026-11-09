import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginWithEmail, loginWithGoogle, resendVerificationEmail, checkEmailVerified, logoutUser, sendMagicLink, completeMagicLinkSignIn, resetPassword } from '../auth.js';

export default function Login({ initialMethod = 'password' }) {
  const { currentUser, userDetails, isAuthenticated, adminPasswordAuthenticated } = useAuth();
  const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [method, setMethod] = useState(initialMethod); const [email, setEmail] = useState('');
  const verificationRequired = currentUser && !currentUser.emailVerified;
  const link = window.location.href.includes('mode=signIn');
  useEffect(() => { if (isAuthenticated && (userDetails.role !== 'admin' || adminPasswordAuthenticated)) navigate(`/${userDetails.role}`, { replace: true }); }, [isAuthenticated, userDetails, adminPasswordAuthenticated, navigate]);
  async function perform(work) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await work(); if (!result.success) setError(result.error); else if (result.message) setMessage(result.message);
      if (result.success && result.redirect) navigate(result.redirect, { replace: true }); return result;
    } catch { setError('Unable to complete sign-in. Reconnect and retry.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-4"><section className="card w-full max-w-md space-y-4">
    <h1 className="text-2xl font-bold">MediCare Plus · Sign in</h1>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p>}{message && <p role="status" className="rounded-lg bg-teal-50 p-3 text-teal-900">{message}</p>}
    {verificationRequired ? <div className="space-y-3"><p>Verify your email before accessing hospital records.</p>
      <button className="button-secondary" disabled={busy} onClick={() => perform(() => resendVerificationEmail())}>Resend verification</button>
      <button className="button" disabled={busy} onClick={async () => { const result = await perform(() => checkEmailVerified()); if (result?.success && !result.verified) setMessage('Email is not verified yet. Open the verification link and check again.'); }}>I have verified my email</button>
      <button className="button-secondary" disabled={busy} onClick={() => perform(logoutUser)}>Sign out</button>
    </div> : <>
      <form className="space-y-4" onSubmit={event => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        if (link) perform(() => completeMagicLinkSignIn(email)); else if (method === 'reset') perform(() => resetPassword(email)); else if (method === 'link') perform(() => sendMagicLink(email));
        else perform(() => loginWithEmail(email, values.get('password'), values.get('remember') === 'on'));
      }}>
        <label className="block">Email<input className="input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
        {method === 'password' && !link && <><label className="block">Password<input className="input" type="password" name="password" required autoComplete="current-password" maxLength={128} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="remember" />Remember me on this private device only</label></>}
        <button className="button w-full" disabled={busy}>{busy ? 'Please wait…' : link ? 'Complete sign-in link' : method === 'reset' ? 'Send password reset instructions' : method === 'link' ? 'Send sign-in link' : 'Sign in'}</button>
      </form>
      {!link && <div className="space-y-3"><button className="button-secondary w-full" disabled={busy} onClick={() => perform(loginWithGoogle)}>Sign in with Google</button>
        <button className="underline text-sm" disabled={busy} onClick={() => setMethod(method === 'password' ? 'link' : 'password')}>{method === 'password' ? 'Use an email sign-in link' : 'Use password'}</button></div>}
      <p className="text-xs">Administrators use verified email/password only. No administrator registration or OTP simulation is available.</p>
    </>}
    <p className="text-sm"><Link className="underline" to="/forgot-password">Reset password</Link> · <Link className="underline" to="/register">Patient registration</Link> · <Link to="/">Home</Link></p>
  </section></main>;
}
