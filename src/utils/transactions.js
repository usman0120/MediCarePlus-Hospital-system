import pako from 'pako';

/** Pure workflow calculations. All Firestore I/O belongs in database.js. */
export class WorkflowError extends Error {
  constructor(code, message, fields = {}) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.fields = fields;
  }
}

export const assert = (condition, code, message, fields) => {
  if (!condition) throw new WorkflowError(code, message, fields);
};

export const requireId = (value, field = 'id') => {
  assert(typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value),
    'validation', `${field} is invalid.`, { [field]: 'Invalid document identifier' });
  return value;
};

export const requireText = (value, field, max = 2000, optional = false) => {
  assert(typeof value === 'string' || (optional && value == null), 'validation', `${field} must be text.`);
  const text = (value ?? '').trim();
  assert((optional || text.length > 0) && text.length <= max, 'validation',
    `${field} must contain ${optional ? '0' : '1'}–${max} characters.`, { [field]: 'Invalid length' });
  return text;
};

export const requireNumber = (value, field, min = 0, max = 1_000_000_000, integer = false) => {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max &&
    (!integer || Number.isSafeInteger(value)), 'validation', `${field} is invalid.`, { [field]: 'Invalid number' });
  return value;
};

export const requireDate = (value, field = 'date') => {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'validation', `${field} must be YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00Z`);
  assert(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, 'validation', `${field} is not a valid date.`);
  return value;
};

export const hospitalDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

export const appointmentInstant = (date, time) => {
  requireDate(date);
  assert(typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time), 'validation', 'Time must be HH:mm (00:00–23:59).');
  return new Date(`${date}T${time}:00+05:00`);
};

export const monthDates = (month, year) => {
  requireNumber(month, 'month', 1, 12, true);
  requireNumber(year, 'year', 2000, 2100, true);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return Array.from({ length: days }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);
};

export const moneyToMinor = (amount) => {
  requireNumber(amount, 'amount');
  const minor = Math.round(amount * 100);
  assert(Math.abs(amount * 100 - minor) < 0.00001, 'validation', 'Money must have at most two decimal places.');
  return requireNumber(minor, 'amountMinor', 0, 100_000_000_000, true);
};

export const invoiceTotals = (items, taxBasisPoints = 0) => {
  assert(Array.isArray(items) && items.length > 0 && items.length <= 100, 'validation', 'Invoice requires 1–100 line items.');
  requireNumber(taxBasisPoints, 'taxBasisPoints', 0, 10000, true);
  const ids = new Set();
  let subtotalMinor = 0;
  for (const item of items) {
    requireId(item.id, 'itemId');
    assert(!ids.has(item.id), 'duplicate', 'Duplicate invoice line.');
    ids.add(item.id);
    requireText(item.description, 'description', 200);
    const quantity = requireNumber(item.quantity, 'quantity', 1, 10000, true);
    const unitPriceMinor = requireNumber(item.unitPriceMinor, 'unitPriceMinor', 0, 100_000_000_000, true);
    const amountMinor = quantity * unitPriceMinor;
    requireNumber(amountMinor, 'amountMinor', 0, 100_000_000_000, true);
    assert(item.amountMinor === amountMinor, 'validation', 'Invoice line amount does not match quantity × price.');
    subtotalMinor += amountMinor;
  }
  requireNumber(subtotalMinor, 'subtotalMinor', 0, 100_000_000_000, true);
  const taxMinor = Math.round(subtotalMinor * taxBasisPoints / 10000);
  const totalMinor = requireNumber(subtotalMinor + taxMinor, 'totalMinor', 0, 100_000_000_000, true);
  return { subtotalMinor, taxMinor, totalMinor, taxBasisPoints,
    subtotal: subtotalMinor / 100, tax: taxMinor / 100, total: totalMinor / 100 };
};

