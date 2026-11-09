import { useCallback, useEffect, useState } from 'react';
import { hospital } from '../database.js';
import { encodeAttachment } from '../utils/transactions.js';
import { logoutUser } from '../auth.js';

export default function Lab() {
  const [page, setPage] = useState({ records: [], cursor: null, hasMore: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const load = useCallback(async cursor => {
    setBusy(true); setError('');
    const result = await hospital.listRecords('labRequests', { status: 'pending' }, { cursor, pageSize: 20 });
    if (result.success) setPage(result.data); else setError(result.error);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const attachment = await encodeAttachment(data.get('file'));
      const result = await hospital.completeLabTest(selected.id, attachment, data.get('summary'));
      if (result.success) { setSelected(null); setMessage('Lab result uploaded. The assigned doctor and patient can now view it.'); await load(); }
      else setError(result.error);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <main className="max-w-5xl mx-auto p-4 dark:text-white">
    <header className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Laboratory requests</h1><button onClick={logoutUser} className="underline">Sign out</button></header>
    {error && <p role="alert" className="bg-red-100 text-red-900 p-3 mb-4 rounded-lg">{error}</p>}
    {message && <p role="status" className="bg-green-100 text-green-900 p-3 mb-4 rounded-lg">{message}</p>}
    <button onClick={() => load()} disabled={busy} className="underline mb-4">Refresh requests</button>
    {busy && <p role="status">Loading…</p>}
    {!busy && !page.records.length && <p>No pending requests.</p>}
    <ul className="space-y-3">{page.records.map(request => <li key={request.id} className="border rounded-lg p-4 flex flex-wrap gap-3 justify-between">
      <div><h2 className="font-bold">{request.testName}</h2><p>Request: {request.id} · Priority: {request.priority}</p><p>Patient ID: {request.patientId}</p></div>
      <button disabled={busy} onClick={() => setSelected(request)} className="rounded-lg bg-teal-700 text-white px-4 py-2">Upload result</button>
    </li>)}</ul>
    {page.hasMore && <button disabled={busy} onClick={() => load(page.cursor)} className="mt-4 underline">Next page</button>}
    {selected && <form onSubmit={submit} className="mt-6 border rounded-lg p-4 space-y-3">
      <h2 className="font-bold">Complete {selected.testName}</h2>
      <label className="block">Result summary<textarea name="summary" required maxLength={4000} className="block w-full border rounded-lg p-3 dark:bg-gray-900" /></label>
      <label className="block">Report (PDF or image)<input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="block" /></label>
      <p className="text-sm">Compressed files must fit the Firestore size limit. Large files are rejected, never silently truncated.</p>
      <button disabled={busy} className="bg-teal-700 text-white px-4 py-2 rounded-lg">{busy ? 'Uploading…' : 'Complete request'}</button>
      <button type="button" disabled={busy} onClick={() => setSelected(null)} className="ml-3 underline">Cancel</button>
    </form>}
  </main>;
}
