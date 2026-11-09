import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { hospital } from '../database.js';
import { createStaffUser } from '../auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { encodeAttachment } from '../utils/transactions.js';
import { csvValues, downloadAttachment, downloadBlob, downloadJSON, formatDate, formatMinor } from '../utils/helpers.js';
import { DEFAULT_PAYROLL_POLICY } from '../utils/constants.js';
import { generatePDF } from '../components/PDFGenerator.js';
import BedGrid from '../components/BedGrid.jsx';
import { Card, ErrorNotice, Form, RecordTable, Shell, Tabs, useAction, useRecords } from './Dashboard.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);
export default function Admin() {
  const [tab, setTab] = useState('Analytics');
  return <Shell title="Hospital administration"><Tabs tabs={['Analytics', 'Staff', 'Departments', 'Inventory', 'Beds', 'Payroll', 'Medical unlock', 'Audit & exports']} selected={tab} onChange={setTab} />
    {tab === 'Analytics' && <Analytics />}{tab === 'Staff' && <Staff />}{tab === 'Departments' && <Departments />}{tab === 'Inventory' && <Inventory />}
    {tab === 'Beds' && <Beds />}{tab === 'Payroll' && <Payroll />}{tab === 'Medical unlock' && <MedicalUnlock />}{tab === 'Audit & exports' && <AuditExports />}
  </Shell>;
}
function Analytics() {
  const action = useAction(); const [report, setReport] = useState(null); const [alerts, setAlerts] = useState(null); const [alertError, setAlertError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const result = await hospital.alertMetrics();
      if (active) { if (result.success) { setAlerts(result.data); setAlertError(''); } else setAlertError(result.error); }
    };
    refresh(); const timer = window.setInterval(refresh, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <><Card title="Foreground automation alerts"><ErrorNotice message={alertError} />
    <p className="text-xs mb-3">Monitored while this page is open; no unattended Cloud Function or fake scheduled job runs.</p>
    {alerts && <><p>Bed occupancy: {alerts.occupancy == null ? 'No usable beds' : `${alerts.occupancy.toFixed(1)}%`} · Pending lab tests: {alerts.pendingLabs} · Today's emergency assessments: {alerts.emergencies}</p>
      <ul className="mt-3 space-y-2">{alerts.alerts.map(alert => <li key={alert} role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-950">{alert}</li>)}</ul>
      {!alerts.configured && <p className="mt-2 text-sm">Configure laboratory/emergency thresholds below to enable those workload alerts.</p>}
    </>}
    <Form busy={action.busy} submitLabel="Save hospital alert thresholds" fields={[{ name: 'labCapacity', label: 'Pending lab request alert threshold', type: 'number', min: 1, step: 1, required: true }, { name: 'emergencyThreshold', label: 'Daily emergency assessment alert threshold', type: 'number', min: 1, step: 1, required: true }]}
      onSubmit={values => action.run(() => hospital.configureAlerts({ labCapacity: Number(values.labCapacity), emergencyThreshold: Number(values.emergencyThreshold) }), 'Alert policy saved.')} />
  </Card><Card title="Financial and clinical analytics"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Generate verified aggregate report" fields={[
    { name: 'start', label: 'Start date', type: 'date', required: true }, { name: 'end', label: 'End date', type: 'date', required: true },
  ]} onSubmit={values => action.run(() => hospital.analytics(values.start, values.end), 'Report generated from server aggregates.', setReport)} />
    {report && <div className="mt-5 space-y-5"><p className="font-semibold">Confirmed revenue: {formatMinor(report.revenueMinor)} · Completed visits: {report.completedVisits} · Inventory acquisition value: {formatMinor(report.inventoryCostMinor)}</p>
      <p>{report.revenueChangePercent == null ? 'No previous-period revenue baseline.' : `Revenue change versus preceding period: ${report.revenueChangePercent.toFixed(1)}%.`}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Line data={{ labels: report.months.map(item => item.label), datasets: [{ label: 'Confirmed revenue (PKR)', data: report.months.map(item => item.revenueMinor / 100), borderColor: '#0f766e' }] }} options={{ responsive: true }} />
        <Bar data={{ labels: report.departments.map(item => item.name), datasets: [{ label: 'Department revenue (PKR)', data: report.departments.map(item => item.revenueMinor / 100), backgroundColor: '#2563eb' }] }} options={{ responsive: true }} />
        <Bar data={{ labels: report.months.map(item => item.label), datasets: [{ label: 'Inventory acquisition value (PKR, not bank settlement)', data: report.months.map(item => item.inventoryCostMinor / 100), backgroundColor: '#7c3aed' }] }} options={{ responsive: true }} />
        <Bar data={{ labels: report.emergencyHours.map(item => `${item.hour}:00`), datasets: [{ label: 'Emergency assessments', data: report.emergencyHours.map(item => item.count), backgroundColor: '#dc2626' }] }} options={{ responsive: true }} />
      </div>
      <p>{report.highestRated ? `Highest average rating: ${report.highestRated.name} (${report.highestRated.rating.toFixed(2)}/5 from ${report.highestRated.count} ratings).` : 'No doctor ratings in this period.'}</p>
      <ul className="text-sm">{report.doctors.map(doctor => <li key={doctor.id}>{doctor.name}: {doctor.completedVisits} completed visits · {doctor.rating == null ? 'No ratings' : `${doctor.rating.toFixed(2)}/5`}</li>)}</ul>
      <button className="button-secondary" onClick={() => downloadJSON(report, `analytics-${report.start}-${report.end}.json`)}>Download aggregate report</button>
    </div>}
  </Card></>;
}
function Staff() {
  const { currentUser } = useAuth(); const action = useAction(); const [role, setRole] = useState('doctor'); const records = useRecords('users', { role });
  const [editing, setEditing] = useState(null);
  return <><Card title="Create verified-email staff account"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Create staff and send setup emails" fields={[
    { name: 'fullName', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Pakistan mobile', required: true, pattern: '[+]923[0-9]{9}' },
    { name: 'role', label: 'Role', type: 'select', required: true, options: ['doctor', 'receptionist', 'lab'] }, { name: 'departmentId', label: 'Active department ID', required: true },
    { name: 'employmentStartDate', label: 'Employment start date', type: 'date', required: true }, { name: 'baseSalary', label: 'Base monthly salary (PKR)', type: 'number', min: 0, step: '0.01', required: true },
    { name: 'specialization', label: 'Doctor specialization (required for doctor)' }, { name: 'licenseNumber', label: 'Doctor medical license (required for doctor)' },
      { name: 'consultationFee', label: 'Doctor consultation fee (PKR)', type: 'number', min: 0, step: '0.01' },
  ]} onSubmit={values => action.run(() => {
    if (values.role === 'doctor' && values.consultationFee === '') throw new Error('Enter the doctor consultation fee explicitly. Zero is allowed only when intentionally entered.');
    return createStaffUser({ ...values, baseSalary: Number(values.baseSalary), consultationFee: Number(values.consultationFee) }, currentUser.uid);
  }, 'Staff record created. Review email delivery status.', (profile, result) => {
    if (result.emailsSent === false) throw new Error(`Account ${profile.id} exists, but setup email delivery needs a retry. Do not create it again.`);
  })} />
    <p className="mt-3 text-xs">No administrator or accountant can register here. Doctor booking stays unavailable until an actual schedule is configured.</p>
  </Card><Card title="Staff status"><select className="input mb-3" value={role} onChange={event => setRole(event.target.value)}>{['doctor', 'receptionist', 'lab'].map(value => <option key={value}>{value}</option>)}</select>
    <RecordTable data={records} columns={[{ label: 'Staff ID', key: 'id' }, { label: 'Name', key: 'fullName' }, { label: 'Status', key: 'accountStatus' }, { label: 'Department ID', key: 'departmentId' }]}
      actions={record => <><button className="button-secondary" onClick={() => setEditing(record)}>Edit staff</button><Form busy={action.busy} submitLabel={record.accountStatus === 'active' ? 'Disable access' : 'Enable access'} fields={[{ name: 'reason', label: 'Status-change reason', required: true }]}
        onSubmit={values => action.run(() => hospital.setStaffStatus(record.id, record.accountStatus === 'active' ? 'disabled' : 'active', values.reason), 'Staff access and department roster updated.')} /></>} /></Card>
    {editing && <Card title={`Edit ${editing.fullName}`}><Form key={editing.id} initial={editing} busy={action.busy} fields={[{ name: 'fullName', label: 'Full name', required: true }, { name: 'phone', label: 'Mobile number' },
      { name: 'specialization', label: 'Doctor specialization', required: editing.role === 'doctor' }, { name: 'licenseNumber', label: 'Medical license', required: editing.role === 'doctor' }, { name: 'employmentStartDate', label: 'Employment start', type: 'date', required: true }, { name: 'employmentEndDate', label: 'Employment end (optional)', type: 'date' }]}
      onSubmit={values => action.run(() => hospital.editStaff(editing.id, values), 'Staff details and roster synchronized.', () => setEditing(null))} /><button className="mt-3 button-secondary" onClick={() => setEditing(null)}>Cancel edit</button></Card>}
  </>;
}
function Departments() {
  const records = useRecords('departments', { kind: 'department' }); const action = useAction();
  const [editing, setEditing] = useState(null);
  return <><Card title="Department administration"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Create department" fields={[{ name: 'id', label: 'Stable department ID', required: true }, { name: 'name', label: 'Department name', required: true }, { name: 'emergencyEnabled', label: 'Emergency triage enabled', type: 'select', required: true, options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] }]}
    onSubmit={values => action.run(() => hospital.createDepartment({ ...values, emergencyEnabled: values.emergencyEnabled === 'true' }), 'Department created without invented services/prices.')} />
    <Form busy={action.busy} submitLabel="Configure service pricing" fields={[{ name: 'departmentId', label: 'Department ID', required: true }, { name: 'serviceId', label: 'Stable service ID', required: true }, { name: 'name', label: 'Service name', required: true },
      { name: 'type', label: 'Service type', type: 'select', required: true, options: ['consultation', 'lab', 'operation'] }, { name: 'price', label: 'Price (PKR)', type: 'number', min: 0, step: '0.01', required: true }]}
      onSubmit={values => action.run(() => hospital.configureService(values.departmentId, values.serviceId, { ...values, price: Number(values.price) }), 'Department service updated.')} />
    <Form busy={action.busy} submitLabel="Configure doctor schedule / head doctor" fields={[{ name: 'departmentId', label: 'Department ID', required: true }, { name: 'doctorId', label: 'Assigned doctor ID', required: true }, { name: 'weekdays', label: 'Working weekdays: 0 Sunday … 6 Saturday (commas)', required: true },
      { name: 'times', label: 'Actual available slots HH:mm (commas)', required: true }, { name: 'closedDates', label: 'Closed dates YYYY-MM-DD (optional, commas)' }, { name: 'consultationFee', label: 'Consultation fee (PKR)', type: 'number', min: 0, step: '0.01', required: true },
      { name: 'head', label: 'Set as department head', type: 'select', options: [{ value: 'false', label: 'No change' }, { value: 'true', label: 'Yes' }] }]}
      onSubmit={values => action.run(() => hospital.configureDoctor(values.departmentId, values.doctorId, { consultationFee: Number(values.consultationFee), isHeadDoctor: values.head === 'true', schedule: { weekdays: csvValues(values.weekdays).map(Number), times: csvValues(values.times), closedDates: csvValues(values.closedDates) } }), 'Doctor schedule saved.')} />
  </Card><Card title="Configured departments"><RecordTable data={records} columns={[{ label: 'ID', key: 'id' }, { label: 'Name', key: 'name' }, { label: 'Head doctor ID', key: 'headDoctorId' }, { label: 'Collected revenue', render: record => formatMinor(record.revenueMinor) }]}
    actions={record => <button className="button-secondary" onClick={() => setEditing(record)}>Edit department</button>} /></Card>
    {editing && <Card title="Edit department"><Form key={editing.id} busy={action.busy} initial={{ ...editing, active: String(editing.active), emergencyEnabled: String(editing.emergencyEnabled) }} fields={[{ name: 'name', label: 'Name', required: true },
      { name: 'active', label: 'Open for new booking', type: 'select', required: true, options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }, { name: 'emergencyEnabled', label: 'Triage enabled', type: 'select', required: true, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }]}
      onSubmit={values => action.run(() => hospital.editDepartment(editing.id, { name: values.name, active: values.active === 'true', emergencyEnabled: values.emergencyEnabled === 'true' }), 'Department updated; historical invoices remain unchanged.', () => setEditing(null))} /></Card>}
  </>;
}
function Inventory() {
  const records = useRecords('inventory'); const action = useAction();
  const [editing, setEditing] = useState(null);
  return <><Card title="Inventory configuration"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Create real inventory item" fields={[
    { name: 'id', label: 'Item ID', required: true }, { name: 'name', label: 'Item name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: ['medicine', 'equipment', 'supply', 'surgical', 'lab', 'ppe'] },
    { name: 'unit', label: 'Unit', required: true }, { name: 'quantity', label: 'Opening quantity', type: 'number', min: 0, step: 1, required: true }, { name: 'threshold', label: 'Low-stock threshold', type: 'number', min: 0, step: 1, required: true }, { name: 'price', label: 'Unit price (PKR)', type: 'number', min: 0, step: '0.01', required: true },
  ]} onSubmit={values => action.run(() => hospital.createInventory({ ...values, quantity: Number(values.quantity), threshold: Number(values.threshold), price: Number(values.price) }), 'Inventory opening balance recorded.')} /></Card>
    <Card title="Stock and usage"><RecordTable data={records} columns={[{ label: 'Item ID', key: 'id' }, { label: 'Name', key: 'name' }, { label: 'Quantity', key: 'quantity' }, { label: 'Consumed', key: 'usedQuantity' }, { label: 'Low stock', render: record => record.lowStock ? 'Alert' : 'No' }]}
      actions={record => <><button className="button-secondary" onClick={() => setEditing(record)}>Edit pricing / threshold</button><Form busy={action.busy} submitLabel="Record restock" fields={[{ name: 'quantity', label: 'Received quantity', type: 'number', min: 1, step: 1, required: true }, { name: 'reason', label: 'Purchase/reference', required: true }]}
        onSubmit={values => action.run(() => hospital.restockInventory(record.id, Number(values.quantity), values.reason), 'Stock and acquisition journal updated.')} /></>} /></Card>
    {editing && <Card title="Edit inventory settings"><Form key={editing.id} initial={editing} busy={action.busy} fields={[{ name: 'name', label: 'Item name', required: true }, { name: 'threshold', label: 'Threshold', type: 'number', min: 0, step: 1, required: true }, { name: 'price', label: 'Current unit price (PKR)', type: 'number', min: 0, step: '0.01', required: true }]}
      onSubmit={values => action.run(() => hospital.editInventory(editing.id, { name: values.name, threshold: Number(values.threshold), price: Number(values.price) }), 'Future pricing updated without changing historical consumption.', () => setEditing(null))} /></Card>}
  </>;
}
function Beds() {
  const action = useAction(); const [beds, setBeds] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; hospital.collectRecords('beds').then(result => { if (active) { if (result.success) setBeds(result.data); else setError(result.error); setLoading(false); } }); return () => { active = false; }; }, []);
  return <><Card title="Configure a bed"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Create available bed" fields={[{ name: 'id', label: 'Bed ID', required: true }, { name: 'label', label: 'Bed label', required: true }, { name: 'type', label: 'Type', type: 'select', required: true, options: ['General', 'ICU', 'Emergency', 'Isolation', 'CCU', 'NICU', 'PICU'] }, { name: 'dailyRate', label: 'Daily rate (PKR)', type: 'number', min: 0, step: '0.01', required: true }]}
    onSubmit={values => action.run(() => hospital.createBed({ ...values, dailyRate: Number(values.dailyRate) }), 'Bed configured.', async () => { const result = await hospital.collectRecords('beds'); if (result.success) setBeds(result.data); })} /></Card>
    <BedGrid beds={beds} loading={loading} error={error} /></>;
}
function Payroll() {
  const records = useRecords('salaryRecords'); const action = useAction();
  return <><Card title="Attendance-based salary processing"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Configure approved payroll policy" fields={[{ name: 'userId', label: 'Staff ID', required: true }, { name: 'baseSalary', label: 'Monthly base salary (PKR)', type: 'number', min: 0, step: '0.01', required: true }]}
    onSubmit={values => action.run(() => hospital.configurePayroll(values.userId, { baseSalary: Number(values.baseSalary), policy: DEFAULT_PAYROLL_POLICY }), 'Approved Mon–Sat/paid-leave payroll policy configured.')} />
    <Form busy={action.busy} submitLabel="Finalize one employee's monthly payroll" fields={[{ name: 'userId', label: 'Staff ID', required: true }, { name: 'month', label: 'Month (1–12)', type: 'number', min: 1, max: 12, step: 1, required: true }, { name: 'year', label: 'Year', type: 'number', min: 2000, max: 2100, step: 1, required: true }]}
      onSubmit={values => action.run(() => hospital.calculateSalary(values.userId, Number(values.month), Number(values.year)), 'Payroll finalized; monthly attendance frozen.')} />
    <Form busy={action.busy} submitLabel="Record actual payout (up to eight salaries atomically)" fields={[{ name: 'salaryIds', label: 'Salary record IDs (commas)', required: true }, { name: 'method', label: 'Actual payment method', type: 'select', required: true, options: ['cash', 'bank_transfer'] }, { name: 'reference', label: 'Payment reference', required: true }]}
      onSubmit={values => { if (window.confirm('Confirm these salary amounts have actually been paid?')) action.run(() => hospital.paySalaries(csvValues(values.salaryIds), values), 'Salary payout recorded.'); }} />
  </Card><Card title="Salary records"><RecordTable data={records} columns={[{ label: 'Salary ID', key: 'id' }, { label: 'Staff', key: 'userName' }, { label: 'Net amount', render: row => formatMinor(row.netSalaryMinor) }, { label: 'Status', key: 'status' }]}
    actions={record => record.status === 'paid' && <button className="button-secondary" disabled={action.busy} onClick={() => action.run(async () => {
      if (record.salaryPdf) { await downloadAttachment(record.salaryPdf); return { success: true }; }
      const pdf = await generatePDF('salary', record); const attachment = await encodeAttachment(new File([pdf], `salary-${record.id}.pdf`, { type: 'application/pdf' }));
      const result = await hospital.saveSalaryPdf(record.id, attachment); if (result.success) downloadBlob(pdf, attachment.name); return result;
    }, 'Paid salary slip available.')}>Salary PDF</button>} /></Card></>;
}
function MedicalUnlock() {
  const action = useAction();
  return <Card title="Authorize a medical-record amendment"><ErrorNotice message={action.error} /><Form busy={action.busy} submitLabel="Unlock discharged visit with audit trail" fields={[{ name: 'visitId', label: 'Locked visit ID', required: true }, { name: 'reason', label: 'Authorization reason', type: 'textarea', required: true }]}
    onSubmit={values => { if (window.confirm('Authorize the assigned doctor to amend this discharged record?')) action.run(() => hospital.unlockVisit(values.visitId, values.reason), 'Record unlocked for an audited amendment.'); }} />
  </Card>;
}
function AuditExports() {
  const logs = useRecords('auditLogs'); const action = useAction();
  return <><Card title="Immutable application audit entries"><RecordTable data={logs} columns={[{ label: 'Time', render: row => formatDate(row.timestamp) }, { label: 'Actor', key: 'actorId' }, { label: 'Action', key: 'action' }, { label: 'Target', key: 'targetId' }, { label: 'Details', render: row => JSON.stringify(row.details) }]} /></Card>
    <Card title="Authorized data export"><ErrorNotice message={action.error} /><p className="mb-3 text-sm">Browser exports are not atomic point-in-time backups. Chat/messages are deliberately excluded because only participants can read them. Use the protected owner maintenance tool for an offline disaster-recovery backup.</p>
      <button className="button" disabled={action.busy} onClick={() => { if (window.confirm('Export sensitive hospital records to this device? Store the result securely.')) action.run(async () => {
        const result = await hospital.exportData(); if (result.success) downloadJSON(result.data, `medicare-export-${Date.now()}.json`); return result;
      }, 'Authorized data export completed and audited.'); }}>Export non-chat hospital data</button>
    </Card>
  </>;
}
