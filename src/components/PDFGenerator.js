import logoURL from '../../assets/logo.png';
import { assert } from '../utils/transactions.js';
import { formatDate, formatMinor } from '../utils/helpers.js';

let logoPromise;
const loadLogo = () => {
  if (!logoPromise) logoPromise = fetch(logoURL).then(async response => {
    assert(response.ok, 'pdf-logo', 'Hospital logo could not be loaded. Reconnect and retry.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return `data:image/png;base64,${btoa(binary)}`;
  }).catch(error => { logoPromise = null; throw error; });
  return logoPromise;
};

/** Generate actual PDFs from authorized records; no HTML renderer or invented data. */
export async function generatePDF(type, record) {
  const renderedText = JSON.stringify(record, (key, value) => ['base64', 'sha256'].includes(key) ? undefined : value);
  assert(!/\p{Script=Arabic}|\p{Script=Devanagari}|\p{Script=Han}/u.test(renderedText), 'pdf-font',
    'This record requires a hospital-approved multilingual PDF font. The original data remains intact; an unreadable PDF will not be generated.');
  const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([import('jspdf'), import('jspdf-autotable'), loadLogo()]);
  assert(record?.id, 'pdf-data', 'A saved hospital record is required.');
  const doc = new jsPDF({ compress: true });
  const titles = { prescription: 'Medical prescription', summary: 'Medical visit summary', invoice: 'Patient invoice', salary: 'Salary slip' };
  assert(titles[type], 'pdf-type', 'Unsupported hospital document.');
  doc.setProperties({ title: titles[type], subject: 'Confidential hospital document' });
  const header = () => {
    doc.addImage(logo, 'PNG', 14, 10, 22, 22);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(15, 118, 110);
    doc.text('MediCare Plus', 42, 18);
    doc.setTextColor(30); doc.setFontSize(12); doc.text(titles[type], 42, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(`Record: ${record.id}`, 14, 39);
    doc.line(14, 42, 196, 42);
  };
  header();
  const table = (head, body, startY) => {
    autoTable(doc, { head: [head], body, startY, margin: { top: 48, bottom: 22 },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 118, 110] },
      didDrawPage: () => { if (doc.getNumberOfPages() > 1) header(); } });
    return doc.lastAutoTable.finalY + 7;
  };
  if (type === 'prescription' || type === 'summary') {
    assert(record.patientName && record.doctorName && record.diagnosis, 'pdf-data', 'Patient, doctor and diagnosis must be recorded first.');
    let y = table(['Clinical information', 'Recorded value'], [
      ['Patient', record.patientName], ['Doctor', record.doctorName], ['Visit date', formatDate(record.createdAt)],
      ['Chief complaint', record.chiefComplaint], ['Symptoms', record.symptoms], ['Diagnosis', record.diagnosis],
      ['Blood pressure', record.vitals?.bp || 'Not measured'], ['Blood sugar', record.vitals?.sugar ?? 'Not measured'],
      ['Heart rate', record.vitals?.heartRate ?? 'Not measured'], ['Temperature (°C)', record.vitals?.temperature ?? 'Not measured'],
      ['Follow-up date', record.followUpDate || 'Not specified'],
    ], 48);
    if (record.prescription?.length) y = table(['Medicine', 'Dose', 'Frequency', 'Duration', 'Instructions'],
      record.prescription.map(medicine => [medicine.name, medicine.dose, medicine.frequency, medicine.duration, medicine.instructions || '']), y);
    if (type === 'summary') table(['Visit status', 'Clinical notes'], [[record.status, record.notes || 'Not recorded'], ['Discharge notes', record.dischargeNotes || 'Not recorded']], y);
  } else if (type === 'invoice') {
    assert(Array.isArray(record.items) && Number.isSafeInteger(record.totalMinor), 'pdf-data', 'A valid invoice is required.');
    let y = table(['Invoice information', 'Value'], [['Patient ID', record.patientId], ['Created', formatDate(record.createdAt)],
      ['Status', record.status], ['Paid at', record.paidAt ? formatDate(record.paidAt) : 'Not paid'],
      ['Payment reference', record.payment?.reference || 'Not recorded']], 48);
    y = table(['Description', 'Quantity', 'Unit price (PKR)', 'Amount (PKR)'], record.items.map(item =>
      [item.description, item.quantity, formatMinor(item.unitPriceMinor), formatMinor(item.amountMinor)]), y);
    table(['Subtotal', 'Tax', 'Total'], [[formatMinor(record.subtotalMinor), formatMinor(record.taxMinor), formatMinor(record.totalMinor)]], y);
  } else {
    assert(record.status === 'paid', 'salary-unpaid', 'A final salary slip is generated after actual payout only.');
    table(['Payroll information', 'Value'], [['Staff', record.userName], ['Role', record.userRole], ['Period', `${record.year}-${String(record.month).padStart(2, '0')}`],
      ['Scheduled workdays', record.scheduledDays], ['Absences', record.absentDays], ['Half days', record.halfDays], ['Approved leave days', record.leaveDays],
      ['Base salary', formatMinor(record.baseSalaryMinor)], ['Gross salary', formatMinor(record.grossMinor)], ['Deductions', formatMinor(record.deductionMinor)],
      ['Net paid', formatMinor(record.netSalaryMinor)], ['Paid at', formatDate(record.paidAt)], ['Payment method', record.paymentMethod],
      ['Payment reference', record.paymentReference], ['Payroll policy version', record.policyVersion]], 48);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor(90);
    doc.text('Confidential — intended for the patient or authorized hospital personnel.', 14, 283);
    doc.text(`${page} / ${pages}`, 196, 283, { align: 'right' });
  }
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}
