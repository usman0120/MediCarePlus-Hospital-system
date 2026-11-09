import { useState } from 'react';
import { hospital } from '../database.js';
import { encodeAttachment } from '../utils/transactions.js';
import { Card, ErrorNotice, Form, RecordTable, Shell, useAction, useRecords } from './Dashboard.jsx';

export default function Lab() {
  const requests = useRecords('labRequests', { status: 'pending' });
  const [selected, setSelected] = useState(null); const [file, setFile] = useState(null); const action = useAction();
  return <Shell title="Laboratory workspace"><Card title="Pending doctor requests"><RecordTable data={requests} columns={[{ label: 'Test', key: 'testName' }, { label: 'Patient ID', key: 'patientId' }, { label: 'Priority', key: 'priority' }]}
    actions={record => <button className="button-secondary" disabled={action.busy} onClick={() => { setSelected(record); setFile(null); }}>Upload result</button>} /></Card>
    <ErrorNotice message={action.error} />{selected && <Card title={`Complete ${selected.testName}`}><Form busy={action.busy} submitLabel="Complete test and notify through live records"
      fields={[{ name: 'summary', label: 'Result summary', type: 'textarea', required: true, maxLength: 4000 }]}
      onSubmit={values => action.run(async () => hospital.completeLabTest(selected.id, await encodeAttachment(file), values.summary), 'Result uploaded for the doctor and patient.', () => setSelected(null))}>
      <label className="block text-sm">PDF/image report<input className="input" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" disabled={action.busy} onChange={event => setFile(event.target.files[0] || null)} /></label>
    </Form><button className="mt-3 button-secondary" disabled={action.busy} onClick={() => setSelected(null)}>Cancel upload</button></Card>}
    <p className="text-sm">Lab staff do not access full EMR or chat with patients. Report completion updates the outstanding-test count atomically.</p>
  </Shell>;
}
