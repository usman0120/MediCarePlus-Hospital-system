import { useEffect, useState } from 'react';
import { hospital } from '../database.js';
import { encodeAttachment } from '../utils/transactions.js';
import { MAX_PRESCRIPTION_MEDICINES } from '../utils/constants.js';
import { downloadBlob } from '../utils/helpers.js';
import { generatePDF } from './PDFGenerator.js';
import { Card, ErrorNotice, Skeleton, useAction } from '../pages/Dashboard.jsx';

const medicine = () => ({ name: '', dose: '', frequency: '', duration: '', instructions: '' });
const draftOf = visit => ({ chiefComplaint: visit.chiefComplaint, symptoms: visit.symptoms, diagnosis: visit.diagnosis,
  notes: visit.notes, followUpDate: visit.followUpDate || '', vitals: { ...visit.vitals }, prescription: visit.prescription.map(item => ({ ...item })) });

export default function EMRForm({ visitId, onClose }) {
  const [visit, setVisit] = useState(null);
  const [draft, setDraft] = useState(null);
  const [revision, setRevision] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const action = useAction();
  useEffect(() => { let active = true; hospital.listRecords('inventory', { category: 'medicine' }, { pageSize: 100 }).then(result => { if (active) { if (result.success) setCatalog(result.data.records); else setCatalogError(`Medicine suggestions unavailable: ${result.error}`); } }); return () => { active = false; }; }, []);
  useEffect(() => hospital.subscribeRecord('visits', visitId, record => {
    setVisit(record);
    setDraft(previous => previous || draftOf(record));
    setRevision(previous => previous ?? record.revision);
  }, result => setLoadError(result.error)), [visitId]);
  if (loadError) return <ErrorNotice message={loadError} />;
  if (!visit || !draft) return <Skeleton />;
  const stale = revision !== visit.revision;
  const update = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  const accept = record => { setVisit(record); setDraft(draftOf(record)); setRevision(record.revision); };
  const refreshAfterSave = async () => {
    const result = await hospital.getRecord('visits', visitId);
    if (!result.success) throw new Error(result.error);
    accept(result.data);
  };
  return <Card title={`Structured EMR · ${visit.patientName}`}>
    <div className="mb-4 flex flex-wrap gap-3"><span>Visit {visit.id} · {visit.locked ? 'Locked' : 'Editable'} · revision {visit.revision}</span><button className="ml-auto button-secondary" onClick={onClose}>Close</button></div>
    <ErrorNotice message={action.error} />
    <ErrorNotice message={catalogError} />
    {stale && <div role="alert" className="my-3 rounded-lg bg-amber-50 p-3 text-amber-950">This record changed. Your draft was not overwritten.
      <button className="ml-3 underline" onClick={() => { if (window.confirm('Discard this draft and load the latest saved record?')) accept(visit); }}>Load latest record</button></div>}
    <form onSubmit={event => { event.preventDefault(); action.run(() => hospital.saveEMR(visitId, draft, revision), 'Clinical record saved.', refreshAfterSave); }} className="space-y-4">
      <fieldset disabled={visit.locked || action.busy || stale} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">{[['chiefComplaint', 'Chief complaint', 2000], ['symptoms', 'Symptoms', 4000], ['diagnosis', 'Diagnosis', 4000], ['notes', 'Notes', 6000]].map(([key, label, max]) =>
          <label key={key} className="text-sm font-medium">{label}<textarea aria-label={label} className="input" required={key !== 'notes'} maxLength={max} value={draft[key]} onChange={event => update(key, event.target.value)} /></label>)}</div>
        <div className="grid gap-3 sm:grid-cols-4">{[['bp', 'Blood pressure', 'text'], ['sugar', 'Sugar (mg/dL)', 'number'], ['heartRate', 'Heart rate (bpm)', 'number'], ['temperature', 'Temperature (°C)', 'number']].map(([key, label, type]) =>
          <label key={key} className="text-sm">{label}<input aria-label={label} className="input" type={type} step="any" min={type === 'number' ? 0 : undefined} value={draft.vitals[key] ?? ''}
            onChange={event => update('vitals', { ...draft.vitals, [key]: event.target.value })} /></label>)}</div>
        <label className="block text-sm">Follow-up date<input className="input" type="date" value={draft.followUpDate} onChange={event => update('followUpDate', event.target.value)} /></label>
        <h3 className="font-semibold">Prescription medicines</h3>
        <datalist id={`medicines-${visitId}`}>{catalog.map(item => <option key={item.id} value={item.name} />)}</datalist>
        {draft.prescription.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
          {['name', 'dose', 'frequency', 'duration', 'instructions'].map(key => <label className="text-sm" key={key}>{key}<input aria-label={key} className="input" list={key === 'name' ? `medicines-${visitId}` : undefined} required={key !== 'instructions'} maxLength={key === 'instructions' ? 500 : 100}
            value={item[key]} onChange={event => update('prescription', draft.prescription.map((value, i) => i === index ? { ...value, [key]: event.target.value } : value))} /></label>)}
          <button type="button" className="button-secondary" onClick={() => update('prescription', draft.prescription.filter((_, i) => i !== index))}>Remove medicine</button>
        </div>)}
        <button type="button" className="button-secondary" disabled={draft.prescription.length >= MAX_PRESCRIPTION_MEDICINES} onClick={() => update('prescription', [...draft.prescription, medicine()])}>Add medicine</button>
        <p className="text-xs">Up to {MAX_PRESCRIPTION_MEDICINES} medicines per issued prescription. Larger records require an approved schema/validation extension.</p>
      </fieldset>
      <button className="button" disabled={visit.locked || action.busy || stale}>{action.busy ? 'Saving…' : 'Save structured EMR'}</button>
    </form>
    <div className="mt-4 flex flex-wrap gap-3">
      <button className="button-secondary" disabled={visit.locked || action.busy || stale || !visit.prescription.length} onClick={() => action.run(async () => {
        const pdf = await generatePDF('prescription', visit);
        const attachment = await encodeAttachment(new File([pdf], `prescription-${visit.id}.pdf`, { type: 'application/pdf' }));
        const result = await hospital.savePrescription(visit.id, visit.prescription, attachment, visit.revision);
        if (result.success) downloadBlob(pdf, attachment.name);
        return result;
      }, 'Saved prescription PDF generated.', refreshAfterSave)}>Generate PDF from saved prescription</button>
      {visit.status === 'active' && <button className="button-secondary" disabled={action.busy || visit.locked || stale} onClick={() => {
        if (window.confirm('Discharge and lock this saved visit? Resolve pending tests, operations and bed charges first.')) action.run(() => hospital.dischargeVisit(visit.id, visit.notes), 'Visit discharged and locked.', refreshAfterSave);
      }}>Discharge patient</button>}
      {visit.status === 'discharged' && !visit.locked && <button className="button-secondary" disabled={action.busy} onClick={() => action.run(() => hospital.relockVisit(visit.id), 'Amended record relocked.', refreshAfterSave)}>Relock amendment</button>}
    </div>
  </Card>;
}