export const invoiceLine = (id, description, quantity, unitPriceMinor, sourceType, sourceId) => ({
  id: requireId(id), description: requireText(description, 'description', 200),
  quantity: requireNumber(quantity, 'quantity', 1, 10000, true),
  unitPriceMinor: requireNumber(unitPriceMinor, 'unitPriceMinor', 0, 100_000_000_000, true),
  amountMinor: quantity * unitPriceMinor, sourceType, sourceId: requireId(sourceId),
});

export const validatePayrollPolicy = policy => {
  assert(policy?.divisor === 26 && Number.isSafeInteger(policy.version) && policy.version >= 1, 'policy-required', 'Configure a versioned 26-day payroll policy first.');
  assert(Array.isArray(policy.workingWeekdays) && policy.workingWeekdays.length > 0 &&
    new Set(policy.workingWeekdays).size === policy.workingWeekdays.length &&
    policy.workingWeekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6),
  'policy-required', 'Configure working weekdays (0 = Sunday).');
  assert(typeof policy.paidLeave === 'boolean', 'policy-required', 'Configure whether approved leave is paid.');
  requireNumber(policy.lateDeductionDays, 'lateDeductionDays', 0, 1);
  requireNumber(policy.halfDayDeductionDays, 'halfDayDeductionDays', 0, 1);
  return { divisor: 26, version: policy.version, workingWeekdays: [...policy.workingWeekdays],
    paidLeave: policy.paidLeave, lateDeductionDays: policy.lateDeductionDays, halfDayDeductionDays: policy.halfDayDeductionDays };
};

export const salaryCalculation = (staff, records, month, year) => {
  const dates = monthDates(month, year);
  const policy = validatePayrollPolicy(staff.payrollPolicy);
  requireDate(staff.employmentStartDate, 'employmentStartDate');
  if (staff.employmentEndDate) requireDate(staff.employmentEndDate, 'employmentEndDate');
  assert(!staff.employmentEndDate || staff.employmentEndDate >= staff.employmentStartDate, 'validation', 'Employment dates are reversed.');
  const baseSalaryMinor = requireNumber(staff.baseSalaryMinor, 'baseSalaryMinor', 1, 100_000_000_000, true);
  const eligible = dates.filter(date => policy.workingWeekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()) &&
    date >= staff.employmentStartDate && (!staff.employmentEndDate || date <= staff.employmentEndDate));
  assert(eligible.length > 0, 'validation', 'No eligible workdays in this month.');
  assert(dates.at(-1) < hospitalDate(), 'period-open', 'Payroll can only be finalized after the month ends.');
  const byDate = new Map();
  for (const record of records) {
    assert(!byDate.has(record.date), 'duplicate', 'Duplicate attendance date.');
    byDate.set(record.date, record);
  }
  const missing = eligible.filter(date => !byDate.has(date));
  assert(!missing.length, 'attendance-incomplete', `Attendance is missing for: ${missing.join(', ')}.`, { dates: missing });
  let deductedDays = 0;
  const counts = { present: 0, absent: 0, late: 0, 'half-day': 0, leave: 0 };
  for (const date of eligible) {
    const status = byDate.get(date).status;
    assert(Object.hasOwn(counts, status), 'validation', `Invalid attendance on ${date}.`);
    counts[status]++;
    deductedDays += status === 'absent' ? 1 : status === 'late' ? policy.lateDeductionDays :
      status === 'half-day' ? policy.halfDayDeductionDays : status === 'leave' && !policy.paidLeave ? 1 : 0;
  }
  // Full-month employees receive base salary minus explicit deductions, not days × salary/26.
  const isFullMonth = staff.employmentStartDate <= dates[0] && (!staff.employmentEndDate || staff.employmentEndDate >= dates.at(-1));
  const grossMinor = isFullMonth ? baseSalaryMinor : Math.round(baseSalaryMinor * Math.min(26, eligible.length) / 26);
  const deductionMinor = Math.min(grossMinor, Math.round(baseSalaryMinor * deductedDays / 26));
  return { baseSalaryMinor, grossMinor, deductionMinor, netSalaryMinor: grossMinor - deductionMinor,
    scheduledDays: eligible.length, workingDays: eligible.length - deductedDays, deductedDays,
    presentDays: counts.present, absentDays: counts.absent, lateDays: counts.late, halfDays: counts['half-day'], leaveDays: counts.leave,
    calculatedSalary: (grossMinor - deductionMinor) / 100, baseSalary: baseSalaryMinor / 100,
    perDaySalary: baseSalaryMinor / 2600, policyVersion: policy.version, attendanceDates: eligible };
};

