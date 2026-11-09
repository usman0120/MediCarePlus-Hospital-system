import { appointmentInstant, hospitalDate, requireDate } from './transactions.js';
import { MAX_PRESCRIPTION_MEDICINES } from './constants.js';

const checked = errors => ({ isValid: Object.keys(errors).length === 0, errors });
const hasText = (value, max = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const optionalText = (value, max) => value == null || value === '' || typeof value === 'string' && value.length <= max;
const numeric = (value, min, max, integer = false) => {
  if (value == null || value === '' || typeof value === 'boolean') return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max && (!integer || Number.isSafeInteger(number));
};
export const normalizePhone = value => {
  const digits = String(value ?? '').replace(/[\s()-]/g, '').replace(/^\+/, '').replace(/^0(?=3)/, '92');
  return /^923\d{9}$/.test(digits) ? `+${digits}` : null;
};
export const validateProfile = data => {
  const errors = {};
  if (!hasText(data?.fullName, 100)) errors.fullName = 'Full name is required (at most 100 characters).';
  if (!normalizePhone(data?.phone)) errors.phone = 'Enter a valid Pakistan mobile number.';
  if (data?.email && (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) errors.email = 'Enter a valid email address.';
  if (data?.emergencyContact && !normalizePhone(data.emergencyContact)) errors.emergencyContact = 'Enter a valid Pakistan emergency contact.';
  if (data?.cnic && !/^\d{5}-\d{7}-\d$/.test(data.cnic)) errors.cnic = 'Use CNIC format 12345-1234567-1.';
  if (data?.bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(data.bloodGroup)) errors.bloodGroup = 'Select a valid blood group.';
  if (data?.gender && !['male', 'female', 'other'].includes(data.gender)) errors.gender = 'Select a valid gender.';
  if (!optionalText(data?.address, 500)) errors.address = 'Address must contain at most 500 characters.';
  if (data?.dateOfBirth) {
    try {
      requireDate(data.dateOfBirth);
      if (data.dateOfBirth > hospitalDate()) errors.dateOfBirth = 'Date of birth cannot be in the future.';
    } catch { errors.dateOfBirth = 'Enter a real calendar date.'; }
  }
  return checked(errors);
};
export const validateRegistration = (data, role = 'patient') => {
  const errors = { ...validateProfile(data).errors };
  if (!['patient', 'doctor', 'receptionist', 'lab'].includes(role)) errors.role = 'Administrator registration is not available.';
  if (!data?.email) errors.email = 'Email is required.';
  if (typeof data?.password !== 'string' || data.password.length < 12 || data.password.length > 128) errors.password = 'Use a password containing 12–128 characters.';
  if (data?.password !== data?.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (role === 'patient') {
    if (!data?.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.';
    if (!data?.gender) errors.gender = 'Gender is required.';
    // Children and emergency walk-ins may not have a CNIC or emergency contact.
  } else {
    if (!data?.departmentId && !data?.department) errors.department = 'Select an active department.';
    if (role === 'doctor') {
      if (!hasText(data?.licenseNumber, 100)) errors.licenseNumber = 'Medical license number is required.';
      if (!hasText(data?.specialization, 150)) errors.specialization = 'Specialization is required.';
      if (!numeric(data?.consultationFee, 0, 1_000_000_000)) errors.consultationFee = 'Enter a nonnegative consultation fee.';
    }
  }
  return checked(errors);
};
export const validateAppointment = data => {
  const errors = {};
  if (!data?.departmentId && !data?.department) errors.department = 'Select a department.';
  if (!data?.doctorId) errors.doctorId = 'Select a doctor.';
  try {
    const instant = appointmentInstant(data?.date, data?.time);
    if (instant <= new Date()) errors.date = 'Choose a future slot in Pakistan time.';
  } catch {
    if (!data?.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.date = 'Enter a valid appointment date.';
    else {
      try { requireDate(data.date); } catch { errors.date = 'Enter a real calendar date.'; }
    }
    if (!data?.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) errors.time = 'Choose a valid HH:mm time (not 24:00).';
  }
  if (!hasText(data?.reason)) errors.reason = 'Reason is required (at most 2,000 characters).';
  return checked(errors);
};
export const validateRecordedVitals = (vitals = {}) => {
  const errors = {};
  if (vitals.bp) {
    const match = typeof vitals.bp === 'string' && vitals.bp.match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!match || !numeric(match[1], 40, 300) || !numeric(match[2], 20, 200) || Number(match[1]) <= Number(match[2])) errors.bp = 'Record BP as systolic/diastolic, within supported recording limits.';
  }
  // Abnormal clinical values are not the same as invalid input. These broad
  // bounds permit recording critical conditions; they are not diagnostic advice.
  for (const [key, max] of [['sugar', 1500], ['heartRate', 350], ['temperature', 50]]) {
    const value = vitals[key] ?? (key === 'temperature' ? vitals.temp : null);
    if (value != null && value !== '' && !numeric(value, 0, max)) errors[key] = `Enter a finite number from 0 to ${max}.`;
  }
  return checked(errors);
};
export const validatePrescription = data => {
  const errors = {};
  const medicines = data?.medicines || data?.prescription;
  if (!Array.isArray(medicines) || !medicines.length || medicines.length > MAX_PRESCRIPTION_MEDICINES) errors.medicines = `Select 1–${MAX_PRESCRIPTION_MEDICINES} medicines.`;
  else {
    const entries = {};
    medicines.forEach((medicine, index) => {
      const fields = {};
      for (const [key, max] of [['name', 150], ['dose', 100], ['frequency', 100], ['duration', 100]]) {
        if (!hasText(medicine?.[key], max)) fields[key] = `${key} is required (at most ${max} characters).`;
      }
      if (!optionalText(medicine?.instructions, 500)) fields.instructions = 'Instructions must contain at most 500 characters.';
      if (Object.keys(fields).length) entries[index] = fields;
    });
    if (Object.keys(entries).length) errors.medicines = entries;
  }
  return checked(errors);
};
export const validateEMR = data => {
  const errors = {};
  for (const [key, max] of [['chiefComplaint', 2000], ['symptoms', 4000], ['diagnosis', 4000]]) {
    if (!hasText(data?.[key], max)) errors[key] = `${key} is required (at most ${max} characters).`;
  }
  const vitals = validateRecordedVitals(data?.vitals);
  if (!vitals.isValid) errors.vitals = vitals.errors;
  if (!optionalText(data?.notes, 6000)) errors.notes = 'Notes must contain at most 6,000 characters.';
  if (data?.followUpDate) {
    try { requireDate(data.followUpDate); if (data.followUpDate < hospitalDate()) errors.followUpDate = 'Follow-up cannot be in the past.'; }
    catch { errors.followUpDate = 'Enter a valid follow-up date.'; }
  }
  if (data?.prescription?.length) {
    const prescription = validatePrescription({ prescription: data.prescription });
    if (!prescription.isValid) errors.prescription = prescription.errors;
  }
  return checked(errors);
};
export const validateBedAssignment = data => {
  const errors = {};
  if (!data?.bedId) errors.bedId = 'Select an available bed.';
  if (!data?.patientId) errors.patientId = 'Select a patient with an active visit.';
  return checked(errors);
};
export const validateOperation = data => {
  const errors = {};
  for (const key of ['patientId', 'doctorId', 'visitId']) if (!data?.[key]) errors[key] = `${key} is required.`;
  if (!data?.serviceId && !data?.operationType) errors.operationType = 'Select an approved operation service.';
  if (!Array.isArray(data?.requiredStaff) || !data.requiredStaff.length || data.requiredStaff.length > 5) errors.requiredStaff = 'Select 1–5 assigned staff.';
  if (data?.inventoryUsage && (!Array.isArray(data.inventoryUsage) || data.inventoryUsage.length > 5)) errors.inventoryUsage = 'At most five distinct consumable lines per atomic operation.';
  return checked(errors);
};
export const validateInventory = data => {
  const errors = {};
  if (!hasText(data?.name, 150)) errors.name = 'Name is required (at most 150 characters).';
  if (!['medicine', 'equipment', 'supply', 'surgical', 'lab', 'ppe'].includes(data?.category)) errors.category = 'Select a valid category.';
  if (!hasText(data?.unit, 50)) errors.unit = 'Unit is required.';
  for (const key of ['quantity', 'threshold']) if (!numeric(data?.[key], 0, 1_000_000_000, true)) errors[key] = 'Enter a nonnegative whole number.';
  if (!numeric(data?.price, 0, 1_000_000_000) || Math.abs(Number(data.price) * 100 - Math.round(Number(data.price) * 100)) > 0.00001) errors.price = 'Enter a nonnegative price with at most two decimal places.';
  return checked(errors);
};
export const validateChatMessage = data => {
  const errors = {};
  if (!hasText(data?.text, 4000) && !data?.file) errors.message = 'Enter a message or attach a file.';
  if (!optionalText(data?.text, 4000)) errors.text = 'Messages must contain at most 4,000 characters.';
  if (data?.file) {
    if (data.file.encoding === 'gzip-base64') {
      if (typeof data.file.base64 !== 'string' || data.file.base64.length > 600_000) errors.file = 'Compressed file is too large for Firestore.';
    } else {
      if (!numeric(data.file.size, 1, 5_000_000, true)) errors.file = 'File must be between 1 byte and 5 MB before compression.';
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(data.file.type)) errors.file = 'Select a supported PDF or image.';
    }
  }
  return checked(errors);
};
