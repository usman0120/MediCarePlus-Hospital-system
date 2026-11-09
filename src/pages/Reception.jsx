import { useState } from 'react';
import { hospital } from '../database.js';
import { registerPatient } from '../auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { currentDate, formatMinor } from '../utils/helpers.js';
import Invoice from '../components/Invoice.jsx';
import { Card, ErrorNotice, Form, profileFields, RecordTable, Shell, Tabs, useAction, useRecords } from './Dashboard.jsx';

export default function Reception() {
  const [tab, setTab] = useState('Appointments');
  return <Shell title="Reception workspace"><Tabs tabs={['Appointments', 'Emergency intake', 'Walk-in registration', 'Payments', 'Beds', 'Attendance']} selected={tab} onChange={setTab} />
    {tab === 'Appointments' && <Appointments />}{tab === 'Emergency intake' && <Emergency />}{tab === 'Walk-in registration' && <Registration />}{tab === 'Payments' && <Payments />}{tab === 'Beds' && <Beds />}{tab === 'Attendance' && <Attendance />}
  </Shell>;
}
function Appointments() {
  const records = useRecords('appointments', { kind: 'appointment' }); const action = useAction(); const [triage, setTriage] = useState(null);
  const rows = { ...records, records: [...records.records].sort((a, b) => (a.triagePriority ?? 3) - (b.triagePriority ?? 3) || a.time.localeCompare(b.time)) };
  return <><Card title="Appointments and emergency priority"><ErrorNotice message={action.error} /><RecordTable data={rows}
    columns={[{ label: 'Patient', key: 'patientName' }, { label: 'Doctor', key: 'doctorName' }, { label: 'Date', key: 'date' }, { label: 'Time', key: 'time' }, { label: 'Status', key: 'status' }, { label: 'Triage', key: 'triage' }]}
    actions={record => <>{record.status === 'scheduled' && <button className="button-secondary" disabled={action.busy} onClick={() => action.run(() => hospital.transitionAppointment(record.id, 'confirmed'), 'Appointment confirmed.')}>Confirm appointment</button>}
      {record.status === 'confirmed' && <button className="button" disabled={action.busy} onClick={() => action.run(() => hospital.transitionAppointment(record.id, 'checked-in'), 'Patient checked in.')}>Check in</button>}
      {['scheduled', 'confirmed'].includes(record.status) && <button className="button-secondary" disabled={action.busy} onClick={() => {
        if (window.confirm('Mark no-show only if the scheduled time has passed?')) action.run(() => hospital.transitionAppointment(record.id, 'no-show'), 'No-show recorded; slot released.');
      }}>No-show</button>}{record.isEmergency && <button className="button-secondary" onClick={() => setTriage(record.id)}>Assess triage</button>}</>} /></Card>
    {triage && <Card title="Emergency assessment"><Form busy={action.busy} fields={[{ name: 'triage', label: 'Priority', type: 'select', required: true, options: ['red', 'yellow', 'green'] }, { name: 'assessment', label: 'Assessment notes', type: 'textarea', required: true }]}
      onSubmit={values => action.run(() => hospital.setTriage(triage, values.triage, values.assessment), 'Triage assessment recorded.', () => setTriage(null))} /></Card>}
    <Booking />
  </>;
}
function Booking() {
  const action = useAction();
  return <Card title="Book for a registered walk-in patient"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Reserve configured doctor slot" fields={[
    { name: 'patientId', label: 'Registered patient ID', required: true }, { name: 'departmentId', label: 'Department ID', required: true }, { name: 'doctorId', label: 'Doctor ID', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'time', label: 'Configured appointment time', type: 'time', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true },
  ]} onSubmit={values => action.run(() => hospital.bookAppointment({ ...values, requestId: `apt_${crypto.randomUUID()}` }), 'Appointment reserved.')} />
    <p className="mt-3 text-xs">Use the global directory to look up patients and doctor IDs. Routine appointments must match the department's configured schedule; emergency admission requires an approved intake policy.</p>
  </Card>;
}
function Emergency() {
  const action = useAction(); const queue = useRecords('appointments', { kind: 'appointment', isEmergency: true, status: 'checked-in' }, { orderBy: 'triagePriority', direction: 'asc' });
  return <><Card title="Immediate emergency intake"><ErrorNotice message={action.error} /><p className="mb-3 text-sm">Register the patient first. Emergency intake bypasses routine booking slots, records actual reception assessment time, and queues red/yellow/green by severity and arrival order.</p>
    <Form busy={action.busy} submitLabel="Admit and queue emergency" fields={[{ name: 'patientId', label: 'Registered patient ID', required: true }, { name: 'departmentId', label: 'Triage-enabled department ID', required: true }, { name: 'doctorId', label: 'Assigned on-duty doctor ID', required: true },
      { name: 'triage', label: 'Severity', type: 'select', required: true, options: ['red', 'yellow', 'green'] }, { name: 'reason', label: 'Chief complaint', type: 'textarea', required: true }, { name: 'assessment', label: 'Reception assessment', type: 'textarea', required: true }]}
      onSubmit={values => action.run(() => hospital.intakeEmergency(values), 'Emergency assessment recorded and queued immediately.')} />
  </Card><Card title="Waiting emergency queue"><RecordTable data={queue} columns={[{ label: 'Patient', key: 'patientName' }, { label: 'Severity', key: 'triage' }, { label: 'Doctor', key: 'doctorName' }]}
    actions={record => <Form busy={action.busy} submitLabel="Dismiss waiting case with reason" fields={[{ name: 'reason', label: 'Departure/referral reason', required: true }]}
      onSubmit={values => action.run(() => hospital.dismissEmergency(record.id, values.reason), 'Waiting emergency closed with an audit trail.')} />} /></Card></>;
}
function Registration() {
  const { currentUser } = useAuth(); const action = useAction(); const [registered, setRegistered] = useState(null);
  return <Card title="Register a walk-in patient"><ErrorNotice message={action.error} />{registered && <p role="status" className="mb-4 break-all">Saved patient ID: <strong>{registered.id}</strong>. {registered.email ? 'Email verification/password setup are required before portal access.' : 'This is an in-hospital record without portal access.'}</p>}
    <Form fields={[...profileFields, { name: 'email', label: 'Email (optional for in-hospital-only record)', type: 'email' }]} busy={action.busy} submitLabel="Register patient"
      onSubmit={values => action.run(() => registerPatient(values, currentUser.uid), 'Patient registered.', setRegistered)} />
  </Card>;
}
function Payments() {
  const records = useRecords('invoices'); const [selected, setSelected] = useState(null);
  return <><Card title="Invoices and payment verification"><RecordTable data={records} columns={[{ label: 'Invoice ID', key: 'id' }, { label: 'Patient ID', key: 'patientId' }, { label: 'Total', render: item => formatMinor(item.totalMinor) }, { label: 'Status', key: 'status' }]}
    actions={record => <button className="button-secondary" onClick={() => setSelected(record)}>Review invoice</button>} /></Card>{selected && <Invoice key={selected.id} invoice={selected} onClose={() => setSelected(null)} onChange={() => { setSelected(null); records.refresh(); }} />}</>;
}
function Beds() {
  const records = useRecords('beds'); const action = useAction();
  return <><Card title="Assign / transfer a bed"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Assign available bed" fields={[{ name: 'bedId', label: 'Available bed ID', required: true }, { name: 'patientId', label: 'Patient ID with active visit', required: true }]}
    onSubmit={values => action.run(() => hospital.assignBed(values.bedId, values.patientId), 'Bed and patient/visit links synchronized.')} />
    <Form busy={action.busy} submitLabel="Transfer and settle previous bed charges" fields={[{ name: 'patientId', label: 'Patient ID', required: true }, { name: 'fromBedId', label: 'Current bed ID', required: true }, { name: 'toBedId', label: 'Available target bed ID', required: true }]}
      onSubmit={values => action.run(() => hospital.transferBed(values.patientId, values.fromBedId, values.toBedId), 'Transfer and billing saved atomically.')} />
  </Card><Card title="Bed availability"><RecordTable data={records} columns={[{ label: 'Bed', key: 'id' }, { label: 'Type', key: 'type' }, { label: 'Status', key: 'status' }, { label: 'Patient ID', key: 'patientId' }]}
    actions={record => record.status === 'occupied' && <button className="button-secondary" disabled={action.busy} onClick={() => {
      if (window.confirm('Release the bed and add its actual stay charges to the invoice?')) action.run(() => hospital.releaseBed(record.id), 'Bed released and charges settled.');
    }}>Release / settle charges</button>} /></Card></>;
}
function Attendance() {
  const records = useRecords('attendance', { kind: 'daily', date: currentDate() }); const action = useAction();
  return <><Card title="Staff attendance"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Mark / correct attendance" initial={{ date: currentDate() }} fields={[
    { name: 'userId', label: 'Staff ID', required: true }, { name: 'date', label: 'Attendance date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['present', 'absent', 'late', 'half-day', 'leave'] },
    { name: 'reason', label: 'Correction reason (required when changing a marked day)' },
  ]} onSubmit={values => action.run(() => hospital.markAttendance(values.userId, values.date, values.status, values.reason), 'Attendance saved.')} />
    <p className="mt-3 text-xs">Reception cannot read staff salary values. Attendance is frozen when monthly payroll is finalized.</p>
  </Card><Card title="Today's marked attendance"><RecordTable data={records} columns={[{ label: 'Staff ID', key: 'userId' }, { label: 'Status', key: 'status' }, { label: 'Date', key: 'date' }]} /></Card></>;
}
