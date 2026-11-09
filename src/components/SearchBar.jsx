import { useEffect, useState } from 'react';
import { hospital } from '../database.js';
import { formatMinor } from '../utils/helpers.js';

const highlighted = (text, query) => {
  const value = String(text || '');
  const index = value.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return index < 0 ? value : <>{value.slice(0, index)}<mark>{value.slice(index, index + query.length)}</mark>{value.slice(index + query.length)}</>;
};
export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recent, setRecent] = useState([]);
  const [views, setViews] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      setBusy(true); setError('');
      const response = await hospital.searchDirectory(query.trim());
      if (active) {
        if (response.success) setResults(response.data); else setError(response.error);
        setBusy(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  const open = record => {
    setSelected(record); setRecent(previous => [record, ...previous.filter(item => item.id !== record.id)].slice(0, 5));
    setViews(previous => ({ ...previous, [record.id]: (previous[record.id] || 0) + 1 }));
  };
  return <div className="relative w-full sm:max-w-sm">
    <label className="sr-only" htmlFor="hospital-search">Search authorized patients and doctors</label>
    <input id="hospital-search" className="input m-0" type="search" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setSelected(null); }} aria-controls="search-results" autoComplete="off" placeholder="Patient name / ID / phone, or doctor" />
    {(query || selected) && <div className="absolute right-0 z-30 mt-2 w-full max-h-96 overflow-y-auto rounded-xl border bg-white p-3 shadow-lg dark:bg-slate-900" id="search-results">
      {busy && <p role="status">Searching…</p>}{error && <p role="alert" className="text-red-600">{error}</p>}
      {!busy && query.length >= 2 && !results.length && !error && <p>No authorized matching records.</p>}
      {results.map(record => <button key={record.id} className="mb-2 block w-full rounded-lg border p-2 text-left" onClick={() => open(record)}>
        <strong>{highlighted(record.fullName, query)}</strong><p className="text-xs">{record.role} · {record.phone ? highlighted(record.phone, query) : record.departmentName}</p>
      </button>)}
      {selected && <div className="border-t pt-3"><h2 className="font-semibold">{selected.fullName}</h2><p className="break-all text-xs">ID: {selected.id}</p>
        {selected.phone && <p>{selected.phone}</p>}{selected.specialization && <p>{selected.specialization}</p>}
        {selected.consultationFeeMinor != null && <p>Consultation: {formatMinor(selected.consultationFeeMinor)}</p>}
      </div>}
      {!!recent.length && <div className="border-t pt-3"><h3 className="text-sm font-semibold">Recently viewed (this session only)</h3>
        {[...recent].sort((a, b) => views[b.id] - views[a.id]).map(record => <button key={record.id} className="mr-2 text-sm underline" onClick={() => open(record)}>{record.fullName} ({views[record.id]})</button>)}
      </div>}
      <button className="mt-3 text-sm underline" onClick={() => { setQuery(''); setSelected(null); }}>Close search</button>
    </div>}
  </div>;
}
