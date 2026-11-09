import {
  collection, doc, getDoc, getDocsFromServer, query, where, orderBy, limit, startAfter,
  Timestamp, runTransaction, serverTimestamp, increment, writeBatch, onSnapshot,
  getAggregateFromServer, count, sum, average,
} from 'firebase/firestore';
import Fuse from 'fuse.js';
import { auth, db } from './firebase.js';
import {
  assert as ensure, WorkflowError, requireId, requireText, requireNumber, requireDate,
  appointmentInstant, hospitalDate, monthDates, moneyToMinor, invoiceLine, invoiceTotals,
  salaryCalculation, validateAttachment, validatePayrollPolicy,
} from './utils/transactions.js';
import { formatTime, searchName, availabilityNotice } from './utils/helpers.js';
import { normalizePhone } from './utils/validators.js';
import { COLLECTIONS, DEFAULT_PAYROLL_POLICY, MAX_PRESCRIPTION_MEDICINES } from './utils/constants.js';

/** All Firestore I/O. Inject real emulator clients for tests; rules remain authoritative. */
export const createHospitalDatabase = ({ auth, db }) => {
  const collections = new Set(COLLECTIONS);
  const refFor = (name, id) => {
    ensure(collections.has(name), 'validation', 'Unsupported collection.');
    return doc(db, name, requireId(id));
  };
  const normalized = value => {
    if (value instanceof Timestamp) return value.toDate();
    if (Array.isArray(value)) return value.map(normalized);
    if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalized(item)]));
    return value;
  };
  const row = snapshot => ({ ...normalized(snapshot.data()), id: snapshot.id });
  const resultOf = async work => {
    try { return { success: true, data: await work() }; }
    catch (error) {
      const messages = {
        'permission-denied': 'Access denied. Check your role, email verification, administrator verification and record ownership.',
        unavailable: 'Database unavailable. Reconnect before retrying this transaction.',
        aborted: 'Another user changed this record. Reload and retry.',
        'failed-precondition': 'A database index or workflow prerequisite is missing. Contact administration.',
      };
      return { success: false, code: error.code || 'unexpected',
        error: error instanceof WorkflowError ? error.message : messages[error.code] || 'Unable to complete this operation. Retry or contact support.',
        fields: error instanceof WorkflowError ? error.fields : {},
        ...(import.meta.env.MODE === 'test' ? { diagnostic: error.message } : {}) };
    }
  };
  const read = async (tx, name, id) => {
    const ref = refFor(name, id); const snapshot = await tx.get(ref);
    ensure(snapshot.exists(), 'not-found', `${name} record was not found.`);
    ensure(snapshot.data().schemaVersion === 2, 'migration-required', `${name} needs an owner-authorized schema migration before changes.`);
    return { ref, data: snapshot.data() };
  };
  const assertSize = data => ensure(new TextEncoder().encode(JSON.stringify(data)).length < 900_000,
    'document-too-large', 'Record exceeds its safe Firestore size. Reduce attachments or split the visit.');
  const actorIn = async (tx, roles) => {
    const current = auth.currentUser;
    ensure(current?.uid, 'unauthenticated', 'Please sign in.');
    ensure(current.emailVerified, 'email-unverified', 'Verify your email first.');
    const profile = await read(tx, 'users', current.uid);
    ensure(profile.data.schemaVersion === 2, 'migration-required', 'Your profile needs an owner-authorized migration.');
    ensure(profile.data.accountStatus === 'active', 'account-disabled', 'Your hospital access is disabled.');
    ensure(roles.includes(profile.data.role), 'forbidden', 'Your role cannot perform this action.');
    return { ...profile.data, id: current.uid };
  };
  const write = (tx, ref, values, actor, log, previous = null) => {
    const data = { ...values, schemaVersion: 2, revision: (previous?.revision || 0) + 1,
      updatedAt: serverTimestamp(), updatedBy: actor.id, lastAuditId: log.id };
    if (!previous) Object.assign(data, { createdAt: serverTimestamp(), createdBy: actor.id });
    assertSize({ ...(previous || {}), ...data });
    if (previous) tx.update(ref, data); else tx.set(ref, data);
  };
  const emit = (tx, log, actor, action, name, id, details = {}) => tx.set(log, {
    schemaVersion: 2, actorId: actor.id, userId: actor.id, action, targetCollection: name, targetId: id, details, timestamp: serverTimestamp(),
  });
  const mutate = (roles, action, name, id, work) => resultOf(async () => {
    const log = doc(collection(db, 'auditLogs'));
    return runTransaction(db, async tx => {
      const actor = await actorIn(tx, roles);
      return work(tx, actor, log, details => emit(tx, log, actor, action, name, id, details));
    });
  });
  const clinicalOwner = (actor, visit) => {
    ensure(actor.role === 'doctor' && visit.doctorId === actor.id, 'forbidden', 'Only the assigned doctor can amend this visit.');
    ensure(!visit.locked, 'record-locked', 'The record is locked. Administration must authorize an amendment.');
  };
  const slotId = (doctorId, date, time) => `slot_${requireId(doctorId)}_${requireDate(date)}_${time.replace(':', '')}`;
  const chatId = (doctorId, patientId) => `chat_${requireId(doctorId)}_${requireId(patientId)}`;
  const salaryId = (userId, month, year) => `${requireId(userId)}_${year}-${String(month).padStart(2, '0')}`;
  const publicDoctor = (department, id) => {
    const doctor = department.doctorProfiles?.[id];
    ensure(department.active && department.doctorIds?.includes(id) && doctor?.active, 'doctor-unavailable', 'Doctor is not active in this department.');
    ensure(department.headDoctorId && department.doctorProfiles[department.headDoctorId]?.active, 'department-head-required', 'Administration must assign an active department head before booking.');
    requireNumber(doctor.consultationFeeMinor, 'consultationFeeMinor', 0, 100_000_000_000, true);
    return doctor;
  };
  const slotsFor = (doctor, date) => {
    requireDate(date);
    const schedule = doctor.schedule;
    ensure(schedule && Array.isArray(schedule.weekdays) && Array.isArray(schedule.times), 'schedule-required', 'Configure an actual doctor schedule first.');
    return schedule.weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()) && !(schedule.closedDates || []).includes(date) ? schedule.times : [];
  };
  const appendLine = (invoice, line) => {
    ensure(invoice.status === 'unpaid' && !invoice.locked, 'invoice-locked', 'Only unpaid invoices accept charges. Resolve pending proof or use an approved new billing workflow.');
    const items = [...invoice.items, line]; return { items, ...invoiceTotals(items, invoice.taxBasisPoints) };
  };
  const emrFields = input => {
    const vitals = {};
    for (const [key, max] of [['sugar', 1500], ['heartRate', 350], ['temperature', 50]]) {
      const value = input.vitals?.[key];
      vitals[key] = value == null || value === '' ? null : requireNumber(Number(value), key, 0, max);
    }
    const bp = input.vitals?.bp || '';
    ensure(bp === '' || /^\d{2,3}\/\d{2,3}$/.test(bp), 'validation', 'Record blood pressure as systolic/diastolic.');
    if (bp) { const [s, d] = bp.split('/').map(Number); ensure(s > d && s >= 40 && s <= 300 && d >= 20 && d <= 200, 'validation', 'Blood pressure exceeds supported recording bounds.'); }
    vitals.bp = bp;
    const prescription = input.prescription || [];
    ensure(Array.isArray(prescription) && prescription.length <= MAX_PRESCRIPTION_MEDICINES, 'validation', `At most ${MAX_PRESCRIPTION_MEDICINES} medicines per prescription under the validated Firestore rule budget.`);
    const medicines = prescription.map(item => ({ name: requireText(item.name, 'medicine name', 150), dose: requireText(item.dose, 'dose', 100),
      frequency: requireText(item.frequency, 'frequency', 100), duration: requireText(item.duration, 'duration', 100), instructions: requireText(item.instructions || '', 'instructions', 500, true) }));
    if (input.followUpDate) requireDate(input.followUpDate);
    return { chiefComplaint: requireText(input.chiefComplaint, 'chiefComplaint'), symptoms: requireText(input.symptoms, 'symptoms', 4000),
      diagnosis: requireText(input.diagnosis, 'diagnosis', 4000), notes: requireText(input.notes || '', 'notes', 6000, true), vitals,
      prescription: medicines, followUpDate: input.followUpDate || null };
  };
  const constraintsFor = filters => Object.entries(filters).map(([key, value]) => {
    ensure(['role', 'patientId', 'doctorId', 'userId', 'status', 'departmentId', 'date', 'month', 'year', 'kind', 'chatId', 'actorId', 'action', 'active', 'lowStock', 'careTeamIds', 'category', 'isEmergency'].includes(key), 'validation', 'Unsupported query filter.');
    ensure(value != null && ['string', 'number', 'boolean'].includes(typeof value), 'validation', 'Invalid query value.');
    return where(key, key === 'careTeamIds' ? 'array-contains' : '==', value);
  });
  const makeQuery = (name, filters, options = {}) => {
    ensure(collections.has(name), 'validation', 'Unsupported collection.');
    const sort = options.orderBy || (['messages', 'auditLogs'].includes(name) ? 'timestamp' : 'createdAt');
    ensure(['createdAt', 'updatedAt', 'timestamp', 'date', 'fullName', 'name', 'paidAt', 'lastMessageAt', 'triagePriority'].includes(sort), 'validation', 'Unsupported sort field.');
    const direction = options.direction || 'desc'; ensure(['asc', 'desc'].includes(direction), 'validation', 'Invalid sort direction.');
    const constraints = [...constraintsFor(filters), orderBy(sort, direction)];
    if (sort === 'triagePriority') constraints.push(orderBy('createdAt', 'asc'));
    if (options.cursor) constraints.push(startAfter(options.cursor));
    constraints.push(limit(requireNumber(options.pageSize ?? 20, 'pageSize', 1, 100, true)));
    return query(collection(db, name), ...constraints);
  };
  const pageOf = (snapshot, size) => ({ records: snapshot.docs.map(row), cursor: snapshot.docs.at(-1) || null,
    hasMore: snapshot.size === size, fromCache: snapshot.metadata.fromCache });
  const collect = async (name, filters = {}) => {
    const records = []; let cursor; let bytes = 0;
    do {
      const snapshot = await getDocsFromServer(makeQuery(name, filters, { pageSize: 100, cursor }));
      for (const document of snapshot.docs) {
        const record = row(document); bytes += new TextEncoder().encode(JSON.stringify(record)).length;
        ensure(bytes <= 20_000_000 && records.length < 10000, 'export-too-large', 'Collection exceeds safe browser export limits. Use the protected owner backup tool.');
        records.push(record);
      }
      cursor = snapshot.size === 100 ? snapshot.docs.at(-1) : null;
    } while (cursor);
    return records;
  };
  const aggregate = async (name, filters, specification = { count: count() }) => (await getAggregateFromServer(query(collection(db, name), ...filters), specification)).data();
  const reportRange = (start, end) => {
    requireDate(start); requireDate(end); ensure(start <= end, 'validation', 'Report dates are reversed.');
    const from = appointmentInstant(start, '00:00');
    const until = new Date(appointmentInstant(end, '00:00').getTime() + 86400000);
    ensure(until - from <= 366 * 86400000, 'validation', 'Choose a report period no longer than 366 days.');
    return { from: Timestamp.fromDate(from), until: Timestamp.fromDate(until) };
  };
  const between = (field, range) => [where(field, '>=', range.from), where(field, '<', range.until)];

  const hospital = {
    getRecord: (name, id) => resultOf(async () => { const snapshot = await getDoc(refFor(name, id)); ensure(snapshot.exists(), 'not-found', 'Record not found.'); return row(snapshot); }),
    listRecords: (name, filters = {}, options = {}) => resultOf(async () => pageOf(await getDocsFromServer(makeQuery(name, filters, options)), options.pageSize ?? 20)),
    collectRecords: (name, filters = {}) => resultOf(() => collect(name, filters)),
    subscribeRecords: (name, filters, options, onData, onError) => onSnapshot(makeQuery(name, filters, options), { includeMetadataChanges: true },
      snapshot => onData(pageOf(snapshot, options.pageSize ?? 20)), error => onError({ code: error.code, error: 'Live records could not be loaded. Check your permissions, indexes and connection.' })),
    subscribeRecord: (name, id, onData, onError) => onSnapshot(refFor(name, id), snapshot => {
      if (snapshot.exists()) onData(row(snapshot)); else onError({ code: 'not-found', error: 'Record not found.' });
    }, error => onError({ code: error.code, error: 'Record updates could not be loaded.' })),
    subscribeProfile: (uid, onData, onError) => onSnapshot(refFor('users', uid), snapshot => onData(snapshot.exists() ? row(snapshot) : null), onError),

    bookAppointment: input => resultOf(async () => {
      requireId(input.patientId); requireId(input.doctorId); requireId(input.departmentId);
      const at = appointmentInstant(input.date, input.time); ensure(at > new Date(), 'validation', 'Select a future routine slot in Pakistan time.');
      const reason = requireText(input.reason, 'reason'); const id = input.requestId ? requireId(input.requestId) : `apt_${crypto.randomUUID()}`;
      ensure(id.length <= 96, 'validation', 'Appointment request ID exceeds its safe linked-record length.');
      const ref = refFor('appointments', id); const slotRef = refFor('appointments', slotId(input.doctorId, input.date, input.time));
      const log = doc(collection(db, 'auditLogs'));
      return runTransaction(db, async tx => {
        const actor = await actorIn(tx, ['patient', 'receptionist', 'admin']);
        ensure(actor.role !== 'patient' || actor.id === input.patientId, 'forbidden', 'Book only for yourself.');
        ensure(!input.isEmergency || actor.role !== 'patient', 'forbidden', 'Reception must assess emergencies.');
        const patient = await read(tx, 'users', input.patientId); const department = await read(tx, 'departments', input.departmentId);
        ensure(patient.data.role === 'patient' && patient.data.accountStatus === 'active', 'validation', 'Select an active patient.');
        const doctor = publicDoctor(department.data, input.doctorId);
        ensure(slotsFor(doctor, input.date).includes(input.time), 'doctor-unavailable', 'Time is outside the configured schedule.');
        const [existing, slot] = await Promise.all([tx.get(ref), tx.get(slotRef)]);
        if (existing.exists()) {
          const saved = existing.data(); ensure(saved.patientId === input.patientId && saved.doctorId === input.doctorId && saved.date === input.date && saved.time === input.time, 'duplicate', 'Booking request ID is already used.');
          return { ...normalized(saved), id, alreadyCompleted: true };
        }
        ensure(!slot.exists() || slot.data().status === 'available', 'slot-unavailable', 'Another patient reserved this slot.');
        const data = { kind: 'appointment', patientId: input.patientId, doctorId: input.doctorId, departmentId: input.departmentId,
          department: department.data.name, date: input.date, time: input.time, scheduledAt: Timestamp.fromDate(at), reason, status: 'scheduled', slotId: slotRef.id,
          patientName: patient.data.fullName, doctorName: doctor.fullName, consultationFeeMinor: doctor.consultationFeeMinor, paymentAmount: doctor.consultationFeeMinor / 100,
          paymentStatus: 'unpaid', isEmergency: Boolean(input.isEmergency), triage: null, triagePriority: 3, visitId: null, invoiceId: null };
        const careTeamIds = [...new Set([...(patient.data.careTeamIds || []), input.doctorId])]; ensure(careTeamIds.length <= 50, 'limit-exceeded', 'Care team needs administrative review.');
        write(tx, ref, data, actor, log);
        write(tx, slotRef, { kind: 'slot', doctorId: input.doctorId, date: input.date, time: input.time, appointmentId: id, status: 'reserved' }, actor, log, slot.exists() ? slot.data() : null);
        write(tx, patient.ref, { careTeamIds }, actor, log, patient.data); emit(tx, log, actor, 'APPOINTMENT_CREATED', 'appointments', id, { slotId: slotRef.id });
        return { ...data, id };
      });
    }),
    availableSlots: (departmentId, doctorId, date) => resultOf(async () => {
      const snapshot = await getDoc(refFor('departments', departmentId)); ensure(snapshot.exists(), 'not-found', 'Department not found.');
      const times = slotsFor(publicDoctor(snapshot.data(), doctorId), date).filter(time => appointmentInstant(date, time) > new Date());
      ensure(times.length <= 48, 'validation', 'Too many daily schedule slots.');
      const slots = await Promise.all(times.map(time => getDoc(refFor('appointments', slotId(doctorId, date, time)))));
      return times.map((time, i) => ({ time, display: formatTime(time), available: !slots[i].exists() || slots[i].data().status === 'available' }));
    }),
    intakeEmergency: input => {
      const id = input.requestId || `er_${crypto.randomUUID()}`;
      return mutate(['receptionist', 'admin'], 'EMERGENCY_ADMITTED', 'appointments', id, async (tx, actor, log, audit) => {
        requireId(id); ensure(id.length <= 96, 'validation', 'Emergency ID is too long.');
        ensure(['red', 'yellow', 'green'].includes(input.triage), 'validation', 'Select emergency severity.');
        const patient = await read(tx, 'users', input.patientId); const department = await read(tx, 'departments', input.departmentId);
        const doctor = publicDoctor(department.data, input.doctorId);
        ensure(department.data.emergencyEnabled, 'validation', 'Use a triage-enabled department.');
        ensure(patient.data.role === 'patient' && patient.data.accountStatus === 'active', 'validation', 'Select an active registered patient.');
        const ref = refFor('appointments', id); const marker = refFor('appointments', `case_${id}`);
        const [existing, lock] = await Promise.all([tx.get(ref), tx.get(marker)]);
        if (existing.exists()) { ensure(existing.data().patientId === input.patientId && existing.data().doctorId === input.doctorId, 'duplicate', 'Emergency ID is already used.'); return { id, alreadyCompleted: true }; }
        ensure(!lock.exists() && !patient.data.activeVisitId && !patient.data.currentBedId && !patient.data.pendingEmergencyId, 'active-visit', 'Patient already has an admission, bed or waiting emergency case.');
        const date = hospitalDate(); const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
        const careTeamIds = [...new Set([...(patient.data.careTeamIds || []), input.doctorId])]; ensure(careTeamIds.length <= 50, 'limit-exceeded', 'Care team needs review.');
        const data = { kind: 'appointment', patientId: input.patientId, doctorId: input.doctorId, departmentId: input.departmentId, department: department.data.name,
          patientName: patient.data.fullName, doctorName: doctor.fullName, date, time, scheduledAt: serverTimestamp(), reason: requireText(input.reason, 'chief complaint'), status: 'checked-in', slotId: marker.id,
          consultationFeeMinor: doctor.consultationFeeMinor, paymentAmount: doctor.consultationFeeMinor / 100, paymentStatus: 'unpaid', isEmergency: true,
          triage: input.triage, triagePriority: { red: 0, yellow: 1, green: 2 }[input.triage], triageAssessment: requireText(input.assessment, 'assessment'),
          triagedAt: serverTimestamp(), firstTriagedAt: serverTimestamp(), firstTriageHour: Number(time.split(':')[0]), checkedInAt: serverTimestamp(), checkedInBy: actor.id, visitId: null, invoiceId: null };
        write(tx, ref, data, actor, log); write(tx, marker, { kind: 'case-lock', caseId: id, doctorId: input.doctorId, date, time, appointmentId: id, status: 'reserved' }, actor, log);
        write(tx, patient.ref, { pendingEmergencyId: id, careTeamIds }, actor, log, patient.data); audit({ patientId: input.patientId, triage: input.triage }); return { id, ...data };
      });
    },
    dismissEmergency: (id, reason) => mutate(['receptionist', 'admin'], 'EMERGENCY_DISMISSED', 'appointments', id, async (tx, actor, log, audit) => {
      const record = await read(tx, 'appointments', id); ensure(record.data.isEmergency && record.data.status === 'checked-in' && !record.data.visitId, 'invalid-transition', 'Only a waiting emergency may be dismissed before consultation.');
      const patient = await read(tx, 'users', record.data.patientId); const lock = await read(tx, 'appointments', record.data.slotId);
      ensure(patient.data.pendingEmergencyId === id, 'conflict', 'Emergency linkage needs review.');
      write(tx, record.ref, { status: 'cancelled', statusReason: requireText(reason, 'reason', 2000) }, actor, log, record.data);
      write(tx, lock.ref, { status: 'available', appointmentId: null }, actor, log, lock.data); write(tx, patient.ref, { pendingEmergencyId: null }, actor, log, patient.data); audit({ reason }); return { id };
    }),
    transitionAppointment: (id, status, reason = '') => mutate(['patient', 'receptionist', 'doctor', 'admin'], 'APPOINTMENT_UPDATED', 'appointments', id, async (tx, actor, log, audit) => {
      const record = await read(tx, 'appointments', id); const data = record.data;
      ensure(data.kind === 'appointment' && { scheduled: ['confirmed', 'cancelled', 'no-show'], confirmed: ['checked-in', 'cancelled', 'no-show'] }[data.status]?.includes(status), 'invalid-transition', 'Appointment cannot move to that status.');
      if (actor.role === 'patient') ensure(data.patientId === actor.id && status === 'cancelled', 'forbidden', 'Patients can only cancel their own upcoming appointments.');
      if (actor.role === 'doctor') ensure(data.doctorId === actor.id && status === 'cancelled', 'forbidden', 'Doctors can only cancel their own appointments.');
      if (status === 'no-show') ensure(data.scheduledAt.toMillis() < Date.now(), 'validation', 'Scheduled time has not passed.');
      if (status === 'checked-in') ensure(data.date === hospitalDate(), 'validation', 'Check-in must be on the appointment date.');
      const slot = await read(tx, 'appointments', data.slotId); ensure(slot.data.appointmentId === id && slot.data.status === 'reserved', 'conflict', 'Slot linkage is inconsistent.');
      write(tx, record.ref, { status, statusReason: requireText(reason, 'reason', 1000, true), ...(status === 'checked-in' ? { checkedInAt: serverTimestamp(), checkedInBy: actor.id } : {}) }, actor, log, data);
      if (['cancelled', 'no-show'].includes(status)) write(tx, slot.ref, { status: 'available', appointmentId: null }, actor, log, slot.data);
      audit({ fromStatus: data.status, toStatus: status }); return { id, status };
    }),
    rescheduleAppointment: (id, date, time, reason = '') => mutate(['patient', 'receptionist', 'admin'], 'APPOINTMENT_RESCHEDULED', 'appointments', id, async (tx, actor, log, audit) => {
      const at = appointmentInstant(date, time); ensure(at > new Date(), 'validation', 'Select a future appointment.');
      const record = await read(tx, 'appointments', id); const data = record.data;
      ensure(['scheduled', 'confirmed'].includes(data.status) && (date !== data.date || time !== data.time), 'invalid-transition', 'Select a different upcoming slot.');
      ensure(actor.role !== 'patient' || actor.id === data.patientId, 'forbidden', 'This appointment is not yours.');
      const department = await read(tx, 'departments', data.departmentId); ensure(slotsFor(publicDoctor(department.data, data.doctorId), date).includes(time), 'doctor-unavailable', 'Slot is outside the configured schedule.');
      const old = await read(tx, 'appointments', data.slotId); const ref = refFor('appointments', slotId(data.doctorId, date, time)); const next = await tx.get(ref);
      ensure(old.data.appointmentId === id, 'conflict', 'Old slot linkage is inconsistent.'); ensure(!next.exists() || next.data().status === 'available', 'slot-unavailable', 'New slot is reserved.');
      write(tx, old.ref, { status: 'available', appointmentId: null }, actor, log, old.data);
      write(tx, ref, { kind: 'slot', doctorId: data.doctorId, date, time, appointmentId: id, status: 'reserved' }, actor, log, next.exists() ? next.data() : null);
      write(tx, record.ref, { date, time, scheduledAt: Timestamp.fromDate(at), slotId: ref.id, status: 'scheduled', statusReason: requireText(reason, 'reason', 1000, true) }, actor, log, data);
      audit({ previousDate: data.date, previousTime: data.time, date, time }); return { id, date, time };
    }),
    startVisit: id => mutate(['doctor'], 'VISIT_CREATED', 'visits', id, async (tx, actor, log, audit) => {
      const appointment = await read(tx, 'appointments', id); ensure(appointment.data.doctorId === actor.id, 'forbidden', 'You are not the assigned doctor.');
      const ref = refFor('visits', id); const invoiceRef = refFor('invoices', id); const [visitSnapshot, invoice] = await Promise.all([tx.get(ref), tx.get(invoiceRef)]);
      if (visitSnapshot.exists()) return { ...normalized(visitSnapshot.data()), id, alreadyCompleted: true };
      ensure(appointment.data.status === 'checked-in' && !invoice.exists(), 'invalid-transition', 'Reception must check in this patient; an orphan invoice requires review.');
      const patient = await read(tx, 'users', appointment.data.patientId); ensure(!patient.data.activeVisitId, 'active-visit', 'Patient already has an active visit.');
      ensure(!patient.data.pendingEmergencyId || patient.data.pendingEmergencyId === id, 'pending-emergency', 'Resolve the waiting emergency before routine consultation.');
      const conversationRef = refFor('chats', chatId(actor.id, appointment.data.patientId)); const conversation = await tx.get(conversationRef);
      const data = { id, appointmentId: id, patientId: patient.ref.id, doctorId: actor.id, departmentId: appointment.data.departmentId, patientName: appointment.data.patientName, doctorName: appointment.data.doctorName,
        status: 'active', locked: false, invoiceId: id, chiefComplaint: appointment.data.reason, symptoms: '', diagnosis: '', vitals: { bp: '', sugar: null, heartRate: null, temperature: null },
        prescription: [], prescriptionPdf: null, followUpDate: null, notes: '', bedId: null, openLabRequests: 0, openOperations: 0, dischargedAt: null, unlockReason: null };
      const line = invoiceLine(`consult_${id}`, 'Consultation', 1, appointment.data.consultationFeeMinor, 'consultation', id);
      write(tx, ref, data, actor, log); write(tx, invoiceRef, { patientId: data.patientId, doctorId: actor.id, departmentId: data.departmentId, visitId: id, appointmentId: id,
        items: [line], ...invoiceTotals([line]), status: 'unpaid', locked: false, payment: null, paymentProof: null, paidAt: null }, actor, log);
      write(tx, appointment.ref, { status: 'in-progress', visitId: id, invoiceId: id }, actor, log, appointment.data);
      write(tx, patient.ref, { activeVisitId: id, treatedDoctorIds: [...new Set([...(patient.data.treatedDoctorIds || []), actor.id])], ...(appointment.data.isEmergency ? { pendingEmergencyId: null } : {}) }, actor, log, patient.data);
      if (!conversation.exists()) write(tx, conversationRef, { doctorId: actor.id, patientId: data.patientId, departmentId: data.departmentId, participants: [actor.id, data.patientId], appointmentId: id,
        lastMessage: null, lastMessageAt: serverTimestamp(), unreadCount: { [actor.id]: 0, [data.patientId]: 0 }, sequence: 0 }, actor, log);
      audit({ appointmentId: id, invoiceId: id }); return data;
    }),
    saveEMR: (id, input, revision) => mutate(['doctor'], 'VISIT_UPDATED', 'visits', id, async (tx, actor, log, audit) => {
      const visit = await read(tx, 'visits', id); clinicalOwner(actor, visit.data); requireNumber(revision, 'expectedRevision', 1, Number.MAX_SAFE_INTEGER, true);
      ensure(visit.data.revision === revision, 'stale-record', 'The visit changed. Reload before saving.'); const fields = emrFields(input);
      write(tx, visit.ref, fields, actor, log, visit.data); audit({ amendedAfterDischarge: visit.data.status === 'discharged' }); return { id, revision: revision + 1, ...fields };
    }),
    savePrescription: (id, medicines, pdf, revision) => mutate(['doctor'], 'PRESCRIPTION_ADDED', 'visits', id, async (tx, actor, log, audit) => {
      const visit = await read(tx, 'visits', id); clinicalOwner(actor, visit.data); ensure(visit.data.revision === revision, 'stale-record', 'Regenerate from the latest saved visit.');
      ensure(Array.isArray(medicines) && medicines.length, 'validation', 'Select a medicine.'); const fields = emrFields({ ...visit.data, prescription: medicines }); validateAttachment(pdf);
      ensure(pdf.mimeType === 'application/pdf', 'validation', 'Prescription must be a PDF.'); write(tx, visit.ref, { prescription: fields.prescription, prescriptionPdf: pdf }, actor, log, visit.data);
      audit({ medicineCount: medicines.length, pdfChecksum: pdf.sha256 }); return { id, revision: revision + 1 };
    }),
    dischargeVisit: (id, notes = '') => mutate(['doctor'], 'VISIT_DISCHARGED', 'visits', id, async (tx, actor, log, audit) => {
      const visit = await read(tx, 'visits', id); const data = visit.data; ensure(data.doctorId === actor.id, 'forbidden', 'Only the assigned doctor can discharge.');
      if (data.status === 'discharged' && data.locked) return { id, invoiceId: data.invoiceId, alreadyCompleted: true };
      clinicalOwner(actor, data); ensure(data.status === 'active', 'invalid-transition', 'Visit is not active.'); emrFields(data);
      ensure(!data.bedId, 'bed-occupied', 'Release the bed and settle its charges first.'); ensure(data.openOperations === 0 && data.openLabRequests === 0, 'pending-clinical-work', 'Resolve outstanding tests/operations first.');
      const patient = await read(tx, 'users', data.patientId); const appointment = await read(tx, 'appointments', data.appointmentId);
      const slot = await read(tx, 'appointments', appointment.data.slotId); const invoice = await read(tx, 'invoices', data.invoiceId);
      ensure(patient.data.activeVisitId === id && slot.data.appointmentId === data.appointmentId, 'conflict', 'Visit links are inconsistent.');
      write(tx, visit.ref, { status: 'discharged', locked: true, dischargedAt: serverTimestamp(), dischargeNotes: requireText(notes, 'dischargeNotes', 4000, true) }, actor, log, data);
      write(tx, patient.ref, { activeVisitId: null }, actor, log, patient.data); write(tx, appointment.ref, { status: 'completed' }, actor, log, appointment.data);
      write(tx, slot.ref, { status: 'available', appointmentId: null }, actor, log, slot.data); audit({ invoiceId: data.invoiceId, totalMinor: invoice.data.totalMinor }); return { id, invoiceId: data.invoiceId, total: invoice.data.total };
    }),
    unlockVisit: (id, reason) => mutate(['admin'], 'RECORD_UNLOCKED', 'visits', id, async (tx, actor, log, audit) => {
      const visit = await read(tx, 'visits', id); ensure(visit.data.locked && visit.data.status === 'discharged', 'invalid-transition', 'Select a locked discharged record.'); const text = requireText(reason, 'unlockReason');
      write(tx, visit.ref, { locked: false, unlockedAt: serverTimestamp(), unlockedBy: actor.id, unlockReason: text }, actor, log, visit.data); audit({ reason: text }); return { id };
    }),
    relockVisit: id => mutate(['admin', 'doctor'], 'RECORD_RELOCKED', 'visits', id, async (tx, actor, log, audit) => {
      const visit = await read(tx, 'visits', id); ensure(visit.data.status === 'discharged' && !visit.data.locked, 'invalid-transition', 'Record is not an open amendment.');
      ensure(actor.role === 'admin' || visit.data.doctorId === actor.id, 'forbidden', 'Only the assigned doctor or administration can relock.'); write(tx, visit.ref, { locked: true }, actor, log, visit.data); audit(); return { id };
    }),
    submitPaymentProof: (id, proof, reference, method = 'bank_transfer') => mutate(['patient'], 'PAYMENT_PROOF_SUBMITTED', 'invoices', id, async (tx, actor, log, audit) => {
      validateAttachment(proof); ensure(['bank_transfer', 'online', 'card'].includes(method), 'validation', 'Unsupported payment method.'); const invoice = await read(tx, 'invoices', id);
      ensure(invoice.data.patientId === actor.id, 'forbidden', 'This invoice is not yours.'); ensure(invoice.data.status === 'unpaid' && !invoice.data.locked, 'invoice-locked', 'Invoice cannot accept another proof.');
      write(tx, invoice.ref, { status: 'pending_confirmation', paymentProof: proof, payment: { method, reference: requireText(reference, 'reference', 150), submittedBy: actor.id,
        amountMinor: invoice.data.totalMinor, submittedAt: serverTimestamp() } }, actor, log, invoice.data); audit({ amountMinor: invoice.data.totalMinor }); return { id };
    }),
    rejectPayment: (id, reason) => mutate(['receptionist', 'admin'], 'PAYMENT_PROOF_REJECTED', 'invoices', id, async (tx, actor, log, audit) => {
      const invoice = await read(tx, 'invoices', id); ensure(invoice.data.status === 'pending_confirmation' && !invoice.data.locked, 'invalid-transition', 'No pending proof to reject.');
      const text = requireText(reason, 'rejectionReason', 1000); write(tx, invoice.ref, { status: 'unpaid', payment: null, paymentProof: null, rejectionReason: text }, actor, log, invoice.data); audit({ reason: text }); return { id };
    }),
    confirmPayment: (id, cash = null) => mutate(['receptionist', 'admin'], 'PAYMENT_CONFIRMED', 'invoices', id, async (tx, actor, log, audit) => {
      const invoice = await read(tx, 'invoices', id); const data = invoice.data;
      if (data.status === 'paid') return { id, alreadyCompleted: true };
      ensure(!data.locked, 'invoice-locked', 'Invoice is locked.'); const totals = invoiceTotals(data.items, data.taxBasisPoints);
      ensure(totals.totalMinor === data.totalMinor, 'corrupt-invoice', 'Invoice arithmetic is inconsistent.');
      if (cash) {
        ensure(data.status === 'unpaid' && cash.method === 'cash' && cash.amountMinor === data.totalMinor, 'validation', 'Cash receipt must exactly match an unpaid invoice.'); requireText(cash.reference, 'cashReference', 150);
      } else ensure(data.status === 'pending_confirmation' && data.paymentProof, 'proof-required', 'Require submitted proof or actual cash received.');
      const department = await read(tx, 'departments', data.departmentId); const appointment = await read(tx, 'appointments', data.appointmentId);
      const payment = cash ? { method: 'cash', amountMinor: cash.amountMinor, reference: cash.reference } : data.payment;
      const revenueMinor = requireNumber(department.data.revenueMinor + totals.totalMinor, 'revenueMinor', 0, Number.MAX_SAFE_INTEGER, true);
      write(tx, invoice.ref, { status: 'paid', locked: true, paidAt: serverTimestamp(), payment: { ...payment, confirmedBy: actor.id, confirmedAt: serverTimestamp() } }, actor, log, data);
      write(tx, department.ref, { revenueMinor, revenue: revenueMinor / 100, collectedRevenue: revenueMinor / 100, lastPaidInvoiceId: id }, actor, log, department.data);
      write(tx, appointment.ref, { paymentStatus: 'paid' }, actor, log, appointment.data); audit({ amountMinor: totals.totalMinor, departmentId: data.departmentId, reference: payment.reference }); return { id, total: totals.total };
    }),
    requestLabTest: (visitId, testId, priority = 'normal', id = `lab_${crypto.randomUUID()}`) => mutate(['doctor'], 'LAB_REQUEST_CREATED', 'labRequests', id, async (tx, actor, log, audit) => {
      requireId(testId); ensure(['normal', 'urgent', 'stat'].includes(priority), 'validation', 'Invalid lab priority.'); const visit = await read(tx, 'visits', visitId); clinicalOwner(actor, visit.data);
      ensure(visit.data.status === 'active' && visit.data.openLabRequests < 10, 'limit-exceeded', 'An active visit supports up to ten outstanding tests.');
      const department = await read(tx, 'departments', visit.data.departmentId); const service = department.data.services[testId]; ensure(service?.active && service.type === 'lab', 'validation', 'Select an approved lab service.');
      const ref = refFor('labRequests', id); const existing = await tx.get(ref);
      if (existing.exists()) { ensure(existing.data().visitId === visitId && existing.data().testId === testId, 'duplicate', 'Request ID is already used.'); return { id, alreadyCompleted: true }; }
      const invoice = await read(tx, 'invoices', visit.data.invoiceId); const update = appendLine(invoice.data, invoiceLine(id, service.name, 1, service.priceMinor, 'lab', id));
      const data = { visitId, invoiceId: visit.data.invoiceId, patientId: visit.data.patientId, doctorId: actor.id, departmentId: visit.data.departmentId, testId, testName: service.name, priceMinor: service.priceMinor, priority, status: 'pending', result: null, completedAt: null };
      write(tx, ref, data, actor, log); write(tx, invoice.ref, update, actor, log, invoice.data); write(tx, visit.ref, { openLabRequests: visit.data.openLabRequests + 1 }, actor, log, visit.data);
      audit({ visitId, invoiceId: visit.data.invoiceId }); return { id, ...data };
    }),
    completeLabTest: (id, attachment, summary) => mutate(['lab'], 'LAB_RESULT_UPLOADED', 'labRequests', id, async (tx, actor, log, audit) => {
      validateAttachment(attachment); const request = await read(tx, 'labRequests', id); ensure(['pending', 'in-progress'].includes(request.data.status), 'invalid-transition', 'Test is already completed/cancelled.');
      write(tx, request.ref, { status: 'completed', result: attachment, resultSummary: requireText(summary, 'resultSummary', 4000), completedAt: serverTimestamp(), completedBy: actor.id }, actor, log, request.data);
      tx.update(refFor('visits', request.data.visitId), { openLabRequests: increment(-1), revision: increment(1), schemaVersion: 2, updatedAt: serverTimestamp(), updatedBy: actor.id, lastAuditId: log.id });
      audit({ visitId: request.data.visitId, checksum: attachment.sha256 }); return { id };
    }),
    cancelLabTest: (id, reason) => mutate(['doctor'], 'LAB_REQUEST_CANCELLED', 'labRequests', id, async (tx, actor, log, audit) => {
      const request = await read(tx, 'labRequests', id); ensure(request.data.doctorId === actor.id && request.data.status === 'pending', 'invalid-transition', 'Only the requesting doctor can cancel a pending test.');
      const visit = await read(tx, 'visits', request.data.visitId); clinicalOwner(actor, visit.data); const invoice = await read(tx, 'invoices', request.data.invoiceId);
      ensure(invoice.data.status === 'unpaid' && !invoice.data.locked, 'invoice-locked', 'Resolve submitted proof before removing charges.');
      const index = invoice.data.items.findIndex(item => item.sourceId === id && item.sourceType === 'lab'); ensure(index >= 0 && visit.data.openLabRequests > 0, 'conflict', 'Lab request linkage is inconsistent.');
      const items = invoice.data.items.filter((_, i) => i !== index);
      write(tx, request.ref, { status: 'cancelled', cancellationReason: requireText(reason, 'reason', 1000) }, actor, log, request.data);
      write(tx, visit.ref, { openLabRequests: visit.data.openLabRequests - 1 }, actor, log, visit.data);
      write(tx, invoice.ref, { items, ...invoiceTotals(items, invoice.data.taxBasisPoints), cancelledLabRequestId: id, cancelledLabItemIndex: index }, actor, log, invoice.data); audit({ visitId: request.data.visitId }); return { id };
    }),
    assignBed: (id, patientId, visitId = null) => mutate(['receptionist', 'admin'], 'BED_ASSIGNED', 'beds', id, async (tx, actor, log, audit) => {
      const bed = await read(tx, 'beds', id); const patient = await read(tx, 'users', patientId); const activeId = visitId || patient.data.activeVisitId; requireId(activeId, 'activeVisitId');
      const invoice = await read(tx, 'invoices', activeId); ensure(bed.data.status === 'available' && !patient.data.currentBedId, 'bed-unavailable', 'Bed or patient already has an assignment.');
      ensure(patient.data.role === 'patient' && patient.data.activeVisitId === activeId && invoice.data.patientId === patientId && invoice.data.status === 'unpaid', 'validation', 'Bed assignment requires an active visit and unpaid invoice.');
      requireNumber(bed.data.dailyRateMinor, 'dailyRateMinor', 0, 100_000_000_000, true);
      write(tx, bed.ref, { status: 'occupied', patientId, visitId: activeId, sessionId: `bed_${log.id}`, assignedAt: serverTimestamp(), assignedBy: actor.id, rateAtAssignmentMinor: bed.data.dailyRateMinor }, actor, log, bed.data);
      write(tx, patient.ref, { currentBedId: id }, actor, log, patient.data);
      tx.update(refFor('visits', activeId), { bedId: id, schemaVersion: 2, revision: increment(1), updatedAt: serverTimestamp(), updatedBy: actor.id, lastAuditId: log.id });
      audit({ patientId, visitId: activeId, sessionId: `bed_${log.id}` }); return { bedId: id, visitId: activeId };
    }),
    releaseBed: id => hospital.transferBed(null, id, null),
    transferBed: (patientId, fromId, toId) => mutate(['receptionist', 'admin'], 'BED_RELEASED', 'beds', fromId, async (tx, actor, log, audit) => {
      const from = await read(tx, 'beds', fromId); ensure(from.data.status === 'occupied' && fromId !== toId, 'invalid-transition', 'Select an occupied source and distinct available target.');
      const id = patientId || from.data.patientId; ensure(from.data.patientId === id, 'validation', 'Patient does not occupy the source bed.');
      const patient = await read(tx, 'users', id); const invoice = await read(tx, 'invoices', from.data.visitId); const to = toId ? await read(tx, 'beds', toId) : null;
      ensure(patient.data.currentBedId === fromId && patient.data.activeVisitId === from.data.visitId, 'conflict', 'Bed/visit links are inconsistent.'); ensure(!to || to.data.status === 'available', 'bed-unavailable', 'Target bed is unavailable.');
      ensure(from.data.assignedAt instanceof Timestamp, 'validation', 'Admission timestamp is missing.'); const days = Math.max(1, Math.ceil((Date.now() - from.data.assignedAt.toMillis()) / 86400000));
      const line = invoiceLine(from.data.sessionId, `Bed — ${from.data.type}`, days, from.data.rateAtAssignmentMinor, 'bed', fromId); const update = appendLine(invoice.data, line);
      if (to) requireNumber(to.data.dailyRateMinor, 'dailyRateMinor', 0, 100_000_000_000, true);
      write(tx, from.ref, { status: 'available', patientId: null, visitId: null, sessionId: null, assignedAt: null, releasedAt: serverTimestamp() }, actor, log, from.data);
      if (to) write(tx, to.ref, { status: 'occupied', patientId: id, visitId: from.data.visitId, sessionId: `bed_${log.id}`, assignedAt: serverTimestamp(), assignedBy: actor.id, rateAtAssignmentMinor: to.data.dailyRateMinor }, actor, log, to.data);
      write(tx, patient.ref, { currentBedId: toId }, actor, log, patient.data);
      tx.update(refFor('visits', from.data.visitId), { bedId: toId, schemaVersion: 2, revision: increment(1), updatedAt: serverTimestamp(), updatedBy: actor.id, lastAuditId: log.id });
      write(tx, invoice.ref, update, actor, log, invoice.data); audit({ patientId: id, visitId: from.data.visitId, toBedId: toId, days, amountMinor: line.amountMinor }); return { patientId: id, fromBedId: fromId, toBedId: toId, days, amount: line.amountMinor / 100 };
    }),
    scheduleOperation: (visitId, serviceId, staffIds, inventoryUsage = [], id = `op_${crypto.randomUUID()}`) => mutate(['doctor'], 'OPERATION_SCHEDULED', 'operations', id, async (tx, actor, log, audit) => {
      const visit = await read(tx, 'visits', visitId); clinicalOwner(actor, visit.data); ensure(visit.data.status === 'active' && visit.data.openOperations < 5, 'validation', 'Select an active visit with fewer than five outstanding operations.');
      const department = await read(tx, 'departments', visit.data.departmentId); const service = department.data.services[requireId(serviceId)]; ensure(service?.active && service.type === 'operation', 'validation', 'Select an approved operation service.');
      ensure(Array.isArray(staffIds) && staffIds.length && staffIds.length <= 5 && new Set(staffIds).size === staffIds.length && staffIds.includes(actor.id), 'validation', 'Select 1–5 distinct active staff including the operating doctor.');
      for (const staffId of staffIds) ensure(department.data.staffProfiles?.[requireId(staffId)]?.active, 'staff-unavailable', 'Required staff must be active in the department.');
      ensure(Array.isArray(inventoryUsage) && inventoryUsage.length <= 5, 'validation', 'At most five distinct consumable lines per atomic operation.'); const ids = new Set(); const items = [];
      for (const item of inventoryUsage) {
        requireId(item.itemId); requireNumber(item.quantity, 'quantity', 1, 10000, true); ensure(!ids.has(item.itemId), 'duplicate', 'Combine duplicate consumables.'); ids.add(item.itemId);
        const inventory = await read(tx, 'inventory', item.itemId); ensure(inventory.data.category !== 'equipment' && inventory.data.quantity >= item.quantity, 'insufficient-stock', 'Select available consumables, not reusable equipment.');
        items.push({ itemId: item.itemId, name: inventory.data.name, quantity: item.quantity, unitPriceMinor: inventory.data.priceMinor, amountMinor: item.quantity * inventory.data.priceMinor });
      }
      const ref = refFor('operations', id); ensure(!(await tx.get(ref)).exists(), 'duplicate', 'Operation request ID already exists.');
      const data = { visitId, patientId: visit.data.patientId, doctorId: actor.id, departmentId: visit.data.departmentId, invoiceId: visit.data.invoiceId, serviceId,
        operationType: service.name, requiredStaff: staffIds, inventoryUsage: items, chargeMinor: service.priceMinor, inventoryCostMinor: items.reduce((total, item) => total + item.amountMinor, 0),
        status: 'scheduled', locked: false, inventoryDeducted: false, checklist: { staffConfirmed: false, equipmentConfirmed: false, consentConfirmed: false, riskAcknowledged: false } };
      write(tx, ref, data, actor, log); write(tx, visit.ref, { openOperations: visit.data.openOperations + 1 }, actor, log, visit.data); audit({ visitId }); return { id, ...data };
    }),
    confirmChecklist: (id, item) => mutate(['doctor'], 'OPERATION_CHECKLIST_CONFIRMED', 'operations', id, async (tx, actor, log, audit) => {
      ensure(['staffConfirmed', 'equipmentConfirmed', 'consentConfirmed', 'riskAcknowledged'].includes(item), 'validation', 'Invalid safety checklist item.'); const operation = await read(tx, 'operations', id);
      ensure(operation.data.doctorId === actor.id && operation.data.status === 'scheduled' && !operation.data.locked, 'forbidden', 'Only the operating doctor can confirm a scheduled checklist.');
      write(tx, operation.ref, { checklist: { ...operation.data.checklist, [item]: true } }, actor, log, operation.data); audit({ checklistItem: item }); return { id };
    }),
    startOperation: id => mutate(['doctor'], 'OPERATION_STARTED', 'operations', id, async (tx, actor, log, audit) => {
      const operation = await read(tx, 'operations', id); const data = operation.data; ensure(data.doctorId === actor.id, 'forbidden', 'Only the operating doctor can start.');
      if (data.status === 'in-progress' && data.inventoryDeducted) return { id, alreadyCompleted: true };
      ensure(data.status === 'scheduled' && !data.locked && !data.inventoryDeducted, 'invalid-transition', 'Operation cannot start again.');
      ensure(['staffConfirmed', 'equipmentConfirmed', 'consentConfirmed', 'riskAcknowledged'].every(key => data.checklist[key] === true), 'checklist-incomplete', 'Confirm all safety checks.');
      const visit = await read(tx, 'visits', data.visitId); clinicalOwner(actor, visit.data); const invoice = await read(tx, 'invoices', data.invoiceId); const department = await read(tx, 'departments', data.departmentId);
      ensure(data.requiredStaff.every(staffId => department.data.staffProfiles?.[staffId]?.active), 'staff-unavailable', 'A required staff member is no longer active.');
      const inventories = [];
      for (const item of data.inventoryUsage) { const inventory = await read(tx, 'inventory', item.itemId); ensure(inventory.data.quantity >= item.quantity, 'insufficient-stock', `Insufficient ${item.name}.`); ensure(inventory.data.priceMinor === item.unitPriceMinor, 'price-changed', 'Inventory price changed; reschedule with current pricing.'); inventories.push({ ...inventory, item }); }
      const line = invoiceLine(id, `Operation — ${data.operationType} (including consumables)`, 1, data.chargeMinor + data.inventoryCostMinor, 'operation', id); const update = appendLine(invoice.data, line);
      for (const inventory of inventories) write(tx, inventory.ref, { quantity: inventory.data.quantity - inventory.item.quantity, usedQuantity: inventory.data.usedQuantity + inventory.item.quantity,
        usageValueMinor: inventory.data.usageValueMinor + inventory.item.amountMinor, lastOperationId: id, lowStock: inventory.data.quantity - inventory.item.quantity <= inventory.data.threshold }, actor, log, inventory.data);
      write(tx, invoice.ref, update, actor, log, invoice.data); write(tx, operation.ref, { status: 'in-progress', locked: true, inventoryDeducted: true, startedAt: serverTimestamp() }, actor, log, data);
      audit({ visitId: data.visitId, inventoryUsage: data.inventoryUsage, amountMinor: line.amountMinor }); return { id };
    }),
    completeOperation: (id, outcome) => mutate(['doctor'], 'OPERATION_COMPLETED', 'operations', id, async (tx, actor, log, audit) => {
      const operation = await read(tx, 'operations', id); ensure(operation.data.doctorId === actor.id && operation.data.status === 'in-progress' && operation.data.inventoryDeducted, 'invalid-transition', 'Only the operating doctor can complete a started operation.');
      const visit = await read(tx, 'visits', operation.data.visitId); ensure(visit.data.openOperations > 0 && !visit.data.locked, 'conflict', 'Visit linkage is inconsistent.');
      write(tx, operation.ref, { status: 'completed', locked: true, outcome: requireText(outcome, 'outcome', 6000), completedAt: serverTimestamp() }, actor, log, operation.data);
      write(tx, visit.ref, { openOperations: visit.data.openOperations - 1 }, actor, log, visit.data); audit({ visitId: operation.data.visitId }); return { id };
    }),
    cancelOperation: (id, reason) => mutate(['doctor'], 'OPERATION_CANCELLED', 'operations', id, async (tx, actor, log, audit) => {
      const operation = await read(tx, 'operations', id); ensure(operation.data.doctorId === actor.id && operation.data.status === 'scheduled' && !operation.data.inventoryDeducted, 'invalid-transition', 'Only scheduled operations can be cancelled.');
      const visit = await read(tx, 'visits', operation.data.visitId); clinicalOwner(actor, visit.data); ensure(visit.data.openOperations > 0, 'conflict', 'Operation count is inconsistent.');
      write(tx, operation.ref, { status: 'cancelled', locked: true, cancellationReason: requireText(reason, 'reason', 1000) }, actor, log, operation.data);
      write(tx, visit.ref, { openOperations: visit.data.openOperations - 1 }, actor, log, visit.data); audit({ visitId: operation.data.visitId }); return { id };
    }),
    markAttendance: (userId, date, status, reason = '') => mutate(['receptionist', 'admin'], 'ATTENDANCE_MARKED', 'attendance', `${userId}_${date}`, async (tx, actor, log, audit) => {
      requireId(userId); requireDate(date); ensure(date <= hospitalDate(), 'validation', 'Attendance cannot be in the future.'); ensure(['present', 'absent', 'late', 'half-day', 'leave'].includes(status), 'validation', 'Invalid attendance status.');
      const month = Number(date.slice(5, 7)); const year = Number(date.slice(0, 4)); ensure(!(await tx.get(refFor('attendance', `${salaryId(userId, month, year)}_lock`))).exists(), 'payroll-locked', 'Monthly attendance is frozen by finalized payroll.');
      const ref = refFor('attendance', `${userId}_${date}`); const previous = await tx.get(ref); if (previous.exists()) requireText(reason, 'correction reason', 1000);
      write(tx, ref, { kind: 'daily', userId, date, status, markedBy: actor.id, markedAt: serverTimestamp(), correctionReason: requireText(reason, 'reason', 1000, true) }, actor, log, previous.exists() ? previous.data() : null);
      audit({ userId, date, status, previousStatus: previous.exists() ? previous.data().status : null }); return { userId, date, status };
    }),
    calculateSalary: (userId, month, year) => mutate(['admin'], 'SALARY_CALCULATED', 'salaryRecords', salaryId(userId, month, year), async (tx, actor, log, audit) => {
      const dates = monthDates(month, year); const user = await read(tx, 'users', userId); ensure(['doctor', 'receptionist', 'lab'].includes(user.data.role), 'validation', 'Select hospital staff.');
      const ref = refFor('salaryRecords', salaryId(userId, month, year)); const existing = await tx.get(ref); if (existing.exists()) return { ...normalized(existing.data()), id: ref.id, alreadyCompleted: true };
      const lock = refFor('attendance', `${ref.id}_lock`); ensure(!(await tx.get(lock)).exists(), 'conflict', 'Payroll is locked without a salary record.');
      const days = await Promise.all(dates.map(date => tx.get(refFor('attendance', `${userId}_${date}`)))); const calculation = salaryCalculation(user.data, days.filter(day => day.exists()).map(day => day.data()), month, year);
      const department = await read(tx, 'departments', user.data.departmentId);
      const data = { ...calculation, userId, userName: user.data.fullName, userRole: user.data.role, departmentId: user.data.departmentId, userDepartment: department.data.name,
        month, year, status: 'pending', locked: false, calculatedBy: actor.id, calculatedAt: serverTimestamp(), paidAt: null, paidBy: null, paymentMethod: null, paymentReference: null, payrollPolicy: user.data.payrollPolicy, salaryPdf: null };
      write(tx, ref, data, actor, log); write(tx, lock, { kind: 'payroll-lock', userId, period: `${year}-${String(month).padStart(2, '0')}`, salaryId: ref.id, locked: true }, actor, log);
      audit({ userId, month, year, netSalaryMinor: data.netSalaryMinor, policyVersion: data.policyVersion }); return { ...data, id: ref.id };
    }),
    paySalaries: (records, payment) => resultOf(async () => {
      ensure(Array.isArray(records) && records.length && records.length <= 8, 'validation', 'Pay 1–8 salaries atomically.'); const ids = records.map(value => requireId(typeof value === 'string' ? value : value.id)); ensure(new Set(ids).size === ids.length, 'duplicate', 'Duplicate salary record.');
      ensure(['cash', 'bank_transfer'].includes(payment?.method), 'validation', 'Select the actual payment method.'); const reference = requireText(payment.reference, 'paymentReference', 150); const log = doc(collection(db, 'auditLogs'));
      return runTransaction(db, async tx => {
        const actor = await actorIn(tx, ['admin']); const salaries = await Promise.all(ids.map(id => read(tx, 'salaryRecords', id)));
        for (const salary of salaries) ensure(salary.data.status === 'pending' && !salary.data.locked, 'salary-paid', 'At least one salary is already paid. Nothing changed.');
        for (const salary of salaries) write(tx, salary.ref, { status: 'paid', locked: true, paidAt: serverTimestamp(), paidBy: actor.id, paymentMethod: payment.method, paymentReference: reference }, actor, log, salary.data);
        emit(tx, log, actor, 'SALARY_PAID', 'salaryRecords', ids[0], { salaryIds: ids, totalMinor: salaries.reduce((total, salary) => total + salary.data.netSalaryMinor, 0), reference }); return { salaryIds: ids };
      });
    }),
    saveSalaryPdf: (id, attachment) => mutate(['admin'], 'SALARY_PDF_GENERATED', 'salaryRecords', id, async (tx, actor, log, audit) => {
      validateAttachment(attachment); ensure(attachment.mimeType === 'application/pdf', 'validation', 'Salary slip must be a PDF.'); const salary = await read(tx, 'salaryRecords', id);
      ensure(salary.data.status === 'paid', 'salary-unpaid', 'Generate final slips after actual payout only.'); ensure(!salary.data.salaryPdf, 'duplicate', 'Final PDF is already attached.'); write(tx, salary.ref, { salaryPdf: attachment }, actor, log, salary.data); audit({ checksum: attachment.sha256 }); return { id };
    }),
    setTriage: (id, classification, assessment) => mutate(['receptionist', 'admin'], 'TRIAGE_CLASSIFIED', 'appointments', id, async (tx, actor, log, audit) => {
      ensure(['red', 'yellow', 'green'].includes(classification), 'validation', 'Select red/yellow/green.'); const record = await read(tx, 'appointments', id);
      ensure(record.data.isEmergency && ['scheduled', 'confirmed', 'checked-in', 'in-progress'].includes(record.data.status), 'validation', 'Select an active emergency case.');
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
      write(tx, record.ref, { triage: classification, triagePriority: { red: 0, yellow: 1, green: 2 }[classification], triageAssessment: requireText(assessment, 'assessment'), triagedAt: serverTimestamp(),
        firstTriagedAt: record.data.firstTriagedAt || serverTimestamp(), firstTriageHour: record.data.firstTriageHour ?? hour }, actor, log, record.data); audit({ classification }); return { id };
    }),
    sendMessage: (id, input, requestId = `msg_${crypto.randomUUID()}`) => mutate(['patient', 'doctor'], 'CHAT_MESSAGE_SENT', 'messages', requestId, async (tx, actor, log, audit) => {
      const conversation = await read(tx, 'chats', id); ensure(conversation.data.participants.includes(actor.id), 'forbidden', 'You are not a participant.'); const text = requireText(input.text || '', 'message', 4000, true); const file = input.file || null; if (file) validateAttachment(file); ensure(text || file, 'validation', 'Enter a message or file.');
      const ref = refFor('messages', requestId); const existing = await tx.get(ref);
      if (existing.exists()) { const data = existing.data(); ensure(data.senderId === actor.id && data.chatId === id && data.text === text && (data.file?.sha256 || null) === (file?.sha256 || null), 'duplicate', 'Message ID belongs to another payload.'); return { ...normalized(data), id: requestId, alreadyCompleted: true }; }
      const department = await read(tx, 'departments', conversation.data.departmentId); const doctor = department.data.doctorProfiles[conversation.data.doctorId];
      const recipientId = conversation.data.participants.find(value => value !== actor.id); const data = { chatId: id, senderId: actor.id, recipientId, text, file, status: 'sent', sequence: conversation.data.sequence + 1,
        timestamp: serverTimestamp(), deliveredAt: null, seenAt: null, autoReplyNotice: actor.role === 'patient' ? availabilityNotice(doctor) : null };
      write(tx, ref, data, actor, log); write(tx, conversation.ref, { sequence: data.sequence, lastMessage: { id: requestId, text: text.slice(0, 200), senderId: actor.id, sequence: data.sequence }, lastMessageAt: serverTimestamp(),
        unreadCount: { ...conversation.data.unreadCount, [recipientId]: conversation.data.unreadCount[recipientId] + 1 } }, actor, log, conversation.data); audit({ chatId: id }); return { ...data, id: requestId };
    }),
    acknowledgeMessages: (id, ids, status = 'seen') => mutate(['doctor', 'patient'], 'CHAT_MESSAGES_READ', 'chats', id, async (tx, actor, log, audit) => {
      ensure(['delivered', 'seen'].includes(status) && Array.isArray(ids) && ids.length && ids.length <= 8 && new Set(ids).size === ids.length, 'validation', 'Acknowledge 1–8 distinct messages.');
      const conversation = await read(tx, 'chats', id); ensure(conversation.data.participants.includes(actor.id), 'forbidden', 'You are not a participant.'); const messages = await Promise.all(ids.map(value => read(tx, 'messages', value)));
      for (const message of messages) ensure(message.data.chatId === id && message.data.recipientId === actor.id, 'forbidden', 'Acknowledge only messages sent to you.');
      const changed = messages.filter(message => message.data.status !== 'seen' && message.data.status !== status);
      if (!changed.length) return { chatId: id, newlySeen: 0, alreadyCompleted: true };
      const seen = status === 'seen' ? changed.length : 0; ensure(conversation.data.unreadCount[actor.id] >= seen, 'conflict', 'Unread counter is inconsistent.');
      for (const message of changed) write(tx, message.ref, { status, deliveredAt: message.data.deliveredAt || serverTimestamp(), ...(status === 'seen' ? { seenAt: serverTimestamp() } : {}) }, actor, log, message.data);
      write(tx, conversation.ref, { unreadCount: { ...conversation.data.unreadCount, [actor.id]: conversation.data.unreadCount[actor.id] - seen } }, actor, log, conversation.data); audit({ messageIds: ids, status }); return { chatId: id, newlySeen: seen };
    }),
    rateVisit: (id, stars, review = '') => mutate(['patient'], 'DOCTOR_RATED', 'ratings', id, async (tx, actor, log, audit) => {
      requireNumber(stars, 'rating', 1, 5, true); const visit = await read(tx, 'visits', id); ensure(visit.data.patientId === actor.id && visit.data.status === 'discharged', 'forbidden', 'Rate only your completed visit.');
      const ref = refFor('ratings', id); ensure(!(await tx.get(ref)).exists(), 'duplicate', 'Visit already rated.'); const data = { visitId: id, patientId: actor.id, doctorId: visit.data.doctorId, rating: stars, review: requireText(review, 'review', 2000, true) };
      write(tx, ref, data, actor, log); audit({ visitId: id }); return { id, ...data };
    }),
    createProfile: (authUser, input, createdBy = null) => resultOf(async () => {
      requireId(authUser.uid); const current = auth.currentUser; ensure(current, 'unauthenticated', 'Please sign in.'); const self = current.uid === authUser.uid;
      ensure(self || createdBy === current.uid, 'forbidden', 'Invalid creator.'); const role = self ? 'patient' : input.role;
      ensure(['patient', 'doctor', 'receptionist', 'lab'].includes(role) && (!self || !input.role || input.role === 'patient'), 'forbidden', 'Patients alone self-register; administrator registration is disabled.');
      const fullName = requireText(input.fullName, 'fullName', 100); const phone = input.phone ? normalizePhone(input.phone) : ''; const emergencyContact = input.emergencyContact ? normalizePhone(input.emergencyContact) : '';
      ensure(phone !== null && emergencyContact !== null, 'validation', 'Enter valid Pakistan mobile numbers.');
      const profile = { uid: authUser.uid, email: authUser.email || null, role, fullName, fullNameSearch: searchName(fullName), phone, emergencyContact,
        cnic: input.cnic || '', dateOfBirth: input.dateOfBirth || '', gender: input.gender || '', address: requireText(input.address || '', 'address', 500, true), bloodGroup: input.bloodGroup || '',
        accountStatus: 'active', activeVisitId: null, currentBedId: null, pendingEmergencyId: null, careTeamIds: [], treatedDoctorIds: [], departmentId: role === 'patient' ? null : input.departmentId || null, department: '',
        specialization: requireText(input.specialization || '', 'specialization', 150, true), licenseNumber: requireText(input.licenseNumber || '', 'licenseNumber', 100, true), baseSalaryMinor: role === 'patient' ? 0 : moneyToMinor(Number(input.baseSalary)),
        employmentStartDate: role === 'patient' ? null : requireDate(input.employmentStartDate), employmentEndDate: null, payrollPolicy: role === 'patient' ? null : validatePayrollPolicy(input.payrollPolicy || DEFAULT_PAYROLL_POLICY) };
      if (profile.cnic) ensure(/^\d{5}-\d{7}-\d$/.test(profile.cnic), 'validation', 'Invalid CNIC.');
      if (profile.dateOfBirth) { requireDate(profile.dateOfBirth); ensure(profile.dateOfBirth <= hospitalDate(), 'validation', 'Birth date is in the future.'); }
      ensure(['', 'male', 'female', 'other'].includes(profile.gender) && ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(profile.bloodGroup), 'validation', 'Invalid gender/blood group.');
      const log = doc(collection(db, 'auditLogs'));
      return runTransaction(db, async tx => {
        const actor = self ? { id: current.uid, role: 'patient' } : await actorIn(tx, ['admin', 'receptionist']); ensure(actor.role !== 'receptionist' || role === 'patient', 'forbidden', 'Reception registers patients only.');
        const ref = refFor('users', authUser.uid); ensure(!(await tx.get(ref)).exists(), 'profile-exists', 'Registration will not overwrite an existing profile.');
        const department = role !== 'patient' ? await read(tx, 'departments', profile.departmentId) : null; if (department) { ensure(department.data.active, 'validation', 'Select an active department.'); profile.department = department.data.name; }
        let doctor = null;
        if (role === 'doctor') { requireText(profile.specialization, 'specialization'); requireText(profile.licenseNumber, 'medical license'); doctor = { fullName, specialization: profile.specialization, consultationFeeMinor: moneyToMinor(Number(input.consultationFee)), active: true, schedule: { weekdays: [], times: [], closedDates: [] }, messagingHours: null }; }
        write(tx, ref, profile, actor, log);
        if (department) write(tx, department.ref, { staffProfiles: { ...department.data.staffProfiles, [ref.id]: { fullName, role, active: true } }, ...(doctor ? { doctorIds: [...department.data.doctorIds, ref.id], doctorProfiles: { ...department.data.doctorProfiles, [ref.id]: doctor } } : {}) }, actor, log, department.data);
        emit(tx, log, actor, self ? 'USER_REGISTERED' : role === 'patient' ? 'PATIENT_REGISTERED' : 'STAFF_CREATED', 'users', ref.id, { role }); return { ...profile, id: ref.id };
      });
    }),
    registerWalkIn: (input, createdBy) => hospital.createProfile({ uid: `walk_${crypto.randomUUID()}`, email: null }, { ...input, role: 'patient' }, createdBy),
    updateProfile: (id, input) => mutate(['patient', 'doctor', 'receptionist', 'lab', 'admin'], 'PROFILE_UPDATED', 'users', id, async (tx, actor, log, audit) => {
      ensure(actor.id === id || ['receptionist', 'admin'].includes(actor.role), 'forbidden', 'Profile is not yours.'); const user = await read(tx, 'users', id); ensure(actor.id === id || user.data.role === 'patient', 'forbidden', 'Use staff administration for staff profiles.');
      ensure(Object.keys(input).every(key => ['fullName', 'phone', 'cnic', 'dateOfBirth', 'gender', 'address', 'emergencyContact', 'bloodGroup'].includes(key)), 'validation', 'Profile cannot change role, email, salary or access status.');
      const fields = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, requireText(value, key, key === 'address' ? 500 : 150, true)]));
      if (fields.fullName != null) { fields.fullName = requireText(fields.fullName, 'fullName', 100); fields.fullNameSearch = searchName(fields.fullName); }
      for (const key of ['phone', 'emergencyContact']) if (fields[key]) { fields[key] = normalizePhone(fields[key]); ensure(fields[key], 'validation', 'Invalid Pakistan mobile.'); }
      if (fields.cnic) ensure(/^\d{5}-\d{7}-\d$/.test(fields.cnic), 'validation', 'Invalid CNIC.'); if (fields.dateOfBirth) { requireDate(fields.dateOfBirth); ensure(fields.dateOfBirth <= hospitalDate(), 'validation', 'Birth date is in the future.'); }
      if (fields.gender) ensure(['male', 'female', 'other'].includes(fields.gender), 'validation', 'Invalid gender.'); if (fields.bloodGroup) ensure(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(fields.bloodGroup), 'validation', 'Invalid blood group.');
      const department = user.data.role === 'doctor' && fields.fullName ? await read(tx, 'departments', user.data.departmentId) : null;
      write(tx, user.ref, fields, actor, log, user.data);
      if (department) write(tx, department.ref, { doctorProfiles: { ...department.data.doctorProfiles, [id]: { ...department.data.doctorProfiles[id], fullName: fields.fullName } },
        staffProfiles: { ...department.data.staffProfiles, [id]: { ...department.data.staffProfiles[id], fullName: fields.fullName } } }, actor, log, department.data);
      audit({ fields: Object.keys(fields) }); return { id };
    }),
    setStaffStatus: (id, status, reason) => mutate(['admin'], 'STAFF_STATUS_CHANGED', 'users', id, async (tx, actor, log, audit) => {
      ensure(['active', 'disabled'].includes(status), 'validation', 'Invalid account status.'); const user = await read(tx, 'users', id); ensure(['doctor', 'receptionist', 'lab'].includes(user.data.role), 'forbidden', 'The sole admin/patients cannot be changed here.');
      const department = await read(tx, 'departments', user.data.departmentId); write(tx, user.ref, { accountStatus: status, statusReason: requireText(reason, 'reason', 1000) }, actor, log, user.data);
      write(tx, department.ref, { staffProfiles: { ...department.data.staffProfiles, [id]: { ...department.data.staffProfiles[id], active: status === 'active' } }, ...(user.data.role === 'doctor' ? { doctorProfiles: { ...department.data.doctorProfiles, [id]: { ...department.data.doctorProfiles[id], active: status === 'active' } } } : {}) }, actor, log, department.data);
      audit({ userId: id, status }); return { id };
    }),
    editStaff: (id, input) => mutate(['admin'], 'STAFF_EDITED', 'users', id, async (tx, actor, log, audit) => {
      const user = await read(tx, 'users', id); ensure(['doctor', 'receptionist', 'lab'].includes(user.data.role), 'forbidden', 'Edit staff only; roles, email identities and the sole administrator are immutable here.');
      ensure(Object.keys(input).every(key => ['fullName', 'phone', 'specialization', 'licenseNumber', 'employmentStartDate', 'employmentEndDate'].includes(key)), 'validation', 'Unsupported staff edit.');
      const fields = { ...input };
      if (fields.fullName != null) { fields.fullName = requireText(fields.fullName, 'fullName', 100); fields.fullNameSearch = searchName(fields.fullName); }
      if (fields.phone) { fields.phone = normalizePhone(fields.phone); ensure(fields.phone, 'validation', 'Invalid mobile number.'); }
      if (fields.specialization != null) fields.specialization = requireText(fields.specialization, 'specialization', 150, user.data.role !== 'doctor');
      if (fields.licenseNumber != null) fields.licenseNumber = requireText(fields.licenseNumber, 'licenseNumber', 100, user.data.role !== 'doctor');
      if (Object.hasOwn(fields, 'employmentStartDate')) requireDate(fields.employmentStartDate);
      if (Object.hasOwn(fields, 'employmentEndDate')) fields.employmentEndDate = fields.employmentEndDate || null;
      if (fields.employmentEndDate) { requireDate(fields.employmentEndDate); ensure(fields.employmentEndDate >= (fields.employmentStartDate || user.data.employmentStartDate), 'validation', 'Employment end precedes start.'); }
      const department = await read(tx, 'departments', user.data.departmentId);
      write(tx, user.ref, fields, actor, log, user.data);
      const merged = { ...user.data, ...fields };
      write(tx, department.ref, { staffProfiles: { ...department.data.staffProfiles, [id]: { ...department.data.staffProfiles[id], fullName: merged.fullName } },
        ...(user.data.role === 'doctor' ? { doctorProfiles: { ...department.data.doctorProfiles, [id]: { ...department.data.doctorProfiles[id], fullName: merged.fullName, specialization: merged.specialization } } } : {}) }, actor, log, department.data);
      audit({ fields: Object.keys(fields) }); return { id };
    }),
    recordAuthEvent: action => resultOf(async () => {
      ensure(['USER_LOGIN', 'USER_LOGOUT'].includes(action) && auth.currentUser, 'validation', 'Invalid authentication event.'); const uid = auth.currentUser.uid; const log = doc(collection(db, 'auditLogs')); const batch = writeBatch(db);
      batch.set(log, { schemaVersion: 2, actorId: uid, userId: uid, action, targetCollection: 'users', targetId: uid, timestamp: serverTimestamp(), details: { userAgent: navigator.userAgent.slice(0, 500), platform: navigator.userAgentData?.platform || navigator.platform || '', ipAddress: null, ipSource: 'unavailable-client-only' } });
      if (action === 'USER_LOGIN') batch.update(refFor('users', uid), { lastLogin: serverTimestamp(), lastAuthAuditId: log.id }); await batch.commit(); return { id: log.id };
    }),
    createDepartment: input => mutate(['admin'], 'DEPARTMENT_CREATED', 'departments', input.id, async (tx, actor, log, audit) => {
      const ref = refFor('departments', input.id); ensure(!(await tx.get(ref)).exists(), 'duplicate', 'Department already exists.'); const data = { kind: 'department', name: requireText(input.name, 'name', 100), active: true, emergencyEnabled: Boolean(input.emergencyEnabled),
        headDoctorId: null, doctorIds: [], doctorProfiles: {}, staffProfiles: {}, services: {}, revenueMinor: 0, revenue: 0, collectedRevenue: 0, lastPaidInvoiceId: null };
      write(tx, ref, data, actor, log); audit(); return { id: ref.id, ...data };
    }),
    configureService: (departmentId, serviceId, input) => mutate(['admin'], 'DEPARTMENT_SERVICE_UPDATED', 'departments', departmentId, async (tx, actor, log, audit) => {
      requireId(serviceId); ensure(['lab', 'operation', 'consultation'].includes(input.type), 'validation', 'Invalid service type.'); const department = await read(tx, 'departments', departmentId);
      ensure(Object.keys(department.data.services).length < 100 || Object.hasOwn(department.data.services, serviceId), 'limit-exceeded', 'At most 100 services.');
      const service = { name: requireText(input.name, 'service name', 150), type: input.type, priceMinor: moneyToMinor(input.price), active: input.active !== false };
      write(tx, department.ref, { services: { ...department.data.services, [serviceId]: service } }, actor, log, department.data); audit({ serviceId }); return { serviceId };
    }),
    editDepartment: (id, input) => mutate(['admin'], 'DEPARTMENT_UPDATED', 'departments', id, async (tx, actor, log, audit) => {
      const department = await read(tx, 'departments', id); ensure(id !== '_settings', 'validation', 'Use alert settings for hospital configuration.');
      const name = requireText(input.name, 'name', 100); ensure(typeof input.active === 'boolean' && typeof input.emergencyEnabled === 'boolean', 'validation', 'Select explicit department status/triage settings.');
      write(tx, department.ref, { name, active: input.active, emergencyEnabled: input.emergencyEnabled }, actor, log, department.data); audit(); return { id };
    }),
    configureDoctor: (departmentId, doctorId, input) => mutate(['admin'], 'DOCTOR_SCHEDULE_UPDATED', 'departments', departmentId, async (tx, actor, log, audit) => {
      const department = await read(tx, 'departments', departmentId); const doctor = await read(tx, 'users', doctorId); ensure(doctor.data.role === 'doctor' && doctor.data.departmentId === departmentId, 'validation', 'Doctor must belong to this department.'); const schedule = input.schedule;
      ensure(schedule && Array.isArray(schedule.times) && schedule.times.length && schedule.times.length <= 48 && new Set(schedule.times).size === schedule.times.length && Array.isArray(schedule.weekdays) && schedule.weekdays.length && schedule.weekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6), 'validation', 'Configure distinct actual slots and valid weekdays.');
      for (const time of schedule.times) appointmentInstant(hospitalDate(), time); ensure(Array.isArray(schedule.closedDates || []) && (schedule.closedDates || []).length <= 60, 'validation', 'Too many schedule exceptions.'); for (const date of schedule.closedDates || []) requireDate(date);
      const data = { fullName: doctor.data.fullName, specialization: doctor.data.specialization, active: doctor.data.accountStatus === 'active', consultationFeeMinor: moneyToMinor(input.consultationFee),
        schedule: { weekdays: [...new Set(schedule.weekdays)], times: [...schedule.times].sort(), closedDates: schedule.closedDates || [] }, messagingHours: department.data.doctorProfiles[doctorId]?.messagingHours || null };
      write(tx, department.ref, { doctorProfiles: { ...department.data.doctorProfiles, [doctorId]: data }, ...(input.isHeadDoctor ? { headDoctorId: doctorId } : {}) }, actor, log, department.data); audit({ doctorId }); return { doctorId };
    }),
    configurePayroll: (id, input) => mutate(['admin'], 'PAYROLL_POLICY_UPDATED', 'users', id, async (tx, actor, log, audit) => {
      const user = await read(tx, 'users', id); ensure(['doctor', 'receptionist', 'lab'].includes(user.data.role), 'validation', 'Select staff.'); const policy = validatePayrollPolicy({ ...input.policy, divisor: 26, version: (user.data.payrollPolicy?.version || 0) + 1 }); const baseSalaryMinor = moneyToMinor(input.baseSalary); ensure(baseSalaryMinor > 0, 'validation', 'Base salary must be greater than zero.');
      write(tx, user.ref, { payrollPolicy: policy, baseSalaryMinor }, actor, log, user.data); audit({ policyVersion: policy.version }); return { userId: id };
    }),
    createBed: input => mutate(['admin'], 'BED_CREATED', 'beds', input.id, async (tx, actor, log, audit) => {
      ensure(['ICU', 'General', 'Emergency', 'Isolation', 'CCU', 'NICU', 'PICU'].includes(input.type), 'validation', 'Invalid bed type.'); const ref = refFor('beds', input.id); ensure(!(await tx.get(ref)).exists(), 'duplicate', 'Bed exists.');
      const data = { type: input.type, label: requireText(input.label || input.id, 'label', 100), status: 'available', patientId: null, visitId: null, sessionId: null, assignedAt: null, rateAtAssignmentMinor: null, dailyRateMinor: moneyToMinor(input.dailyRate), dailyRate: input.dailyRate };
      write(tx, ref, data, actor, log); audit(); return { id: ref.id, ...data };
    }),
    createInventory: input => mutate(['admin'], 'INVENTORY_CREATED', 'inventory', input.id, async (tx, actor, log, audit) => {
      const ref = refFor('inventory', input.id); ensure(!(await tx.get(ref)).exists(), 'duplicate', 'Inventory exists.'); const quantity = requireNumber(input.quantity, 'quantity', 0, 1_000_000_000, true); const threshold = requireNumber(input.threshold, 'threshold', 0, 1_000_000_000, true); const priceMinor = moneyToMinor(input.price);
      const costMinor = requireNumber(quantity * priceMinor, 'purchaseValueMinor', 0, Number.MAX_SAFE_INTEGER, true);
      ensure(['medicine', 'equipment', 'supply', 'surgical', 'lab', 'ppe'].includes(input.category), 'validation', 'Invalid category.'); const data = { name: requireText(input.name, 'name', 150), category: input.category, unit: requireText(input.unit, 'unit', 50), quantity, threshold, priceMinor, price: input.price, usedQuantity: 0, usageValueMinor: 0, purchasedQuantity: quantity, purchaseValueMinor: costMinor, lowStock: quantity <= threshold, lastOperationId: null };
      write(tx, ref, data, actor, log); audit({ quantity, costMinor: quantity * priceMinor }); return { id: ref.id, ...data };
    }),
    restockInventory: (id, quantity, reason) => mutate(['admin'], 'INVENTORY_RESTOCKED', 'inventory', id, async (tx, actor, log, audit) => {
      requireNumber(quantity, 'quantity', 1, 1_000_000, true); const inventory = await read(tx, 'inventory', id); const remaining = requireNumber(inventory.data.quantity + quantity, 'newQuantity', 0, 1_000_000_000, true); const costMinor = quantity * inventory.data.priceMinor;
      const purchaseValueMinor = requireNumber(inventory.data.purchaseValueMinor + costMinor, 'purchaseValueMinor', 0, Number.MAX_SAFE_INTEGER, true);
      write(tx, inventory.ref, { quantity: remaining, lowStock: remaining <= inventory.data.threshold, purchasedQuantity: inventory.data.purchasedQuantity + quantity, purchaseValueMinor }, actor, log, inventory.data); audit({ quantity, costMinor, reason: requireText(reason, 'reason', 1000) }); return { id, quantity: remaining };
    }),
    editInventory: (id, input) => mutate(['admin'], 'INVENTORY_UPDATED', 'inventory', id, async (tx, actor, log, audit) => {
      const inventory = await read(tx, 'inventory', id); const threshold = requireNumber(input.threshold, 'threshold', 0, 1_000_000_000, true);
      write(tx, inventory.ref, { name: requireText(input.name, 'name', 150), threshold, priceMinor: moneyToMinor(input.price), price: input.price, lowStock: inventory.data.quantity <= threshold }, actor, log, inventory.data); audit(); return { id };
    }),
    editBed: (id, input) => mutate(['admin'], 'BED_UPDATED', 'beds', id, async (tx, actor, log, audit) => {
      const bed = await read(tx, 'beds', id); ensure(['available', 'maintenance'].includes(bed.data.status), 'bed-occupied', 'Do not reprice or reconfigure an occupied bed.');
      write(tx, bed.ref, { label: requireText(input.label, 'label', 100), dailyRateMinor: moneyToMinor(input.dailyRate), dailyRate: input.dailyRate, status: input.maintenance ? 'maintenance' : 'available' }, actor, log, bed.data); audit(); return { id };
    }),
    setMessagingHours: input => resultOf(async () => {
      const current = auth.currentUser; ensure(current, 'unauthenticated', 'Sign in.');
      const profile = await getDoc(refFor('users', current.uid)); ensure(profile.exists() && profile.data().role === 'doctor', 'forbidden', 'Only doctors configure their availability.');
      const departmentId = profile.data().departmentId;
      ensure(Array.isArray(input.days) && input.days.length && new Set(input.days).size === input.days.length && input.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6), 'validation', 'Select valid distinct weekdays.');
      appointmentInstant(hospitalDate(), input.start); appointmentInstant(hospitalDate(), input.end); ensure(input.start < input.end, 'validation', 'Messaging start must precede end.');
      const hours = { days: input.days, start: input.start, end: input.end, autoReply: requireText(input.autoReply, 'autoReply', 500) };
      const result = await mutate(['doctor'], 'MESSAGING_HOURS_UPDATED', 'departments', departmentId, async (tx, actor, log, audit) => {
        const department = await read(tx, 'departments', departmentId); const doctor = publicDoctor(department.data, actor.id);
        write(tx, department.ref, { doctorProfiles: { ...department.data.doctorProfiles, [actor.id]: { ...doctor, messagingHours: hours } } }, actor, log, department.data); audit({ doctorId: actor.id }); return { doctorId: actor.id };
      });
      ensure(result.success, result.code, result.error); return result.data;
    }),
    directory: () => resultOf(async () => (await collect('departments', { active: true })).map(department => ({ id: department.id, name: department.name,
      doctors: Object.entries(department.doctorProfiles).filter(([, doctor]) => doctor.active).map(([id, doctor]) => ({ ...doctor, id, role: 'doctor', departmentId: department.id, departmentName: department.name })) }))),
    searchDirectory: term => resultOf(async () => {
      const text = requireText(term, 'search', 100); ensure(text.length >= 2, 'validation', 'Enter at least two characters.');
      const snapshot = await getDoc(refFor('users', auth.currentUser.uid)); ensure(snapshot.exists(), 'not-found', 'Profile not found.'); const role = snapshot.data().role;
      const directory = await hospital.directory(); ensure(directory.success, directory.code, directory.error); const candidates = directory.data.flatMap(department => department.doctors);
      if (['doctor', 'receptionist', 'admin'].includes(role)) {
        const prefix = searchName(text); const field = /^[+\d ().-]+$/.test(text) ? 'phone' : 'fullNameSearch';
        const value = field === 'phone' ? `+${text.replace(/[+\s()-]/g, '').replace(/^0(?=3)/, '92')}` : prefix;
        const constraints = [where('role', '==', 'patient'), where(field, '>=', value), where(field, '<=', `${value}\uf8ff`), orderBy(field), limit(50)];
        if (role === 'doctor') constraints.push(where('careTeamIds', 'array-contains', auth.currentUser.uid));
        candidates.push(...(await getDocsFromServer(query(collection(db, 'users'), ...constraints))).docs.map(document => {
          const data = document.data(); return { id: document.id, role: 'patient', fullName: data.fullName, phone: data.phone };
        }));
        if (/^[A-Za-z0-9_-]{12,128}$/.test(text)) {
          try { const exact = await getDoc(refFor('users', text)); if (exact.exists() && exact.data().role === 'patient') candidates.push({ id: exact.id, role: 'patient', fullName: exact.data().fullName, phone: exact.data().phone }); }
          catch (error) { if (error.code !== 'permission-denied') throw error; }
        }
      }
      return [...new Map(new Fuse(candidates, { keys: ['fullName', 'id', 'phone', 'specialization'], threshold: 0.4, ignoreLocation: true }).search(text).map(({ item }) => [item.id, item])).values()].slice(0, 20);
    }),
    configureAlerts: input => mutate(['admin'], 'SETTINGS_UPDATED', 'departments', '_settings', async (tx, actor, log, audit) => {
      requireNumber(input.labCapacity, 'labCapacity', 1, 100000, true); requireNumber(input.emergencyThreshold, 'emergencyThreshold', 1, 100000, true);
      const ref = refFor('departments', '_settings'); const existing = await tx.get(ref); write(tx, ref, { kind: 'settings', active: false, labCapacity: input.labCapacity, emergencyThreshold: input.emergencyThreshold }, actor, log, existing.exists() ? existing.data() : null); audit(); return input;
    }),
    alertMetrics: () => resultOf(async () => {
      const [usable, occupied, labs, emergencies, settings] = await Promise.all([
        aggregate('beds', [where('status', 'in', ['available', 'occupied'])]), aggregate('beds', [where('status', '==', 'occupied')]),
        aggregate('labRequests', [where('status', '==', 'pending')]), aggregate('appointments', [where('isEmergency', '==', true), ...between('firstTriagedAt', reportRange(hospitalDate(), hospitalDate()))]), getDoc(refFor('departments', '_settings')),
      ]);
      const occupancy = usable.count ? occupied.count / usable.count * 100 : null; const alerts = [];
      if (occupancy > 80) alerts.push('Usable bed occupancy exceeds 80%.');
      if (settings.exists()) { if (labs.count > settings.data().labCapacity) alerts.push('Pending laboratory work exceeds the configured capacity.'); if (emergencies.count > settings.data().emergencyThreshold) alerts.push('Emergency assessments exceed the configured daily threshold.'); }
      return { occupancy, pendingLabs: labs.count, emergencies: emergencies.count, configured: settings.exists(), alerts };
    }),
    analytics: (start, end) => resultOf(async () => {
      const range = reportRange(start, end); const current = auth.currentUser; ensure(current, 'unauthenticated', 'Sign in.'); const profile = await getDoc(refFor('users', current.uid)); ensure(profile.exists() && ['doctor', 'admin'].includes(profile.data().role), 'forbidden', 'Only clinical/admin analytics are available.');
      const doctorOnly = profile.data().role === 'doctor';
      const departments = doctorOnly ? [] : (await collect('departments')).filter(department => department.id !== '_settings');
      const doctors = doctorOnly ? [{ id: current.uid, name: profile.data().fullName }] : departments.flatMap(department => Object.entries(department.doctorProfiles).map(([id, doctor]) => ({ id, name: doctor.fullName })));
      const performances = await Promise.all(doctors.map(async doctor => {
        const [visits, ratings, patients] = await Promise.all([
          aggregate('visits', [where('doctorId', '==', doctor.id), where('status', '==', 'discharged'), ...between('createdAt', range)]),
          aggregate('ratings', [where('doctorId', '==', doctor.id), ...between('createdAt', range)], { count: count(), rating: average('rating') }),
          aggregate('users', [where('role', '==', 'patient'), where('treatedDoctorIds', 'array-contains', doctor.id)]),
        ]); return { ...doctor, completedVisits: visits.count, rating: ratings.rating, count: ratings.count, lifetimePatients: patients.count };
      }));
      if (doctorOnly) return { start, end, doctors: performances };
      const paid = [where('status', '==', 'paid'), ...between('paidAt', range)];
      const [revenue, completed, acquisition] = await Promise.all([
        aggregate('invoices', paid, { total: sum('totalMinor') }), aggregate('visits', [where('status', '==', 'discharged'), ...between('createdAt', range)]),
        aggregate('auditLogs', [where('action', 'in', ['INVENTORY_CREATED', 'INVENTORY_RESTOCKED']), ...between('timestamp', range)], { total: sum('details.costMinor') }),
      ]);
      const length = range.until.toMillis() - range.from.toMillis(); const previousRange = { from: Timestamp.fromMillis(range.from.toMillis() - length), until: range.from };
      const previous = await aggregate('invoices', [where('status', '==', 'paid'), ...between('paidAt', previousRange)], { total: sum('totalMinor') });
      const months = []; let month = start.slice(0, 7);
      while (month <= end.slice(0, 7)) {
        const first = `${month}-01`; const last = monthDates(Number(month.slice(5)), Number(month.slice(0, 4))).at(-1); const part = reportRange(first < start ? start : first, last > end ? end : last);
        const [receipts, purchases] = await Promise.all([aggregate('invoices', [where('status', '==', 'paid'), ...between('paidAt', part)], { total: sum('totalMinor') }),
          aggregate('auditLogs', [where('action', 'in', ['INVENTORY_CREATED', 'INVENTORY_RESTOCKED']), ...between('timestamp', part)], { total: sum('details.costMinor') })]);
        months.push({ label: month, revenueMinor: receipts.total, inventoryCostMinor: purchases.total }); const next = new Date(`${first}T00:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1); month = next.toISOString().slice(0, 7);
      }
      const byDepartment = await Promise.all(departments.map(async department => ({ id: department.id, name: department.name, revenueMinor: (await aggregate('invoices', [...paid, where('departmentId', '==', department.id)], { total: sum('totalMinor') })).total })));
      const emergencyHours = await Promise.all(Array.from({ length: 24 }, async (_, hour) => ({ hour, count: (await aggregate('appointments', [where('isEmergency', '==', true), where('firstTriageHour', '==', hour), ...between('firstTriagedAt', range)])).count })));
      const ranked = performances.filter(doctor => doctor.count > 0).sort((a, b) => b.rating - a.rating || b.count - a.count);
      return { start, end, revenueMinor: revenue.total, completedVisits: completed.count, inventoryCostMinor: acquisition.total, revenueChangePercent: previous.total ? (revenue.total - previous.total) / previous.total * 100 : null,
        months, departments: byDepartment, doctors: performances, highestRated: ranked[0] || null, emergencyHours };
    }),
    exportData: () => resultOf(async () => {
      const user = auth.currentUser; ensure(user, 'unauthenticated', 'Sign in.'); const profile = await getDoc(refFor('users', user.uid)); ensure(profile.exists() && profile.data().role === 'admin', 'forbidden', 'Only verified administration can export.');
      const startedAt = new Date().toISOString(); const data = {}; let size = 0;
      for (const name of COLLECTIONS.filter(name => !['chats', 'messages'].includes(name))) { data[name] = await collect(name); size += new TextEncoder().encode(JSON.stringify(data[name])).length; ensure(size <= 20_000_000, 'export-too-large', 'Export exceeds safe browser memory limits. Use the protected owner backup tool.'); }
      const log = doc(collection(db, 'auditLogs')); const batch = writeBatch(db); batch.set(log, { schemaVersion: 2, actorId: user.uid, userId: user.uid, action: 'DATA_EXPORTED', targetCollection: 'users', targetId: user.uid,
        details: { collections: Object.keys(data), bytes: size, startedAt }, timestamp: serverTimestamp() }); await batch.commit();
      return { schemaVersion: 2, startedAt, finishedAt: new Date().toISOString(), pointInTime: false, excludedCollections: ['chats', 'messages'], data };
    }),
  };
  return Object.freeze(hospital);
};

export const hospital = createHospitalDatabase({ auth, db });