const base64FromBytes = bytes => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
};

export const encodeAttachment = async (file) => {
  assert(file && typeof file.arrayBuffer === 'function', 'validation', 'Select a file.');
  assert(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type), 'validation', 'Only PDF, JPEG, PNG and WebP are allowed.');
  requireNumber(file.size, 'fileSize', 1, 5_000_000, true);
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Validate signatures, not just a caller-supplied MIME type.
  const signature = [...bytes.subarray(0, 12)];
  const valid = file.type === 'application/pdf' ? new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-' :
    file.type === 'image/jpeg' ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255 :
      file.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => signature[i] === byte) :
        new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP';
  assert(valid, 'validation', 'The file content does not match its type.');
  const base64 = base64FromBytes(pako.gzip(bytes));
  assert(base64.length <= 600_000, 'file-too-large', 'Compressed file is too large for Firestore. Reduce the file size first.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return { name: requireText(file.name || 'document', 'fileName', 150), mimeType: file.type,
    encoding: 'gzip-base64', originalBytes: bytes.length, base64,
    sha256: [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('') };
};

export const validateAttachment = attachment => {
  assert(attachment && attachment.encoding === 'gzip-base64', 'validation', 'File encoding is invalid.');
  requireText(attachment.name, 'fileName', 150);
  assert(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(attachment.mimeType), 'validation', 'File type is invalid.');
  requireNumber(attachment.originalBytes, 'originalBytes', 1, 5_000_000, true);
  assert(typeof attachment.base64 === 'string' && attachment.base64.length > 0 && attachment.base64.length <= 600_000 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(attachment.base64), 'validation', 'File data is invalid or too large.');
  assert(/^[a-f0-9]{64}$/.test(attachment.sha256), 'validation', 'File checksum is invalid.');
  assert(Object.keys(attachment).every(key => ['name', 'mimeType', 'encoding', 'originalBytes', 'base64', 'sha256'].includes(key)), 'validation', 'Unexpected file fields.');
  return attachment;
};

export const decodeAttachment = async attachment => {
  validateAttachment(attachment);
  const compressed = Uint8Array.from(atob(attachment.base64), char => char.charCodeAt(0));
  // Bound decompression to prevent a tiny compressed file exhausting memory.
  const inflater = new pako.Inflate({ chunkSize: 16384 });
  const chunks = [];
  let size = 0;
  inflater.onData = chunk => {
    size += chunk.length;
    assert(size <= attachment.originalBytes && size <= 5_000_000, 'file-corrupt', 'File expands beyond its declared size.');
    chunks.push(chunk);
  };
  inflater.push(compressed, true);
  assert(!inflater.err && inflater.ended && size === attachment.originalBytes, 'file-corrupt', 'Compressed file is corrupt.');
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  assert(digest === attachment.sha256, 'file-corrupt', 'File checksum does not match.');
  return new Blob([bytes], { type: attachment.mimeType });
};

// Compatibility entry points; no duplicated transaction or toast logic.
export const processCompletePayment = async (...args) => (await import('../database.js')).processPayment(...args);
export const performOperationWithInventory = async (...args) => (await import('../database.js')).startOperation(...args);
export const transferPatientWithBilling = async (...args) => (await import('../database.js')).hospital.transferBed(...args);
export const processBulkSalary = async (...args) => (await import('../database.js')).hospital.paySalaries(...args);
