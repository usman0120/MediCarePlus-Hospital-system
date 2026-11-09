import { useEffect, useState } from 'react';
import { hospital } from '../database.js';
import { useAuth } from '../context/AuthContext.jsx';
import { csvValues, downloadAttachment, formatDate, formatMinor } from '../utils/helpers.js';
import EMRForm from '../components/EMRForm.jsx';
import Chat from '../components/Chat.jsx';
import { Card, ErrorNotice, Form, profileFields, RecordTable, Shell, Tabs, useAction, useRecords } from './Dashboard.jsx';

export default function Doctor() {
  const [tab, setTab] = useState('Appointments');
  return <Shell title="Doctor workspace"><Tabs tabs={['Appointments', 'Visits', 'Lab requests', 'Operations', 'Chat', 'Ratings', 'Performance', 'Profile & messaging']} selected={tab} onChange={setTab} />
    {tab === 'Appointments' && <Appointments />}{tab === 'Visits' && <Visits />}{tab === 'Lab requests' && <LabRequests />}
    {tab === 'Operations' && <Operations />}{tab === 'Chat' && <Chat />}{tab === 'Ratings' && <Ratings />}{tab === 'Performance' && <Performance />}{tab === 'Profile & messaging' && <Profile />}
  </Shell>;
}
function Appointments() {
  const { currentUser } = useAuth(); const action = useAction(); const [selected, setSelected] = useState(null);
  const emergencies = useRecords('appointments', { kind: 'appointment', doctorId: currentUser.uid, isEmergency: true, status: 'checked-in' }, { orderBy: 'triagePriority', direction: 'asc' });
  const records = useRecords('appointments', { kind: 'appointment', doctorId: currentUser.uid });
  return <><Card title="Your waiting emergencies — severity, then arrival"><RecordTable data={emergencies} columns={[{ label: 'Patient', key: 'patientName' }, { label: 'Severity', key: 'triage' }]}
    actions={record => <button className="button" disabled={action.busy} onClick={() => action.run(() => hospital.startVisit(record.id), 'Emergency consultation opened.', visit => setSelected(visit.id))}>Treat emergency</button>} /></Card>
    <Card title="Your appointments"><ErrorNotice message={action.error} /><RecordTable data={records}
    columns={[{ label: 'Patient', key: 'patientName' }, { label: 'Date', key: 'date' }, { label: 'Time', key: 'time' }, { label: 'Status', key: 'status' }, { label: 'Triage', key: 'triage' }]}
    actions={record => <>{record.status === 'checked-in' && <button className="button" disabled={action.busy} onClick={() => action.run(() => hospital.startVisit(record.id), 'Consultation opened with its invoice.', visit => setSelected(visit.id))}>Start consultation</button>}
      {record.visitId && <button className="button-secondary" onClick={() => setSelected(record.visitId)}>Open visit</button>}</>} /></Card>
    {selected && <EMRForm key={selected} visitId={selected} onClose={() => setSelected(null)} />}</>;
}
function Visits() {
  const { currentUser } = useAuth(); const [selected, setSelected] = useState(null);
  const records = useRecords('visits', { doctorId: currentUser.uid });
  return <><Card title="Structured clinical visits"><RecordTable data={records} columns={[{ label: 'Patient', key: 'patientName' }, { label: 'Date', render: item => formatDate(item.createdAt) }, { label: 'Diagnosis', key: 'diagnosis' }, { label: 'Status', key: 'status' }, { label: 'Locked', render: item => item.locked ? 'Yes' : 'No' }]}
    actions={record => <button className="button-secondary" onClick={() => setSelected(record.id)}>View / edit EMR</button>} /></Card>{selected && <EMRForm key={selected} visitId={selected} onClose={() => setSelected(null)} />}</>;
}
function useClinicalChoices() {
  const { currentUser, userDetails } = useAuth();
  const visits = useRecords('visits', { doctorId: currentUser.uid, status: 'active' });
  const [department, setDepartment] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    hospital.getRecord('departments', userDetails.departmentId).then(result => { if (active) { if (result.success) setDepartment(result.data); else setError(result.error); } });
    return () => { active = false; };
  }, [userDetails.departmentId]);
  return { visits, department, error };
}
function LabRequests() {
  const { currentUser } = useAuth(); const action = useAction(); const choices = useClinicalChoices();
  const records = useRecords('labRequests', { doctorId: currentUser.uid });
  const tests = Object.entries(choices.department?.services || {}).filter(([, item]) => item.type === 'lab' && item.active);
  return <><Card title="Request a laboratory test"><ErrorNotice message={action.error || choices.error || choices.visits.error} />
    <Form busy={action.busy || choices.visits.loading} submitLabel="Request test and add its charge" fields={[
      { name: 'visitId', label: 'Active visit', type: 'select', required: true, options: choices.visits.records.filter(item => !item.locked).map(item => ({ value: item.id, label: `${item.patientName} · ${item.id}` })) },
      { name: 'testId', label: 'Approved lab service', type: 'select', required: true, options: tests.map(([id, item]) => ({ value: id, label: `${item.name} · ${formatMinor(item.priceMinor)}` })) },
      { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['normal', 'urgent', 'stat'] },
    ]} onSubmit={values => action.run(() => hospital.requestLabTest(values.visitId, values.testId, values.priority), 'Lab request and invoice charge saved atomically.')} />
    <p className="mt-3 text-xs">Only approved department services are billable. Pending proof or a paid invoice cannot accept new charges.</p>
  </Card><Card title="Your test requests"><RecordTable data={records} columns={[{ label: 'Test', key: 'testName' }, { label: 'Patient ID', key: 'patientId' }, { label: 'Status', key: 'status' }, { label: 'Summary', key: 'resultSummary' }]}
    actions={record => <>{record.status === 'pending' && <Form busy={action.busy} submitLabel="Cancel pending test" fields={[{ name: 'reason', label: 'Cancellation reason', required: true }]}
      onSubmit={values => action.run(() => hospital.cancelLabTest(record.id, values.reason), 'Request cancelled and its charge removed.')} />}
      {record.result && <button className="button-secondary" onClick={() => action.run(async () => { await downloadAttachment(record.result); return { success: true }; })}>Download lab result</button>}</>} /></Card></>;
}
function Operations() {
  const { currentUser } = useAuth(); const action = useAction(); const choices = useClinicalChoices();
  const records = useRecords('operations', { doctorId: currentUser.uid });
  const services = Object.entries(choices.department?.services || {}).filter(([, item]) => item.type === 'operation' && item.active);
  return <><Card title="Schedule an operation"><ErrorNotice message={action.error || choices.error || choices.visits.error} />
    <Form busy={action.busy || choices.visits.loading} submitLabel="Schedule operation (no stock deduction yet)" fields={[
      { name: 'visitId', label: 'Active visit', type: 'select', required: true, options: choices.visits.records.filter(item => !item.locked).map(item => ({ value: item.id, label: `${item.patientName} · ${item.id}` })) },
      { name: 'serviceId', label: 'Approved operation service', type: 'select', required: true, options: services.map(([id, item]) => ({ value: id, label: `${item.name} · ${formatMinor(item.priceMinor)}` })) },
      { name: 'staff', label: 'Additional staff IDs, separated by commas', hint: 'Your doctor ID is included automatically.' },
      { name: 'inventory', label: 'Consumables: itemId:quantity, separated by commas', hint: 'Up to five distinct items. Reusable equipment must not be consumed.' },
    ]} onSubmit={values => action.run(() => hospital.scheduleOperation(values.visitId, values.serviceId, [...new Set([currentUser.uid, ...csvValues(values.staff)])],
      csvValues(values.inventory).map(value => { const [itemId, quantity] = value.split(':'); return { itemId, quantity: Number(quantity) }; })), 'Operation scheduled. Complete all safety checks before starting.')} />
    <details className="mt-3 text-sm"><summary>Active department staff IDs</summary>{Object.entries(choices.department?.staffProfiles || {}).filter(([, staff]) => staff.active).map(([id, staff]) => <p key={id} className="break-all">{staff.fullName} · {staff.role} · {id}</p>)}</details>
  </Card><Card title="Your operation records"><RecordTable data={records} columns={[{ label: 'Operation', key: 'operationType' }, { label: 'Patient ID', key: 'patientId' }, { label: 'Status', key: 'status' }, { label: 'Safety checks', render: item => Object.entries(item.checklist).map(([key, checked]) => `${key}: ${checked ? 'confirmed' : 'pending'}`).join(', ') }]}
    actions={record => <>{record.status === 'scheduled' && <>
      {Object.entries(record.checklist).filter(([, checked]) => !checked).map(([key]) => <button key={key} className="button-secondary" disabled={action.busy} onClick={() => {
        if (window.confirm(`Confirm ${key} has actually been verified for this operation?`)) action.run(() => hospital.confirmChecklist(record.id, key), 'Safety confirmation recorded.');
      }}>Confirm {key}</button>)}
      <button className="button" disabled={action.busy || !Object.values(record.checklist).every(Boolean)} onClick={() => action.run(() => hospital.startOperation(record.id), 'Operation started; inventory and billing synchronized.')}>Start operation</button>
      <Form busy={action.busy} submitLabel="Cancel scheduled operation" fields={[{ name: 'reason', label: 'Reason', required: true }]} onSubmit={values => action.run(() => hospital.cancelOperation(record.id, values.reason), 'Scheduled operation cancelled.')} />
    </>}{record.status === 'in-progress' && <Form busy={action.busy} submitLabel="Complete operation" fields={[{ name: 'outcome', label: 'Clinical outcome', type: 'textarea', required: true, maxLength: 6000 }]}
      onSubmit={values => action.run(() => hospital.completeOperation(record.id, values.outcome), 'Outcome saved; operation completed.')} />}</>} /></Card></>;
}
function Ratings() {
  const { currentUser } = useAuth(); const records = useRecords('ratings', { doctorId: currentUser.uid });
  return <Card title="Patient feedback"><RecordTable data={records} columns={[{ label: 'Visit', key: 'visitId' }, { label: 'Rating', key: 'rating' }, { label: 'Review', key: 'review' }, { label: 'Date', render: item => formatDate(item.createdAt) }]} /></Card>;
}
function Profile() {
  const { currentUser, userDetails } = useAuth(); const action = useAction();
  return <><Card title="Your profile"><ErrorNotice message={action.error} /><Form key={userDetails.revision} fields={profileFields} initial={userDetails} busy={action.busy} onSubmit={values => action.run(() => hospital.updateProfile(currentUser.uid, values), 'Profile saved.')} /></Card>
    <Card title="Messaging hours (Pakistan time)"><Form busy={action.busy} submitLabel="Save messaging availability" fields={[
      { name: 'days', label: 'Weekdays: 0 Sunday, 1 Monday … 6 Saturday', required: true, hint: 'Comma-separated numbers.' },
      { name: 'start', label: 'Start time', type: 'time', required: true }, { name: 'end', label: 'End time', type: 'time', required: true },
      { name: 'autoReply', label: 'Automatic availability notice outside hours', type: 'textarea', required: true, maxLength: 500 },
    ]} onSubmit={values => action.run(() => hospital.setMessagingHours({ days: csvValues(values.days).map(Number), start: values.start, end: values.end, autoReply: values.autoReply }), 'Messaging hours saved.')} /></Card>
  </>;
}
function Performance() {
  const action = useAction(); const [report, setReport] = useState(null);
  return <><Card title="Your performance analytics"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Generate performance report" fields={[
    { name: 'start', label: 'Start date', type: 'date', required: true }, { name: 'end', label: 'End date', type: 'date', required: true },
  ]} onSubmit={values => action.run(() => hospital.analytics(values.start, values.end), 'Performance computed from server records.', setReport)} />
    {report?.doctors.map(doctor => <div key={doctor.id} className="mt-4"><p>{doctor.completedVisits} completed visits in the selected period.</p><p>{doctor.lifetimePatients} distinct patients treated across all visits.</p><p>{doctor.count ? `${doctor.rating.toFixed(2)}/5 average from ${doctor.count} ratings.` : 'No ratings in this period.'}</p></div>)}
  </Card><StaffPayroll /></>;
}
function StaffPayroll() {
  const { currentUser } = useAuth(); const records = useRecords('salaryRecords', { userId: currentUser.uid }); const action = useAction();
  return <Card title="Your finalized payroll"><ErrorNotice message={action.error} /><RecordTable data={records} columns={[{ label: 'Period', render: item => `${item.year}-${item.month}` }, { label: 'Net amount', render: item => formatMinor(item.netSalaryMinor) }, { label: 'Status', key: 'status' }]}
    actions={item => item.salaryPdf && <button className="button-secondary" onClick={() => action.run(async () => { await downloadAttachment(item.salaryPdf); return { success: true }; })}>Download salary slip</button>} /></Card>;
}
