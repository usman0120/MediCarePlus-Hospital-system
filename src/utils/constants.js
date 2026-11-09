export const ROLES = Object.freeze({ PATIENT: 'patient', DOCTOR: 'doctor', RECEPTIONIST: 'receptionist', LAB: 'lab', ADMIN: 'admin' });
export const SCHEMA_VERSION = 2;
export const HOSPITAL_TIME_ZONE = 'Asia/Karachi';
export const COLLECTIONS = Object.freeze([
  'users', 'appointments', 'visits', 'invoices', 'beds', 'inventory', 'labRequests',
  'operations', 'attendance', 'salaryRecords', 'chats', 'messages', 'auditLogs', 'departments', 'ratings',
]);
export const MAX_ATTACHMENT_BASE64_LENGTH = 600_000;
export const MAX_DOCUMENT_BYTES = 900_000;
export const MAX_PRESCRIPTION_MEDICINES = 8;
export const DEFAULT_PAYROLL_POLICY = Object.freeze({ divisor: 26, version: 1,
  workingWeekdays: Object.freeze([1, 2, 3, 4, 5, 6]), paidLeave: true, lateDeductionDays: 0, halfDayDeductionDays: 0.5 });
