import { useEffect, useMemo, useRef, useState } from 'react';
import { hospital } from '../database.js';
import { useAuth } from '../context/AuthContext.jsx';
import { encodeAttachment } from '../utils/transactions.js';
import { downloadAttachment, formatDate } from '../utils/helpers.js';
import { Card, ErrorNotice, RecordTable, useRecords } from '../pages/Dashboard.jsx';

export default function Chat() {
  const { currentUser, userDetails } = useAuth();
  const chats = useRecords('chats', { [userDetails.role === 'doctor' ? 'doctorId' : 'patientId']: currentUser.uid });
  const [selected, setSelected] = useState(null);
  return <div className="space-y-4"><Card title="Doctor–patient conversations">
    <p className="mb-3 text-sm">Conversations become available when the doctor opens a consultation. No administrator or receptionist can read chat content.</p>
    <RecordTable data={chats} columns={[{ label: 'Doctor ID', key: 'doctorId' }, { label: 'Patient ID', key: 'patientId' },
      { label: 'Unread', render: row => row.unreadCount[currentUser.uid] }]}
      actions={row => <button className="button-secondary" onClick={() => setSelected(row)}>Open conversation</button>} />
  </Card>{selected && <Conversation key={selected.id} chat={selected} onClose={() => setSelected(null)} />}</div>;
}
function Conversation({ chat, onClose }) {
  const { currentUser } = useAuth();
  const [live, setLive] = useState([]);
  const [older, setOlder] = useState([]);
  const [pending, setPending] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const receiving = useRef(false);
  const sendPending = useRef(false);
  const preparing = useRef(false);
  const mounted = useRef(true);
  const initialCursor = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return hospital.subscribeRecords('messages', { chatId: chat.id }, { pageSize: 30, orderBy: 'timestamp' }, page => {
      setLive(page.records); setHasOlder(page.hasMore || Boolean(initialCursor.current));
      if (!initialCursor.current && page.cursor) { initialCursor.current = page.cursor; setCursor(page.cursor); }
      setPending(previous => previous.filter(message => !page.records.some(saved => saved.id === message.id)));
    }, result => setError(result.error));
  }, [chat.id]);
  useEffect(() => () => { mounted.current = false; }, []);
  const messages = useMemo(() => [...new Map([...older, ...live, ...pending].map(message => [message.id, message])).values()]
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp) || a.id.localeCompare(b.id)), [older, live, pending]);
  useEffect(() => {
    const unread = live.filter(message => message.recipientId === currentUser.uid && message.status !== 'seen');
    if (!unread.length || receiving.current || document.visibilityState !== 'visible') return;
    receiving.current = true;
    (async () => {
      try {
        for (let i = 0; i < unread.length; i += 8) {
          const result = await hospital.acknowledgeMessages(chat.id, unread.slice(i, i + 8).map(message => message.id));
          if (!result.success) { if (mounted.current) setError(result.error); break; }
        }
      } finally { receiving.current = false; }
    })();
  }, [live, currentUser.uid, chat.id]);
  async function send(message) {
    if (sendPending.current) return;
    sendPending.current = true; setBusy(true); setError('');
    const result = await hospital.sendMessage(chat.id, { text: message.text, file: message.file }, message.id);
    if (mounted.current && !result.success) { setPending(previous => previous.map(item => item.id === message.id ? { ...item, status: 'failed' } : item)); setError(result.error); }
    sendPending.current = false; if (mounted.current) setBusy(false);
  }
  async function submit(event) {
    event.preventDefault(); if (preparing.current || sendPending.current || !text.trim() && !file) return;
    preparing.current = true;
    setBusy(true); setError('');
    try {
      const attachment = file ? await encodeAttachment(file) : null;
      const message = { id: `msg_${crypto.randomUUID()}`, text: text.trim(), file: attachment, senderId: currentUser.uid,
        recipientId: chat.participants.find(id => id !== currentUser.uid), timestamp: new Date(), status: 'sending' };
      if (!mounted.current) return;
      setPending(previous => [...previous, message]); setText(''); setFile(null); event.target.reset();
      await send(message);
    } catch (error) { if (mounted.current) { setError(error.message); setBusy(false); } }
    finally { preparing.current = false; }
  }
  return <Card title="Conversation">
    <button className="mb-3 button-secondary" onClick={onClose}>Close conversation</button><ErrorNotice message={error} />
    {hasOlder && <button className="mb-3 button-secondary" disabled={busy || !cursor} onClick={async () => {
      setBusy(true);
      const result = await hospital.listRecords('messages', { chatId: chat.id }, { pageSize: 30, cursor, orderBy: 'timestamp' });
      if (result.success) { setOlder(previous => [...previous, ...result.data.records]); setCursor(result.data.cursor); setHasOlder(result.data.hasMore); }
      else setError(result.error);
      setBusy(false);
    }}>Load older messages</button>}
    <ol className="mb-4 max-h-96 space-y-3 overflow-y-auto" aria-live="polite">{messages.map(message => <li key={message.id}
      className={`rounded-lg border p-3 ${message.senderId === currentUser.uid ? 'ml-6 bg-blue-50 dark:bg-blue-950' : 'mr-6'}`}>
      <p className="whitespace-pre-wrap break-words">{message.text}</p>
      {message.file && <button className="text-sm underline" onClick={async () => { try { await downloadAttachment(message.file); } catch (error) { setError(error.message); } }}>Download {message.file.name}</button>}
      {message.autoReplyNotice && <p className="mt-2 text-xs text-amber-700">Automatic availability notice: {message.autoReplyNotice}</p>}
      <p className="mt-1 text-xs">{formatDate(message.timestamp)} · {message.status}</p>
      {message.status === 'failed' && <button className="text-sm underline" disabled={busy} onClick={() => send(message)}>Retry the same message</button>}
    </li>)}</ol>
    <form onSubmit={submit} className="space-y-3"><label className="block text-sm">Message<textarea className="input" value={text} onChange={event => setText(event.target.value)} maxLength={4000} disabled={busy} /></label>
      <label className="block text-sm">Optional file<input className="input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={event => setFile(event.target.files[0] || null)} /></label>
      <button className="button" disabled={busy || !text.trim() && !file}>{busy ? 'Sending…' : 'Send message'}</button>
      <p className="text-xs">Files are compressed and size-checked before upload. Outside configured messaging hours, availability notices are labelled automatically—not sent under the doctor's identity.</p>
    </form>
  </Card>;
}
