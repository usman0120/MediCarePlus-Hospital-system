import { useEffect, useState } from 'react';
import { hospital } from '../database.js';
import { useAuth } from '../context/AuthContext.jsx';
import { downloadAttachment, downloadBlob, formatDate, formatMinor } from '../utils/helpers.js';
import { generatePDF } from '../components/PDFGenerator.js';
import Invoice from '../components/Invoice.jsx';
import Chat from '../components/Chat.jsx';
import { Card, ErrorNotice, Form, profileFields, RecordTable, Shell, Tabs, useAction, useRecords } from './Dashboard.jsx';

export default function Patient() {
  const [tab, setTab] = useState('Appointments');
  return <Shell title="Patient portal"><Tabs tabs={['Appointments', 'Medical records', 'Invoices', 'Lab results', 'Chat', 'Profile']} selected={tab} onChange={setTab} />
    {tab === 'Appointments' && <Appointments />}{tab === 'Medical records' && <MedicalRecords />}{tab === 'Invoices' && <Invoices />}
    {tab === 'Lab results' && <LabResults />}{tab === 'Chat' && <Chat />}{tab === 'Profile' && <Profile />}
  </Shell>;
}
function Appointments() {
  const { currentUser } = useAuth();
  const records = useRecords('appointments', { kind: 'appointment', patientId: currentUser.uid });
  const action = useAction();
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; hospital.directory().then(result => { if (active) { if (result.success) setDepartments(result.data); else setError(result.error); } }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true;
    if (doctorId && departmentId && date) hospital.availableSlots(departmentId, doctorId, date).then(result => {
      if (active) { setSlots(result.success ? result.data.filter(slot => slot.available) : []); setError(result.success ? '' : result.error); }
    });
    return () => { active = false; };
  }, [departmentId, doctorId, date]);
  const department = departments.find(item => item.id === departmentId);
  const doctors = department?.doctors || [];
  return <><Card title="Book an appointment">
    <ErrorNotice message={error || action.error} />
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault(); const values = new FormData(event.currentTarget);
      action.run(() => hospital.bookAppointment({ patientId: currentUser.uid, departmentId, doctorId, date, time: values.get('time'), reason: values.get('reason'), requestId: `apt_${crypto.randomUUID()}` }),
        'Appointment slot reserved. Reception will confirm your visit.', () => { setDate(''); setSlots([]); records.refresh(); });
    }}>
      <fieldset disabled={action.busy} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Department<select aria-label="Department" className="input" required value={departmentId} onChange={event => { setDepartmentId(event.target.value); setDoctorId(''); setSlots([]); }}><option value="">Select department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm">Doctor<select aria-label="Doctor" className="input" required value={doctorId} onChange={event => { setDoctorId(event.target.value); setSlots([]); }}><option value="">Select doctor</option>{doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.fullName} · {formatMinor(doctor.consultationFeeMinor)}</option>)}</select></label>
        <label className="text-sm">Date (Pakistan time)<input className="input" type="date" required value={date} onChange={event => { setDate(event.target.value); setSlots([]); }} /></label>
        <label className="text-sm">Available slot<select aria-label="Available slot" key={`${doctorId}:${date}`} className="input" name="time" required disabled={!slots.length}><option value="">Select available time</option>{slots.map(slot => <option key={slot.time} value={slot.time}>{slot.display}</option>)}</select></label>
        <label className="sm:col-span-2 text-sm">Reason<textarea className="input" name="reason" required maxLength={2000} /></label>
      </fieldset>
      <button className="button" disabled={action.busy || !slots.length}>{action.busy ? 'Reserving…' : 'Reserve appointment'}</button>
      <p className="text-xs">Availability is rechecked atomically at booking. Emergency care is assessed at reception, not booked through this routine form.</p>
    </form>
  </Card><Card title="Your appointments"><RecordTable data={records} columns={[{ label: 'Doctor', key: 'doctorName' }, { label: 'Date', key: 'date' }, { label: 'Time', key: 'time' }, { label: 'Status', key: 'status' }]}
    actions={record => ['scheduled', 'confirmed'].includes(record.status) && <button className="button-secondary" disabled={action.busy} onClick={() => {
      if (window.confirm('Cancel this appointment and release its slot?')) action.run(() => hospital.transitionAppointment(record.id, 'cancelled', 'Patient cancellation'), 'Appointment cancelled.', records.refresh);
    }}>Cancel</button>} /></Card></>;
}
function MedicalRecords() {
  const { currentUser } = useAuth();
  const records = useRecords('visits', { patientId: currentUser.uid });
  const action = useAction();
  const [selected, setSelected] = useState(null);
  return <><Card title="Your structured medical records"><ErrorNotice message={action.error} /><RecordTable data={records}
    columns={[{ label: 'Doctor', key: 'doctorName' }, { label: 'Date', render: record => formatDate(record.createdAt) }, { label: 'Diagnosis', key: 'diagnosis' }, { label: 'Status', key: 'status' }]}
    actions={record => <><button className="button-secondary" onClick={() => setSelected(record)}>View visit</button>
      <button className="button-secondary" disabled={action.busy} onClick={() => action.run(async () => { downloadBlob(await generatePDF('summary', record), `summary-${record.id}.pdf`); return { success: true }; })}>Summary PDF</button>
      {record.prescriptionPdf && <button className="button-secondary" onClick={() => action.run(async () => { await downloadAttachment(record.prescriptionPdf); return { success: true }; })}>Prescription PDF</button>}</>} /></Card>
    {selected && <Card title={`Visit ${selected.id}`}><dl className="grid gap-3 sm:grid-cols-2">{['chiefComplaint', 'symptoms', 'diagnosis', 'notes', 'followUpDate'].map(key => <div key={key}><dt className="font-semibold">{key}</dt><dd className="whitespace-pre-wrap">{selected[key] || 'Not recorded'}</dd></div>)}</dl>
      <p className="mt-3">Vitals: {JSON.stringify(selected.vitals)}</p>
      <ul className="my-3">{selected.prescription.map((item, index) => <li key={index}>{item.name} · {item.dose} · {item.frequency} · {item.duration} · {item.instructions}</li>)}</ul>
      {selected.status === 'discharged' && <Form busy={action.busy} submitLabel="Rate this visit" fields={[{ name: 'rating', label: 'Doctor rating (1–5)', type: 'number', min: 1, max: 5, step: 1, required: true }, { name: 'review', label: 'Optional review', type: 'textarea' }]}
        onSubmit={values => action.run(() => hospital.rateVisit(selected.id, Number(values.rating), values.review), 'Thank you. This completed visit has been rated.')} />}
      <button className="mt-3 button-secondary" onClick={() => setSelected(null)}>Close visit</button>
    </Card>}
  </>;
}
function Invoices() {
  const { currentUser } = useAuth();
  const records = useRecords('invoices', { patientId: currentUser.uid });
  const [selected, setSelected] = useState(null);
  return <><Card title="Your invoices"><RecordTable data={records} columns={[{ label: 'Invoice', key: 'id' }, { label: 'Total', render: item => formatMinor(item.totalMinor) }, { label: 'Status', key: 'status' }]}
    actions={record => <button className="button-secondary" onClick={() => setSelected(record)}>View / submit proof</button>} /></Card>
    {selected && <Invoice key={selected.id} invoice={selected} onClose={() => setSelected(null)} onChange={() => { setSelected(null); records.refresh(); }} />}</>;
}
function LabResults() {
  const { currentUser } = useAuth(); const action = useAction();
  const records = useRecords('labRequests', { patientId: currentUser.uid, status: 'completed' });
  return <Card title="Completed laboratory results"><ErrorNotice message={action.error} /><RecordTable data={records} columns={[{ label: 'Test', key: 'testName' }, { label: 'Completed', render: record => formatDate(record.completedAt) }, { label: 'Result summary', key: 'resultSummary' }]}
    actions={record => <button className="button-secondary" onClick={() => action.run(async () => { await downloadAttachment(record.result); return { success: true }; })}>Download report</button>} /></Card>;
}
function Profile() {
  const { currentUser, userDetails } = useAuth(); const action = useAction();
  return <Card title="Patient profile"><ErrorNotice message={action.error} /><Form key={userDetails.revision} fields={profileFields} initial={userDetails} busy={action.busy}
    onSubmit={values => action.run(() => hospital.updateProfile(currentUser.uid, values), 'Profile saved.')} /></Card>;
}
