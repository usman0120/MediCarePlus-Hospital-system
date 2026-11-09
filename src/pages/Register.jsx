import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerWithEmail } from '../auth.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospital } from '@fortawesome/free-solid-svg-icons';

export default function Register() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const result = await registerWithEmail(values.email, values.password, { ...values, role: 'patient' });
      if (result.success) setMessage(result.message); else setError(result.error);
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-blue-50 dark:bg-gray-950 p-4 flex items-center justify-center">
    <section className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 dark:text-white p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-2"><FontAwesomeIcon icon={faHospital} className="mr-2 text-blue-600" />Patient registration</h1>
      <p className="text-sm mb-5">Staff accounts are created by hospital administration. Email verification is required.</p>
      {error && <p role="alert" className="p-3 mb-4 bg-red-100 text-red-900 rounded-lg">{error}</p>}
      {message ? <div role="status"><p>{message}</p><Link className="text-blue-600 underline" to="/login">Continue to login</Link></div> :
        <form onSubmit={submit} className="space-y-4">
          {[
            ['fullName', 'Full name', 'text', true], ['email', 'Email', 'email', true],
            ['phone', 'Pakistan mobile number (+923XXXXXXXXX)', 'tel', true],
            ['dateOfBirth', 'Date of birth', 'date', true], ['cnic', 'CNIC (optional for children)', 'text', false],
            ['emergencyContact', 'Emergency contact (+923XXXXXXXXX)', 'tel', false], ['address', 'Address', 'text', false],
            ['password', 'Password (at least 12 characters)', 'password', true], ['confirmPassword', 'Confirm password', 'password', true],
          ].map(([name, label, type, required]) => <label key={name} className="block text-sm font-medium">{label}
            <input name={name} type={type} required={required} minLength={type === 'password' ? 12 : undefined}
              maxLength={type === 'password' ? 128 : 500} autoComplete={type === 'password' ? 'new-password' : name === 'email' ? 'email' : 'off'}
              className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
          </label>)}
          <label className="block text-sm font-medium">Gender<select name="gender" required className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-800">
            <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select></label>
          <button disabled={busy} className="w-full rounded-lg bg-blue-600 text-white p-3 disabled:opacity-50">{busy ? 'Creating account…' : 'Create patient account'}</button>
        </form>}
      <p className="mt-4 text-sm"><Link to="/login" className="text-blue-600 underline">Already registered? Sign in</Link> · <Link to="/">Home</Link></p>
    </section>
  </main>;
}
