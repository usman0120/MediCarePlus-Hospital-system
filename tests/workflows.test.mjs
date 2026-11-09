import test from 'node:test';
import { strict as assert } from 'node:assert';
import {
  moneyToMinor, invoiceLine, invoiceTotals, monthDates, requireDate, appointmentInstant,
  salaryCalculation, encodeAttachment, decodeAttachment,
} from '../src/utils/transactions.js';
import { validateInventory, validateRecordedVitals, validateAppointment, normalizePhone } from '../src/utils/validators.js';

test('PKR uses integer paisa and rejects invalid money', () => {
  assert.equal(moneyToMinor(123.45), 12345);
  assert.equal(moneyToMinor(0), 0);
  for (const amount of [-1, NaN, Infinity, 0.001, '10']) assert.throws(() => moneyToMinor(amount));
});
test('invoice totals validate every line, uniqueness and overflow', () => {
  const lines = [invoiceLine('a', 'Consultation', 1, 300000, 'consultation', 'visit1'), invoiceLine('b', 'Lab', 2, 100000, 'lab', 'lab1')];
  assert.equal(invoiceTotals(lines).totalMinor, 500000);
  assert.equal(invoiceTotals(lines, 500).taxMinor, 25000);
  assert.throws(() => invoiceTotals([lines[0], lines[0]]));
  assert.throws(() => invoiceTotals([{ ...lines[0], amountMinor: 1 }]));
  assert.throws(() => invoiceTotals([]));
});
test('calendar validates leap years, invalid dates and Pakistan appointment timezone', () => {
  assert.equal(monthDates(2, 2024).length, 29);
  assert.equal(monthDates(2, 2025).length, 28);
  assert.equal(monthDates(4, 2025).at(-1), '2025-04-30');
  assert.throws(() => requireDate('2025-02-29'));
  assert.throws(() => requireDate('2025-13-01'));
  assert.throws(() => appointmentInstant('2025-04-01', '24:00'));
  assert.equal(appointmentInstant('2025-04-01', '09:30').toISOString(), '2025-04-01T04:30:00.000Z');
});
const staff = {
  baseSalaryMinor: 2600000, employmentStartDate: '2020-01-01', employmentEndDate: null,
  payrollPolicy: { divisor: 26, version: 1, workingWeekdays: [1, 2, 3, 4, 5, 6], paidLeave: true, lateDeductionDays: 0, halfDayDeductionDays: 0.5 },
};
const attendance = () => monthDates(1, 2025).filter(date => new Date(`${date}T00:00:00Z`).getUTCDay() !== 0).map(date => ({ date, status: 'present' }));
test('fixed-26 payroll pays full base salary instead of overpaying a 27-day month', () => {
  assert.equal(attendance().length, 27);
  assert.equal(salaryCalculation(staff, attendance(), 1, 2025).netSalaryMinor, 2600000);
});
test('payroll deducts only explicitly configured absences/half days and paid leave', () => {
  const records = attendance(); records[0].status = 'absent'; records[1].status = 'half-day'; records[2].status = 'leave'; records[3].status = 'late';
  const calculation = salaryCalculation(staff, records, 1, 2025);
  assert.equal(calculation.deductionMinor, 150000);
  assert.equal(calculation.netSalaryMinor, 2450000);
});
test('payroll refuses missing attendance, duplicate dates and an unspecified policy', () => {
  assert.throws(() => salaryCalculation(staff, attendance().slice(1), 1, 2025), /missing/);
  assert.throws(() => salaryCalculation(staff, [...attendance(), attendance()[0]], 1, 2025), /Duplicate/);
  assert.throws(() => salaryCalculation({ ...staff, payrollPolicy: null }, attendance(), 1, 2025), /policy/);
});
test('files round trip with compression and checksum verification', async () => {
  // Synthetic test fixture only; never seeded into the application/database.
  const source = new File(['%PDF-1.4\nHospital test fixture'], 'report.pdf', { type: 'application/pdf' });
  const attachment = await encodeAttachment(source);
  assert.equal(await (await decodeAttachment(attachment)).text(), await source.text());
  await assert.rejects(decodeAttachment({ ...attachment, sha256: '0'.repeat(64) }), /checksum/);
  await assert.rejects(decodeAttachment({ ...attachment, originalBytes: 1 }), /declared size/);
  await assert.rejects(encodeAttachment(new File(['not a PDF'], 'report.pdf', { type: 'application/pdf' })), /content/);
});
test('form validation accepts zero stock and rejects NaN, fractional stock and invalid dates', () => {
  const inventory = { name: 'Gauze', category: 'supply', unit: 'pack', quantity: 0, threshold: 0, price: 0 };
  assert.equal(validateInventory(inventory).isValid, true);
  assert.equal(validateInventory({ ...inventory, quantity: 'invalid' }).isValid, false);
  assert.equal(validateInventory({ ...inventory, quantity: 0.5 }).isValid, false);
  assert.equal(validateRecordedVitals({ heartRate: 0 }).isValid, true);
  assert.equal(validateRecordedVitals({ sugar: 'invalid' }).isValid, false);
  assert.equal(validateAppointment({ doctorId: 'doctor', department: 'cardiology', date: '2027-02-30', time: '09:00', reason: 'Review' }).isValid, false);
  assert.equal(normalizePhone('0300 1234567'), '+923001234567');
});
