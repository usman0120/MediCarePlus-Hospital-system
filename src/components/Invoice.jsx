import { useState } from 'react';
import { hospital } from '../database.js';
import { useAuth } from '../context/AuthContext.jsx';
import { encodeAttachment, moneyToMinor } from '../utils/transactions.js';
import { downloadAttachment, downloadBlob, formatMinor } from '../utils/helpers.js';
import { generatePDF } from './PDFGenerator.js';
import { Card, ErrorNotice, Form, useAction } from '../pages/Dashboard.jsx';

export default function Invoice({ invoice, onChange, onClose }) {
  const { userDetails } = useAuth();
  const action = useAction();
  const [file, setFile] = useState(null);
  const staff = ['receptionist', 'admin'].includes(userDetails.role);
  return <Card title={`Invoice ${invoice.id}`}>
    <div className="mb-4 flex flex-wrap gap-3"><span className="font-semibold">{invoice.status} · {formatMinor(invoice.totalMinor)}</span>
      <button className="button-secondary" disabled={action.busy} onClick={() => action.run(async () => {
        downloadBlob(await generatePDF('invoice', invoice), `invoice-${invoice.id}.pdf`); return { success: true };
      })}>Download invoice PDF</button>
      {invoice.paymentProof && <button className="button-secondary" disabled={action.busy} onClick={() => action.run(async () => {
        await downloadAttachment(invoice.paymentProof); return { success: true };
      })}>Download submitted proof</button>}
      {onClose && <button className="ml-auto button-secondary" onClick={onClose}>Close invoice</button>}
    </div>
    <ErrorNotice message={action.error} />
    <div className="mb-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Description</th><th>Quantity</th><th>Amount</th></tr></thead>
      <tbody>{invoice.items.map(item => <tr key={item.id}><td className="py-2">{item.description}</td><td>{item.quantity}</td><td>{formatMinor(item.amountMinor)}</td></tr>)}</tbody></table></div>
    <p className="mb-4 text-sm">Submitting proof is not payment confirmation. Paid invoices are immutable; additional services require a separate approved billing workflow.</p>
    {userDetails.role === 'patient' && invoice.status === 'unpaid' && <Form busy={action.busy} submitLabel="Submit payment proof"
      fields={[{ name: 'reference', label: 'Bank/card payment reference', required: true },
        { name: 'method', label: 'Payment method', type: 'select', options: ['bank_transfer', 'online', 'card'], required: true }]}
      onSubmit={values => action.run(async () => hospital.submitPaymentProof(invoice.id, await encodeAttachment(file), values.reference, values.method), 'Proof submitted for reception review.', onChange)}>
      <label className="block text-sm">Payment proof<input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" disabled={action.busy} onChange={event => setFile(event.target.files[0] || null)} className="input" /></label>
    </Form>}
    {staff && invoice.status === 'pending_confirmation' && <div className="space-y-4">
      <button className="button" disabled={action.busy} onClick={() => {
        if (window.confirm('Confirm that the exact invoice amount has actually been received?')) action.run(() => hospital.confirmPayment(invoice.id), 'Payment confirmed; invoice locked and revenue updated.', onChange);
      }}>Confirm received payment</button>
      <Form busy={action.busy} submitLabel="Reject proof" fields={[{ name: 'reason', label: 'Rejection reason', required: true }]}
        onSubmit={values => action.run(() => hospital.rejectPayment(invoice.id, values.reason), 'Proof rejected. The patient may resubmit.', onChange)} />
    </div>}
    {staff && invoice.status === 'unpaid' && <Form busy={action.busy} submitLabel="Confirm actual cash receipt"
      fields={[{ name: 'amount', label: 'Cash received (PKR)', type: 'number', min: 0, step: '0.01', required: true }, { name: 'reference', label: 'Counter receipt reference', required: true }]}
      onSubmit={values => {
        if (window.confirm('Record cash physically received at the counter?')) action.run(() => hospital.confirmPayment(invoice.id, {
          method: 'cash', amountMinor: moneyToMinor(Number(values.amount)), reference: values.reference,
        }), 'Cash receipt recorded; invoice locked.', onChange);
      }} />}
  </Card>;
}
