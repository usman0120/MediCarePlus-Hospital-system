import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospital, faMoon, faSun, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { hospital } from '../database.js';
import { logoutUser } from '../auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { fieldValues } from '../utils/helpers.js';

export default function Dashboard() {
  const { userDetails } = useAuth();
  return userDetails ? <Navigate to={`/${userDetails.role}`} replace /> : <Skeleton />;
}

export function Shell({ title, children }) {
  const { userDetails, theme, toggleTheme } = useAuth();
  return <div className={`min-h-screen ${userDetails?.role}-theme`}>
    <header className="sticky top-0 z-20 border-b bg-white dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/dashboard" className="mr-auto flex items-center gap-2 font-bold"><FontAwesomeIcon icon={faHospital} className="text-[var(--role-color)]" />MediCare Plus</Link>
        <span className="text-sm">{userDetails?.fullName} · {userDetails?.role}</span>
        <button className="button-secondary" aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} onClick={toggleTheme}><FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} /></button>
        <button className="button-secondary" onClick={async () => { const result = await logoutUser(); if (!result.success) toast.error(result.error); }}><FontAwesomeIcon icon={faRightFromBracket} /> Sign out</button>
      </div>
    </header>
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-4"><h1 className="mr-auto text-2xl font-bold">{title}</h1><SearchBar key={userDetails.uid} /></div>
      {children}
    </main>
  </div>;
}

export function Tabs({ tabs, selected, onChange }) {
  return <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2">{tabs.map(tab => <button key={tab} aria-current={selected === tab ? 'page' : undefined}
    className={selected === tab ? 'button' : 'button-secondary'} onClick={() => onChange(tab)}>{tab}</button>)}</nav>;
}
export function Card({ title, children, className = '' }) {
  return <section className={`card ${className}`}>{title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}{children}</section>;
}
export function Skeleton() { return <div role="status" aria-label="Loading records" className="space-y-3 animate-pulse"><div className="h-8 rounded bg-slate-200 dark:bg-slate-800" /><div className="h-24 rounded bg-slate-200 dark:bg-slate-800" /></div>; }
export function ErrorNotice({ message, onRetry }) { return message ? <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-950 dark:bg-red-950 dark:text-red-100">{message}{onRetry && <button className="ml-3 underline" onClick={onRetry}>Retry</button>}</div> : null; }

/** One real, cancellable pagination/subscription implementation for every role. */
export function useRecords(name, filters = {}, options = {}) {
  const filterKey = JSON.stringify(filters);
  const stableFilters = useMemo(() => JSON.parse(filterKey), [filterKey]);
  const queryKey = `${name}:${filterKey}`;
  const [pagination, setPagination] = useState({ key: queryKey, cursor: null, history: [] });
  const { cursor, history } = pagination.key === queryKey ? pagination : { cursor: null, history: [] };
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ records: [], loading: true, error: '', hasMore: false, cursor: null, fromCache: false });
  const pageSize = options.pageSize || 20;
  const sort = options.orderBy;
  const direction = options.direction;
  useEffect(() => {
    let active = true;
    const begin = async () => {
      setState(previous => ({ ...previous, loading: true, error: '' }));
    };
    begin();
    const unsubscribe = hospital.subscribeRecords(name, stableFilters, { pageSize, cursor, orderBy: sort, direction },
      page => { if (active) setState({ ...page, key: queryKey, loading: false, error: '' }); },
      result => { if (active) setState(previous => ({ ...previous, key: queryKey, loading: false, error: result.error })); });
    return () => { active = false; unsubscribe(); };
  }, [name, filterKey, queryKey, stableFilters, pageSize, cursor, sort, direction, version]);
  return { ...state, loading: state.loading || state.key !== queryKey, page: history.length + 1,
    refresh: () => setVersion(value => value + 1),
    next: () => { if (state.hasMore && !state.loading) setPagination({ key: queryKey, history: [...history, cursor], cursor: state.cursor }); },
    previous: () => { if (history.length && !state.loading) setPagination({ key: queryKey, cursor: history.at(-1), history: history.slice(0, -1) }); },
  };
}
export function RecordTable({ data, columns, actions, empty = 'No matching records.' }) {
  if (data.loading) return <Skeleton />;
  if (data.error) return <ErrorNotice message={data.error} onRetry={data.refresh} />;
  return <>
    {data.fromCache && <p role="status" className="mb-2 text-sm text-amber-700">Cached view. Financial changes require an online transaction.</p>}
    {!data.records.length ? <p className="text-slate-500">{empty}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr>{columns.map(column => <th className="border-b p-3" key={column.label}>{column.label}</th>)}{actions && <th className="border-b p-3">Actions</th>}</tr></thead>
      <tbody>{data.records.map(record => <tr key={record.id}>{columns.map(column => <td className="border-b p-3 align-top" key={column.label}>{column.render ? column.render(record) : record[column.key] ?? 'Not recorded'}</td>)}
        {actions && <td className="border-b p-3"><div className="flex flex-wrap gap-2">{actions(record)}</div></td>}</tr>)}</tbody>
    </table></div>}
    <div className="mt-4 flex items-center gap-3"><button className="button-secondary" disabled={data.page === 1} onClick={data.previous}>Previous</button><span>Page {data.page}</span><button className="button-secondary" disabled={!data.hasMore} onClick={data.next}>Next</button><button className="ml-auto button-secondary" onClick={data.refresh}>Refresh</button></div>
  </>;
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const run = useCallback(async (work, successMessage, onSuccess) => {
    if (pending.current) return null;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await work();
      if (!result.success) { setError(result.error); toast.error(result.error); return null; }
      if (result.emailsSent === false || result.verificationSent === false) toast.error(result.message || 'Record saved, but email delivery needs attention.');
      else if (successMessage || result.message) toast.success(result.message || successMessage);
      if (onSuccess) await onSuccess(result.data, result);
      return result.data;
    } catch (error) { const message = error.message || 'Unable to complete the action.'; setError(message); toast.error(message); return null; }
    finally { pending.current = false; setBusy(false); }
  }, []);
  return { busy, error, run };
}

export function Form({ fields, initial = {}, onSubmit, busy, submitLabel = 'Save', children }) {
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!busy) onSubmit(fieldValues(event.currentTarget)); }}>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {fields.map(field => <label key={field.name} className={`block text-sm font-medium ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>{field.label}
        {field.type === 'select' ? <select aria-label={field.label} className="input" name={field.name} required={field.required} defaultValue={initial[field.name] ?? ''}>
          <option value="">Select</option>{field.options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
        </select> : field.type === 'textarea' ? <textarea aria-label={field.label} className="input" name={field.name} required={field.required} maxLength={field.maxLength || 2000} defaultValue={initial[field.name] ?? ''} /> :
          <input className="input" name={field.name} type={field.type || 'text'} required={field.required} min={field.min} max={field.max} step={field.step}
            maxLength={field.maxLength || 150} pattern={field.pattern} autoComplete={field.autoComplete || 'off'} defaultValue={initial[field.name] ?? ''} />}
        {field.hint && <span className="text-xs text-slate-500">{field.hint}</span>}
      </label>)}
    </fieldset>
    {children}<button className="button" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
  </form>;
}

export const profileFields = [
  { name: 'fullName', label: 'Full name', required: true, maxLength: 100 },
  { name: 'phone', label: 'Pakistan mobile (+923XXXXXXXXX)', required: true, pattern: '[+]923[0-9]{9}' },
  { name: 'cnic', label: 'CNIC (optional)', pattern: '[0-9]{5}-[0-9]{7}-[0-9]' },
  { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { name: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'] },
  { name: 'emergencyContact', label: 'Emergency contact', pattern: '[+]923[0-9]{9}' },
  { name: 'bloodGroup', label: 'Blood group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  { name: 'address', label: 'Address', type: 'textarea', maxLength: 500 },
];
