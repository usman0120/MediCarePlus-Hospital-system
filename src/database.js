import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  Timestamp,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  increment,
  writeBatch,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { compressData, generatePDF, formatCurrency, formatTime } from '../src/utils/helpers';
import { 
  APPOINTMENT_STATUS, 
  VISIT_STATUS, 
  INVOICE_STATUS, 
  BED_STATUS,
  LAB_REQUEST_STATUS,
  OPERATION_STATUS, 
  AUDIT_ACTIONS,
  ALERT_TYPES,
  ALERT_SEVERITY
} from './utils/constants';
import { createStaffUser } from './auth.js';

// ==================== USER MANAGEMENT ====================
export const getUserById = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { 
        success: true, 
        data: { 
          id: userDoc.id, 
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt?.toDate?.() || null,
          lastLogin: userDoc.data().lastLogin?.toDate?.() || null
        } 
      };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: error.message };
  }
};
/**
 * Create staff user
 * @param {Object} staffData - Staff data including profileImage
 * @param {string} createdBy - Creator user ID
 * @returns {Promise<Object>} Created staff data
 */
export const createStaff = async (staffData, createdBy) => {
  try {
    // Validate required fields
    if (!staffData.email || !staffData.fullName || !staffData.role || !staffData.password) {
      return { success: false, error: 'Missing required fields' };
    }

    // Validate profile image size if provided
    if (staffData.profileImage) {
      // Base64 string length roughly corresponds to file size
      // Base64 adds ~33% overhead, so check approximate size
      const approximateSize = Math.ceil(staffData.profileImage.length * 0.75);
      if (approximateSize > 2 * 1024 * 1024) { // 2MB
        return { success: false, error: 'Profile image size should be less than 2MB' };
      }
    }

    // Use the auth function to create staff user
    const result = await createStaffUser(staffData, createdBy);
    
    if (result.success) {
      return result;
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error in createStaff:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserStatus = async (userId, status, updatedBy) => {
  try {
    if (!userId || !status) {
      return { success: false, error: 'Missing required fields' };
    }

    await updateDoc(doc(db, 'users', userId), {
      accountStatus: status,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: AUDIT_ACTIONS.USER_UPDATED,
      targetUserId: userId,
      newStatus: status,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { success: false, error: error.message };
  }
};

// ==================== APPOINTMENT MANAGEMENT ====================

export const getAppointmentsByDoctor = async (doctorId, date = null, status = null) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    let constraints = [
      where('doctorId', '==', doctorId),
      orderBy('date', 'desc'),
      orderBy('time', 'asc')
    ];

    if (date) {
      constraints.push(where('date', '==', date));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }

    const q = query(collection(db, 'appointments'), ...constraints);
    const snapshot = await getDocs(q);
    
    const appointments = [];
    for (const docSnap of snapshot.docs) {
      const appointment = { 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      
      // Get patient details
      const patientData = await getUserById(appointment.patientId);
      if (patientData.success) {
        appointment.patient = patientData.data;
      }
      appointments.push(appointment);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { success: false, error: error.message };
  }
};

export const updateAppointmentStatus = async (appointmentId, status, updatedBy) => {
  try {
    if (!appointmentId || !status) {
      return { success: false, error: 'Missing required fields' };
    }

    await updateDoc(doc(db, 'appointments', appointmentId), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: error.message };
  }
};

// ==================== EMR/VISIT MANAGEMENT ====================

export const createVisit = async (visitData) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Check if there's an active visit
      const activeVisitsQuery = query(
        collection(db, 'visits'),
        where('patientId', '==', visitData.patientId),
        where('status', '==', VISIT_STATUS.ACTIVE)
      );
      
      const activeVisits = await getDocs(activeVisitsQuery);
      if (!activeVisits.empty) {
        throw new Error('Patient already has an active visit');
      }

      const visitRef = doc(collection(db, 'visits'));
      const visit = {
        id: visitRef.id,
        ...visitData,
        status: VISIT_STATUS.ACTIVE,
        locked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        vitals: visitData.vitals || {},
        prescriptions: [],
        labRequests: [],
        notes: []
      };

      transaction.set(visitRef, visit);

      // Update appointment if exists
      if (visitData.appointmentId) {
        const appointmentRef = doc(db, 'appointments', visitData.appointmentId);
        transaction.update(appointmentRef, {
          status: APPOINTMENT_STATUS.COMPLETED,
          visitId: visitRef.id,
          updatedAt: serverTimestamp()
        });
      }

      return { success: true, data: { id: visitRef.id, ...visit } };
    });
  } catch (error) {
    console.error('Error creating visit:', error);
    return { success: false, error: error.message };
  }
};

export const getVisitsByDoctor = async (doctorId) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    const q = query(
      collection(db, 'visits'),
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const visits = [];
    
    for (const docSnap of snapshot.docs) {
      const visit = { 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      
      // Get patient details
      const patientData = await getUserById(visit.patientId);
      if (patientData.success) {
        visit.patientName = patientData.data.fullName;
      }
      
      visits.push(visit);
    }

    return { success: true, data: visits };
  } catch (error) {
    console.error('Error fetching visits:', error);
    return { success: false, error: error.message };
  }
};

export const getVisitsByPatient = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    const q = query(
      collection(db, 'visits'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const visits = [];
    
    for (const docSnap of snapshot.docs) {
      const visit = { 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      
      // Get doctor details
      const doctorData = await getUserById(visit.doctorId);
      if (doctorData.success) {
        visit.doctorName = doctorData.data.fullName;
      }
      
      visits.push(visit);
    }

    return { success: true, data: visits };
  } catch (error) {
    console.error('Error fetching visits:', error);
    return { success: false, error: error.message };
  }
};

export const updateVisitEMR = async (visitId, emrData, doctorId) => {
  try {
    if (!visitId || !emrData) {
      return { success: false, error: 'Missing required fields' };
    }

    const visitRef = doc(db, 'visits', visitId);
    const visitDoc = await getDoc(visitRef);

    if (!visitDoc.exists()) {
      return { success: false, error: 'Visit not found' };
    }

    const visit = visitDoc.data();
    
    if (visit.locked) {
      return { success: false, error: 'Visit is locked. Cannot modify.' };
    }

    await updateDoc(visitRef, {
      ...emrData,
      updatedAt: serverTimestamp(),
      updatedBy: doctorId
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating EMR:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PRESCRIPTION MANAGEMENT ====================

export const addPrescription = async (visitId, prescriptionData, doctorId) => {
  try {
    if (!visitId || !prescriptionData || !doctorId) {
      return { success: false, error: 'Missing required fields' };
    }

    const visitRef = doc(db, 'visits', visitId);
    const visitDoc = await getDoc(visitRef);

    if (!visitDoc.exists()) {
      return { success: false, error: 'Visit not found' };
    }

    if (visitDoc.data().locked) {
      return { success: false, error: 'Visit is locked' };
    }

    // Get doctor details for PDF
    const doctorData = await getUserById(doctorId);
    
    // Generate PDF
    const pdfBase64 = await generatePDF('prescription', {
      ...prescriptionData,
      doctorId,
      doctorName: doctorData.success ? doctorData.data.fullName : 'Doctor',
      licenseNumber: doctorData.success ? doctorData.data.licenseNumber : '',
      visitId,
      date: new Date().toISOString()
    });

    const compressedPDF = compressData(pdfBase64);

    const prescription = {
      ...prescriptionData,
      id: doc(collection(db, 'prescriptions')).id,
      doctorId,
      pdfBase64: compressedPDF,
      createdAt: serverTimestamp()
    };

    await updateDoc(visitRef, {
      prescriptions: arrayUnion(prescription),
      updatedAt: serverTimestamp()
    });

    return { success: true, data: prescription };
  } catch (error) {
    console.error('Error adding prescription:', error);
    return { success: false, error: error.message };
  }
};
// ==================== BILLING & INVOICES ====================

export const createInvoice = async (invoiceData) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Calculate total
      let subtotal = 0;
      const items = invoiceData.items.map(item => {
        const amount = item.quantity ? item.quantity * item.unitPrice : item.amount;
        subtotal += amount;
        return { ...item, calculatedAmount: amount };
      });

      const tax = invoiceData.taxRate ? subtotal * (invoiceData.taxRate / 100) : 0;
      const total = subtotal + tax;

      const invoiceRef = doc(collection(db, 'invoices'));
      const invoice = {
        id: invoiceRef.id,
        ...invoiceData,
        items,
        subtotal,
        tax,
        total,
        status: INVOICE_STATUS.UNPAID,
        locked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      transaction.set(invoiceRef, invoice);

      // Update department revenue
      if (invoiceData.departmentId) {
        const deptRef = doc(db, 'departments', invoiceData.departmentId);
        transaction.update(deptRef, {
          revenue: increment(total),
          updatedAt: serverTimestamp()
        });
      }

      return { success: true, data: invoice };
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: error.message };
  }
};

export const getInvoicesByPatient = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    const q = query(
      collection(db, 'invoices'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const invoices = [];
    
    for (const docSnap of snapshot.docs) {
      const invoice = { 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      invoices.push(invoice);
    }

    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return { success: false, error: error.message };
  }
};

export const getPendingPayments = async () => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const payments = [];
    
    for (const doc of snapshot.docs) {
      const payment = { id: doc.id, ...doc.data() };
      
      // Get patient details
      if (payment.patientId) {
        try {
          const patientDoc = await getDoc(doc(db, 'users', payment.patientId));
          if (patientDoc.exists()) {
            payment.patientName = patientDoc.data().fullName;
            payment.patientPhone = patientDoc.data().phone;
          }
        } catch (error) {
          console.error('Error fetching patient:', error);
        }
      }
      
      payments.push(payment);
    }
    
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting pending payments:', error);
    
    // Fallback: try without orderBy
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(invoicesRef, where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const payments = [];
      
      for (const doc of snapshot.docs) {
        const payment = { id: doc.id, ...doc.data() };
        
        if (payment.patientId) {
          try {
            const patientDoc = await getDoc(doc(db, 'users', payment.patientId));
            if (patientDoc.exists()) {
              payment.patientName = patientDoc.data().fullName;
              payment.patientPhone = patientDoc.data().phone;
            }
          } catch (error) {
            console.error('Error fetching patient:', error);
          }
        }
        
        payments.push(payment);
      }
      
      return { success: true, data: payments };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

/**
 * Add item to invoice
 * @param {string} invoiceId - Invoice ID
 * @param {Object} item - Item to add
 * @param {string} addedBy - User ID
 * @returns {Promise<Object>} Success status
 */
export const addInvoiceItem = async (invoiceId, item, addedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await transaction.get(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceDoc.data();
      
      if (invoice.locked || invoice.status === INVOICE_STATUS.PAID) {
        throw new Error('Cannot modify paid or locked invoice');
      }

      // Calculate new total
      const itemAmount = item.quantity ? item.quantity * item.unitPrice : item.amount;
      const newSubtotal = (invoice.subtotal || 0) + itemAmount;
      const newTax = invoice.taxRate ? newSubtotal * (invoice.taxRate / 100) : 0;
      const newTotal = newSubtotal + newTax;

      transaction.update(invoiceRef, {
        items: arrayUnion({ ...item, calculatedAmount: itemAmount }),
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        updatedAt: serverTimestamp(),
        updatedBy: addedBy
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error adding invoice item:', error);
    return { success: false, error: error.message };
  }
};

export const processPayment = async (invoiceId, paymentData, confirmedBy = null) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await transaction.get(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceDoc.data();
      
      if (invoice.status === INVOICE_STATUS.PAID) {
        throw new Error('Invoice already paid');
      }

      // Compress payment proof if exists
      let paymentProof = null;
      if (paymentData.proof) {
        paymentProof = compressData(paymentData.proof);
      }

      const payment = {
        ...paymentData,
        proof: paymentProof,
        confirmedBy,
        confirmedAt: confirmedBy ? serverTimestamp() : null,
        timestamp: serverTimestamp()
      };

      transaction.update(invoiceRef, {
        status: confirmedBy ? INVOICE_STATUS.PAID : INVOICE_STATUS.PENDING,
        payment,
        locked: confirmedBy ? true : false,
        updatedAt: serverTimestamp()
      });

      // If confirmed, update department revenue
      if (confirmedBy && invoice.departmentId) {
        const deptRef = doc(db, 'departments', invoice.departmentId);
        transaction.update(deptRef, {
          collectedRevenue: increment(invoice.total),
          updatedAt: serverTimestamp()
        });
      }

      // Log transaction
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: confirmedBy || paymentData.patientId,
        action: confirmedBy ? AUDIT_ACTIONS.PAYMENT_CONFIRMED : AUDIT_ACTIONS.PAYMENT_PROCESSED,
        invoiceId,
        amount: invoice.total,
        timestamp: serverTimestamp()
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, error: error.message };
  }
};

// ==================== BED MANAGEMENT ====================

export const assignBed = async (bedId, patientId, assignedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const bedRef = doc(db, 'beds', bedId);
      const bedDoc = await transaction.get(bedRef);

      if (!bedDoc.exists()) {
        throw new Error('Bed not found');
      }

      const bed = bedDoc.data();
      
      if (bed.status !== BED_STATUS.AVAILABLE) {
        throw new Error('Bed is not available');
      }

      // Update bed
      transaction.update(bedRef, {
        status: BED_STATUS.OCCUPIED,
        patientId,
        assignedAt: serverTimestamp(),
        assignedBy,
        lastUpdated: serverTimestamp()
      });

      // Update patient
      const patientRef = doc(db, 'users', patientId);
      transaction.update(patientRef, {
        currentBedId: bedId,
        updatedAt: serverTimestamp()
      });

      // Create bed charge in invoice
      if (bed.dailyRate) {
        const invoiceRef = doc(collection(db, 'invoices'));
        transaction.set(invoiceRef, {
          patientId,
          type: 'bed_charge',
          bedId,
          items: [{
            description: `Bed Charge - ${bed.type}`,
            amount: bed.dailyRate,
            quantity: 1,
            unitPrice: bed.dailyRate
          }],
          subtotal: bed.dailyRate,
          total: bed.dailyRate,
          status: INVOICE_STATUS.UNPAID,
          createdAt: serverTimestamp(),
          createdBy: assignedBy
        });
      }

      // Log assignment
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: assignedBy,
        action: AUDIT_ACTIONS.BED_ASSIGNED,
        bedId,
        patientId,
        timestamp: serverTimestamp()
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error assigning bed:', error);
    return { success: false, error: error.message };
  }
};

export const releaseBed = async (bedId, releasedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const bedRef = doc(db, 'beds', bedId);
      const bedDoc = await transaction.get(bedRef);

      if (!bedDoc.exists()) {
        throw new Error('Bed not found');
      }

      const bed = bedDoc.data();
      
      if (bed.status !== BED_STATUS.OCCUPIED) {
        throw new Error('Bed is not occupied');
      }

      // Update bed
      transaction.update(bedRef, {
        status: BED_STATUS.AVAILABLE,
        patientId: null,
        releasedAt: serverTimestamp(),
        releasedBy,
        lastUpdated: serverTimestamp()
      });

      // Update patient
      if (bed.patientId) {
        const patientRef = doc(db, 'users', bed.patientId);
        transaction.update(patientRef, {
          currentBedId: null,
          updatedAt: serverTimestamp()
        });
      }

      // Log release
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: releasedBy,
        action: AUDIT_ACTIONS.BED_RELEASED,
        bedId,
        patientId: bed.patientId,
        timestamp: serverTimestamp()
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error releasing bed:', error);
    return { success: false, error: error.message };
  }
};

export const getBedsByStatus = async (status = null) => {
  try {
    let constraints = [];
    
    if (status) {
      constraints.push(where('status', '==', status));
    }
    constraints.push(orderBy('type'));

    const q = query(collection(db, 'beds'), ...constraints);
    const snapshot = await getDocs(q);
    const beds = [];
    
    for (const docSnap of snapshot.docs) {
      const bed = { 
        id: docSnap.id, 
        ...docSnap.data(),
        assignedAt: docSnap.data().assignedAt?.toDate?.() || null
      };
      
      // Get patient details if occupied
      if (bed.status === BED_STATUS.OCCUPIED && bed.patientId) {
        const patientData = await getUserById(bed.patientId);
        if (patientData.success) {
          bed.patientName = patientData.data.fullName;
        }
      }
      
      beds.push(bed);
    }

    return { success: true, data: beds };
  } catch (error) {
    console.error('Error fetching beds:', error);
    return { success: false, error: error.message };
  }
};

// ==================== INVENTORY MANAGEMENT ====================

export const getInventory = async () => {
  try {
    const q = query(
      collection(db, 'inventory'),
      orderBy('name')
    );

    const snapshot = await getDocs(q);
    const items = [];
    snapshot.forEach((doc) => {
      items.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      });
    });

    return { success: true, data: items };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: error.message };
  }
};

// Add this function to database.js
export const useInventoryItem = async (itemId, quantityUsed, usedBy, reason = '') => {
  try {
    if (!itemId || !quantityUsed || quantityUsed <= 0) {
      return { success: false, error: 'Invalid quantity' };
    }

    return await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, 'inventory', itemId);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }

      const item = itemDoc.data();
      const newQuantity = item.quantity - quantityUsed;

      if (newQuantity < 0) {
        throw new Error(`Insufficient stock. Only ${item.quantity} ${item.unit}(s) available`);
      }

      // Update inventory
      transaction.update(itemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp(),
        updatedBy: usedBy
      });

      // Record usage transaction
      const transactionRef = doc(collection(db, 'inventoryTransactions'));
      transaction.set(transactionRef, {
        itemId,
        itemName: item.name,
        type: 'usage',
        quantity: quantityUsed,
        unitPrice: item.price || 0,
        totalValue: (item.price || 0) * quantityUsed,
        reason: reason || 'Inventory usage',
        usedBy,
        timestamp: serverTimestamp()
      });

      // Log usage
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: usedBy,
        action: 'INVENTORY_USED',
        itemId,
        itemName: item.name,
        quantityUsed,
        previousQuantity: item.quantity,
        newQuantity,
        reason,
        timestamp: serverTimestamp()
      });

      return { success: true, data: { newQuantity, usedQuantity: quantityUsed } };
    });
  } catch (error) {
    console.error('Error using inventory item:', error);
    return { success: false, error: error.message };
  }
};
// ==================== OPERATION MANAGEMENT ====================

export const scheduleOperation = async (operationData, scheduledBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Check resource availability
      for (const equipment of operationData.requiredEquipment || []) {
        const equipRef = doc(db, 'inventory', equipment.id);
        const equipDoc = await transaction.get(equipRef);
        
        if (!equipDoc.exists() || equipDoc.data().quantity < equipment.quantity) {
          throw new Error(`Insufficient equipment: ${equipment.name}`);
        }
      }

      const operationRef = doc(collection(db, 'operations'));
      const operation = {
        id: operationRef.id,
        ...operationData,
        status: OPERATION_STATUS.SCHEDULED,
        checklist: {
          staffConfirmed: false,
          equipmentConfirmed: false,
          consentConfirmed: false,
          riskAcknowledged: false
        },
        createdAt: serverTimestamp(),
        scheduledBy,
        updatedAt: serverTimestamp()
      };

      transaction.set(operationRef, operation);

      // Reserve equipment
      for (const equipment of operationData.requiredEquipment || []) {
        const equipRef = doc(db, 'inventory', equipment.id);
        transaction.update(equipRef, {
          quantity: increment(-equipment.quantity),
          reservedFor: operationRef.id,
          updatedAt: serverTimestamp()
        });
      }

      return { success: true, data: operation };
    });
  } catch (error) {
    console.error('Error scheduling operation:', error);
    return { success: false, error: error.message };
  }
};

export const confirmOperationChecklist = async (operationId, checklistItem, confirmedBy) => {
  try {
    if (!operationId || !checklistItem) {
      return { success: false, error: 'Missing required fields' };
    }

    const operationRef = doc(db, 'operations', operationId);
    
    await updateDoc(operationRef, {
      [`checklist.${checklistItem}`]: true,
      [`checklist.${checklistItem}By`]: confirmedBy,
      [`checklist.${checklistItem}At`]: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error confirming checklist:', error);
    return { success: false, error: error.message };
  }
};

export const startOperation = async (operationId, startedBy) => {
  try {
    if (!operationId) {
      return { success: false, error: 'Operation ID is required' };
    }

    const operationRef = doc(db, 'operations', operationId);
    const operationDoc = await getDoc(operationRef);

    if (!operationDoc.exists()) {
      return { success: false, error: 'Operation not found' };
    }

    const operation = operationDoc.data();
    
    // Verify all checklist items are confirmed
    const checklist = operation.checklist || {};
    const requiredChecks = ['staffConfirmed', 'equipmentConfirmed', 'consentConfirmed', 'riskAcknowledged'];
    const missingChecks = requiredChecks.filter(check => !checklist[check]);

    if (missingChecks.length > 0) {
      return { success: false, error: `Missing checklist items: ${missingChecks.join(', ')}` };
    }

    await updateDoc(operationRef, {
      status: OPERATION_STATUS.IN_PROGRESS,
      startedAt: serverTimestamp(),
      startedBy,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error starting operation:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CHAT SYSTEM ====================

export const createChat = async (participants) => {
  try {
    const sanitizedParticipants = Array.from(
      new Set(
        (participants || [])
          .map(p => (typeof p === 'string' ? p.trim() : p))
          .filter(Boolean)
      )
    );

    if (sanitizedParticipants.length !== 2) {
      return { success: false, error: 'Exactly 2 valid participants required' };
    }

    // Check if chat already exists
    const existingChat = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', sanitizedParticipants[0])
    );
    
    const snapshot = await getDocs(existingChat);
    let existingChatId = null;
    
    snapshot.forEach((doc) => {
      const chatData = doc.data();
      if (sanitizedParticipants.every(p => chatData.participants.includes(p))) {
        existingChatId = doc.id;
      }
    });

    if (existingChatId) {
      return { success: true, data: { id: existingChatId } };
    }

    // Create new chat
    const chatRef = doc(collection(db, 'chats'));
    const chat = {
      id: chatRef.id,
      participants: sanitizedParticipants,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: null,
      unreadCount: {}
    };

    sanitizedParticipants.forEach(p => {
      chat.unreadCount[p] = 0;
    });

    await setDoc(chatRef, chat);

    return { success: true, data: chat };
  } catch (error) {
    console.error('Error creating chat:', error);
    return { success: false, error: error.message };
  }
};

export const retrySendMessage = async (messageId, chatId) => {
  try {
    if (!messageId || !chatId) {
      return { success: false, error: 'Missing required fields' };
    }

    // Get the failed message
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const originalMessage = messageDoc.data();

    // Create new message with same content
    const newMessageRef = doc(collection(db, 'messages'));
    const newMessage = {
      id: newMessageRef.id,
      chatId: originalMessage.chatId,
      senderId: originalMessage.senderId,
      recipientId: originalMessage.recipientId,
      text: originalMessage.text,
      file: originalMessage.file,
      status: 'sent',
      timestamp: serverTimestamp(),
      readBy: [originalMessage.senderId],
      retryOf: messageId // Reference to original failed message
    };

    await setDoc(newMessageRef, newMessage);

    // Update chat
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: originalMessage.text || 'File',
        senderId: originalMessage.senderId,
        timestamp: serverTimestamp(),
        messageId: newMessageRef.id
      },
      lastMessageAt: serverTimestamp(),
      [`unreadCount.${originalMessage.recipientId}`]: increment(1)
    });

    // Delete the failed message
    await deleteDoc(messageRef);

    return { 
      success: true, 
      data: { 
        id: newMessageRef.id, 
        ...newMessage,
        timestamp: new Date() 
      } 
    };
  } catch (error) {
    console.error('Error retrying message:', error);
    return { success: false, error: error.message };
  }
};

export const getChatByParticipants = async (participants) => {
  try {
    if (!participants || participants.length !== 2) {
      return { success: false, error: 'Exactly 2 participants required' };
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', participants[0])
    );

    const snapshot = await getDocs(q);
    let chat = null;

    snapshot.forEach((doc) => {
      const chatData = doc.data();
      if (participants.every(p => chatData.participants.includes(p))) {
        chat = { id: doc.id, ...chatData };
      }
    });

    return { success: true, data: chat };
  } catch (error) {
    console.error('Error getting chat:', error);
    return { success: false, error: error.message };
  }
};

export const markAllMessagesAsRead = async (chatId, userId) => {
  try {
    if (!chatId || !userId) {
      return { success: false, error: 'Missing required fields' };
    }

    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '!=', userId),
      where('status', '!=', 'seen')
    );

    const messagesSnapshot = await getDocs(messagesQuery);
    
    if (messagesSnapshot.empty) {
      return { success: true };
    }

    const batch = writeBatch(db);
    
    messagesSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        status: 'seen',
        readBy: arrayUnion(userId)
      });
    });

    // Reset unread count
    const chatRef = doc(db, 'chats', chatId);
    batch.update(chatRef, {
      [`unreadCount.${userId}`]: 0
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    return { success: false, error: error.message };
  }
};

export const updateMessageStatus = async (messageId, status) => {
  try {
    if (!messageId || !status) {
      return { success: false, error: 'Missing required fields' };
    }

    await updateDoc(doc(db, 'messages', messageId), {
      status,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating message status:', error);
    return { success: false, error: error.message };
  }
};


// ==================== ATTENDANCE & SALARY ====================

export const calculateSalary = async (userId, month, year, calculatedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get user details
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const user = userDoc.data();
      
      // Get attendance for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      let attendanceSnapshot;
      try {
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', userId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        attendanceSnapshot = await getDocs(attendanceQuery);
      } catch (queryError) {
        console.error('Error with indexed query, trying fallback:', queryError);
        // Fallback: get all attendance and filter client-side
        const allAttendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', userId)
        );
        const allSnapshot = await getDocs(allAttendanceQuery);
        const filtered = [];
        allSnapshot.forEach(doc => {
          const att = doc.data();
          if (att.date >= startDate && att.date <= endDate) {
            filtered.push(doc);
          }
        });
        attendanceSnapshot = { docs: filtered, forEach: (cb) => filtered.forEach(cb) };
      }
      
      let workingDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let halfDays = 0;
      
      attendanceSnapshot.forEach(doc => {
        const attendance = doc.data();
        switch (attendance.status) {
          case 'present':
            workingDays++;
            break;
          case 'absent':
            absentDays++;
            break;
          case 'late':
            lateDays++;
            workingDays += 0.5;
            break;
          case 'half-day':
            halfDays++;
            workingDays += 0.5;
            break;
        }
      });

      // Calculate salary (assuming 26 working days)
      const monthlySalary = user.baseSalary || 0;
      const perDaySalary = monthlySalary / 26;
      const calculatedSalary = workingDays * perDaySalary;

      // Determine user department (handle both system users and department staff)
      let userDepartment = user.department || user.userDepartment || null;
      
      // If no department, try to find if user is department staff
      if (!userDepartment) {
        try {
          // Check if this user exists in departmentStaff collection
          const departmentsResult = await getDocs(collection(db, 'departments'));
          for (const deptDoc of departmentsResult.docs) {
            const staffQuery = query(
              collection(db, 'departmentStaff'),
              where('departmentId', '==', deptDoc.id),
              where('id', '==', userId)
            );
            const staffSnapshot = await getDocs(staffQuery);
            if (!staffSnapshot.empty) {
              userDepartment = deptDoc.data().name;
              break;
            }
          }
        } catch (error) {
          console.error('Error checking department staff:', error);
        }
      }

      // Create salary record
      const salaryRef = doc(collection(db, 'salaryRecords'));
      const salaryRecord = {
        id: salaryRef.id,
        userId,
        userName: user.fullName || user.name || 'Unknown',
        userRole: user.role || 'staff',
        userDepartment: userDepartment || 'N/A',
        month,
        year,
        baseSalary: monthlySalary,
        workingDays,
        absentDays,
        lateDays,
        halfDays,
        perDaySalary,
        calculatedSalary,
        status: 'pending',
        calculatedBy,
        calculatedAt: serverTimestamp(),
        paidAt: null,
        paidBy: null,
        paymentMethod: null,
        paymentReference: null
      };

      transaction.set(salaryRef, salaryRecord);

      // Generate PDF - with error handling for missing data
      let pdfBase64 = null;
      try {
        pdfBase64 = await generatePDF('salary-slip', {
          userId: userId,
          userName: user.fullName || user.name || 'Unknown',
          userRole: user.role || 'staff',
          userDepartment: userDepartment || 'N/A',
          month: month,
          year: year,
          baseSalary: monthlySalary,
          workingDays: workingDays,
          absentDays: absentDays,
          lateDays: lateDays,
          halfDays: halfDays,
          perDaySalary: perDaySalary,
          calculatedSalary: calculatedSalary,
          status: 'pending',
          paidAt: null,
          paidBy: null
        });
        
        const compressedPDF = compressData(pdfBase64);
        transaction.update(salaryRef, {
          pdfBase64: compressedPDF
        });
      } catch (pdfError) {
        console.error('Error generating PDF for salary:', pdfError);
        // Continue without PDF - don't fail the transaction
      }

      return { success: true, data: salaryRecord };
    });
  } catch (error) {
    console.error('Error calculating salary:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DEPARTMENT MANAGEMENT ====================

export const createDepartment = async (departmentData, createdBy) => {
  try {
    if (!departmentData.name) {
      return { success: false, error: 'Department name is required' };
    }

    const deptRef = doc(collection(db, 'departments'));
    const department = {
      id: deptRef.id,
      ...departmentData,
      revenue: 0,
      collectedRevenue: 0,
      patientCount: 0,
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp()
    };

    await setDoc(deptRef, department);

    return { success: true, data: department };
  } catch (error) {
    console.error('Error creating department:', error);
    return { success: false, error: error.message };
  }
};

export const getDepartments = async () => {
  try {
    const q = query(
      collection(db, 'departments'),
      orderBy('name')
    );

    const snapshot = await getDocs(q);
    const departments = [];
    
    for (const docSnap of snapshot.docs) {
      const dept = { 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      
      // Get head doctor details
      if (dept.headDoctor) {
        const doctorData = await getUserById(dept.headDoctor);
        if (doctorData.success) {
          dept.headDoctorName = doctorData.data.fullName;
        }
      }
      
      departments.push(dept);
    }

    return { success: true, data: departments };
  } catch (error) {
    console.error('Error fetching departments:', error);
    return { success: false, error: error.message };
  }
};

export const submitRating = async (ratingData) => {
  try {
    const { patientId, doctorId, rating, review } = ratingData;

    if (!patientId || !doctorId || !rating) {
      return { success: false, error: 'Missing required fields' };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Check if patient has already rated this doctor
    const existingRatingQuery = query(
      collection(db, 'ratings'),
      where('patientId', '==', patientId),
      where('doctorId', '==', doctorId)
    );
    
    const existingSnapshot = await getDocs(existingRatingQuery);
    
    if (!existingSnapshot.empty) {
      return { 
        success: false, 
        error: 'You have already rated this doctor. You can only rate once per doctor.',
        alreadyRated: true
      };
    }

    // Add rating
    const ratingRef = doc(collection(db, 'ratings'));
    const ratingDoc = {
      id: ratingRef.id,
      patientId,
      doctorId,
      rating,
      review: review || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(ratingRef, ratingDoc);

    // Update doctor's average rating
    const doctorRef = doc(db, 'users', doctorId);
    const doctorDoc = await getDoc(doctorRef);
    
    if (doctorDoc.exists()) {
      const doctorData = doctorDoc.data();
      const currentRatings = doctorData.ratings || [];
      const currentAvg = doctorData.avgRating || 0;
      const currentTotal = doctorData.totalRatings || 0;
      
      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;
      
      await updateDoc(doctorRef, {
        ratings: [...currentRatings, ratingRef.id],
        avgRating: newAvg,
        totalRatings: newTotal,
        updatedAt: serverTimestamp()
      });
    }

    return { success: true, data: ratingDoc };
  } catch (error) {
    console.error('Error submitting rating:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PATIENT MANAGEMENT ====================

export const getPatientsByDoctor = async (doctorId) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    // Get unique patients from visits
    const visitsQuery = query(
      collection(db, 'visits'),
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(visitsQuery);
    const patientMap = new Map();
    
    for (const docSnap of snapshot.docs) {
      const visit = docSnap.data();
      if (!patientMap.has(visit.patientId)) {
        const patientData = await getUserById(visit.patientId);
        if (patientData.success) {
          patientMap.set(visit.patientId, {
            id: visit.patientId,
            ...patientData.data,
            lastVisit: visit.createdAt?.toDate?.() || null,
            visitCount: 1
          });
        }
      } else {
        const patient = patientMap.get(visit.patientId);
        patient.visitCount++;
        patientMap.set(visit.patientId, patient);
      }
    }

    return { success: true, data: Array.from(patientMap.values()) };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { success: false, error: error.message };
  }
};
// ==================== ANALYTICS & REPORTS ====================

export const getDoctorPerformance = async (doctorId, period = 'month') => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const visitsQuery = query(
      collection(db, 'visits'),
      where('doctorId', '==', doctorId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );

    const visitsSnapshot = await getDocs(visitsQuery);
    
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('doctorId', '==', doctorId),
      where('createdAt', '>=', Timestamp.fromDate(startDate))
    );

    const ratingsSnapshot = await getDocs(ratingsQuery);
    
    let totalRating = 0;
    ratingsSnapshot.forEach(doc => {
      totalRating += doc.data().rating || 0;
    });

    // Calculate follow-up rate
    let followUps = 0;
    visitsSnapshot.forEach(doc => {
      if (doc.data().followUpDate) {
        followUps++;
      }
    });

    const performance = {
      totalPatients: visitsSnapshot.size,
      averageRating: ratingsSnapshot.size > 0 ? totalRating / ratingsSnapshot.size : 0,
      totalRatings: ratingsSnapshot.size,
      followUpRate: visitsSnapshot.size > 0 ? (followUps / visitsSnapshot.size) * 100 : 0,
      period
    };

    return { success: true, data: performance };
  } catch (error) {
    console.error('Error getting doctor performance:', error);
    return { success: false, error: error.message };
  }
};

// ==================== AUDIT LOGS ====================

export const getAuditLogs = async (filters = {}, pageSize = 50, lastDoc = null) => {
  try {
    let constraints = [orderBy('timestamp', 'desc'), limit(pageSize)];

    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters.action) {
      constraints.push(where('action', '==', filters.action));
    }
    if (filters.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(new Date(filters.startDate))));
    }
    if (filters.endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(new Date(filters.endDate))));
    }

    let q = query(collection(db, 'auditLogs'), ...constraints);

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || null
      });
    });

    return {
      success: true,
      data: logs,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: error.message };
  }
};

// ==================== BACKUP & EXPORT ====================


export const exportCollection = async (collectionName) => {
  try {
    if (!collectionName) {
      return { success: false, error: 'Collection name is required' };
    }

    const snapshot = await getDocs(collection(db, collectionName));
    const data = [];
    
    snapshot.forEach((doc) => {
      const docData = doc.data();
      // Convert timestamps to ISO strings for export
      Object.keys(docData).forEach(key => {
        if (docData[key]?.toDate) {
          docData[key] = docData[key].toDate().toISOString();
        }
      });
      data.push({ id: doc.id, ...docData });
    });

    // Compress data for export
    const jsonString = JSON.stringify(data);
    const compressed = compressData(jsonString);
    
    return { success: true, data: compressed };
  } catch (error) {
    console.error('Error exporting collection:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ALERTS & NOTIFICATIONS ====================

export const checkSystemAlerts = async () => {
  try {
    const alerts = [];

    // Check bed occupancy
    const beds = await getBedsByStatus();
    if (beds.success && beds.data.length > 0) {
      const totalBeds = beds.data.length;
      const occupiedBeds = beds.data.filter(b => b.status === BED_STATUS.OCCUPIED).length;
      const occupancyRate = (occupiedBeds / totalBeds) * 100;
      
      if (occupancyRate > 80) {
        alerts.push({
          type: ALERT_TYPES.HIGH_BED_OCCUPANCY,
          severity: ALERT_SEVERITY.WARNING,
          message: `Bed occupancy is at ${occupancyRate.toFixed(1)}%`,
          data: { occupancyRate, occupiedBeds, totalBeds }
        });
      }
    }

    // Check low stock items
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('quantity', '<=', where('threshold'))
    );
    const lowStockSnapshot = await getDocs(inventoryQuery);
    
    lowStockSnapshot.forEach(doc => {
      const item = doc.data();
      alerts.push({
        type: ALERT_TYPES.LOW_STOCK,
        severity: ALERT_SEVERITY.CRITICAL,
        message: `Low stock: ${item.name} (${item.quantity} remaining)`,
        data: { itemId: doc.id, ...item }
      });
    });

    // Check emergency cases spike
    const today = new Date().toISOString().split('T')[0];
    const emergencyQuery = query(
      collection(db, 'appointments'),
      where('department', '==', 'Emergency'),
      where('date', '==', today)
    );
    
    const emergencySnapshot = await getDocs(emergencyQuery);
    if (emergencySnapshot.size > 20) { // Threshold
      alerts.push({
        type: ALERT_TYPES.EMERGENCY_SPIKE,
        severity: ALERT_SEVERITY.INFO,
        message: `High emergency cases today: ${emergencySnapshot.size}`,
        data: { count: emergencySnapshot.size }
      });
    }

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error checking alerts:', error);
    return { success: false, error: error.message };
  }
};

export const unlockMedicalRecord = async (visitId, unlockedBy) => {
  try {
    if (!visitId) {
      return { success: false, error: 'Visit ID is required' };
    }

    await updateDoc(doc(db, 'visits', visitId), {
      locked: false,
      unlockedAt: serverTimestamp(),
      unlockedBy,
      updatedAt: serverTimestamp()
    });

    // Log unlock
    await addDoc(collection(db, 'auditLogs'), {
      userId: unlockedBy,
      action: AUDIT_ACTIONS.RECORD_UNLOCKED,
      visitId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error unlocking record:', error);
    return { success: false, error: error.message };
  }
};

export const downloadMedicalSummary = async (visitId) => {
  try {
    if (!visitId) {
      return { success: false, error: 'Visit ID is required' };
    }

    const visitDoc = await getDoc(doc(db, 'visits', visitId));
    if (!visitDoc.exists()) {
      return { success: false, error: 'Visit not found' };
    }

    const visit = visitDoc.data();
    
    // Get patient and doctor details
    const [patientData, doctorData] = await Promise.all([
      getUserById(visit.patientId),
      getUserById(visit.doctorId)
    ]);

    const summaryData = {
      visit,
      patient: patientData.success ? patientData.data : null,
      doctor: doctorData.success ? doctorData.data : null,
      generatedAt: new Date()
    };

    const pdfBase64 = await generatePDF('medical-summary', summaryData);
    
    return { success: true, data: pdfBase64 };
  } catch (error) {
    console.error('Error downloading summary:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PATIENT-SPECIFIC FUNCTIONS ====================

export const getAppointmentsByPatient = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    const q = query(
      collection(db, 'appointments'),
      where('patientId', '==', patientId),
      orderBy('date', 'desc'),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(q);
    const appointments = [];
    
    for (const docSnap of snapshot.docs) {
      const appointment = { 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null,
        date: docSnap.data().date,
        time: docSnap.data().time
      };
      
      // Get doctor details
      const doctorData = await getUserById(appointment.doctorId);
      if (doctorData.success) {
        appointment.doctorName = doctorData.data.fullName;
        appointment.doctorSpecialization = doctorData.data.specialization;
      }
      
      // Get visit details if completed
      if (appointment.visitId) {
        const visitDoc = await getDoc(doc(db, 'visits', appointment.visitId));
        if (visitDoc.exists()) {
          appointment.visit = { id: visitDoc.id, ...visitDoc.data() };
        }
      }
      
      appointments.push(appointment);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching appointments by patient:', error);
    return { success: false, error: error.message };
  }
};

export const getDoctorsByDepartment = async (departmentId) => {
  try {
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'doctor'),
      where('department', '==', departmentId),
      where('accountStatus', '==', 'active'),
      orderBy('fullName')
    );

    const snapshot = await getDocs(q);
    const doctors = [];
    
    snapshot.forEach((doc) => {
      doctors.push({ 
        id: doc.id, 
        ...doc.data(),
        fullName: doc.data().fullName,
        specialization: doc.data().specialization,
        consultationFee: doc.data().consultationFee
      });
    });

    return { success: true, data: doctors };
  } catch (error) {
    console.error('Error fetching doctors by department:', error);
    return { success: false, error: error.message };
  }
};

export const getAvailableTimeSlots = async (doctorId, date) => {
  try {
    if (!doctorId || !date) {
      return { success: false, error: 'Missing required parameters', data: [] };
    }

    console.log('Getting available slots for:', { doctorId, date });
    
    // Get doctor's schedule for the day
    const scheduleQuery = query(
      collection(db, 'doctorSchedules'),
      where('doctorId', '==', doctorId),
      where('date', '==', date)
    );
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    let schedule = {};
    if (!scheduleSnapshot.empty) {
      schedule = scheduleSnapshot.docs[0].data();
    }
    
    // Get all appointments for this doctor on this date (excluding cancelled/rejected)
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('date', '==', date),
      where('status', 'in', ['pending', 'approved', 'confirmed', 'checked-in'])
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    const bookedTimes = new Set();
    appointmentsSnapshot.forEach(doc => {
      const apt = doc.data();
      if (apt.time) {
        bookedTimes.add(apt.time);
      }
    });
    
    // Generate time slots (9 AM to 5 PM, 30 min intervals)
    const slots = [];
    const startHour = 9;
    const endHour = 24;
    
    // Get current time for today's date
    const now = new Date();
    const todayDate = new Date().toISOString().split('T')[0];
    const isToday = date === todayDate;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute > 0) continue;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // For today's date, skip past time slots
        if (isToday) {
          const slotHour = hour;
          const slotMinute = minute;
          
          // Skip if slot time has already passed
          if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
            continue;
          }
        }
        
        // Check if slot is within doctor's working hours
        let isWorkingHour = true;
        if (schedule.workingHours) {
          const [startTime, endTime] = schedule.workingHours.split('-');
          const slotInMinutes = hour * 60 + minute;
          const startInMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1] || 0);
          const endInMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1] || 0);
          isWorkingHour = slotInMinutes >= startInMinutes && slotInMinutes <= endInMinutes;
        }
        
        const isBooked = bookedTimes.has(timeString);
        const isAvailable = isWorkingHour && !isBooked;
        
        slots.push({
          time: timeString,
          available: isAvailable,
          display: formatTime(timeString)
        });
      }
    }
    
    // Also check if doctor has custom availability set for this date
    if (schedule.customSlots && Array.isArray(schedule.customSlots)) {
      schedule.customSlots.forEach(customSlot => {
        const existingSlot = slots.find(s => s.time === customSlot.time);
        if (existingSlot) {
          existingSlot.available = customSlot.available;
        } else if (customSlot.available) {
          slots.push({
            time: customSlot.time,
            available: true,
            display: formatTime(customSlot.time)
          });
        }
      });
    }
    
    // Sort slots by time
    slots.sort((a, b) => a.time.localeCompare(b.time));
    
    console.log('Generated slots:', slots.length, 'Available:', slots.filter(s => s.available).length);
    
    return { success: true, data: slots };
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getPatientDashboardStats = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    // Get appointments
    const appointmentsResult = await getAppointmentsByPatient(patientId);
    
    // Get visits
    const visitsResult = await getVisitsByPatient(patientId);
    
    // Get invoices
    const invoicesResult = await getInvoicesByPatient(patientId);

    const stats = {
      totalAppointments: appointmentsResult.success ? appointmentsResult.data.length : 0,
      upcomingAppointments: appointmentsResult.success 
        ? appointmentsResult.data.filter(a => a.status === 'scheduled').length 
        : 0,
      completedAppointments: appointmentsResult.success 
        ? appointmentsResult.data.filter(a => a.status === 'completed').length 
        : 0,
      totalVisits: visitsResult.success ? visitsResult.data.length : 0,
      pendingBills: invoicesResult.success 
        ? invoicesResult.data.filter(i => i.status === 'unpaid' || i.status === 'pending').length 
        : 0,
      totalBills: invoicesResult.success ? invoicesResult.data.length : 0
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching patient dashboard stats:', error);
    return { success: false, error: error.message };
  }
};

export const updatePatientProfile = async (patientId, profileData, updatedBy) => {
  try {
    if (!patientId || !profileData) {
      return { success: false, error: 'Missing required fields' };
    }

    const patientRef = doc(db, 'users', patientId);
    
    // Remove fields that shouldn't be updated directly
    const { ...updateData } = profileData;
    
    await updateDoc(patientRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    // Log profile update
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'PROFILE_UPDATED',
      targetUserId: patientId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return { success: false, error: error.message };
  }
};

export const getPatientMedicalHistory = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    // Get all visits
    const visitsResult = await getVisitsByPatient(patientId);
    
    if (!visitsResult.success) {
      return { success: false, error: visitsResult.error };
    }

    const visits = visitsResult.data;
    
    // Extract unique conditions and medications
    const conditions = new Set();
    const medications = new Set();
    const doctors = new Set();
    const allergies = new Set();
    
    visits.forEach(visit => {
      if (visit.diagnosis) {
        visit.diagnosis.split(',').forEach(d => conditions.add(d.trim()));
      }
      
      if (visit.prescriptions) {
        visit.prescriptions.forEach(pres => {
          medications.add(pres.medicineName);
        });
      }
      
      if (visit.doctorName) {
        doctors.add(visit.doctorName);
      }
      
      if (visit.allergies) {
        visit.allergies.split(',').forEach(a => allergies.add(a.trim()));
      }
    });

    const summary = {
      totalVisits: visits.length,
      firstVisit: visits.length > 0 ? visits[visits.length - 1].createdAt : null,
      lastVisit: visits.length > 0 ? visits[0].createdAt : null,
      uniqueConditions: Array.from(conditions),
      uniqueMedications: Array.from(medications),
      treatingDoctors: Array.from(doctors),
      allergies: Array.from(allergies),
      visitsByYear: {},
      commonDiagnosis: []
    };

    // Group visits by year
    visits.forEach(visit => {
      if (visit.createdAt) {
        const year = new Date(visit.createdAt).getFullYear();
        summary.visitsByYear[year] = (summary.visitsByYear[year] || 0) + 1;
      }
    });

    // Find most common diagnoses
    const diagnosisCount = {};
    visits.forEach(visit => {
      if (visit.diagnosis) {
        diagnosisCount[visit.diagnosis] = (diagnosisCount[visit.diagnosis] || 0) + 1;
      }
    });
    
    summary.commonDiagnosis = Object.entries(diagnosisCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([diagnosis, count]) => ({ diagnosis, count }));

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching medical history:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PATIENT SEARCH ====================

export const searchPatients = async (searchQuery) => {
  try {
    if (!searchQuery || searchQuery.length < 3) {
      return { success: true, data: [] };
    }

    const searchLower = searchQuery.toLowerCase();
    const usersRef = collection(db, 'users');
    
    // Search by name (partial match)
    const nameQueryRef = query(
      usersRef,
      where('role', '==', 'patient'),
      where('fullName', '>=', searchLower),
      where('fullName', '<=', searchLower + '\uf8ff'),
      limit(10)
    );

    // Search by phone
    const phoneQueryRef = query(
      usersRef,
      where('role', '==', 'patient'),
      where('phone', '>=', searchQuery),
      where('phone', '<=', searchQuery + '\uf8ff'),
      limit(10)
    );

    // Search by CNIC if it looks like a CNIC format
    let cnicQueryRef = null;
    if (searchQuery.includes('-') || searchQuery.length === 13 || searchQuery.length === 15) {
      cnicQueryRef = query(
        usersRef,
        where('role', '==', 'patient'),
        where('cnic', '>=', searchQuery),
        where('cnic', '<=', searchQuery + '\uf8ff'),
        limit(10)
      );
    }

    // Search by email
    const emailQueryRef = query(
      usersRef,
      where('role', '==', 'patient'),
      where('email', '>=', searchLower),
      where('email', '<=', searchLower + '\uf8ff'),
      limit(10)
    );

    // Execute all queries in parallel
    const promises = [
      getDocs(nameQueryRef), 
      getDocs(phoneQueryRef),
      getDocs(emailQueryRef)
    ];
    
    if (cnicQueryRef) {
      promises.push(getDocs(cnicQueryRef));
    }

    const results = await Promise.allSettled(promises);
    
    // Combine and deduplicate results
    const patientsMap = new Map();
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const snapshot = result.value;
        snapshot.forEach(doc => {
          if (!patientsMap.has(doc.id)) {
            const data = doc.data();
            patientsMap.set(doc.id, {
              id: doc.id,
              ...data,
              fullName: data.fullName || '',
              phone: data.phone || '',
              cnic: data.cnic || '',
              email: data.email || '',
              dateOfBirth: data.dateOfBirth || '',
              gender: data.gender || '',
              bloodGroup: data.bloodGroup || '',
              address: data.address || '',
              accountStatus: data.accountStatus || 'active'
            });
          }
        });
      }
    });

    // If no results from indexed queries, try fallback search
    if (patientsMap.size === 0) {
      return await fallbackPatientSearch(searchQuery);
    }

    return { 
      success: true, 
      data: Array.from(patientsMap.values()).slice(0, 20) 
    };
    
  } catch (error) {
    console.error('Error searching patients:', error);
    // Fallback to client-side filtering
    return await fallbackPatientSearch(searchQuery);
  }
};

const fallbackPatientSearch = async (searchQuery) => {
  try {
    const searchLower = searchQuery.toLowerCase();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'patient'));
    const snapshot = await getDocs(q);
    
    const results = [];
    snapshot.forEach(doc => {
      const patient = doc.data();
      const fullName = (patient.fullName || '').toLowerCase();
      const phone = patient.phone || '';
      const email = (patient.email || '').toLowerCase();
      const cnic = patient.cnic || '';
      
      if (
        fullName.includes(searchLower) ||
        phone.includes(searchQuery) ||
        email.includes(searchLower) ||
        cnic.includes(searchQuery)
      ) {
        results.push({
          id: doc.id,
          ...patient,
          fullName: patient.fullName || '',
          phone: patient.phone || '',
          cnic: patient.cnic || '',
          email: patient.email || '',
          dateOfBirth: patient.dateOfBirth || '',
          gender: patient.gender || '',
          bloodGroup: patient.bloodGroup || '',
          address: patient.address || '',
          accountStatus: patient.accountStatus || 'active'
        });
      }
      
      // Limit results
      if (results.length >= 20) return;
    });
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Error in fallback patient search:', error);
    return { success: false, error: error.message };
  }
};

export const searchAppointments = async (query, date = null) => {
  try {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    // First find matching patients
    const patientsResult = await searchPatients(query);
    
    if (!patientsResult.success) {
      return patientsResult;
    }

    const patientIds = patientsResult.data.map(p => p.id);
    
    if (patientIds.length === 0) {
      return { success: true, data: [] };
    }

    // Search appointments for these patients
    let constraints = [
      where('patientId', 'in', patientIds),
      orderBy('date', 'desc'),
      orderBy('time', 'asc'),
      limit(20)
    ];

    if (date) {
      constraints.push(where('date', '==', date));
    }

    const appointmentsQuery = query(
      collection(db, 'appointments'),
      ...constraints
    );

    const snapshot = await getDocs(appointmentsQuery);
    const appointments = [];
    
    for (const docSnap of snapshot.docs) {
      const appointment = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      
      // Add patient details
      const patient = patientsResult.data.find(p => p.id === appointment.patientId);
      if (patient) {
        appointment.patientName = patient.fullName;
        appointment.patientPhone = patient.phone;
      }
      
      appointments.push(appointment);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error searching appointments:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FIXED ALERTS FUNCTION ====================

export const getPendingAlerts = async () => {
  try {
    // First, try with the recommended index
    const q = query(
      collection(db, 'alerts'),
      where('resolved', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const alerts = [];
    snapshot.forEach((doc) => {
      alerts.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      });
    });

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error fetching pending alerts:', error);
    
    // Fallback: query without orderBy if index doesn't exist yet
    try {
      const fallbackQuery = query(
        collection(db, 'alerts'),
        where('resolved', '==', false)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const alerts = [];
      fallbackSnapshot.forEach((doc) => {
        alerts.push({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null
        });
      });
      
      // Sort manually
      alerts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      return { success: true, data: alerts.slice(0, 50) };
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return { success: true, data: [] }; // Return empty array instead of error
    }
  }
};

// ==================== ENHANCED USER MANAGEMENT ====================
export const updateUser = async (userId, updateData, updatedBy) => {
  try {
    if (!userId || !updateData) {
      return { success: false, error: 'Missing required fields' };
    }

    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    // Log the update
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'USER_UPDATED',
      targetUserId: userId,
      updates: Object.keys(updateData),
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED BED MANAGEMENT ====================

export const addBed = async (bedData, createdBy) => {
  try {
    if (!bedData.type) {
      return { success: false, error: 'Bed type is required' };
    }

    const bedRef = doc(collection(db, 'beds'));
    const bed = {
      id: bedRef.id,
      ...bedData,
      status: 'available',
      patientId: null,
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp()
    };

    await setDoc(bedRef, bed);

    await addDoc(collection(db, 'auditLogs'), {
      userId: createdBy,
      action: 'BED_ADDED',
      bedId: bedRef.id,
      bedType: bedData.type,
      timestamp: serverTimestamp()
    });

    return { success: true, data: bed };
  } catch (error) {
    console.error('Error adding bed:', error);
    return { success: false, error: error.message };
  }
};

export const updateBed = async (bedId, updateData, updatedBy) => {
  try {
    if (!bedId) {
      return { success: false, error: 'Bed ID is required' };
    }

    const bedRef = doc(db, 'beds', bedId);
    
    await updateDoc(bedRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'BED_UPDATED',
      bedId,
      updates: Object.keys(updateData),
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating bed:', error);
    return { success: false, error: error.message };
  }
};

export const deleteBed = async (bedId, deletedBy) => {
  try {
    if (!bedId) {
      return { success: false, error: 'Bed ID is required' };
    }

    // Check if bed is occupied
    const bedDoc = await getDoc(doc(db, 'beds', bedId));
    if (bedDoc.exists() && bedDoc.data().status === 'occupied') {
      return { success: false, error: 'Cannot delete occupied bed' };
    }

    await deleteDoc(doc(db, 'beds', bedId));

    await addDoc(collection(db, 'auditLogs'), {
      userId: deletedBy,
      action: 'BED_DELETED',
      bedId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting bed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED DEPARTMENT MANAGEMENT ====================

export const updateDepartment = async (departmentId, updateData, updatedBy) => {
  try {
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }

    const deptRef = doc(db, 'departments', departmentId);
    
    await updateDoc(deptRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'DEPARTMENT_UPDATED',
      departmentId,
      updates: Object.keys(updateData),
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating department:', error);
    return { success: false, error: error.message };
  }
};

export const deleteDepartment = async (departmentId, deletedBy) => {
  try {
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }

    // Check if department has doctors
    const doctorsQuery = query(
      collection(db, 'users'),
      where('department', '==', departmentId),
      limit(1)
    );
    const doctorsSnapshot = await getDocs(doctorsQuery);
    
    if (!doctorsSnapshot.empty) {
      return { success: false, error: 'Cannot delete department with assigned doctors' };
    }

    await deleteDoc(doc(db, 'departments', departmentId));

    await addDoc(collection(db, 'auditLogs'), {
      userId: deletedBy,
      action: 'DEPARTMENT_DELETED',
      departmentId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting department:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED INVENTORY MANAGEMENT ====================
export const updateInventoryItem = async (itemId, updateData, updatedBy) => {
  try {
    if (!itemId) {
      return { success: false, error: 'Item ID is required' };
    }

    const itemRef = doc(db, 'inventory', itemId);
    
    await updateDoc(itemRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'INVENTORY_ITEM_UPDATED',
      itemId,
      updates: Object.keys(updateData),
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { success: false, error: error.message };
  }
};

export const deleteInventoryItem = async (itemId, deletedBy) => {
  try {
    if (!itemId) {
      return { success: false, error: 'Item ID is required' };
    }

    await deleteDoc(doc(db, 'inventory', itemId));

    await addDoc(collection(db, 'auditLogs'), {
      userId: deletedBy,
      action: 'INVENTORY_ITEM_DELETED',
      itemId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DEPARTMENT STAFF MANAGEMENT (NON-SYSTEM USERS) ====================

export const addDepartmentStaff = async (staffData, departmentId, createdBy) => {
  try {
    if (!staffData.name || !staffData.role || !departmentId) {
      return { success: false, error: 'Missing required fields' };
    }

    const staffRef = doc(collection(db, 'departmentStaff'));
    const staff = {
      id: staffRef.id,
      ...staffData,
      departmentId,
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp()
    };

    await setDoc(staffRef, staff);

    await addDoc(collection(db, 'auditLogs'), {
      userId: createdBy,
      action: 'DEPARTMENT_STAFF_ADDED',
      staffId: staffRef.id,
      staffName: staffData.name,
      departmentId,
      role: staffData.role,
      timestamp: serverTimestamp()
    });

    return { success: true, data: staff };
  } catch (error) {
    console.error('Error adding department staff:', error);
    return { success: false, error: error.message };
  }
};

export const updateDepartmentStaff = async (staffId, updateData, updatedBy) => {
  try {
    if (!staffId) {
      return { success: false, error: 'Staff ID is required' };
    }

    const staffRef = doc(db, 'departmentStaff', staffId);
    
    await updateDoc(staffRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'DEPARTMENT_STAFF_UPDATED',
      staffId,
      updates: Object.keys(updateData),
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating department staff:', error);
    return { success: false, error: error.message };
  }
};

export const deleteDepartmentStaff = async (staffId, deletedBy) => {
  try {
    if (!staffId) {
      return { success: false, error: 'Staff ID is required' };
    }

    await deleteDoc(doc(db, 'departmentStaff', staffId));

    await addDoc(collection(db, 'auditLogs'), {
      userId: deletedBy,
      action: 'DEPARTMENT_STAFF_DELETED',
      staffId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting department staff:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED DEPARTMENT MANAGEMENT ====================

export const updateDepartmentFull = async (departmentId, updateData, updatedBy) => {
  try {
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }

    const deptRef = doc(db, 'departments', departmentId);
    
    await updateDoc(deptRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'DEPARTMENT_UPDATED',
      departmentId,
      updates: Object.keys(updateData),
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating department:', error);
    return { success: false, error: error.message };
  }
};

export const getDepartmentDetails = async (departmentId) => {
  try {
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }

    // Get department data
    const deptDoc = await getDoc(doc(db, 'departments', departmentId));
    if (!deptDoc.exists()) {
      return { success: false, error: 'Department not found' };
    }

    const department = {
      id: deptDoc.id,
      ...deptDoc.data(),
      createdAt: deptDoc.data().createdAt?.toDate?.() || null
    };

    // Get head doctor details if exists
    if (department.headDoctor) {
      const doctorDoc = await getDoc(doc(db, 'users', department.headDoctor));
      if (doctorDoc.exists()) {
        department.headDoctorDetails = {
          id: doctorDoc.id,
          ...doctorDoc.data()
        };
      }
    }

    // Get department staff (non-system users)
    const staffResult = await getDepartmentStaff(departmentId);
    if (staffResult.success) {
      department.staff = staffResult.data;
    }

    return { success: true, data: department };
  } catch (error) {
    console.error('Error fetching department details:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PATIENT MANAGEMENT ====================

export const getAllPatients = async (filters = {}) => {
  try {
    let constraints = [
      where('role', '==', 'patient'),
      orderBy('createdAt', 'desc')
    ];

    if (filters.status && filters.status !== 'all') {
      constraints.push(where('accountStatus', '==', filters.status));
    }

    const q = query(collection(db, 'users'), ...constraints);
    const snapshot = await getDocs(q);
    
    const patients = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      patients.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        lastLogin: data.lastLogin?.toDate?.() || null
      });
    });

    // Apply client-side search if needed
    let filteredPatients = patients;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredPatients = patients.filter(p => 
        p.fullName?.toLowerCase().includes(searchTerm) ||
        p.email?.toLowerCase().includes(searchTerm) ||
        p.phone?.includes(searchTerm) ||
        p.cnic?.includes(searchTerm)
      );
    }

    return { success: true, data: filteredPatients };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PRICING CONTROLS ====================

export const getPricingConfig = async () => {
  try {
    const pricingRef = doc(db, 'config', 'pricing');
    const pricingDoc = await getDoc(pricingRef);
    
    if (pricingDoc.exists()) {
      return { 
        success: true, 
        data: { 
          id: pricingDoc.id, 
          ...pricingDoc.data() 
        } 
      };
    } else {
      // Create default pricing config if it doesn't exist
      const defaultPricing = {
        consultationFees: {},
        labTests: {},
        operations: {},
        bedCharges: {},
        miscellaneous: {},
        lastUpdated: serverTimestamp(),
        updatedBy: null
      };
      
      await setDoc(pricingRef, defaultPricing);
      return { success: true, data: defaultPricing };
    }
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    return { success: false, error: error.message };
  }
};

export const updatePricing = async (pricingData, updatedBy) => {
  try {
    const pricingRef = doc(db, 'config', 'pricing');
    
    await updateDoc(pricingRef, {
      ...pricingData,
      lastUpdated: serverTimestamp(),
      updatedBy
    });

    // Log pricing update
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'PRICING_UPDATED',
      timestamp: serverTimestamp(),
      details: { updatedFields: Object.keys(pricingData) }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating pricing:', error);
    return { success: false, error: error.message };
  }
};

export const getDepartmentPricing = async (departmentId) => {
  try {
    const deptRef = doc(db, 'departments', departmentId);
    const deptDoc = await getDoc(deptRef);
    
    if (!deptDoc.exists()) {
      return { success: false, error: 'Department not found' };
    }

    const deptData = deptDoc.data();
    return { 
      success: true, 
      data: {
        consultationFee: deptData.consultationFee || 0,
        services: deptData.services || [],
        labTests: deptData.labTests || [],
        operations: deptData.operations || []
      }
    };
  } catch (error) {
    console.error('Error fetching department pricing:', error);
    return { success: false, error: error.message };
  }
};

export const updateDepartmentPricing = async (departmentId, pricingData, updatedBy) => {
  try {
    const deptRef = doc(db, 'departments', departmentId);
    
    await updateDoc(deptRef, {
      ...pricingData,
      pricingLastUpdated: serverTimestamp(),
      pricingUpdatedBy: updatedBy
    });

    // Log department pricing update
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'DEPARTMENT_PRICING_UPDATED',
      departmentId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating department pricing:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FIXED GET OPERATIONS ====================

export const getOperations = async (filters = {}) => {
  try {
    let operations = [];
    const snapshot = await getDocs(collection(db, 'operations'));
    
    for (const docSnap of snapshot.docs) {
      const operation = { 
        id: docSnap.id, 
        ...docSnap.data(),
        scheduledDate: docSnap.data().scheduledDate?.toDate?.() || null,
        createdAt: docSnap.data().createdAt?.toDate?.() || null
      };
      
      // Apply filters client-side
      if (filters.status && operation.status !== filters.status) continue;
      if (filters.doctorId && operation.doctorId !== filters.doctorId) continue;
      
      // Get patient details
      if (operation.patientId) {
        const patientData = await getUserById(operation.patientId);
        if (patientData.success) {
          operation.patientName = patientData.data.fullName;
        }
      }
      
      operations.push(operation);
    }

    // Sort manually
    operations.sort((a, b) => {
      const dateA = a.scheduledDate ? new Date(a.scheduledDate) : new Date(0);
      const dateB = b.scheduledDate ? new Date(b.scheduledDate) : new Date(0);
      return dateA - dateB;
    });

    return { success: true, data: operations };
  } catch (error) {
    console.error('Error fetching operations:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FIXED GET DEPARTMENT STAFF ====================

export const getDepartmentStaff = async (departmentId) => {
  try {
    // Use simple query without ordering
    const q = query(
      collection(db, 'departmentStaff'),
      where('departmentId', '==', departmentId)
    );

    const snapshot = await getDocs(q);
    const staff = [];
    snapshot.forEach((doc) => {
      staff.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      });
    });

    // Sort manually by name
    staff.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { success: true, data: staff };
  } catch (error) {
    console.error('Error fetching department staff:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FIXED GET REVENUE ANALYTICS ====================

export const getRevenueAnalytics = async (startDate, endDate) => {
  try {
    const analytics = {
      total: 0,
      byDepartment: {},
      byDay: {},
      byMonth: {}
    };

    // Get all paid invoices and filter manually
    const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
    
    invoicesSnapshot.forEach(doc => {
      const invoice = doc.data();
      if (invoice.status === 'paid' && invoice.createdAt?.toDate) {
        const date = invoice.createdAt.toDate();
        
        // Filter by date range
        if (date >= startDate && date <= endDate) {
          const amount = invoice.total || 0;
          analytics.total += amount;
          
          if (invoice.departmentId) {
            analytics.byDepartment[invoice.departmentId] = 
              (analytics.byDepartment[invoice.departmentId] || 0) + amount;
          }
          
          const dateStr = date.toISOString().split('T')[0];
          analytics.byDay[dateStr] = (analytics.byDay[dateStr] || 0) + amount;
          
          const month = date.toISOString().slice(0, 7);
          analytics.byMonth[month] = (analytics.byMonth[month] || 0) + amount;
        }
      }
    });

    return { success: true, data: analytics };
  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED INVENTORY MANAGEMENT ====================

// New collection for inventory transactions
const INVENTORY_TRANSACTIONS_COLLECTION = 'inventoryTransactions';
const INVENTORY_COLLECTION = 'inventory';
export const addInventoryItem = async (itemData, createdBy) => {
  try {
    if (!itemData.name || !itemData.quantity || !itemData.threshold) {
      return { success: false, error: 'Missing required fields' };
    }

    const itemRef = doc(collection(db, 'inventory'));
    const item = {
      id: itemRef.id,
      ...itemData,
      quantity: Number(itemData.quantity),
      threshold: Number(itemData.threshold),
      price: Number(itemData.price) || 0,
      totalCost: (Number(itemData.price) || 0) * (Number(itemData.quantity) || 0),
      purchasedOnDebt: itemData.purchasedOnDebt || false,
      debtAmount: itemData.purchasedOnDebt ? (Number(itemData.price) || 0) * (Number(itemData.quantity) || 0) : 0,
      paidAmount: itemData.purchasedOnDebt ? (itemData.paidAmount || 0) : (Number(itemData.price) || 0) * (Number(itemData.quantity) || 0),
      supplier: itemData.supplier || '',
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp()
    };

    await setDoc(itemRef, item);

    // Record transaction
    const transactionRef = doc(collection(db, INVENTORY_TRANSACTIONS_COLLECTION));
    await setDoc(transactionRef, {
      itemId: itemRef.id,
      itemName: itemData.name,
      type: 'purchase',
      quantity: itemData.quantity,
      unitPrice: itemData.price,
      totalAmount: item.totalCost,
      paidAmount: item.paidAmount,
      debtAmount: item.debtAmount,
      supplier: itemData.supplier,
      createdBy,
      timestamp: serverTimestamp(),
      notes: itemData.notes || ''
    });

    // Log addition
    await addDoc(collection(db, 'auditLogs'), {
      userId: createdBy,
      action: 'INVENTORY_ADDED',
      itemId: itemRef.id,
      itemName: itemData.name,
      quantity: itemData.quantity,
      totalCost: item.totalCost,
      debtAmount: item.debtAmount,
      timestamp: serverTimestamp()
    });

    return { success: true, data: item };
  } catch (error) {
    console.error('Error adding inventory:', error);
    return { success: false, error: error.message };
  }
};

export const updateInventoryQuantity = async (itemId, quantityChange, updatedBy, reason = '') => {
  try {
    if (!itemId || !quantityChange) {
      return { success: false, error: 'Missing required fields' };
    }

    return await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, 'inventory', itemId);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }

      const item = itemDoc.data();
      const newQuantity = item.quantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Insufficient quantity');
      }

      transaction.update(itemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp(),
        updatedBy
      });

      // Record transaction
      const transactionRef = doc(collection(db, INVENTORY_TRANSACTIONS_COLLECTION));
      const transactionType = quantityChange > 0 ? 'restock' : 'usage';
      const unitPrice = item.price || 0;
      const totalAmount = Math.abs(quantityChange) * unitPrice;

      transaction.set(transactionRef, {
        itemId,
        itemName: item.name,
        type: transactionType,
        quantity: Math.abs(quantityChange),
        unitPrice,
        totalAmount,
        createdBy: updatedBy,
        timestamp: serverTimestamp(),
        notes: reason || `${transactionType} adjustment`
      });

      // Log change
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: updatedBy,
        action: 'INVENTORY_UPDATED',
        itemId,
        previousQuantity: item.quantity,
        newQuantity,
        change: quantityChange,
        reason,
        timestamp: serverTimestamp()
      });

      // Check for low stock alert
      if (newQuantity <= item.threshold) {
        const alertRef = doc(collection(db, 'alerts'));
        transaction.set(alertRef, {
          type: 'LOW_STOCK',
          severity: 'CRITICAL',
          itemId,
          itemName: item.name,
          currentQuantity: newQuantity,
          threshold: item.threshold,
          createdAt: serverTimestamp(),
          resolved: false,
          message: `Low stock: ${item.name} (${newQuantity} remaining)`
        });
      }

      return { success: true };
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return { success: false, error: error.message };
  }
};

export const processInventoryPayment = async (itemId, paymentAmount, paidBy, notes = '') => {
  try {
    return await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, 'inventory', itemId);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }

      const item = itemDoc.data();
      const newPaidAmount = (item.paidAmount || 0) + paymentAmount;
      const newDebtAmount = Math.max(0, (item.debtAmount || 0) - paymentAmount);

      transaction.update(itemRef, {
        paidAmount: newPaidAmount,
        debtAmount: newDebtAmount,
        purchasedOnDebt: newDebtAmount > 0,
        updatedAt: serverTimestamp(),
        updatedBy: paidBy
      });

      // Record payment transaction
      const transactionRef = doc(collection(db, INVENTORY_TRANSACTIONS_COLLECTION));
      transaction.set(transactionRef, {
        itemId,
        itemName: item.name,
        type: 'payment',
        paymentAmount,
        remainingDebt: newDebtAmount,
        paidBy,
        timestamp: serverTimestamp(),
        notes
      });

      // Log payment
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: paidBy,
        action: 'INVENTORY_PAYMENT',
        itemId,
        itemName: item.name,
        paymentAmount,
        remainingDebt: newDebtAmount,
        timestamp: serverTimestamp()
      });

      return { success: true, data: { remainingDebt: newDebtAmount } };
    });
  } catch (error) {
    console.error('Error processing inventory payment:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ACCOUNTANT FUNCTIONS ====================

const BUDGET_COLLECTION = 'budgets';
const EXPENSE_COLLECTION = 'expenses';

export const processSalaryPayment = async (salaryRecordId, paymentData, processedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const salaryRef = doc(db, 'salaryRecords', salaryRecordId);
      const salaryDoc = await transaction.get(salaryRef);

      if (!salaryDoc.exists()) {
        throw new Error('Salary record not found');
      }

      const salary = salaryDoc.data();

      transaction.update(salaryRef, {
        status: 'paid',
        paidAt: serverTimestamp(),
        paidBy: processedBy,
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference,
        updatedAt: serverTimestamp()
      });

      // Add to expenses
      const expenseRef = doc(collection(db, EXPENSE_COLLECTION));
      transaction.set(expenseRef, {
        type: 'salary',
        userId: salary.userId,
        amount: salary.calculatedSalary,
        month: salary.month,
        year: salary.year,
        salaryRecordId,
        createdAt: serverTimestamp(),
        createdBy: processedBy,
        category: 'salary'
      });

      // Log payment
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: processedBy,
        action: 'SALARY_PAID',
        salaryRecordId,
        amount: salary.calculatedSalary,
        // eslint-disable-next-line no-dupe-keys
        userId: salary.userId,
        month: salary.month,
        year: salary.year,
        timestamp: serverTimestamp()
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error processing salary:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED USER MANAGEMENT WITH ACCOUNTANT ROLE ====================

export const getUsersByRole = async (role, lastDoc = null, pageSize = 20) => {
  try {
    if (!role) {
      return { success: false, error: 'Role is required' };
    }

    // Handle multiple roles
    const roles = Array.isArray(role) ? role : [role];

    let q = query(
      collection(db, 'users'),
      where('role', 'in', roles),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      });
    });

    return {
      success: true,
      data: users,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ACCOUNTANT FUNCTIONS ====================

export const getPendingSalaryRecords = async () => {
  try {
    const salaryRef = collection(db, 'salaryRecords');
    const q = query(
      salaryRef,
      where('status', '==', 'pending'),
      orderBy('calculatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const records = [];
    
    for (const doc of snapshot.docs) {
      const record = { id: doc.id, ...doc.data() };
      
      // Get user details
      if (record.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', record.userId));
          if (userDoc.exists()) {
            record.userName = userDoc.data().fullName;
            record.userRole = userDoc.data().role;
            record.userDepartment = userDoc.data().department;
          }
        } catch (error) {
          console.error('Error fetching user for salary record:', error);
        }
      }
      
      records.push(record);
    }
    
    return { success: true, data: records };
  } catch (error) {
    console.error('Error getting pending salary records:', error);
    
    // Fallback: try without orderBy if index is missing
    try {
      const salaryRef = collection(db, 'salaryRecords');
      const q = query(salaryRef, where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const records = [];
      
      for (const doc of snapshot.docs) {
        const record = { id: doc.id, ...doc.data() };
        
        if (record.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', record.userId));
            if (userDoc.exists()) {
              record.userName = userDoc.data().fullName;
              record.userRole = userDoc.data().role;
              record.userDepartment = userDoc.data().department;
            }
          } catch (userError) {
            console.error('Error fetching user for salary record:', userError);
          }
        }
        
        records.push(record);
      }
      
      return { success: true, data: records };
    } catch (fallbackError) {
      console.error('Fallback error getting pending salary records:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

export const addExpense = async (expenseData, createdBy) => {
  try {
    if (!expenseData.category || !expenseData.amount || !expenseData.description) {
      return { success: false, error: 'Missing required fields' };
    }

    const expenseRef = doc(collection(db, 'expenses'));
    const expense = {
      id: expenseRef.id,
      ...expenseData,
      amount: Number(expenseData.amount),
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(expenseRef, expense);

    // Log expense creation
    await addDoc(collection(db, 'auditLogs'), {
      userId: createdBy,
      action: 'EXPENSE_ADDED',
      expenseId: expenseRef.id,
      amount: expenseData.amount,
      category: expenseData.category,
      timestamp: serverTimestamp()
    });

    return { success: true, data: expense };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { success: false, error: error.message };
  }
};

export const getExpensesByCategory = async (startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'expenses'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const expenses = [];
    const byCategory = {};

    snapshot.forEach(doc => {
      const expense = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      };
      expenses.push(expense);
      
      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
    });

    return {
      success: true,
      data: {
        expenses,
        byCategory,
        total: expenses.reduce((sum, e) => sum + e.amount, 0)
      }
    };
  } catch (error) {
    console.error('Error getting expenses:', error);
    return { success: false, error: error.message };
  }
};

export const createPurchaseOrder = async (poData, createdBy) => {
  try {
    if (!poData.itemId || !poData.quantity || !poData.price || !poData.supplier) {
      return { success: false, error: 'Missing required fields' };
    }

    const poRef = doc(collection(db, 'purchaseOrders'));
    const po = {
      id: poRef.id,
      ...poData,
      total: poData.quantity * poData.price,
      status: 'pendingApproval',
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(poRef, po);

    // Log purchase order creation
    await addDoc(collection(db, 'auditLogs'), {
      userId: createdBy,
      action: 'PURCHASE_ORDER_CREATED',
      purchaseOrderId: poRef.id,
      total: po.total,
      timestamp: serverTimestamp()
    });

    return { success: true, data: po };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, error: error.message };
  }
};

export const getPurchaseOrdersByStatus = async (status = null) => {
  try {
    let constraints = [orderBy('createdAt', 'desc')];
    
    if (status) {
      constraints.push(where('status', '==', status));
    }

    const q = query(collection(db, 'purchaseOrders'), ...constraints);
    const snapshot = await getDocs(q);
    const orders = [];

    // Use a different variable name like 'orderDoc' to avoid conflict with Firestore 'doc'
    for (const orderDoc of snapshot.docs) {
      const order = {
        id: orderDoc.id,
        ...orderDoc.data(),
        createdAt: orderDoc.data().createdAt?.toDate?.() || null
      };

      // Get item details
      if (order.itemId) {
        const itemRef = doc(db, 'inventory', order.itemId);
        const itemDoc = await getDoc(itemRef);
        if (itemDoc.exists()) {
          order.itemName = itemDoc.data().name;
          order.itemCategory = itemDoc.data().category;
        }
      }

      orders.push(order);
    }

    return { success: true, data: orders };
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    return { success: false, error: error.message };
  }
};

export const updatePurchaseOrderStatus = async (poId, status, updatedBy) => {
  try {
    if (!poId || !status) {
      return { success: false, error: 'Missing required fields' };
    }

    const poRef = doc(db, 'purchaseOrders', poId);
    const poDoc = await getDoc(poRef);

    if (!poDoc.exists()) {
      return { success: false, error: 'Purchase order not found' };
    }

    const po = poDoc.data();

    await updateDoc(poRef, {
      status,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    // If status is 'delivered', update inventory and create expense
    if (status === 'delivered' && po.itemId) {
      // Update inventory quantity
      await updateInventoryQuantity(
        po.itemId,
        po.quantity,
        updatedBy,
        `Purchase order ${poId} delivered`
      );

      // Create expense record
      await addExpense({
        category: 'inventory',
        amount: po.total,
        description: `Purchase order ${poId} - ${po.itemName || 'Inventory item'}`,
        purchaseOrderId: poId,
        date: new Date()
      }, updatedBy);
    }

    // Log status change
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'PURCHASE_ORDER_UPDATED',
      purchaseOrderId: poId,
      newStatus: status,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { success: false, error: error.message };
  }
};

export const getInventoryWithFinancials = async () => {
  try {
    const inventoryResult = await getInventory();
    
    if (!inventoryResult.success) {
      return inventoryResult;
    }

    const items = inventoryResult.data;
    
    // Calculate financials
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCost = items.reduce((sum, item) => sum + (item.costPrice * item.quantity || item.price * item.quantity), 0);
    const lowStockItems = items.filter(item => item.quantity <= item.threshold).length;

    // Get recent purchases
    const purchasesResult = await getPurchaseOrdersByStatus('delivered');
    const recentPurchases = purchasesResult.success ? purchasesResult.data.slice(0, 10) : [];

    // Get inventory usage stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageQuery = query(
      collection(db, 'inventoryUsage'),
      where('usedAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );

    const usageSnapshot = await getDocs(usageQuery);
    const usageByItem = {};

    usageSnapshot.forEach(doc => {
      const usage = doc.data();
      usageByItem[usage.itemId] = (usageByItem[usage.itemId] || 0) + usage.quantity;
    });

    return {
      success: true,
      data: {
        items,
        summary: {
          totalItems: items.length,
          totalValue,
          totalCost,
          lowStockItems,
          monthlyUsage: usageByItem
        },
        recentPurchases
      }
    };
  } catch (error) {
    console.error('Error getting inventory with financials:', error);
    return { success: false, error: error.message };
  }
};

export const generateInventoryReport = async (startDate, endDate) => {
  try {
    // Get current inventory
    const inventoryResult = await getInventoryWithFinancials();
    
    if (!inventoryResult.success) {
      return inventoryResult;
    }

    // Get purchases in period
    const purchasesQuery = query(
      collection(db, 'purchaseOrders'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'delivered')
    );

    const purchasesSnapshot = await getDocs(purchasesQuery);
    const purchases = [];
    let totalPurchases = 0;

    purchasesSnapshot.forEach(doc => {
      const po = doc.data();
      purchases.push({
        id: doc.id,
        ...po,
        createdAt: po.createdAt?.toDate?.() || null
      });
      totalPurchases += po.total || 0;
    });

    // Get usage in period
    const usageQuery = query(
      collection(db, 'inventoryUsage'),
      where('usedAt', '>=', Timestamp.fromDate(startDate)),
      where('usedAt', '<=', Timestamp.fromDate(endDate))
    );

    const usageSnapshot = await getDocs(usageQuery);
    const usage = [];
    const usageByItem = {};

    usageSnapshot.forEach(doc => {
      const u = doc.data();
      usage.push({
        id: doc.id,
        ...u,
        usedAt: u.usedAt?.toDate?.() || null
      });
      usageByItem[u.itemId] = (usageByItem[u.itemId] || 0) + u.quantity;
    });

    return {
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        inventory: inventoryResult.data,
        purchases: {
          total: totalPurchases,
          items: purchases
        },
        usage: {
          total: usage.length,
          byItem: usageByItem,
          items: usage
        }
      }
    };
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return { success: false, error: error.message };
  }
};

export const recordInventoryUsage = async (itemId, quantity, reason, recordedBy, visitId = null) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, 'inventory', itemId);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }

      const item = itemDoc.data();
      
      if (item.quantity < quantity) {
        throw new Error(`Insufficient quantity. Available: ${item.quantity}`);
      }

      // Update inventory
      transaction.update(itemRef, {
        quantity: item.quantity - quantity,
        updatedAt: serverTimestamp(),
        updatedBy: recordedBy
      });

      // Record usage
      const usageRef = doc(collection(db, 'inventoryUsage'));
      transaction.set(usageRef, {
        id: usageRef.id,
        itemId,
        itemName: item.name,
        quantity,
        reason,
        recordedBy,
        visitId,
        usedAt: serverTimestamp()
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error recording inventory usage:', error);
    return { success: false, error: error.message };
  }
};

export const setDepartmentBudget = async (departmentId, budgetData, createdBy) => {
  try {
    if (!departmentId || !budgetData.monthly || !budgetData.year) {
      return { success: false, error: 'Missing required fields' };
    }

    const budgetRef = doc(collection(db, 'departmentBudgets'));
    const budget = {
      id: budgetRef.id,
      departmentId,
      ...budgetData,
      spent: 0,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(budgetRef, budget);

    return { success: true, data: budget };
  } catch (error) {
    console.error('Error setting department budget:', error);
    return { success: false, error: error.message };
  }
};

export const getDepartmentBudgetStatus = async (departmentId, month, year) => {
  try {
    const q = query(
      collection(db, 'departmentBudgets'),
      where('departmentId', '==', departmentId),
      where('month', '==', month),
      where('year', '==', year)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: true, data: null };
    }

    const budgetDoc = snapshot.docs[0];
    const budget = {
      id: budgetDoc.id,
      ...budgetDoc.data()
    };

    // Get expenses for this department in this month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('departmentId', '==', departmentId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );

    const expensesSnapshot = await getDocs(expensesQuery);
    let spent = 0;

    expensesSnapshot.forEach(doc => {
      spent += doc.data().amount || 0;
    });

    return {
      success: true,
      data: {
        ...budget,
        spent,
        remaining: budget.monthly - spent,
        usagePercentage: (spent / budget.monthly) * 100
      }
    };
  } catch (error) {
    console.error('Error getting budget status:', error);
    return { success: false, error: error.message };
  }
};

export const getMonthlyRevenueTrend = async (year) => {
  try {
    const monthlyData = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'paid')
      );

      const snapshot = await getDocs(invoicesQuery);
      let revenue = 0;
      snapshot.forEach(doc => {
        revenue += doc.data().total || 0;
      });

      monthlyData.push({
        month,
        revenue,
        monthName: startDate.toLocaleString('default', { month: 'short' })
      });
    }

    return { success: true, data: monthlyData };
  } catch (error) {
    console.error('Error getting monthly revenue trend:', error);
    return { success: false, error: error.message };
  }
};

export const getAuditLogsWithUserDetails = async (filters = {}, pageSize = 100) => {
  try {
    // Get audit logs
    const logsResult = await getAuditLogs(filters, pageSize);
    
    if (!logsResult.success) {
      return logsResult;
    }

    const logs = logsResult.data;
    
    // Enhance logs with user details
    const enhancedLogs = await Promise.all(
      logs.map(async (log) => {
        try {
          if (log.userId) {
            // Try to get user by ID
            const userDoc = await getDoc(doc(db, 'users', log.userId));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...log,
                userName: userData.fullName || userData.email || log.userId,
                userEmail: userData.email || ''
              };
            }
            
            // If user not found in Firestore, try to get from Auth (if you have that function)
            // For now, use userId as fallback
            return {
              ...log,
              userName: log.userId,
              userEmail: ''
            };
          }
          
          // No userId, mark as system action
          return {
            ...log,
            userName: 'System',
            userEmail: ''
          };
        } catch (error) {
          console.error('Error fetching user for audit log:', error);
          return {
            ...log,
            userName: log.userId || 'Unknown',
            userEmail: ''
          };
        }
      })
    );

    return {
      success: true,
      data: enhancedLogs
    };
  } catch (error) {
    console.error('Error getting audit logs with user details:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      return {
        success: true,
        data: {
          id: userDoc.id,
          ...userDoc.data()
        }
      };
    }
    
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return { success: false, error: error.message };
  }
};

// ==================== HOSPITAL HISTORY & ANALYTICS ====================

export const getHospitalHistory = async () => {
  try {
    // Get all users (patients) to calculate demographics
    const patientsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'patient')
    );
    const patientsSnapshot = await getDocs(patientsQuery);
    
    // Get all appointments
    const appointmentsQuery = query(collection(db, 'appointments'));
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    // Get all visits
    const visitsQuery = query(collection(db, 'visits'));
    const visitsSnapshot = await getDocs(visitsQuery);
    
    // Get all invoices
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('status', '==', 'paid')
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    
    // Get all departments
    const departmentsSnapshot = await getDocs(collection(db, 'departments'));
    
    // Process data by year
    const yearlyData = {};
    const departmentsData = {};
    const monthlyData = {};
    
    // Process patients for demographics
    const demographics = {
      ageGroups: {
        '0-18': 0,
        '19-35': 0,
        '36-50': 0,
        '51-65': 0,
        '65+': 0
      },
      gender: {
        'Male': 0,
        'Female': 0,
        'Other': 0
      }
    };
    
    patientsSnapshot.forEach(doc => {
      const patient = doc.data();
      
      // Age grouping
      if (patient.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
        if (age <= 18) demographics.ageGroups['0-18']++;
        else if (age <= 35) demographics.ageGroups['19-35']++;
        else if (age <= 50) demographics.ageGroups['36-50']++;
        else if (age <= 65) demographics.ageGroups['51-65']++;
        else demographics.ageGroups['65+']++;
      }
      
      // Gender
      if (patient.gender) {
        const gender = patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1);
        if (demographics.gender[gender] !== undefined) {
          demographics.gender[gender]++;
        }
      }
    });
    
    // Process invoices by year and month
    invoicesSnapshot.forEach(doc => {
      const invoice = doc.data();
      if (invoice.createdAt) {
        const date = invoice.createdAt.toDate();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        if (!yearlyData[year]) {
          yearlyData[year] = {
            revenue: 0,
            expenses: 0,
            patientCount: 0,
            appointmentCount: 0,
            operationCount: 0
          };
        }
        
        if (!monthlyData[year]) {
          monthlyData[year] = {};
        }
        
        if (!monthlyData[year][month]) {
          monthlyData[year][month] = {
            revenue: 0,
            expenses: 0,
            patients: 0
          };
        }
        
        yearlyData[year].revenue += invoice.total || 0;
        monthlyData[year][month].revenue += invoice.total || 0;
        
        // Department revenue
        if (invoice.departmentId) {
          const deptId = invoice.departmentId;
          if (!departmentsData[deptId]) {
            departmentsData[deptId] = {
              revenue: 0,
              patientCount: 0,
              procedureCount: 0
            };
          }
          departmentsData[deptId].revenue += invoice.total || 0;
        }
      }
    });
    
    // Process appointments
    appointmentsSnapshot.forEach(doc => {
      const appointment = doc.data();
      if (appointment.createdAt) {
        const year = appointment.createdAt.toDate().getFullYear();
        if (yearlyData[year]) {
          yearlyData[year].appointmentCount++;
        }
      }
    });
    
    // Process visits/operations
    visitsSnapshot.forEach(doc => {
      const visit = doc.data();
      if (visit.createdAt) {
        const year = visit.createdAt.toDate().getFullYear();
        if (yearlyData[year]) {
          yearlyData[year].patientCount++;
          if (visit.operationType) {
            yearlyData[year].operationCount++;
          }
        }
        
        // Department patient count
        if (visit.departmentId && departmentsData[visit.departmentId]) {
          departmentsData[visit.departmentId].patientCount++;
        }
      }
    });
    
    // Get department names
    const departmentNames = {};
    departmentsSnapshot.forEach(doc => {
      const dept = doc.data();
      departmentNames[doc.id] = dept.name;
    });
    
    // Format departments data with names
    const formattedDepartments = {};
    Object.entries(departmentsData).forEach(([id, data]) => {
      formattedDepartments[departmentNames[id] || id] = data;
    });
    
    // Format monthly data
    const formattedMonthly = {};
    Object.entries(monthlyData).forEach(([year, months]) => {
      formattedMonthly[year] = Object.entries(months).map(([monthNum, data]) => ({
        month: parseInt(monthNum),
        ...data
      })).sort((a, b) => a.month - b.month);
    });
    
    // Convert yearly data to array
    const yearlyStatsArray = Object.entries(yearlyData)
      .map(([year, data]) => ({
        year: parseInt(year),
        ...data
      }))
      .sort((a, b) => a.year - b.year);
    
    return {
      success: true,
      data: {
        departments: formattedDepartments,
        demographics,
        monthly: formattedMonthly,
        yearlyStats: yearlyStatsArray,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error getting hospital history:', error);
    return { success: false, error: error.message };
  }
};

export const getYearlyHospitalStats = async () => {
  try {
    const historyResult = await getHospitalHistory();
    if (!historyResult.success) {
      return historyResult;
    }
    
    return {
      success: true,
      data: historyResult.data.yearlyStats
    };
  } catch (error) {
    console.error('Error getting yearly stats:', error);
    return { success: false, error: error.message };
  }
};

export const getFinancialSummary = async (startDate, endDate) => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('status', '==', 'paid'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    );
    
    const snapshot = await getDocs(q);
    let total = 0;
    const byDepartment = {};
    
    for (const doc of snapshot.docs) {
      const invoice = doc.data();
      total += invoice.total || 0;
      
      if (invoice.departmentId) {
        byDepartment[invoice.departmentId] = (byDepartment[invoice.departmentId] || 0) + (invoice.total || 0);
      }
    }
    
    return {
      success: true,
      data: {
        total,
        byDepartment,
        count: snapshot.size
      }
    };
  } catch (error) {
    console.error('Error getting financial summary:', error);
    
    // Fallback: try without date filters
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(invoicesRef, where('status', '==', 'paid'));
      const snapshot = await getDocs(q);
      let total = 0;
      const byDepartment = {};
      
      for (const doc of snapshot.docs) {
        const invoice = doc.data();
        const invoiceDate = invoice.createdAt?.toDate?.() || new Date(0);
        
        // Client-side date filtering
        if (invoiceDate >= startDate && invoiceDate <= endDate) {
          total += invoice.total || 0;
          
          if (invoice.departmentId) {
            byDepartment[invoice.departmentId] = (byDepartment[invoice.departmentId] || 0) + (invoice.total || 0);
          }
        }
      }
      
      return {
        success: true,
        data: {
          total,
          byDepartment,
          count: Object.keys(byDepartment).length
        }
      };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};
export const exportFinancialReport = async (startDate, endDate) => {
  try {
    const financialData = await getFinancialSummary(startDate, endDate);
    const revenueData = await getRevenueAnalytics(startDate, endDate);
    
    if (!financialData.success || !revenueData.success) {
      return { 
        success: false, 
        error: 'Failed to fetch financial data' 
      };
    }
    
    // Get expense breakdown
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    
    const expensesByCategory = {};
    let totalExpenses = 0;
    
    expensesSnapshot.forEach(doc => {
      const expense = doc.data();
      totalExpenses += expense.amount || 0;
      expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + (expense.amount || 0);
    });
    
    return {
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalRevenue: financialData.data.revenue.total,
          totalExpenses: totalExpenses,
          netProfit: financialData.data.profit,
          margin: financialData.data.revenue.total > 0 
            ? (financialData.data.profit / financialData.data.revenue.total) * 100 
            : 0
        },
        revenue: {
          total: financialData.data.revenue.total,
          byDepartment: financialData.data.revenue.byDepartment,
          byDoctor: financialData.data.revenue.byDoctor,
          daily: revenueData.data.byDay
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory
        },
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error exporting financial report:', error);
    return { success: false, error: error.message };
  }
};

// ==================== EXPORT FUNCTIONS ====================

export const exportOperationalReport = async (startDate, endDate) => {
  try {
    // Validate dates
    if (!startDate || !endDate) {
      return { success: false, error: 'Start date and end date are required' };
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Helper function to safely execute queries with fallback
    const safeQuery = async (queryFn, fallbackValue = {}) => {
      try {
        return await queryFn();
      } catch (error) {
        console.warn('Query failed, using fallback:', error.message);
        return fallbackValue;
      }
    };

    // Fetch appointments data - using existing indexes
    const appointmentsData = await safeQuery(async () => {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const snapshot = await getDocs(appointmentsQuery);
      
      const appointmentsByStatus = {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        'no-show': 0
      };
      
      snapshot.forEach(doc => {
        const apt = doc.data();
        appointmentsByStatus[apt.status] = (appointmentsByStatus[apt.status] || 0) + 1;
      });

      return {
        total: snapshot.size,
        byStatus: appointmentsByStatus
      };
    }, { total: 0, byStatus: {} });

    // Fetch visits data - using existing indexes
    const visitsData = await safeQuery(async () => {
      const visitsQuery = query(
        collection(db, 'visits'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const snapshot = await getDocs(visitsQuery);
      
      const visitsByDepartment = {};
      const uniquePatients = new Set();
      
      snapshot.forEach(doc => {
        const visit = doc.data();
        if (visit.departmentId) {
          visitsByDepartment[visit.departmentId] = (visitsByDepartment[visit.departmentId] || 0) + 1;
        }
        if (visit.patientId) uniquePatients.add(visit.patientId);
      });

      return {
        total: snapshot.size,
        uniquePatients: uniquePatients.size,
        byDepartment: visitsByDepartment
      };
    }, { total: 0, uniquePatients: 0, byDepartment: {} });

    // Fetch operations data - using existing indexes
    const operationsData = await safeQuery(async () => {
      const operationsQuery = query(
        collection(db, 'operations'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const snapshot = await getDocs(operationsQuery);
      
      const operationsByType = {};
      const operationsByStatus = {
        scheduled: 0,
        completed: 0,
        cancelled: 0
      };
      
      snapshot.forEach(doc => {
        const op = doc.data();
        operationsByType[op.operationType] = (operationsByType[op.operationType] || 0) + 1;
        operationsByStatus[op.status] = (operationsByStatus[op.status] || 0) + 1;
      });

      return {
        total: snapshot.size,
        byType: operationsByType,
        byStatus: operationsByStatus
      };
    }, { total: 0, byType: {}, byStatus: {} });

    // Fetch bed data - simple collection query (no filters)
    const bedsData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'beds'));
      const bedStats = {
        total: 0,
        occupied: 0,
        available: 0,
        maintenance: 0,
        occupancyRate: 0
      };
      
      snapshot.forEach(doc => {
        const bed = doc.data();
        bedStats.total++;
        if (bed.status === 'occupied') bedStats.occupied++;
        else if (bed.status === 'available') bedStats.available++;
        else if (bed.status === 'maintenance') bedStats.maintenance++;
      });
      
      bedStats.occupancyRate = bedStats.total > 0 
        ? (bedStats.occupied / bedStats.total) * 100 
        : 0;

      return bedStats;
    }, { total: 0, occupied: 0, available: 0, maintenance: 0, occupancyRate: 0 });

    // Fetch staff data - using existing indexes (role filter only)
    const staffData = await safeQuery(async () => {
      const staffSnapshot = await getDocs(collection(db, 'users'));
      
      const staffByRole = {
        doctors: 0,
        receptionists: 0,
        lab: 0,
        accountants: 0,
        total: 0,
        active: 0,
        byDepartment: {}
      };
      
      staffSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.role && ['doctor', 'receptionist', 'lab', 'accountant', 'patient'].includes(user.role)) {
          staffByRole.total++;
          if (user.accountStatus === 'active') staffByRole.active++;
          
          // Track by department
          if (user.department) {
            if (!staffByRole.byDepartment[user.department]) {
              staffByRole.byDepartment[user.department] = 0;
            }
            staffByRole.byDepartment[user.department]++;
          }
          
          switch(user.role) {
            case 'doctor':
              staffByRole.doctors++;
              break;
            case 'receptionist':
              staffByRole.receptionists++;
              break;
            case 'lab':
              staffByRole.lab++;
              break;
            case 'accountant':
              staffByRole.accountants++;
              break;
          }
        }
      });

      return staffByRole;
    }, { doctors: 0, receptionists: 0, lab: 0, accountants: 0, total: 0, active: 0, byDepartment: {} });

    // Get new patients in date range - using createdAt index only
    const newPatientsData = await safeQuery(async () => {
      const patientsQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const snapshot = await getDocs(patientsQuery);
      
      let newPatients = 0;
      snapshot.forEach(doc => {
        const user = doc.data();
        if (user.role === 'patient') newPatients++;
      });

      return newPatients;
    }, 0);

    // Get total patients (all time)
    const totalPatientsData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      let total = 0;
      snapshot.forEach(doc => {
        if (doc.data().role === 'patient') total++;
      });
      return total;
    }, 0);

    // Fetch lab requests data - using existing indexes
    const labData = await safeQuery(async () => {
      const labRequestsQuery = query(
        collection(db, 'labRequests'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const snapshot = await getDocs(labRequestsQuery);
      
      const labRequestsByStatus = {
        pending: 0,
        'in-progress': 0,
        completed: 0
      };
      
      snapshot.forEach(doc => {
        const req = doc.data();
        labRequestsByStatus[req.status] = (labRequestsByStatus[req.status] || 0) + 1;
      });

      return {
        total: snapshot.size,
        byStatus: labRequestsByStatus
      };
    }, { total: 0, byStatus: {} });

    // Calculate derived metrics
    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    // Compile operational report
    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: daysDiff
      },
      appointments: {
        total: appointmentsData.total,
        byStatus: appointmentsData.byStatus,
        completionRate: appointmentsData.total > 0 
          ? ((appointmentsData.byStatus.completed || 0) / appointmentsData.total) * 100 
          : 0,
        averagePerDay: appointmentsData.total / daysDiff
      },
      visits: {
        total: visitsData.total,
        uniquePatients: visitsData.uniquePatients,
        byDepartment: visitsData.byDepartment,
        averagePerDay: visitsData.total / daysDiff,
        returnRate: visitsData.uniquePatients > 0 && visitsData.total > visitsData.uniquePatients
          ? ((visitsData.total - visitsData.uniquePatients) / visitsData.uniquePatients) * 100
          : 0
      },
      operations: {
        total: operationsData.total,
        byType: operationsData.byType,
        byStatus: operationsData.byStatus,
        completionRate: operationsData.total > 0 
          ? ((operationsData.byStatus.completed || 0) / operationsData.total) * 100 
          : 0,
        averagePerDay: operationsData.total / daysDiff
      },
      beds: bedsData,
      staff: {
        total: staffData.total,
        active: staffData.active,
        byRole: {
          doctors: staffData.doctors,
          receptionists: staffData.receptionists,
          lab: staffData.lab,
          accountants: staffData.accountants
        },
        byDepartment: staffData.byDepartment,
        activePercentage: staffData.total > 0 ? (staffData.active / staffData.total) * 100 : 0
      },
      patients: {
        new: newPatientsData,
        active: visitsData.uniquePatients,
        total: totalPatientsData,
        newPatientRate: totalPatientsData > 0 ? (newPatientsData / totalPatientsData) * 100 : 0
      },
      lab: {
        total: labData.total,
        byStatus: labData.byStatus,
        completionRate: labData.total > 0 
          ? ((labData.byStatus.completed || 0) / labData.total) * 100 
          : 0,
        averagePerDay: labData.total / daysDiff
      },
      generatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: report
    };
  } catch (error) {
    console.error('Error exporting operational report:', error);
    return { 
      success: false, 
      error: error.message,
      details: 'Failed to generate operational report'
    };
  }
};

export const exportDepartmentReport = async (departmentId, startDate, endDate) => {
  try {
    // Validate inputs
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }
    
    if (!startDate || !endDate) {
      return { success: false, error: 'Start date and end date are required' };
    }

    // eslint-disable-next-line no-unused-vars
    const startTimestamp = Timestamp.fromDate(startDate);
    
    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    // Helper function for safe queries
    const safeQuery = async (queryFn, fallbackValue = {}) => {
      try {
        return await queryFn();
      } catch (error) {
        console.warn('Department query failed:', error.message);
        return fallbackValue;
      }
    };

    // Get department details
    const deptDoc = await getDoc(doc(db, 'departments', departmentId));
    if (!deptDoc.exists()) {
      return { success: false, error: 'Department not found' };
    }
    
    const department = {
      id: deptDoc.id,
      ...deptDoc.data()
    };

    // Get doctors in this department - filter in memory instead of composite query
    const doctorsData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const doctors = [];
      const doctorIds = [];
      
      snapshot.forEach(docSnap => {
        const user = docSnap.data();
        if (user.role === 'doctor' && user.department === departmentId && user.accountStatus === 'active') {
          doctors.push({
            id: docSnap.id,
            name: user.fullName,
            specialization: user.specialization,
            licenseNumber: user.licenseNumber,
            consultationFee: user.consultationFee,
            email: user.email,
            phone: user.phone
          });
          doctorIds.push(docSnap.id);
        }
      });

      return { doctors, doctorIds };
    }, { doctors: [], doctorIds: [] });

    // Get department appointments
    const appointmentsData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'appointments'));
      
      const appointmentsByStatus = {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        'no-show': 0
      };
      let total = 0;
      
      snapshot.forEach(doc => {
        const apt = doc.data();
        if (apt.department === departmentId) {
          const aptDate = apt.createdAt?.toDate?.();
          if (aptDate && aptDate >= startDate && aptDate <= endDate) {
            total++;
            appointmentsByStatus[apt.status] = (appointmentsByStatus[apt.status] || 0) + 1;
          }
        }
      });

      return { total, byStatus: appointmentsByStatus };
    }, { total: 0, byStatus: {} });

    // Get department visits
    const visitsData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'visits'));
      
      const visits = [];
      const diagnoses = {};
      const uniquePatients = new Set();
      let totalVisits = 0;
      
      for (const docSnap of snapshot.docs) {
        const visit = docSnap.data();
        if (visit.department === departmentId) {
          const visitDate = visit.createdAt?.toDate?.();
          if (visitDate && visitDate >= startDate && visitDate <= endDate) {
            totalVisits++;
            uniquePatients.add(visit.patientId);
            
            visits.push({
              id: docSnap.id,
              patientId: visit.patientId,
              doctorId: visit.doctorId,
              chiefComplaint: visit.chiefComplaint,
              diagnosis: visit.diagnosis,
              createdAt: visitDate
            });
            
            if (visit.diagnosis) {
              diagnoses[visit.diagnosis] = (diagnoses[visit.diagnosis] || 0) + 1;
            }
          }
        }
      }

      return {
        total: totalVisits,
        uniquePatients: uniquePatients.size,
        diagnoses: diagnoses,
        visits: visits
      };
    }, { total: 0, uniquePatients: 0, diagnoses: {}, visits: [] });

    // Get department invoices
    const financialData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'invoices'));
      
      let totalRevenue = 0;
      const revenueByMonth = {};
      const revenueByService = {};
      let invoiceCount = 0;
      
      snapshot.forEach(doc => {
        const invoice = doc.data();
        if (invoice.departmentId === departmentId && invoice.status === 'paid') {
          const invoiceDate = invoice.createdAt?.toDate?.();
          if (invoiceDate && invoiceDate >= startDate && invoiceDate <= endDate) {
            invoiceCount++;
            totalRevenue += invoice.total || 0;
            
            const month = invoiceDate.toISOString().slice(0, 7);
            revenueByMonth[month] = (revenueByMonth[month] || 0) + (invoice.total || 0);
            
            invoice.items?.forEach(item => {
              const serviceType = item.type || 'other';
              revenueByService[serviceType] = (revenueByService[serviceType] || 0) + (item.calculatedAmount || item.amount || 0);
            });
          }
        }
      });

      return {
        totalRevenue,
        byMonth: revenueByMonth,
        byService: revenueByService,
        invoiceCount
      };
    }, { totalRevenue: 0, byMonth: {}, byService: {}, invoiceCount: 0 });

    // Get department operations
    const operationsData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'operations'));
      
      const operationsByType = {};
      const operationsByStatus = {};
      let total = 0;
      
      snapshot.forEach(doc => {
        const op = doc.data();
        if (op.departmentId === departmentId) {
          const opDate = op.createdAt?.toDate?.();
          if (opDate && opDate >= startDate && opDate <= endDate) {
            total++;
            operationsByType[op.operationType] = (operationsByType[op.operationType] || 0) + 1;
            operationsByStatus[op.status] = (operationsByStatus[op.status] || 0) + 1;
          }
        }
      });

      return { total, byType: operationsByType, byStatus: operationsByStatus };
    }, { total: 0, byType: {}, byStatus: {} });

    // Get department lab requests
    const labData = await safeQuery(async () => {
      const snapshot = await getDocs(collection(db, 'labRequests'));
      
      const labRequestsByStatus = {
        pending: 0,
        'in-progress': 0,
        completed: 0
      };
      const commonTests = {};
      let total = 0;
      
      snapshot.forEach(doc => {
        const req = doc.data();
        if (req.department === departmentId) {
          const reqDate = req.createdAt?.toDate?.();
          if (reqDate && reqDate >= startDate && reqDate <= endDate) {
            total++;
            labRequestsByStatus[req.status] = (labRequestsByStatus[req.status] || 0) + 1;
            
            req.tests?.forEach(test => {
              commonTests[test.name] = (commonTests[test.name] || 0) + 1;
            });
          }
        }
      });

      return {
        total,
        byStatus: labRequestsByStatus,
        commonTests
      };
    }, { total: 0, byStatus: {}, commonTests: {} });

    // Calculate doctor performance
    const doctorPerformance = {};
    for (const doctorId of doctorsData.doctorIds) {
      const doctorVisits = visitsData.visits.filter(v => v.doctorId === doctorId);
      const doctorDiagnoses = {};
      
      doctorVisits.forEach(v => {
        if (v.diagnosis) {
          doctorDiagnoses[v.diagnosis] = (doctorDiagnoses[v.diagnosis] || 0) + 1;
        }
      });

      // Get doctor ratings (simplified - you can enhance this)
      const ratingsSnapshot = await getDocs(collection(db, 'ratings'));
      let totalRating = 0;
      let ratingCount = 0;
      
      ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        if (rating.doctorId === doctorId) {
          const ratingDate = rating.createdAt?.toDate?.();
          if (ratingDate && ratingDate >= startDate && ratingDate <= endDate) {
            totalRating += rating.rating || 0;
            ratingCount++;
          }
        }
      });

      doctorPerformance[doctorId] = {
        visits: doctorVisits.length,
        revenue: 0, // You can calculate this from invoices if needed
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        totalRatings: ratingCount,
        commonDiagnoses: Object.entries(doctorDiagnoses)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([diagnosis, count]) => ({ diagnosis, count }))
      };
    }

    // Compile department report
    const report = {
      department: {
        id: department.id,
        name: department.name,
        headDoctor: department.headDoctorName || 'Not Assigned',
        description: department.description,
        createdAt: department.createdAt?.toDate?.() || null,
        consultationFee: department.consultationFee || 0
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: daysDiff
      },
      staff: {
        doctors: doctorsData.doctors,
        totalDoctors: doctorsData.doctors.length,
        performance: doctorPerformance
      },
      appointments: {
        total: appointmentsData.total,
        byStatus: appointmentsData.byStatus,
        completionRate: appointmentsData.total > 0 
          ? ((appointmentsData.byStatus.completed || 0) / appointmentsData.total) * 100 
          : 0,
        averagePerDay: appointmentsData.total / daysDiff
      },
      visits: {
        total: visitsData.total,
        uniquePatients: visitsData.uniquePatients,
        averagePerDay: visitsData.total / daysDiff,
        returnRate: visitsData.uniquePatients > 0 && visitsData.total > visitsData.uniquePatients
          ? ((visitsData.total - visitsData.uniquePatients) / visitsData.uniquePatients) * 100
          : 0,
        commonDiagnoses: Object.entries(visitsData.diagnoses)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([diagnosis, count]) => ({ diagnosis, count }))
      },
      financial: {
        totalRevenue: financialData.totalRevenue,
        averagePerVisit: visitsData.total > 0 ? financialData.totalRevenue / visitsData.total : 0,
        byMonth: financialData.byMonth,
        byService: financialData.byService,
        invoices: financialData.invoiceCount
      },
      operations: {
        total: operationsData.total,
        byType: operationsData.byType,
        byStatus: operationsData.byStatus,
        averagePerDay: operationsData.total / daysDiff
      },
      lab: {
        total: labData.total,
        byStatus: labData.byStatus,
        completionRate: labData.total > 0 
          ? ((labData.byStatus.completed || 0) / labData.total) * 100 
          : 0,
        commonTests: Object.entries(labData.commonTests)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([test, count]) => ({ test, count }))
      },
      generatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: report
    };
  } catch (error) {
    console.error('Error exporting department report:', error);
    return { 
      success: false, 
      error: error.message,
      details: 'Failed to generate department report'
    };
  }
};

// ==================== APPOINTMENT MANAGEMENT ====================

/**
 * Get appointments by date with patient and doctor details
 * @param {string} date - Date string
 * @returns {Promise<Object>} Appointments with details
 */
export const getAppointmentsByDate = async (date) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('date', '==', date)
    );
    
    const snapshot = await getDocs(q);
    const appointments = [];
    
    for (const document of snapshot.docs) {  // CHANGED: 'doc' to 'document'
      const appointment = { id: document.id, ...document.data() };
      
      // Get patient details
      if (appointment.patientId) {
        try {
          const patientDoc = await getDoc(doc(db, 'users', appointment.patientId));  // This is correct - using imported doc function
          if (patientDoc.exists()) {
            const patientData = patientDoc.data();
            appointment.patientName = patientData.fullName;
            appointment.patientPhone = patientData.phone;
            appointment.patientEmail = patientData.email;
          }
        } catch (error) {
          console.error('Error fetching patient:', error);
        }
      }
      
      // Get doctor details
      if (appointment.doctorId) {
        try {
          const doctorDoc = await getDoc(doc(db, 'users', appointment.doctorId));  // This is correct - using imported doc function
          if (doctorDoc.exists()) {
            const doctorData = doctorDoc.data();
            appointment.doctorName = doctorData.fullName;
            appointment.doctorSpecialization = doctorData.specialization;
          }
        } catch (error) {
          console.error('Error fetching doctor:', error);
        }
      }
      
      appointments.push(appointment);
    }
    
    // Sort client-side by time
    appointments.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    
    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error getting appointments by date:', error);
    return { success: false, error: error.message };
  }
};

// ==================== AVAILABLE DOCTORS ====================

export const getAvailableDoctors = async (departmentId, date) => {
  try {
    // Get all doctors in department
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'doctor'),
      where('department', '==', departmentId),
      where('accountStatus', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    const doctors = [];
    
    // Get existing appointments for the date
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '==', date),
      where('status', 'in', ['approved', 'scheduled', 'checked-in'])
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    const bookedDoctors = new Set();
    
    appointmentsSnapshot.forEach(doc => {
      bookedDoctors.add(doc.data().doctorId);
    });
    
    snapshot.forEach(doc => {
      const doctor = { id: doc.id, ...doc.data() };
      // Only include doctors who are not fully booked
      if (!bookedDoctors.has(doctor.id)) {
        doctors.push(doctor);
      }
    });
    
    return { success: true, data: doctors };
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    return { success: false, error: error.message };
  }
};

export const getDoctorSchedule = async (doctorId, date) => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('date', '==', date),
      where('status', 'in', ['approved', 'scheduled', 'checked-in', 'completed'])
    );
    
    const snapshot = await getDocs(q);
    const schedule = [];
    
    snapshot.forEach(doc => {
      schedule.push({
        id: doc.id,
        time: doc.data().time,
        patientId: doc.data().patientId,
        status: doc.data().status
      });
    });
    
    return { success: true, data: schedule };
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    return { success: false, error: error.message };
  }
};

// ==================== AVAILABLE BEDS ====================

export const getAvailableBeds = async (type = null) => {
  try {
    let q = query(
      collection(db, 'beds'),
      where('status', '==', 'available')
    );
    
    if (type) {
      q = query(q, where('type', '==', type));
    }
    
    const snapshot = await getDocs(q);
    const beds = [];
    
    snapshot.forEach(doc => {
      beds.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: beds };
  } catch (error) {
    console.error('Error fetching available beds:', error);
    return { success: false, error: error.message };
  }
};

// ==================== NOTIFICATIONS ====================

export const sendNotification = async (notificationData) => {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    
    const notification = {
      id: notificationRef.id,
      ...notificationData,
      read: false,
      createdAt: serverTimestamp()
    };
    
    await setDoc(notificationRef, notification);
    
    return { success: true, data: notification };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DASHBOARD STATS ====================

export const getDashboardStats = async (date) => {
  try {
    // Get today's appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '==', date)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    let todayAppointments = 0;
    let checkedIn = 0;
    let pendingApprovals = 0;
    
    appointmentsSnapshot.forEach(doc => {
      todayAppointments++;
      const status = doc.data().status;
      if (status === 'checked-in') checkedIn++;
      if (status === 'pending') pendingApprovals++;
    });
    
    // Get today's discharges
    const dischargesQuery = query(
      collection(db, 'visits'),
      where('dischargeDate', '>=', new Date(date)),
      where('dischargeDate', '<', new Date(new Date(date).setDate(new Date(date).getDate() + 1)))
    );
    const dischargesSnapshot = await getDocs(dischargesQuery);
    
    // Get upcoming operations
    const operationsQuery = query(
      collection(db, 'operations'),
      where('scheduledDate', '>=', new Date()),
      where('status', '==', 'scheduled'),
      limit(10)
    );
    const operationsSnapshot = await getDocs(operationsQuery);
    
    return {
      success: true,
      data: {
        todayAppointments,
        checkedIn,
        pendingApprovals,
        todaysDischarges: dischargesSnapshot.size,
        upcomingOperations: operationsSnapshot.size
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { success: false, error: error.message };
  }
};

// ==================== STAFF ATTENDANCE ====================

/**
 * Get staff attendance for a specific date (including department staff)
 * @param {string} date - Date string
 * @returns {Promise<Object>} Staff attendance records
 */
export const getStaffAttendance = async (date) => {
  try {
    // Use the new comprehensive function
    const result = await getCompleteAttendanceByDate(date);
    if (result.success) {
      return result;
    }
    
    // Fallback to original logic if needed
    // Get all active system staff
    const systemRoles = ['doctor', 'receptionist', 'lab', 'accountant', 'admin', 'nurse'];
    const staffPromises = systemRoles.map(role => getUsersByRole(role));
    const staffResults = await Promise.all(staffPromises);
    
    const staffMap = new Map();
    
    for (let i = 0; i < staffResults.length; i++) {
      if (staffResults[i].success) {
        staffResults[i].data.forEach(user => {
          if (user.accountStatus === 'active' && user.baseSalary && user.baseSalary > 0) {
            staffMap.set(user.id, {
              id: user.id,
              fullName: user.fullName,
              role: user.role,
              department: user.department || 'Administration',
              baseSalary: user.baseSalary,
              source: 'system'
            });
          }
        });
      }
    }
    
    // Add department staff
    const departmentsResult = await getDepartments();
    if (departmentsResult.success) {
      for (const dept of departmentsResult.data) {
        const staffResult = await getDepartmentStaff(dept.id);
        if (staffResult.success && staffResult.data.length > 0) {
          staffResult.data.forEach(staff => {
            if (staff.status === 'active' && staff.salary && staff.salary > 0) {
              staffMap.set(staff.id, {
                id: staff.id,
                fullName: staff.name,
                role: staff.role,
                department: dept.name,
                baseSalary: staff.salary,
                source: 'department'
              });
            }
          });
        }
      }
    }
    
    // Get attendance for the date
    let attendanceSnapshot;
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', date)
      );
      attendanceSnapshot = await getDocs(attendanceQuery);
    } catch (error) {
      console.error('Error fetching attendance with index:', error);
      const allAttendance = await getDocs(collection(db, 'attendance'));
      attendanceSnapshot = {
        docs: allAttendance.docs.filter(doc => doc.data().date === date),
        forEach: (cb) => attendanceSnapshot.docs.forEach(cb)
      };
    }
    
    const attendanceRecords = [];
    const markedStaffIds = new Set();
    
    for (const doc of attendanceSnapshot.docs) {
      const record = doc.data();
      markedStaffIds.add(record.userId);
      const staff = staffMap.get(record.userId);
      
      if (staff) {
        attendanceRecords.push({
          id: doc.id,
          userId: record.userId,
          fullName: staff.fullName,
          role: staff.role,
          department: staff.department,
          date: record.date,
          status: record.status,
          checkInTime: record.checkInTime,
          markedBy: record.markedBy,
          markedAt: record.markedAt?.toDate?.() || null
        });
        staffMap.delete(record.userId);
      }
    }
    
    // Add unmarked staff as absent
    for (const [userId, staff] of staffMap) {
      attendanceRecords.push({
        id: `absent-${userId}`,
        userId: userId,
        fullName: staff.fullName,
        role: staff.role,
        department: staff.department,
        date: date,
        status: 'absent',
        checkInTime: null,
        markedBy: null,
        markedAt: null,
        isAutoMarked: true
      });
    }
    
    // Sort records
    attendanceRecords.sort((a, b) => {
      if (a.department !== b.department) return a.department.localeCompare(b.department);
      return a.fullName.localeCompare(b.fullName);
    });
    
    return { success: true, data: attendanceRecords };
  } catch (error) {
    console.error('Error fetching staff attendance:', error);
    return { success: false, error: error.message };
  }
};

// ==================== GET INVOICE BY ID ====================

export const getInvoiceById = async (invoiceId) => {
  try {
    const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
    
    if (!invoiceDoc.exists()) {
      return { success: false, error: 'Invoice not found' };
    }
    
    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };
    
    // Get patient details
    if (invoice.patientId) {
      const patientResult = await getUserById(invoice.patientId);
      if (patientResult.success) {
        invoice.patientName = patientResult.data.fullName;
      }
    }
    
    // Get doctor details
    if (invoice.doctorId) {
      const doctorResult = await getUserById(invoice.doctorId);
      if (doctorResult.success) {
        invoice.doctorName = doctorResult.data.fullName;
      }
    }
    
    return { success: true, data: invoice };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PATIENT REGISTRATION WITH AUTH ====================

export const registerWalkInPatient = async (patientData) => {
  try {
    // We need to import auth functions dynamically to avoid circular dependency
    // This is a workaround - in production, you might want to restructure your code
    let userId;
    let appointmentId = null;
    
    // If email is provided, we need to create auth user
    if (patientData.email) {
      // Since we can't import directly due to circular dependency,
      // we'll use a fetch to an API endpoint or restructure your code
      // For now, let's create a simple ID and handle auth separately
      // This is a TEMPORARY solution - you should restructure your code
      
      // Generate a unique ID
      userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store in Firestore with a flag that auth needs to be created
      const userDoc = {
        uid: userId,
        fullName: patientData.fullName,
        email: patientData.email,
        phone: patientData.phone,
        cnic: patientData.cnic || null,
        dateOfBirth: patientData.dateOfBirth,
        gender: patientData.gender,
        address: patientData.address || null,
        emergencyContact: patientData.emergencyContact || null,
        bloodGroup: patientData.bloodGroup || null,
        role: 'patient',
        accountStatus: 'pending_verification',
        emailVerified: false,
        createdAt: serverTimestamp(),
        createdBy: patientData.registeredBy || 'system',
        needsAuthCreation: true,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', userId), userDoc);
      
      // Log that auth needs to be created
      console.warn('Auth user needs to be created for:', patientData.email);
      // In production, you'd have a cloud function or separate process to handle this
      
    } else {
      // No email - create only in Firestore
      userId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const userDoc = {
        uid: userId,
        fullName: patientData.fullName,
        email: null,
        phone: patientData.phone,
        cnic: patientData.cnic || null,
        dateOfBirth: patientData.dateOfBirth,
        gender: patientData.gender,
        address: patientData.address || null,
        emergencyContact: patientData.emergencyContact || null,
        bloodGroup: patientData.bloodGroup || null,
        role: 'patient',
        accountStatus: 'active',
        emailVerified: false,
        createdAt: serverTimestamp(),
        createdBy: patientData.registeredBy || 'system',
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', userId), userDoc);
    }
    
    // Create appointment if provided
    if (patientData.department && patientData.doctorId && patientData.appointmentTime) {
      const appointmentResult = await createAppointment({
        patientId: userId,
        doctorId: patientData.doctorId,
        department: patientData.department,
        date: patientData.appointmentDate || new Date().toISOString().split('T')[0],
        time: patientData.appointmentTime,
        reason: patientData.symptoms,
        isEmergency: patientData.isEmergency || false,
        triage: patientData.triage,
        status: patientData.isEmergency ? 'approved' : 'pending',
        createdBy: patientData.registeredBy
      });
      
      if (appointmentResult.success) {
        appointmentId = appointmentResult.data.id;
      }
    }
    
    return { 
      success: true, 
      data: { 
        id: userId, 
        appointmentId 
      },
      message: patientData.email 
        ? 'Patient registered. Auth setup pending. Please contact admin to complete registration.'
        : 'Patient registered successfully.'
    };
  } catch (error) {
    console.error('Error registering walk-in patient:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DOCTOR PUBLIC FUNCTIONS ====================

export const getPublicDoctors = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'doctor'),
      where('accountStatus', '==', 'active'),
      orderBy('fullName')
    );

    const snapshot = await getDocs(q);
    const doctors = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      doctors.push({
        id: doc.id,
        fullName: data.fullName,
        specialization: data.specialization,
        qualifications: data.qualifications || [],
        experience: data.experience || 0,
        consultationFee: data.consultationFee,
        about: data.about || '',
        languages: data.languages || [],
        education: data.education || [],
        awards: data.awards || [],
        profileImage: data.profileImage || null,
        avgRating: data.avgRating || 0,
        ratings: data.ratings?.length || 0,
        availability: data.availability || {}
      });
    });

    return { success: true, data: doctors };
  } catch (error) {
    console.error('Error fetching public doctors:', error);
    return { success: false, error: error.message };
  }
};

export const getPublicDoctorById = async (doctorId) => {
  try {
    const result = await getUserById(doctorId);
    
    if (!result.success) {
      return result;
    }

    const doctor = result.data;
    
    // Only return public fields
    return {
      success: true,
      data: {
        id: doctor.id,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        qualifications: doctor.qualifications || [],
        experience: doctor.experience || 0,
        consultationFee: doctor.consultationFee,
        about: doctor.about || '',
        languages: doctor.languages || [],
        education: doctor.education || [],
        awards: doctor.awards || [],
        profileImage: doctor.profileImage || null,
        avgRating: doctor.avgRating || 0,
        ratings: doctor.ratings?.length || 0,
        availability: doctor.availability || {}
      }
    };
  } catch (error) {
    console.error('Error fetching public doctor:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PUBLIC DEPARTMENT FUNCTIONS ====================

export const getPublicDepartments = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'departments'));
    const departments = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      departments.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        image: data.image || null,
        headDoctorName: data.headDoctorName || 'Not Assigned',
        services: (data.services || []).slice(0, 5),
        doctorCount: data.doctorCount || 0,
        facilities: data.facilities || []
      });
    });

    return { success: true, data: departments };
  } catch (error) {
    console.error('Error fetching public departments:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CONTACT & SUPPORT MESSAGES ====================

// Constants for file handling
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      reject(new Error(`File type ${file.type} is not allowed. Allowed types: images, PDF, DOC, DOCX, TXT, XLS, XLSX`));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File ${file.name} exceeds maximum size of 5MB`));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result includes the data URL prefix (e.g., "data:image/jpeg;base64,")
      // We'll store the full string with prefix for easy rendering
      resolve(reader.result);
    };
    reader.onerror = error => reject(error);
  });
};

export const submitContactMessage = async (messageData) => {
  try {
    // Validate required fields
    if (!messageData.name || !messageData.email || !messageData.subjectType || !messageData.message) {
      return { success: false, error: 'Missing required fields' };
    }

    // Process files if any
    let attachments = [];
    let totalSize = 0;

    if (messageData.files && messageData.files.length > 0) {
      // Check total size
      for (const file of messageData.files) {
        totalSize += file.size;
        if (totalSize > MAX_TOTAL_SIZE) {
          return { success: false, error: 'Total file size exceeds 15MB limit' };
        }
      }

      // Convert each file to base64
      for (const file of messageData.files) {
        try {
          const base64 = await fileToBase64(file);
          attachments.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadedAt: new Date().toISOString()
          });
        } catch (fileError) {
          return { success: false, error: fileError.message };
        }
      }
    }

    // Determine assignment based on subject type
    let assignedRole = 'receptionist'; // Default
    const adminTypes = ['Complaint', 'Bug Report', 'Suggestion', 'Technical Issue', 'Feedback', 'Partnership'];
    
    if (adminTypes.includes(messageData.subjectType)) {
      assignedRole = 'admin';
    }

    const messageRef = doc(collection(db, CONTACT_MESSAGES_COLLECTION));
    const message = {
      id: messageRef.id,
      name: messageData.name,
      email: messageData.email,
      phone: messageData.phone || '',
      subjectType: messageData.subjectType,
      message: messageData.message,
      attachments: attachments,
      status: 'new',
      assignedRole: assignedRole,
      assignedTo: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      replies: []
    };

    await setDoc(messageRef, message);

    // Send notification to appropriate users based on role
    const usersResult = await getUsersByRole(assignedRole);
    if (usersResult.success) {
      const batch = writeBatch(db);
      usersResult.data.forEach(user => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: user.id,
          type: 'NEW_CONTACT_MESSAGE',
          title: `New ${messageData.subjectType}`,
          message: `New message from ${messageData.name}: ${messageData.message.substring(0, 50)}...`,
          contactMessageId: messageRef.id,
          read: false,
          timestamp: serverTimestamp()
        });
      });
      await batch.commit();
    }

    return { success: true, data: message };
  } catch (error) {
    console.error('Error submitting contact message:', error);
    return { success: false, error: error.message };
  }
};
export const getBedOccupancyStats = async () => {
  try {
    const bedsSnapshot = await getDocs(collection(db, 'beds'));
    const beds = [];
    bedsSnapshot.forEach((doc) => {
      beds.push({ id: doc.id, ...doc.data() });
    });

    const occupancy = {
      icu: { total: 0, available: 0, occupied: 0, maintenance: 0 },
      general: { total: 0, available: 0, occupied: 0, maintenance: 0 },
      emergency: { total: 0, available: 0, occupied: 0, maintenance: 0 },
      isolation: { total: 0, available: 0, occupied: 0, maintenance: 0 },
      ccu: { total: 0, available: 0, occupied: 0, maintenance: 0 },
      nicu: { total: 0, available: 0, occupied: 0, maintenance: 0 },
      picu: { total: 0, available: 0, occupied: 0, maintenance: 0 }
    };

    beds.forEach(bed => {
      const type = bed.type?.toLowerCase() || 'general';
      if (occupancy[type]) {
        occupancy[type].total++;
        if (bed.status === 'available') occupancy[type].available++;
        if (bed.status === 'occupied') occupancy[type].occupied++;
        if (bed.status === 'maintenance') occupancy[type].maintenance++;
      }
    });

    return { success: true, data: occupancy };
  } catch (error) {
    console.error('Error getting bed occupancy stats:', error);
    return { success: false, error: error.message };
  }
};

export const getPatientVisits = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    const visitsQuery = query(
      collection(db, 'visits'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(visitsQuery);
    const visits = [];

    querySnapshot.forEach((doc) => {
      const visitData = doc.data();
      visits.push({
        id: doc.id,
        ...visitData,
        admissionDate: visitData.createdAt?.toDate?.() || visitData.createdAt,
        dischargeDate: visitData.dischargeDate?.toDate?.() || visitData.dischargeDate
      });
    });

    return { success: true, data: visits };
  } catch (error) {
    console.error('Error fetching patient visits:', error);
    return { success: false, error: error.message };
  }
};

export const checkPatientExists = async (criteria) => {
  try {
    // Check by email
    if (criteria.email) {
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', criteria.email),
        where('role', '==', 'patient'),
        limit(1)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        return { exists: true, field: 'email', patient: { id: emailSnapshot.docs[0].id, ...emailSnapshot.docs[0].data() } };
      }
    }

    // Check by CNIC
    if (criteria.cnic) {
      const cnicQuery = query(
        collection(db, 'users'),
        where('cnic', '==', criteria.cnic),
        where('role', '==', 'patient'),
        limit(1)
      );
      const cnicSnapshot = await getDocs(cnicQuery);
      if (!cnicSnapshot.empty) {
        return { exists: true, field: 'cnic', patient: { id: cnicSnapshot.docs[0].id, ...cnicSnapshot.docs[0].data() } };
      }
    }

    // Check by phone
    if (criteria.phone) {
      const phoneQuery = query(
        collection(db, 'users'),
        where('phone', '==', criteria.phone),
        where('role', '==', 'patient'),
        limit(1)
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        return { exists: true, field: 'phone', patient: { id: phoneSnapshot.docs[0].id, ...phoneSnapshot.docs[0].data() } };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error('Error checking patient exists:', error);
    return { exists: false, error: error.message };
  }
};

export const printDocument = (options) => {
  try {
    const { title, content } = options;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
    
    // Write the content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || 'MediCare Plus Document'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          .header { text-align: center; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .watermark { 
            position: fixed; 
            bottom: 10px; 
            right: 10px; 
            opacity: 0.1; 
            font-size: 50px; 
            transform: rotate(-45deg);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MediCare Plus</h1>
          <p>Smart Hospital Management System</p>
          <hr/>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()} | MediCare Plus</p>
        </div>
        <div class="watermark">MediCare Plus</div>
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6B7280; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
        <script>
          // Auto-trigger print after load
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    return { success: true };
  } catch (error) {
    console.error('Error printing document:', error);
    return { success: false, error: error.message };
  }
};

export const exportToCSV = (data, options = {}) => {
  try {
    if (!data || !data.length) {
      throw new Error('No data to export');
    }

    const { filename = 'export.csv', columns } = options;
    
    // Determine columns
    let headers = [];
    let columnKeys = [];
    
    if (columns) {
      headers = columns.map(col => col.label || col);
      columnKeys = columns.map(col => col.key || col);
    } else {
      // Use all keys from first object
      columnKeys = Object.keys(data[0]);
      headers = columnKeys.map(key => key.charAt(0).toUpperCase() + key.slice(1));
    }
    
    // Create CSV rows
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = columnKeys.map(key => {
        const value = row[key] || '';
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: `Exported ${data.length} records to ${filename}` };
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return { success: false, error: error.message };
  }
};

export const exportToPDF = (data, options = {}) => {
  try {
    if (!data || !data.length) {
      throw new Error('No data to export');
    }

    const {
      title = 'Export',
      filename = 'export.pdf',
      columns,
      orientation = 'portrait'
    } = options;

    // Dynamically import jspdf
    import('jspdf').then((jsPDFModule) => {
      const jsPDF = jsPDFModule.default;
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({
          orientation,
          unit: 'mm',
          format: 'a4'
        });

        // Add title
        doc.setFontSize(18);
        doc.setTextColor(0, 102, 204);
        doc.text(title, 14, 22);
        
        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        
        // Prepare columns and rows
        let tableColumns = [];
        let tableRows = [];
        
        if (columns) {
          tableColumns = columns.map(col => ({
            header: col.label || col,
            dataKey: col.key || col
          }));
          
          tableRows = data.map(row => {
            const rowData = {};
            columns.forEach(col => {
              const key = col.key || col;
              rowData[key] = row[key] || '';
            });
            return rowData;
          });
        } else {
          // Auto-detect columns from first object
          const firstRow = data[0];
          tableColumns = Object.keys(firstRow).map(key => ({
            header: key.charAt(0).toUpperCase() + key.slice(1),
            dataKey: key
          }));
          // eslint-disable-next-line no-unused-vars
          tableRows = data;
        }

        // Generate table
        doc.autoTable({
          startY: 40,
          head: [tableColumns.map(col => col.header)],
          body: data.map(row => tableColumns.map(col => row[col.dataKey] || '')),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: tableColumns.reduce((acc, col, index) => {
            acc[index] = { cellWidth: 'auto' };
            return acc;
          }, {})
        });

        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }

        // Save PDF
        doc.save(filename);
      });
    }).catch(error => {
      console.error('Error loading PDF libraries:', error);
      throw new Error('Failed to load PDF generation libraries');
    });

    return { success: true, message: `Exporting ${data.length} records to PDF` };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return { success: false, error: error.message };
  }
};

export const updateTriageStatus = async (caseId, triageData, updatedBy) => {
  try {
    const caseRef = doc(db, 'emergency', caseId);
    
    await updateDoc(caseRef, {
      triage: triageData.color,
      vitals: triageData.vitals,
      notes: triageData.notes,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    // Log to audit
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'TRIAGE_UPDATED',
      targetId: caseId,
      newTriage: triageData.color,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating triage:', error);
    return { success: false, error: error.message };
  }
};
export const markAttendance = async (userId, date, status, markedBy) => {
  try {
    const attendanceId = `${userId}_${date}`;
    const attendanceRef = doc(db, 'attendance', attendanceId);
    
    // Check if already marked
    const existing = await getDoc(attendanceRef);
    if (existing.exists()) {
      return { success: false, error: 'Attendance already marked for today' };
    }

    const attendanceData = {
      id: attendanceId,
      userId,
      date,
      status,
      markedBy,
      markedAt: serverTimestamp(),
      checkInTime: status === 'present' || status === 'late' ? new Date().toLocaleTimeString() : null,
      updatedAt: serverTimestamp()
    };

    await setDoc(attendanceRef, attendanceData);

    // Get user details for response
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};

    return { 
      success: true, 
      data: { 
        ...attendanceData, 
        fullName: userData.fullName,
        role: userData.role 
      } 
    };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }
};

export const getTodayAttendance = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('date', '==', today)
    );
    
    const snapshot = await getDocs(q);
    const attendance = [];
    
    // FIX: Use for...of loop with proper document reference
    for (const document of snapshot.docs) {
      const record = { id: document.id, ...document.data() };
      
      // Get user details
      if (record.userId) {
        const userDoc = await getDoc(doc(db, 'users', record.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          record.fullName = userData.fullName;
          record.role = userData.role;
          record.department = userData.department;
        }
      }
      
      attendance.push(record);
    }
    
    return { success: true, data: attendance };
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return { success: false, error: error.message };
  }
};

const CONTACT_MESSAGES_COLLECTION = 'contactMessages';

export const getContactMessages = async (filters = {}, userRole = null, userId = null) => {
  try {
    let constraints = [];

    // Always order by createdAt descending
    constraints.push(orderBy('createdAt', 'desc'));

    // Role-based filtering
    if (userRole === 'receptionist') {
      // Receptionists see messages assigned to receptionist role OR assigned to them personally
      constraints.push(
        where('assignedRole', 'in', ['receptionist', null])
      );
    } else if (userRole === 'admin') {
      // Admin sees everything - no additional filters
    } else if (userRole === 'patient') {
      // Patients see only their own messages
      if (userId) {
        constraints.push(where('userId', '==', userId));
      } else {
        return { success: true, data: [] }; // No user ID, return empty
      }
    }

    // Apply optional filters
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.subjectType) {
      constraints.push(where('subjectType', '==', filters.subjectType));
    }
    if (filters.assignedTo) {
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }

    // Build and execute query
    const q = query(collection(db, CONTACT_MESSAGES_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    const messages = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
        // Convert reply timestamps if they exist
        replies: data.replies?.map(reply => ({
          ...reply,
          repliedAt: reply.repliedAt?.toDate?.() || null
        })) || []
      });
    });

    // If no index exists, we'll get a specific error with a link to create it
    return { success: true, data: messages };
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    
    // Check if it's an index error and provide helpful message
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      // Extract the index creation URL from the error message
      const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      
      return { 
        success: false, 
        error: 'Database index required. Please create the index using the link below.',
        indexUrl: indexUrl,
        requiresIndex: true
      };
    }
    
    return { success: false, error: error.message };
  }
};

export const addMessageReply = async (messageId, reply, repliedBy, repliedByName) => {
  try {
    const messageRef = doc(db, CONTACT_MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const message = messageDoc.data();
    
    // Create reply object
    const replyObj = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: reply,
      repliedBy,
      repliedByName,
      repliedAt: serverTimestamp()
    };

    // Update message with reply and change status to in-progress if it was new
    const updates = {
      replies: arrayUnion(replyObj),
      updatedAt: serverTimestamp()
    };

    // If message was new, set to in-progress
    if (message.status === 'new') {
      updates.status = 'in-progress';
    }

    await updateDoc(messageRef, updates);

    // Create notification for the original sender if they're a registered user
    if (message.userId) {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: message.userId,
        type: 'MESSAGE_REPLY',
        title: 'New Reply to Your Message',
        message: `${repliedByName} has replied to your message: "${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}"`,
        contactMessageId: messageId,
        read: false,
        timestamp: serverTimestamp()
      });
    }

    // Create notification for assigned user if different from replier
    if (message.assignedTo && message.assignedTo !== repliedBy) {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: message.assignedTo,
        type: 'MESSAGE_REPLY',
        title: 'Reply Added to Assigned Message',
        message: `${repliedByName} added a reply to message #${messageId.slice(-6)}`,
        contactMessageId: messageId,
        read: false,
        timestamp: serverTimestamp()
      });
    }

    return { success: true, data: replyObj };
  } catch (error) {
    console.error('Error adding reply:', error);
    return { success: false, error: error.message };
  }
};

export const updateContactMessage = async (messageId, status, assignedTo, updatedBy) => {
  try {
    const messageRef = doc(db, CONTACT_MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const message = messageDoc.data();
    const updates = {
      status,
      updatedAt: serverTimestamp(),
      updatedBy
    };

    // If assigning to someone
    if (assignedTo) {
      updates.assignedTo = assignedTo;
      
      // Determine role of assignee (you might want to fetch this from users collection)
      // For now, we'll set a default or you can pass it as a parameter
      updates.assignedRole = 'receptionist'; // This should be dynamic based on the user's role
    }

    await updateDoc(messageRef, updates);

    // Notify assigned user
    if (assignedTo && assignedTo !== updatedBy) {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: assignedTo,
        type: 'MESSAGE_ASSIGNED',
        title: 'Message Assigned to You',
        message: `A ${message.subjectType || 'support'} message has been assigned to you`,
        contactMessageId: messageId,
        read: false,
        timestamp: serverTimestamp()
      });
    }

    // If resolved, notify the original sender
    if (status === 'resolved' && message.userId) {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: message.userId,
        type: 'MESSAGE_RESOLVED',
        title: 'Your Message Has Been Resolved',
        message: `Your ${message.subjectType || 'support'} message has been marked as resolved`,
        contactMessageId: messageId,
        read: false,
        timestamp: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating contact message:', error);
    return { success: false, error: error.message };
  }
};

export const createContactMessage = async (messageData) => {
  try {
    const messageRef = doc(collection(db, CONTACT_MESSAGES_COLLECTION));
    
    const message = {
      id: messageRef.id,
      ...messageData,
      status: 'new',
      assignedRole: null,
      assignedTo: null,
      replies: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Compress attachments if any
    if (messageData.attachments && messageData.attachments.length > 0) {
      message.attachments = messageData.attachments.map(att => ({
        ...att,
        data: compressData(att.data) // Compress file data
      }));
    }

    await setDoc(messageRef, message);

    // Notify admin and receptionists
    const adminUsers = await getUsersByRole('admin');
    const receptionUsers = await getUsersByRole('receptionist');
    
    const notifyUsers = [...(adminUsers.data || []), ...(receptionUsers.data || [])];
    
    const batch = writeBatch(db);
    notifyUsers.forEach(user => {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: user.id,
        type: 'NEW_CONTACT_MESSAGE',
        title: 'New Support Message',
        message: `New ${messageData.subjectType || 'message'} from ${messageData.name}`,
        contactMessageId: messageRef.id,
        read: false,
        timestamp: serverTimestamp()
      });
    });
    
    await batch.commit();

    return { success: true, data: { id: messageRef.id, ...message } };
  } catch (error) {
    console.error('Error creating contact message:', error);
    return { success: false, error: error.message };
  }
};

export const getContactMessageById = async (messageId) => {
  try {
    const messageRef = doc(db, CONTACT_MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const data = messageDoc.data();
    return { 
      success: true, 
      data: {
        id: messageDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
        replies: data.replies?.map(reply => ({
          ...reply,
          repliedAt: reply.repliedAt?.toDate?.() || null
        })) || []
      }
    };
  } catch (error) {
    console.error('Error fetching contact message:', error);
    return { success: false, error: error.message };
  }
};

export const deleteContactMessage = async (messageId, deletedBy) => {
  try {
    const messageRef = doc(db, CONTACT_MESSAGES_COLLECTION, messageId);
    
    await deleteDoc(messageRef);

    // Log deletion
    const logRef = doc(collection(db, 'auditLogs'));
    await setDoc(logRef, {
      userId: deletedBy,
      action: 'CONTACT_MESSAGE_DELETED',
      targetId: messageId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting contact message:', error);
    return { success: false, error: error.message };
  }
};















// Add these exports at the end of your database.js file
// Make sure to add them to the export section at the bottom

// ==================== RATINGS FUNCTIONS ====================

/**
 * Get all ratings for a specific doctor
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} List of ratings
 */
export const getDoctorRatings = async (doctorId) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    const q = query(
      collection(db, 'ratings'),
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const ratings = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      ratings.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null
      });
    });

    return { success: true, data: ratings };
  } catch (error) {
    console.error('Error fetching doctor ratings:', error);
    
    // Fallback if index doesn't exist
    try {
      const q = query(
        collection(db, 'ratings'),
        where('doctorId', '==', doctorId)
      );
      const snapshot = await getDocs(q);
      const ratings = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        ratings.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null
        });
      });

      // Sort manually
      ratings.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      return { success: true, data: ratings };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

// ==================== PRESCRIPTION FUNCTIONS ====================

/**
 * Download a specific prescription
 * @param {string} prescriptionId - Prescription ID
 * @returns {Promise<Object>} Prescription PDF data
 */
export const downloadPrescription = async (prescriptionId) => {
  try {
    if (!prescriptionId) {
      return { success: false, error: 'Prescription ID is required' };
    }

    // First try to find in visits
    const visitsRef = collection(db, 'visits');
    const visitsSnapshot = await getDocs(visitsRef);
    
    for (const visitDoc of visitsSnapshot.docs) {
      const visitData = visitDoc.data();
      const prescriptions = visitData.prescriptions || [];
      
      const foundPrescription = prescriptions.find(p => p.id === prescriptionId);
      if (foundPrescription && foundPrescription.pdfBase64) {
        return { 
          success: true, 
          data: foundPrescription.pdfBase64,
          prescription: foundPrescription
        };
      }
    }

    // If not found in visits, try standalone prescriptions collection
    const prescriptionDoc = await getDoc(doc(db, 'prescriptions', prescriptionId));
    if (prescriptionDoc.exists()) {
      const data = prescriptionDoc.data();
      if (data.pdfBase64) {
        return { 
          success: true, 
          data: data.pdfBase64,
          prescription: { id: prescriptionDoc.id, ...data }
        };
      }
    }

    return { success: false, error: 'Prescription not found' };
  } catch (error) {
    console.error('Error downloading prescription:', error);
    return { success: false, error: error.message };
  }
};

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Success status
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' };
    }

    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark all notifications for a user as read
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success status
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });

    await batch.commit();

    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SEARCH FUNCTIONS ====================

/**
 * Search doctors by name, specialization, or department
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} Matching doctors
 */
export const searchDoctors = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: true, data: [] };
    }

    const searchLower = searchTerm.toLowerCase();
    const usersRef = collection(db, 'users');
    
    // Get all doctors first (simpler than complex queries)
    const q = query(
      usersRef,
      where('role', '==', 'doctor'),
      where('accountStatus', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const doctors = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const fullName = (data.fullName || '').toLowerCase();
      const specialization = (data.specialization || '').toLowerCase();
      const department = (data.department || '').toLowerCase();

      if (fullName.includes(searchLower) || 
          specialization.includes(searchLower) || 
          department.includes(searchLower)) {
        doctors.push({
          id: doc.id,
          ...data,
          type: 'doctor'
        });
      }
    });

    return { success: true, data: doctors };
  } catch (error) {
    console.error('Error searching doctors:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CHAT FUNCTIONS ====================

/**
 * Get unread message count for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Unread count
 */
export const getUnreadMessageCount = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Get all chats where user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );

    const chatsSnapshot = await getDocs(chatsQuery);
    let totalUnread = 0;

    // Sum up unread counts from each chat
    chatsSnapshot.forEach((doc) => {
      const chat = doc.data();
      totalUnread += chat.unreadCount?.[userId] || 0;
    });

    return { success: true, data: totalUnread };
  } catch (error) {
    console.error('Error getting unread message count:', error);
    
    // Fallback: count unread messages manually
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('recipientId', '==', userId),
        where('status', 'in', ['sent', 'delivered']),
        where('readBy', 'not-in', [[userId]])
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      return { success: true, data: messagesSnapshot.size };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: true, data: 0 }; // Return 0 instead of error
    }
  }
};

// ==================== PAYMENT FUNCTIONS ====================

/**
 * Get payment history for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Payment history
 */
export const getPaymentHistory = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    // Get all paid invoices
    const q = query(
      collection(db, 'invoices'),
      where('patientId', '==', patientId),
      where('status', '==', 'paid'),
      orderBy('paidAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const payments = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        paidAt: data.paidAt?.toDate?.() || null,
        payment: data.payment || null
      });
    });

    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting payment history:', error);
    
    // Fallback if index doesn't exist
    try {
      const q = query(
        collection(db, 'invoices'),
        where('patientId', '==', patientId),
        where('status', '==', 'paid')
      );
      const snapshot = await getDocs(q);
      const payments = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          paidAt: data.paidAt?.toDate?.() || null,
          payment: data.payment || null
        });
      });

      // Sort manually
      payments.sort((a, b) => {
        const dateA = a.paidAt ? new Date(a.paidAt) : new Date(0);
        const dateB = b.paidAt ? new Date(b.paidAt) : new Date(0);
        return dateB - dateA;
      });

      return { success: true, data: payments };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: true, data: [] }; // Return empty array instead of error
    }
  }
};

// ==================== ENHANCED PATIENT DASHBOARD STATS ====================

// You might also want to enhance the existing getPatientDashboardStats function
// to include unread message count:

export const getEnhancedPatientDashboardStats = async (patientId) => {
  try {
    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    // Get appointments
    const appointmentsResult = await getAppointmentsByPatient(patientId);
    
    // Get visits
    const visitsResult = await getVisitsByPatient(patientId);
    
    // Get invoices
    const invoicesResult = await getInvoicesByPatient(patientId);
    
    // Get unread message count
    const unreadResult = await getUnreadMessageCount(patientId);

    const stats = {
      totalAppointments: appointmentsResult.success ? appointmentsResult.data.length : 0,
      upcomingAppointments: appointmentsResult.success 
        ? appointmentsResult.data.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length 
        : 0,
      completedAppointments: appointmentsResult.success 
        ? appointmentsResult.data.filter(a => a.status === 'completed').length 
        : 0,
      totalVisits: visitsResult.success ? visitsResult.data.length : 0,
      pendingBills: invoicesResult.success 
        ? invoicesResult.data.filter(i => i.status === 'unpaid' || i.status === 'pending').length 
        : 0,
      totalBills: invoicesResult.success ? invoicesResult.data.length : 0,
      unreadMessages: unreadResult.success ? unreadResult.data : 0
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching enhanced patient dashboard stats:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED DOCTOR RATINGS WITH PATIENT INFO ====================

/**
 * Get doctor ratings with patient information
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} Ratings with patient details
 */
export const getDoctorRatingsWithPatients = async (doctorId) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    const ratingsResult = await getDoctorRatings(doctorId);
    
    if (!ratingsResult.success) {
      return ratingsResult;
    }

    const ratingsWithPatients = await Promise.all(
      ratingsResult.data.map(async (rating) => {
        if (rating.patientId) {
          const patientResult = await getUserById(rating.patientId);
          if (patientResult.success) {
            return {
              ...rating,
              patientName: patientResult.data.fullName,
              patientPhoto: patientResult.data.photoURL || null
            };
          }
        }
        return rating;
      })
    );

    return { success: true, data: ratingsWithPatients };
  } catch (error) {
    console.error('Error fetching doctor ratings with patients:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED NOTIFICATIONS WITH DETAILS ====================

/**
 * Get user notifications with additional details
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to fetch
 * @returns {Promise<Object>} Notifications with details
 */
export const getUserNotifications = async (userId, limitCount = 50) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const notifications = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || null
      });
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    
    // Fallback if index doesn't exist
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || null
        });
      });

      // Sort manually
      notifications.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });

      return { success: true, data: notifications.slice(0, limitCount) };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

// ==================== ENHANCED SEARCH ====================

/**
 * Global search across multiple collections
 * @param {string} searchTerm - Search term
 * @param {string} userId - Current user ID (for filtering)
 * @returns {Promise<Object>} Search results grouped by type
 */
export const globalSearch = async (searchTerm, userId) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: true, data: { doctors: [], appointments: [], records: [] } };
    }

    const searchLower = searchTerm.toLowerCase();
    const results = {
      doctors: [],
      appointments: [],
      records: []
    };

    // Search doctors
    const doctorsResult = await searchDoctors(searchTerm);
    if (doctorsResult.success) {
      results.doctors = doctorsResult.data;
    }

    // Search appointments for this patient
    if (userId) {
      const appointmentsResult = await getAppointmentsByPatient(userId);
      if (appointmentsResult.success) {
        results.appointments = appointmentsResult.data.filter(apt => 
          apt.doctorName?.toLowerCase().includes(searchLower) ||
          apt.department?.toLowerCase().includes(searchLower) ||
          apt.reason?.toLowerCase().includes(searchLower) ||
          apt.date?.includes(searchTerm)
        );
      }
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in global search:', error);
    return { success: false, error: error.message };
  }
};





// ==================== DEACTIVATION REQUESTS ====================

const DEACTIVATION_REQUESTS_COLLECTION = 'deactivationRequests';

/**
 * Submit account deactivation request
 * @param {string} userId - Patient user ID
 * @param {string} reason - Reason for deactivation (optional)
 * @param {string} userEmail - Patient email
 * @param {string} userName - Patient name
 * @returns {Promise<Object>} Success status
 */
export const submitDeactivationRequest = async (userId, reason, userEmail, userName) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check if there's already a pending request
    const pendingQuery = query(
      collection(db, DEACTIVATION_REQUESTS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const pendingSnapshot = await getDocs(pendingQuery);
    if (!pendingSnapshot.empty) {
      return { success: false, error: 'You already have a pending deactivation request' };
    }

    // Create deactivation request
    const requestRef = doc(collection(db, DEACTIVATION_REQUESTS_COLLECTION));
    const request = {
      id: requestRef.id,
      userId,
      userEmail,
      userName,
      reason: reason || '',
      status: 'pending',
      requestedAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      adminNotes: '',
      type: 'deactivation'
    };

    await setDoc(requestRef, request);

    // Update user status to 'deactivation_requested'
    await updateDoc(doc(db, 'users', userId), {
      accountStatus: 'deactivation_requested',
      deactivationRequestedAt: serverTimestamp(),
      deactivationReason: reason || ''
    });

    // Create notification for admins
    const adminUsers = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    
    const batch = writeBatch(db);
    adminUsers.forEach(adminDoc => {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: adminDoc.id,
        type: 'DEACTIVATION_REQUEST',
        title: 'Account Deactivation Request',
        message: `${userName} (${userEmail}) has requested account deactivation`,
        requestId: requestRef.id,
        // eslint-disable-next-line no-dupe-keys
        userId: userId,
        read: false,
        timestamp: serverTimestamp(),
        priority: 'medium'
      });
    });
    await batch.commit();

    return { 
      success: true, 
      data: request,
      message: 'Deactivation request submitted successfully' 
    };
  } catch (error) {
    console.error('Error submitting deactivation request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get pending deactivation requests
 * @returns {Promise<Object>} List of pending requests
 */
export const getPendingDeactivationRequests = async () => {
  try {
    const q = query(
      collection(db, DEACTIVATION_REQUESTS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const requests = [];

    for (const doc of snapshot.docs) {
      const request = {
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate?.() || null
      };
      requests.push(request);
    }

    return { success: true, data: requests };
  } catch (error) {
    console.error('Error fetching deactivation requests:', error);
    
    // Fallback: try without orderBy
    try {
      const fallbackQuery = query(
        collection(db, DEACTIVATION_REQUESTS_COLLECTION),
        where('status', '==', 'pending')
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const requests = [];

      for (const doc of fallbackSnapshot.docs) {
        const request = {
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate?.() || null
        };
        requests.push(request);
      }
      
      // Sort manually
      requests.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
      
      return { success: true, data: requests };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

/**
 * Process deactivation request (approve/reject)
 * @param {string} requestId - Request ID
 * @param {string} status - 'approved' or 'rejected'
 * @param {string} adminId - Admin user ID
 * @param {string} adminNotes - Optional admin notes
 * @returns {Promise<Object>} Success status
 */
export const processDeactivationRequest = async (requestId, status, adminId, adminNotes = '') => {
  try {
    if (!requestId || !status || !adminId) {
      return { success: false, error: 'Missing required fields' };
    }

    if (!['approved', 'rejected'].includes(status)) {
      return { success: false, error: 'Invalid status' };
    }

    const requestRef = doc(db, DEACTIVATION_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return { success: false, error: 'Request not found' };
    }

    const request = requestDoc.data();

    await runTransaction(db, async (transaction) => {
      // Update request status
      transaction.update(requestRef, {
        status,
        reviewedBy: adminId,
        reviewedAt: serverTimestamp(),
        adminNotes
      });

      // Update user status based on approval/rejection
      const userRef = doc(db, 'users', request.userId);
      if (status === 'approved') {
        transaction.update(userRef, {
          accountStatus: 'disabled',
          disabledAt: serverTimestamp(),
          disabledBy: adminId,
          disabledReason: 'User requested deactivation'
        });
      } else {
        transaction.update(userRef, {
          accountStatus: 'active',
          deactivationRequestedAt: null,
          deactivationReason: null
        });
      }

      // Create notification for the user
      const userNotifRef = doc(collection(db, 'notifications'));
      transaction.set(userNotifRef, {
        userId: request.userId,
        type: 'DEACTIVATION_' + status.toUpperCase(),
        title: status === 'approved' ? 'Account Deactivation Approved' : 'Account Deactivation Rejected',
        message: status === 'approved' 
          ? 'Your account deactivation request has been approved. Your account will be disabled shortly.'
          : 'Your account deactivation request has been rejected. Please contact support for more information.',
        requestId,
        read: false,
        timestamp: serverTimestamp()
      });

      // Log the action
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: adminId,
        action: `DEACTIVATION_REQUEST_${status.toUpperCase()}`,
        targetUserId: request.userId,
        requestId,
        adminNotes,
        timestamp: serverTimestamp()
      });
    });

    return { 
      success: true, 
      message: `Request ${status} successfully` 
    };
  } catch (error) {
    console.error('Error processing deactivation request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to deactivation requests (real-time)
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDeactivationRequests = (callback) => {
  const q = query(
    collection(db, DEACTIVATION_REQUESTS_COLLECTION),
    where('status', '==', 'pending'),
    orderBy('requestedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate?.() || null
      });
    });
    callback(requests);
  });
};

// ==================== APPOINTMENT SYSTEM FUNCTIONS ====================

export const createAppointment = async (appointmentData) => {
  try {
    // Validate required fields
    if (!appointmentData.patientId || !appointmentData.doctorId || !appointmentData.date || !appointmentData.time) {
      return { success: false, error: 'Missing required fields' };
    }

    // Check if time slot is available
    const availabilityCheck = await checkSlotAvailability(
      appointmentData.doctorId,
      appointmentData.date,
      appointmentData.time
    );
    
    if (!availabilityCheck.success) {
      return { success: false, error: availabilityCheck.error || 'Failed to check availability' };
    }
    
    if (!availabilityCheck.available) {
      return { success: false, error: 'Selected time slot is not available' };
    }

    // Get doctor details to fetch department name and consultation fee
    const doctorData = await getUserById(appointmentData.doctorId);
    
    // Handle department name
    let departmentName = appointmentData.department || appointmentData.departmentId || 'General';
    
    if (doctorData.success && doctorData.data.department) {
      departmentName = doctorData.data.department;
    }
    
    // Handle department ID safely - don't store undefined
    let departmentId = null;
    if (appointmentData.departmentId) {
      departmentId = appointmentData.departmentId;
    } else if (departmentName && departmentName !== 'General') {
      try {
        const departmentsResult = await getDepartments();
        if (departmentsResult.success) {
          const foundDept = departmentsResult.data.find(d => 
            d.name?.toLowerCase() === departmentName?.toLowerCase() || 
            d.id === departmentName
          );
          if (foundDept) {
            departmentId = foundDept.id;
          }
        }
      } catch (deptError) {
        console.error('Error fetching department:', deptError);
        // Don't fail the appointment creation for department lookup error
      }
    }

    // Calculate payment amount
    const paymentAmount = doctorData.success ? (doctorData.data.consultationFee || 0) : 1000;

    const appointmentRef = doc(collection(db, 'appointments'));
    const appointment = {
      id: appointmentRef.id,
      patientId: appointmentData.patientId,
      doctorId: appointmentData.doctorId,
      department: departmentName,
      date: appointmentData.date,
      time: appointmentData.time,
      reason: appointmentData.reason || '',
      isEmergency: appointmentData.isEmergency || false,
      status: 'pending',
      paymentStatus: 'pending',
      paymentAmount: paymentAmount,
      paymentReference: null,
      paymentProof: null,
      paymentMethod: null,
      paidAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Only add departmentId if it exists (not undefined)
    if (departmentId) {
      appointment.departmentId = departmentId;
    }

    await setDoc(appointmentRef, appointment);
    console.log('Appointment created with ID:', appointmentRef.id, 'Status:', appointment.status);

    // Get doctor details for notification
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';

    // Get patient details for notification
    let patientName = 'Patient';
    try {
      const patientData = await getUserById(appointmentData.patientId);
      if (patientData.success) {
        patientName = patientData.data.fullName;
      }
    } catch (patientError) {
      console.error('Error fetching patient details:', patientError);
    }

    // Create notification for patient
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: appointmentData.patientId,
        type: 'APPOINTMENT_CREATED',
        title: 'Appointment Request Submitted',
        message: `Your appointment with Dr. ${doctorName} on ${appointmentData.date} at ${appointmentData.time} has been submitted for approval. Payment of ${formatCurrency(paymentAmount)} is required upon approval.`,
        appointmentId: appointmentRef.id,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (notifError) {
      console.error('Error creating patient notification:', notifError);
    }

    // Create notification for all receptionists
    try {
      const receptionists = await getUsersByRole('receptionist');
      if (receptionists.success && receptionists.data.length > 0) {
        const batch = writeBatch(db);
        receptionists.data.forEach(staff => {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: staff.id,
            type: 'NEW_APPOINTMENT_REQUEST',
            title: 'New Appointment Request',
            message: `New appointment request from ${patientName} with Dr. ${doctorName}`,
            appointmentId: appointmentRef.id,
            patientId: appointmentData.patientId,
            doctorId: appointmentData.doctorId,
            read: false,
            timestamp: serverTimestamp(),
            priority: appointmentData.isEmergency ? 'high' : 'normal'
          });
        });
        await batch.commit();
      }
    } catch (receptionError) {
      console.error('Error creating receptionist notifications:', receptionError);
    }

    // Create notification for doctor
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: appointmentData.doctorId,
        type: 'APPOINTMENT_REQUEST',
        title: 'New Appointment Request',
        message: `New appointment request from ${patientName} on ${appointmentData.date} at ${appointmentData.time}`,
        appointmentId: appointmentRef.id,
        patientId: appointmentData.patientId,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (doctorNotifError) {
      console.error('Error creating doctor notification:', doctorNotifError);
    }

    return { success: true, data: { id: appointmentRef.id, ...appointment } };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: error.message };
  }
};

export const checkSlotAvailability = async (doctorId, date, time, excludeAppointmentId = null) => {
  try {
    if (!doctorId || !date || !time) {
      return { success: false, error: 'Missing required parameters', available: false };
    }

    console.log('Checking slot availability for:', { doctorId, date, time, excludeAppointmentId });
    
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('date', '==', date),
      where('time', '==', time),
      where('status', 'in', ['pending', 'approved', 'checked-in', 'confirmed'])
    );

    const snapshot = await getDocs(q);
    
    console.log('Found appointments count:', snapshot.docs.length);
    
    // Filter out the appointment we're trying to approve if it's in the results
    const conflictingAppointments = snapshot.docs.filter(doc => {
      const isExcluded = doc.id === excludeAppointmentId;
      if (isExcluded) {
        console.log('Excluding current appointment:', doc.id);
      }
      return !isExcluded;
    });
    
    console.log('Conflicting appointments after exclusion:', conflictingAppointments.length);
    
    const isAvailable = conflictingAppointments.length === 0;

    return { success: true, available: isAvailable };
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return { success: false, error: error.message, available: false };
  }
};

/**
 * Approve appointment (receptionist action)
 * @param {string} appointmentId - Appointment ID
 * @param {string} approvedBy - Receptionist ID
 * @returns {Promise<Object>} Success status
 */
export const approveAppointment = async (appointmentId, approvedBy) => {
  try {
    if (!appointmentId || !approvedBy) {
      return { success: false, error: 'Missing required fields' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    // Double-check slot availability - EXCLUDE the current appointment
    const availabilityCheck = await checkSlotAvailability(
      appointment.doctorId,
      appointment.date,
      appointment.time,
      appointmentId  // Pass the current appointment ID to exclude it from conflict check
    );

    if (!availabilityCheck.success) {
      return { success: false, error: availabilityCheck.error || 'Failed to check availability' };
    }
    
    if (!availabilityCheck.available) {
      return { success: false, error: 'Time slot is no longer available' };
    }

    // Get doctor details to fetch consultation fee
    const doctorData = await getUserById(appointment.doctorId);
    const consultationFee = doctorData.success ? (doctorData.data.consultationFee || 0) : 1000;

    // Update appointment status to approved (waiting for payment)
    await updateDoc(appointmentRef, {
      status: 'approved',
      paymentStatus: 'pending',  // Mark as pending payment
      paymentAmount: consultationFee,  // Store the consultation fee
      approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Get patient details for notification
    const patientData = await getUserById(appointment.patientId);
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';
    const patientName = patientData.success ? patientData.data.fullName : 'Patient';

    // Simple format currency function (avoid import issues)
    const simpleFormatCurrency = (amount) => {
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // Notify patient that payment is required
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: appointment.patientId,
        type: 'APPOINTMENT_APPROVED',
        title: 'Appointment Approved - Payment Required',
        message: `Your appointment with Dr. ${doctorName} on ${appointment.date} at ${appointment.time} has been approved. Please pay ${simpleFormatCurrency(consultationFee)} to confirm your appointment.`,
        appointmentId,
        doctorId: appointment.doctorId,
        paymentAmount: consultationFee,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (notifError) {
      console.error('Error creating notification for patient:', notifError);
      // Don't fail the whole operation for notification errors
    }

    // Notify receptionist that payment is pending
    try {
      const receptionists = await getUsersByRole('receptionist');
      if (receptionists.success && receptionists.data && receptionists.data.length > 0) {
        const batch = writeBatch(db);
        receptionists.data.forEach(staff => {
          if (staff && staff.id) {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: staff.id,
              type: 'PAYMENT_PENDING',
              title: 'Payment Pending',
              message: `Patient ${patientName} needs to pay ${simpleFormatCurrency(consultationFee)} for appointment with Dr. ${doctorName}`,
              appointmentId,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              read: false,
              timestamp: serverTimestamp(),
              priority: 'normal'
            });
          }
        });
        await batch.commit();
      }
    } catch (receptionError) {
      console.error('Error notifying receptionists:', receptionError);
      // Don't fail the operation
    }

    // Log approval
    try {
      await addDoc(collection(db, 'auditLogs'), {
        userId: approvedBy,
        action: 'APPOINTMENT_APPROVED',
        targetId: appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        paymentAmount: consultationFee,
        paymentStatus: 'pending',
        timestamp: serverTimestamp()
      });
    } catch (logError) {
      console.error('Error logging approval:', logError);
    }

    return { success: true, data: { consultationFee } };
  } catch (error) {
    console.error('Error approving appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reject appointment (receptionist action)
 * @param {string} appointmentId - Appointment ID
 * @param {string} reason - Rejection reason
 * @param {string} rejectedBy - Receptionist ID
 * @returns {Promise<Object>} Success status
 */
export const rejectAppointment = async (appointmentId, reason, rejectedBy) => {
  try {
    if (!reason) {
      return { success: false, error: 'Rejection reason is required' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    await updateDoc(appointmentRef, {
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Get doctor details
    const doctorData = await getUserById(appointment.doctorId);
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';

    // Notify patient
    await addDoc(collection(db, 'notifications'), {
      userId: appointment.patientId,
      type: 'APPOINTMENT_REJECTED',
      title: 'Appointment Request Rejected',
      message: `Your appointment request with Dr. ${doctorName} on ${appointment.date} at ${appointment.time} was rejected. Reason: ${reason}`,
      appointmentId,
      read: false,
      timestamp: serverTimestamp()
    });

    // Log rejection
    await addDoc(collection(db, 'auditLogs'), {
      userId: rejectedBy,
      action: 'APPOINTMENT_REJECTED',
      targetId: appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      reason,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check-in patient (receptionist action)
 * @param {string} appointmentId - Appointment ID
 * @param {string} checkedInBy - Receptionist ID
 * @returns {Promise<Object>} Success status
 */
export const checkInAppointment = async (appointmentId, checkedInBy) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    if (appointment.status !== 'approved') {
      return { success: false, error: 'Only approved appointments can be checked in' };
    }

    await updateDoc(appointmentRef, {
      status: 'checked-in',
      checkedInBy,
      checkedInAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Notify doctor
    await addDoc(collection(db, 'notifications'), {
      userId: appointment.doctorId,
      type: 'PATIENT_CHECKED_IN',
      title: 'Patient Checked In',
      message: `Patient has checked in for your ${appointment.time} appointment.`,
      appointmentId,
      patientId: appointment.patientId,
      read: false,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error checking in appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancel appointment (patient action)
 * @param {string} appointmentId - Appointment ID
 * @param {string} patientId - Patient ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Success status
 */
export const cancelAppointment = async (appointmentId, patientId, reason = '') => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    // Verify patient owns this appointment
    if (appointment.patientId !== patientId) {
      return { success: false, error: 'Unauthorized to cancel this appointment' };
    }

    // Check if cancellation is allowed (not too close to appointment time)
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2 && hoursUntilAppointment > 0) {
      return { success: false, error: 'Cannot cancel appointment less than 2 hours before scheduled time' };
    }

    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: serverTimestamp(),
      cancelledBy: patientId,
      updatedAt: serverTimestamp()
    });

    // Get doctor details
    const doctorData = await getUserById(appointment.doctorId);
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';

    // Get patient details
    const patientData = await getUserById(patientId);
    const patientName = patientData.success ? patientData.data.fullName : 'Patient';

    // Notify doctor
    await addDoc(collection(db, 'notifications'), {
      userId: appointment.doctorId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Appointment Cancelled',
      message: `Appointment with ${patientName} on ${appointment.date} at ${appointment.time} has been cancelled.`,
      appointmentId,
      patientId,
      read: false,
      timestamp: serverTimestamp()
    });

    // Notify receptionists
    const receptionists = await getUsersByRole('receptionist');
    if (receptionists.success) {
      const batch = writeBatch(db);
      receptionists.data.forEach(staff => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: staff.id,
          type: 'APPOINTMENT_CANCELLED',
          title: 'Appointment Cancelled',
          message: `Appointment with Dr. ${doctorName} on ${appointment.date} at ${appointment.time} has been cancelled.`,
          appointmentId,
          patientId,
          read: false,
          timestamp: serverTimestamp()
        });
      });
      await batch.commit();
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark appointment as no-show (receptionist action)
 * @param {string} appointmentId - Appointment ID
 * @param {string} markedBy - Receptionist ID
 * @returns {Promise<Object>} Success status
 */
export const markNoShow = async (appointmentId, markedBy) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    await updateDoc(appointmentRef, {
      status: 'no-show',
      markedNoShowBy: markedBy,
      markedNoShowAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking no-show:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reschedule appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} userId - User ID (patient or receptionist)
 * @param {string} newDate - New date
 * @param {string} newTime - New time
 * @param {string} reason - Reschedule reason
 * @returns {Promise<Object>} Success status
 */
export const rescheduleAppointment = async (appointmentId, userId, newDate, newTime, reason = '') => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    // Check if new slot is available, excluding the current appointment
    const availabilityCheck = await checkSlotAvailability(
      appointment.doctorId, 
      newDate, 
      newTime,
      appointmentId  // Pass the appointment ID to exclude from check
    );
    
    if (!availabilityCheck.success || !availabilityCheck.available) {
      return { success: false, error: 'Selected time slot is not available' };
    }

    await updateDoc(appointmentRef, {
      date: newDate,
      time: newTime,
      status: 'pending', // Goes back to pending for approval
      rescheduledAt: serverTimestamp(),
      rescheduledBy: userId,
      rescheduleReason: reason,
      previousDate: appointment.date,
      previousTime: appointment.time,
      updatedAt: serverTimestamp()
    });

    // Get user details
    const userData = await getUserById(userId);
    const userName = userData.success ? userData.data.fullName : 'User';

    // Notify receptionists
    const receptionists = await getUsersByRole('receptionist');
    if (receptionists.success) {
      const batch = writeBatch(db);
      receptionists.data.forEach(staff => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: staff.id,
          type: 'APPOINTMENT_RESCHEDULED',
          title: 'Appointment Rescheduled',
          message: `${userName} has rescheduled an appointment to ${newDate} at ${newTime}`,
          appointmentId,
          read: false,
          timestamp: serverTimestamp()
        });
      });
      await batch.commit();
    }

    return { success: true };
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get appointment statistics for dashboard
 * @param {string} date - Date string
 * @returns {Promise<Object>} Appointment statistics
 */
export const getAppointmentStats = async (date) => {
  try {
    const today = date || new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'appointments'),
      where('date', '==', today)
    );

    const snapshot = await getDocs(q);
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      checkedIn: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      noShow: 0,
      emergency: 0
    };

    snapshot.forEach(doc => {
      const apt = doc.data();
      stats.total++;
      stats[apt.status] = (stats[apt.status] || 0) + 1;
      if (apt.isEmergency) stats.emergency++;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting appointment stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get pending appointments for receptionist
 * @returns {Promise<Object>} Pending appointments
 */
export const getPendingAppointments = async () => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const appointments = [];

    for (const doc of snapshot.docs) {
      const apt = { id: doc.id, ...doc.data() };
      
      // Get patient and doctor details
      const [patientData, doctorData] = await Promise.all([
        getUserById(apt.patientId),
        getUserById(apt.doctorId)
      ]);

      if (patientData.success) {
        apt.patientName = patientData.data.fullName;
        apt.patientPhone = patientData.data.phone;
      }
      if (doctorData.success) {
        apt.doctorName = doctorData.data.fullName;
        apt.doctorSpecialization = doctorData.data.specialization;
      }

      appointments.push(apt);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching pending appointments:', error);
    
    // Fallback if index doesn't exist
    try {
      const fallbackQuery = query(
        collection(db, 'appointments'),
        where('status', '==', 'pending')
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const appointments = [];

      for (const doc of fallbackSnapshot.docs) {
        const apt = { id: doc.id, ...doc.data() };
        
        const [patientData, doctorData] = await Promise.all([
          getUserById(apt.patientId),
          getUserById(apt.doctorId)
        ]);

        if (patientData.success) {
          apt.patientName = patientData.data.fullName;
          apt.patientPhone = patientData.data.phone;
        }
        if (doctorData.success) {
          apt.doctorName = doctorData.data.fullName;
          apt.doctorSpecialization = doctorData.data.specialization;
        }

        appointments.push(apt);
      }

      // Sort manually
      appointments.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      return { success: true, data: appointments };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

/**
 * Get today's appointments for doctor
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} Today's appointments
 */
export const getTodayDoctorAppointments = async (doctorId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('date', '==', today),
      where('status', 'in', ['approved', 'checked-in', 'completed']),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(q);
    const appointments = [];

    for (const doc of snapshot.docs) {
      const apt = { id: doc.id, ...doc.data() };
      
      const patientData = await getUserById(apt.patientId);
      if (patientData.success) {
        apt.patientName = patientData.data.fullName;
        apt.patientAge = patientData.data.age;
        apt.patientGender = patientData.data.gender;
      }

      appointments.push(apt);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    
    // Fallback if index doesn't exist
    try {
      const today = new Date().toISOString().split('T')[0];
      const fallbackQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId),
        where('date', '==', today)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const appointments = [];

      for (const doc of fallbackSnapshot.docs) {
        const apt = { id: doc.id, ...doc.data() };
        if (['approved', 'checked-in', 'completed'].includes(apt.status)) {
          const patientData = await getUserById(apt.patientId);
          if (patientData.success) {
            apt.patientName = patientData.data.fullName;
            apt.patientAge = patientData.data.age;
            apt.patientGender = patientData.data.gender;
          }
          appointments.push(apt);
        }
      }

      // Sort by time
      appointments.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      return { success: true, data: appointments };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

/**
 * Get upcoming appointments for patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Upcoming appointments
 */
export const getUpcomingPatientAppointments = async (patientId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'appointments'),
      where('patientId', '==', patientId),
      where('date', '>=', today),
      where('status', 'in', ['pending', 'approved']),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(q);
    const appointments = [];

    for (const doc of snapshot.docs) {
      const apt = { id: doc.id, ...doc.data() };
      
      const doctorData = await getUserById(apt.doctorId);
      if (doctorData.success) {
        apt.doctorName = doctorData.data.fullName;
        apt.doctorSpecialization = doctorData.data.specialization;
      }

      appointments.push(apt);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    
    // Fallback if index doesn't exist
    try {
      const today = new Date().toISOString().split('T')[0];
      const fallbackQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', patientId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const appointments = [];

      for (const doc of fallbackSnapshot.docs) {
        const apt = { id: doc.id, ...doc.data() };
        if (apt.date >= today && ['pending', 'approved'].includes(apt.status)) {
          const doctorData = await getUserById(apt.doctorId);
          if (doctorData.success) {
            apt.doctorName = doctorData.data.fullName;
            apt.doctorSpecialization = doctorData.data.specialization;
          }
          appointments.push(apt);
        }
      }

      // Sort by date and time
      appointments.sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });

      return { success: true, data: appointments };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

/**
 * Get appointment by ID with all details
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Appointment details
 */
export const getAppointmentById = async (appointmentId) => {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() || null,
      updatedAt: docSnap.data().updatedAt?.toDate?.() || null
    };

    // Get patient and doctor details
    const [patientData, doctorData] = await Promise.all([
      getUserById(appointment.patientId),
      getUserById(appointment.doctorId)
    ]);

    if (patientData.success) {
      appointment.patientName = patientData.data.fullName;
      appointment.patientPhone = patientData.data.phone;
      appointment.patientEmail = patientData.data.email;
      appointment.patientCNIC = patientData.data.cnic;
      appointment.patientGender = patientData.data.gender;
      appointment.patientAge = patientData.data.age;
      appointment.bloodGroup = patientData.data.bloodGroup;
    }

    if (doctorData.success) {
      appointment.doctorName = doctorData.data.fullName;
      appointment.doctorSpecialization = doctorData.data.specialization;
      appointment.consultationFee = doctorData.data.consultationFee;
    }

    return { success: true, data: appointment };
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate appointment slip PDF
 * @param {Object} appointment - Appointment data
 */
export const generateAppointmentSlip = async (appointment) => {
  try {
    // Dynamically import jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    
    const doc = new jsPDF();
    
    // Add hospital logo/header
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text('MediCare Plus', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Appointment Confirmation Slip', 105, 30, { align: 'center' });
    
    // Add line
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Appointment details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Appointment Details', 20, 45);
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    
    const details = [
      ['Appointment ID:', appointment.id?.slice(-8) || 'N/A'],
      ['Date:', appointment.date],
      ['Time:', appointment.time],
      ['Status:', appointment.status?.toUpperCase()],
      ['', ''],
      ['Patient Information:', ''],
      ['Name:', appointment.patientName || 'N/A'],
      ['Phone:', appointment.patientPhone || 'N/A'],
      ['', ''],
      ['Doctor Information:', ''],
      ['Name:', `Dr. ${appointment.doctorName || 'N/A'}`],
      ['Specialization:', appointment.doctorSpecialization || 'N/A'],
      ['Department:', appointment.department || 'N/A'],
      ['', ''],
      ['Reason for Visit:', appointment.reason || 'N/A']
    ];

    let y = 55;
    details.forEach(([label, value]) => {
      if (label === '') {
        y += 5;
      } else {
        doc.text(label, 25, y);
        if (value) {
          doc.text(value, 80, y);
        }
        y += 7;
      }
    });

    // Add QR code placeholder
    doc.setDrawColor(200);
    doc.setFillColor(240);
    doc.roundedRect(140, 70, 40, 40, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Appointment ID', 145, 120);
    doc.text(appointment.id?.slice(-8) || 'N/A', 145, 127);
    
    // Instructions
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Instructions:', 20, y + 5);
    doc.text('• Please arrive 15 minutes before your appointment time', 25, y + 12);
    doc.text('• Bring your CNIC and medical records if any', 25, y + 19);
    doc.text('• For any changes, please contact reception', 25, y + 26);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for choosing MediCare Plus', 105, 270, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 277, { align: 'center' });
    
    // Save the PDF
    doc.save(`appointment-${appointment.id?.slice(-6) || 'slip'}.pdf`);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating appointment slip:', error);
    return { success: false, error: error.message };
  }
};



// ==================== DOCTOR RATINGS FUNCTIONS ====================

/**
 * Get doctor by ID with public fields only
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} Doctor data
 */
export const getDoctorById = async (doctorId) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    const result = await getUserById(doctorId);
    
    if (!result.success) {
      return result;
    }

    const doctor = result.data;
    
    // Only return public fields
    return {
      success: true,
      data: {
        id: doctor.id,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        qualifications: doctor.qualifications || [],
        experience: doctor.experience || 0,
        consultationFee: doctor.consultationFee,
        about: doctor.about || '',
        languages: doctor.languages || [],
        education: doctor.education || [],
        awards: doctor.awards || [],
        profileImage: doctor.profileImage || null,
        avgRating: doctor.avgRating || 0,
        ratings: doctor.ratings?.length || 0,
        department: doctor.department,
        email: doctor.email,
        phone: doctor.phone
      }
    };
  } catch (error) {
    console.error('Error fetching doctor:', error);
    return { success: false, error: error.message };
  }
};








// ==================== VISIT COMPLETION ====================

// In database.js, replace the completeVisit function with this:

/**
 * Complete a visit and generate invoice automatically
 * @param {string} visitId - Visit ID
 * @param {string} completedBy - Doctor ID
 * @returns {Promise<Object>} Success status with invoice data
 */
export const completeVisit = async (visitId, completedBy) => {
  try {
    // First, get all necessary data outside the transaction
    const visitRef = doc(db, 'visits', visitId);
    const visitDoc = await getDoc(visitRef);
    
    if (!visitDoc.exists()) {
      throw new Error('Visit not found');
    }
    
    const visit = visitDoc.data();
    
    // Check if visit is already completed
    if (visit.status === 'completed') {
      throw new Error('Visit is already completed');
    }
    
    // Get doctor data outside transaction
    const doctorData = await getUserById(visit.doctorId);
    const consultationFee = doctorData.success ? 
      (doctorData.data.consultationFee || 1000) : 1000;
    
    // Calculate additional charges (these are synchronous, no async calls)
    let labFees = 0;
    if (visit.labRequests && visit.labRequests.length > 0) {
      labFees = visit.labRequests.reduce((sum, req) => {
        return sum + (req.price || 500);
      }, 0);
    }
    
    let procedureFees = 0;
    if (visit.procedures && visit.procedures.length > 0) {
      procedureFees = visit.procedures.reduce((sum, proc) => {
        return sum + (proc.price || 0);
      }, 0);
    }
    
    let medicationFees = 0;
    if (visit.prescriptions && visit.prescriptions.length > 0) {
      medicationFees = visit.prescriptions.reduce((sum, pres) => {
        return sum + (pres.price || 0);
      }, 0);
    }
    
    // Get bed charges if needed (single read outside transaction)
    let bedCharges = 0;
    if (visit.bedId) {
      const bedDoc = await getDoc(doc(db, 'beds', visit.bedId));
      if (bedDoc.exists()) {
        const bed = bedDoc.data();
        const admissionDate = visit.createdAt?.toDate?.() || new Date();
        const dischargeDate = new Date();
        const daysStayed = Math.ceil((dischargeDate - admissionDate) / (1000 * 60 * 60 * 24));
        bedCharges = (bed.dailyRate || 1000) * Math.max(1, daysStayed);
      }
    }
    
    // Calculate totals
    const subtotal = consultationFee + labFees + procedureFees + medicationFees + bedCharges;
    const taxRate = 0.05;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // Create invoice items array
    const items = [
      {
        description: 'Consultation Fee',
        amount: consultationFee,
        type: 'consultation',
        quantity: 1,
        unitPrice: consultationFee
      }
    ];
    
    if (labFees > 0) {
      items.push({
        description: 'Lab Tests',
        amount: labFees,
        type: 'lab',
        quantity: visit.labRequests?.length || 1,
        unitPrice: labFees / (visit.labRequests?.length || 1)
      });
    }
    
    if (procedureFees > 0) {
      items.push({
        description: 'Procedures',
        amount: procedureFees,
        type: 'procedure',
        quantity: visit.procedures?.length || 1,
        unitPrice: procedureFees / (visit.procedures?.length || 1)
      });
    }
    
    if (medicationFees > 0) {
      items.push({
        description: 'Medications',
        amount: medicationFees,
        type: 'medication',
        quantity: visit.prescriptions?.length || 1,
        unitPrice: medicationFees / (visit.prescriptions?.length || 1)
      });
    }
    
    if (bedCharges > 0) {
      items.push({
        description: 'Bed Charges',
        amount: bedCharges,
        type: 'bed',
        quantity: 1,
        unitPrice: bedCharges
      });
    }
    
    // Now run transaction for all write operations (no reads inside)
    const result = await runTransaction(db, async (transaction) => {
      // Create invoice
      const invoiceRef = doc(collection(db, 'invoices'));
      const invoice = {
        id: invoiceRef.id,
        patientId: visit.patientId,
        doctorId: visit.doctorId,
        visitId,
        items,
        subtotal,
        tax,
        taxRate: taxRate * 100,
        total,
        status: 'unpaid',
        createdAt: serverTimestamp(),
        createdBy: completedBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        departmentId: visit.department,
        notes: 'Auto-generated invoice from visit completion'
      };
      
      transaction.set(invoiceRef, invoice);
      
      // Update visit status
      transaction.update(visitRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        completedBy,
        invoiceId: invoiceRef.id,
        updatedAt: serverTimestamp()
      });
      
      // Update appointment if exists
      if (visit.appointmentId) {
        const appointmentRef = doc(db, 'appointments', visit.appointmentId);
        transaction.update(appointmentRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          invoiceId: invoiceRef.id,
          updatedAt: serverTimestamp()
        });
      }
      
      // Update department revenue stats
      if (visit.department) {
        const deptRef = doc(db, 'departments', visit.department);
        transaction.update(deptRef, {
          revenue: increment(total),
          patientCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }
      
      // Update doctor stats (read first, then update)
      const doctorStatsRef = doc(db, 'doctorStats', visit.doctorId);
      const doctorStatsDoc = await transaction.get(doctorStatsRef);
      
      if (doctorStatsDoc.exists()) {
        transaction.update(doctorStatsRef, {
          totalPatients: increment(1),
          totalRevenue: increment(total),
          lastVisit: serverTimestamp()
        });
      } else {
        transaction.set(doctorStatsRef, {
          doctorId: visit.doctorId,
          totalPatients: 1,
          totalRevenue: total,
          lastVisit: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      
      // Create notification for patient
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        userId: visit.patientId,
        type: 'VISIT_COMPLETED',
        title: 'Visit Completed',
        message: `Your visit has been completed. Invoice #${invoiceRef.id.slice(-6)} has been generated for ${formatCurrency(total)}.`,
        visitId,
        invoiceId: invoiceRef.id,
        read: false,
        timestamp: serverTimestamp()
      });
      
      // Log completion
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: completedBy,
        action: 'VISIT_COMPLETED',
        visitId,
        invoiceId: invoiceRef.id,
        amount: total,
        timestamp: serverTimestamp()
      });
      
      return { 
        success: true, 
        data: { 
          invoiceId: invoiceRef.id,
          total,
          items: items.length
        } 
      };
    });
    
    // Create notifications for receptionists outside the transaction (using batch)
    const receptionists = await getUsersByRole('receptionist');
    if (receptionists.success && receptionists.data.length > 0) {
      const batch = writeBatch(db);
      receptionists.data.forEach(staff => {
        const staffNotifRef = doc(collection(db, 'notifications'));
        batch.set(staffNotifRef, {
          userId: staff.id,
          type: 'NEW_INVOICE',
          title: 'New Invoice Generated',
          message: `Invoice #${result.data.invoiceId.slice(-6)} for ${formatCurrency(result.data.total)} is pending payment.`,
          invoiceId: result.data.invoiceId,
          patientId: visit.patientId,
          patientName: visit.patientName || 'Unknown',
          read: false,
          timestamp: serverTimestamp()
        });
      });
      await batch.commit();
    }
    
    return result;
    
  } catch (error) {
    console.error('Error completing visit:', error);
    return { success: false, error: error.message };
  }
};



// ==================== APPOINTMENT MANAGEMENT FUNCTIONS ====================
export const checkInPatient = async (appointmentId, checkedInBy) => {
  try {
    if (!appointmentId || !checkedInBy) {
      return { success: false, error: 'Missing required fields' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    // Check if appointment can be checked in (confirmed status after payment)
    if (appointment.status !== 'confirmed') {
      return { 
        success: false, 
        error: `Cannot check in. Appointment status is '${appointment.status}'. Must be 'confirmed' after payment verification.` 
      };
    }

    // Verify payment has been made
    if (appointment.paymentStatus !== 'paid') {
      return { success: false, error: 'Payment not confirmed for this appointment' };
    }

    // Update to checked-in status
    await updateDoc(appointmentRef, {
      status: 'checked-in',
      checkedInBy,
      checkedInAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Get patient details for notification
    const patientData = await getUserById(appointment.patientId);
    const patientName = patientData.success ? patientData.data.fullName : 'Patient';

    // Get doctor details
    const doctorData = await getUserById(appointment.doctorId);
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';

    // Notify doctor
    await addDoc(collection(db, 'notifications'), {
      userId: appointment.doctorId,
      type: 'PATIENT_CHECKED_IN',
      title: 'Patient Checked In',
      message: `${patientName} has checked in for your ${appointment.time} appointment.`,
      appointmentId,
      patientId: appointment.patientId,
      read: false,
      timestamp: serverTimestamp(),
      priority: appointment.isEmergency ? 'high' : 'normal'
    });

    // Notify patient
    await addDoc(collection(db, 'notifications'), {
      userId: appointment.patientId,
      type: 'APPOINTMENT_CHECKED_IN',
      title: 'Checked In',
      message: `You have been checked in for your appointment with Dr. ${doctorName} at ${appointment.time}. Please wait in the waiting area.`,
      appointmentId,
      doctorId: appointment.doctorId,
      read: false,
      timestamp: serverTimestamp()
    });

    // Log check-in
    await addDoc(collection(db, 'auditLogs'), {
      userId: checkedInBy,
      action: 'PATIENT_CHECKED_IN',
      targetId: appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      paymentVerified: true,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error checking in patient:', error);
    return { success: false, error: error.message };
  }
};





/**
 * Get department name by ID
 * @param {string} departmentId - Department ID
 * @returns {Promise<string>} Department name
 */
export const getDepartmentName = async (departmentId) => {
  try {
    if (!departmentId) return departmentId;
    
    const deptDoc = await getDoc(doc(db, 'departments', departmentId));
    if (deptDoc.exists()) {
      return deptDoc.data().name;
    }
    return departmentId;
  } catch (error) {
    console.error('Error fetching department name:', error);
    return departmentId;
  }
};























/**
 * Get all appointments for a doctor (not just today)
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} All appointments
 */
export const getAllDoctorAppointments = async (doctorId) => {
  try {
    if (!doctorId) {
      return { success: false, error: 'Doctor ID is required' };
    }

    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      orderBy('date', 'desc'),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(q);
    const appointments = [];

    for (const doc of snapshot.docs) {
      const apt = { id: doc.id, ...doc.data() };
      
      // Get patient details
      const patientData = await getUserById(apt.patientId);
      if (patientData.success) {
        apt.patient = {
          id: apt.patientId,
          fullName: patientData.data.fullName,
          phone: patientData.data.phone,
          email: patientData.data.email
        };
        apt.patientName = patientData.data.fullName;
      }

      appointments.push(apt);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching all doctor appointments:', error);
    
    // Fallback if index doesn't exist
    try {
      const fallbackQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const appointments = [];

      for (const doc of fallbackSnapshot.docs) {
        const apt = { id: doc.id, ...doc.data() };
        
        const patientData = await getUserById(apt.patientId);
        if (patientData.success) {
          apt.patient = {
            id: apt.patientId,
            fullName: patientData.data.fullName,
            phone: patientData.data.phone,
            email: patientData.data.email
          };
          apt.patientName = patientData.data.fullName;
        }

        appointments.push(apt);
      }

      // Sort manually
      appointments.sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });

      return { success: true, data: appointments };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

/**
 * Get appointments by status for a doctor
 * @param {string} doctorId - Doctor ID
 * @param {string} status - Appointment status
 * @returns {Promise<Object>} Filtered appointments
 */
export const getDoctorAppointmentsByStatus = async (doctorId, status) => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('status', '==', status),
      orderBy('date', 'desc'),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(q);
    const appointments = [];

    for (const doc of snapshot.docs) {
      const apt = { id: doc.id, ...doc.data() };
      
      const patientData = await getUserById(apt.patientId);
      if (patientData.success) {
        apt.patient = {
          id: apt.patientId,
          fullName: patientData.data.fullName,
          phone: patientData.data.phone
        };
        apt.patientName = patientData.data.fullName;
      }

      appointments.push(apt);
    }

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching doctor appointments by status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update doctor profile
 * @param {string} doctorId - Doctor ID
 * @param {Object} profileData - Profile data to update
 * @param {string} updatedBy - User ID making the update
 * @returns {Promise<Object>} Success status
 */
export const updateDoctorProfile = async (doctorId, profileData, updatedBy) => {
  try {
    const doctorRef = doc(db, 'users', doctorId);
    
    // Only allow updating specific fields
    const allowedUpdates = {
      fullName: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email,
      specialization: profileData.specialization,
      qualifications: profileData.qualifications,
      experience: profileData.experience,
      consultationFee: profileData.consultationFee,
      about: profileData.about,
      languages: profileData.languages,
      education: profileData.education,
      awards: profileData.awards,
      profileImage: profileData.profileImage,
      clinicAddress: profileData.clinicAddress,
      availableDays: profileData.availableDays,
      updatedAt: serverTimestamp(),
      updatedBy
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    await updateDoc(doctorRef, allowedUpdates);

    // Log profile update
    await addDoc(collection(db, 'auditLogs'), {
      userId: updatedBy,
      action: 'DOCTOR_PROFILE_UPDATED',
      targetUserId: doctorId,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get doctor profile
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} Doctor profile data
 */
export const getDoctorProfile = async (doctorId) => {
  try {
    const result = await getUserById(doctorId);
    if (!result.success) {
      return result;
    }

    const doctor = result.data;
    
    // Return all relevant profile fields
    return {
      success: true,
      data: {
        id: doctor.id,
        fullName: doctor.fullName,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        qualifications: doctor.qualifications || [],
        experience: doctor.experience || 0,
        consultationFee: doctor.consultationFee,
        about: doctor.about || '',
        languages: doctor.languages || [],
        education: doctor.education || [],
        awards: doctor.awards || [],
        profileImage: doctor.profileImage || null,
        department: doctor.department,
        clinicAddress: doctor.clinicAddress || 'Main Hospital',
        availableDays: doctor.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        licenseNumber: doctor.licenseNumber,
        avgRating: doctor.avgRating || 0,
        ratings: doctor.ratings?.length || 0
      }
    };
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return { success: false, error: error.message };
  }
};






























// ==================== CHAT SYSTEM ====================
export const createOrGetChat = async (participant1, participant2) => {
  try {
    // Validate participants - ensure they are valid strings
    if (!participant1 || !participant2) {
      console.error('Invalid participants:', { participant1, participant2 });
      return { success: false, error: 'Both participants are required', isNew: false };
    }

    // Convert to string and trim
    const p1 = String(participant1).trim();
    const p2 = String(participant2).trim();

    if (!p1 || !p2) {
      console.error('Empty participants after trimming');
      return { success: false, error: 'Invalid participant IDs', isNew: false };
    }

    if (p1 === p2) {
      return { success: false, error: 'Cannot create chat with yourself', isNew: false };
    }

    // Create a sorted array of participants for consistent querying
    const participants = [p1, p2].sort();

    console.log('Creating/getting chat for participants:', participants);

    // Try to find existing chat using a different approach
    // First, try to find chats where participant1 is in the participants array
    let existingChatId = null;
    let existingChatData = null;

    try {
      // Query for chats where participants array contains p1
      const q1 = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', p1)
      );
      const snapshot1 = await getDocs(q1);

      // Check each chat to see if it also contains p2
      for (const doc of snapshot1.docs) {
        const chatData = doc.data();
        if (chatData.participants && Array.isArray(chatData.participants)) {
          if (chatData.participants.includes(p1) && chatData.participants.includes(p2)) {
            existingChatId = doc.id;
            existingChatData = chatData;
            break;
          }
        }
      }
    } catch (queryError) {
      console.error('Error querying existing chats:', queryError);
      // Continue to create new chat
    }

    // If chat exists, return it
    if (existingChatId && existingChatData) {
      return {
        success: true,
        data: { id: existingChatId, ...existingChatData },
        existing: true,
        isNew: false
      };
    }

    // Create new chat
    const chatRef = doc(collection(db, 'chats'));
    const unreadCount = {
      [p1]: 0,
      [p2]: 0
    };
    
    const chatData = {
      participants: participants,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: null,
      unreadCount: unreadCount,
      participantsInfo: {},
      createdAtTimestamp: Date.now()
    };

    await setDoc(chatRef, chatData);
    console.log('New chat created with ID:', chatRef.id);

    return {
      success: true,
      data: { id: chatRef.id, ...chatData },
      existing: false,
      isNew: true
    };
  } catch (error) {
    console.error('Error in createOrGetChat:', error);
    return { success: false, error: error.message || 'Failed to create chat', isNew: false };
  }
};

/**
 * Send a message in a chat
 */
export const sendMessage = async (chatId, messageData) => {
  try {
    if (!chatId || !messageData.senderId || !messageData.recipientId) {
      return { success: false, error: 'Missing required fields' };
    }

    const messageRef = doc(collection(db, 'messages'));
    const timestamp = serverTimestamp();
    
    // Prepare message document
    const message = {
      id: messageRef.id,
      chatId,
      senderId: messageData.senderId,
      recipientId: messageData.recipientId,
      text: messageData.text || '',
      status: 'sent',
      timestamp: timestamp,
      readBy: [messageData.senderId],
      isRead: false,
      reactions: [],
      replyTo: messageData.replyTo || null,
      isEdited: false,
      editedAt: null
    };

    // Handle file attachment if present
    if (messageData.file) {
      message.file = {
        name: messageData.file.name,
        type: messageData.file.type,
        data: messageData.file.data,
        size: messageData.file.size,
        isCompressed: messageData.file.isCompressed || false,
        isEncoded: messageData.file.isEncoded || false
      };
    }

    // Handle auto-reply flag
    if (messageData.isAutoReply) {
      message.isAutoReply = true;
    }

    await setDoc(messageRef, message);

    // Update chat with last message info
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: message.text || (message.file ? '📎 File' : ''),
        senderId: message.senderId,
        timestamp: timestamp,
        messageId: messageRef.id,
        hasFile: !!message.file
      },
      lastMessageAt: timestamp,
      [`unreadCount.${messageData.recipientId}`]: increment(1)
    });

    // Return the message with a proper timestamp for optimistic updates
    return { 
      success: true, 
      data: { 
        ...message, 
        timestamp: new Date() // Client-side timestamp for immediate display
      } 
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get messages for a chat with pagination
 * FIXED: Renamed parameter to avoid conflict with Firestore's limit() method
 */
export const getChatMessages = async (chatId, lastMessage = null, pageSize = 50) => {
  try {
    if (!chatId) {
      return { success: false, error: 'Chat ID is required' };
    }

    let q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'desc'),
      limit(pageSize) // Use pageSize instead of limit parameter
    );

    if (lastMessage) {
      q = query(q, startAfter(lastMessage));
    }

    const snapshot = await getDocs(q);
    const messages = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({ 
        id: doc.id, 
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp) || new Date()
      });
    });

    // Return in ascending order for display
    return { 
      success: true, 
      data: messages.reverse(),
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to new messages in a chat
 */
export const subscribeToMessages = (chatId, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const data = change.doc.data();
        messages.push({ 
          id: change.doc.id, 
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp) || new Date()
        });
      }
    });
    
    if (messages.length > 0) {
      callback(messages);
    }
  }, (error) => {
    console.error('Snapshot error:', error);
  });
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (chatId, userId, messageIds) => {
  try {
    if (!chatId || !userId || !messageIds?.length) {
      return { success: true }; // Silent fail for empty messages
    }

    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const messageId of messageIds) {
      const messageRef = doc(db, 'messages', messageId);
      batch.update(messageRef, {
        status: 'seen',
        readBy: arrayUnion(userId),
        isRead: true
      });
      updatedCount++;
    }

    // Update unread count in chat
    if (updatedCount > 0) {
      const chatRef = doc(db, 'chats', chatId);
      batch.update(chatRef, {
        [`unreadCount.${userId}`]: 0
      });
    }

    await batch.commit();

    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId, chatId, userId) => {
  try {
    if (!messageId || !chatId || !userId) {
      return { success: false, error: 'Missing required fields' };
    }

    // First get the message to verify ownership
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const message = messageDoc.data();

    // Verify user owns this message
    if (message.senderId !== userId) {
      return { success: false, error: 'You can only delete your own messages' };
    }

    // Soft delete - mark as deleted instead of actually removing
    await updateDoc(messageRef, {
      text: '[This message was deleted]',
      file: null,
      isDeleted: true,
      deletedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Toggle pin message
 */
export const togglePinMessage = async (chatId, messageId, userId, shouldPin) => {
  try {
    if (!chatId || !messageId || !userId) {
      return { success: false, error: 'Missing required fields' };
    }

    const chatRef = doc(db, 'chats', chatId);
    
    // Get current chat to verify user has access
    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) {
      return { success: false, error: 'Chat not found' };
    }

    const chatData = chatDoc.data();
    
    // Verify user is a participant
    if (!chatData.participants?.includes(userId)) {
      return { success: false, error: 'You are not a participant in this chat' };
    }

    // Initialize pinnedMessages array if it doesn't exist
    const currentPinned = chatData.pinnedMessages || [];
    
    if (shouldPin && !currentPinned.includes(messageId)) {
      await updateDoc(chatRef, {
        pinnedMessages: [...currentPinned, messageId]
      });
    } else if (!shouldPin && currentPinned.includes(messageId)) {
      await updateDoc(chatRef, {
        pinnedMessages: currentPinned.filter(id => id !== messageId)
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error toggling pin:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unread counts for a user
 */
export const getUnreadCounts = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );

    const chatsSnapshot = await getDocs(chatsQuery);
    const unreadCounts = {};

    chatsSnapshot.forEach((doc) => {
      const chat = doc.data();
      unreadCounts[doc.id] = chat.unreadCount?.[userId] || 0;
    });

    return { success: true, data: unreadCounts };
  } catch (error) {
    console.error('Error getting unread counts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Edit a message
 */
export const editMessage = async (messageId, userId, newText) => {
  try {
    if (!messageId || !userId || !newText) {
      return { success: false, error: 'Missing required fields' };
    }

    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const message = messageDoc.data();

    if (message.senderId !== userId) {
      return { success: false, error: 'You can only edit your own messages' };
    }

    await updateDoc(messageRef, {
      text: newText,
      isEdited: true,
      editedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error editing message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get chat details
 */
export const getChatDetails = async (chatId) => {
  try {
    if (!chatId) {
      return { success: false, error: 'Chat ID is required' };
    }

    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    
    if (!chatDoc.exists()) {
      return { success: false, error: 'Chat not found' };
    }

    return { success: true, data: { id: chatDoc.id, ...chatDoc.data() } };
  } catch (error) {
    console.error('Error getting chat details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's chats
 */
export const getUserChats = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const chats = [];

    for (const doc of snapshot.docs) {
      const chat = { id: doc.id, ...doc.data() };
      
      // Get the other participant's info
      const otherParticipantId = chat.participants.find(p => p !== userId);
      if (otherParticipantId) {
        const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
        if (userDoc.exists()) {
          chat.otherUser = { id: otherParticipantId, ...userDoc.data() };
        }
      }
      
      chats.push(chat);
    }

    return { success: true, data: chats };
  } catch (error) {
    console.error('Error getting user chats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get pinned messages for a chat
 */
export const getPinnedMessages = async (chatId) => {
  try {
    if (!chatId) {
      return { success: false, error: 'Chat ID is required' };
    }

    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    
    if (!chatDoc.exists()) {
      return { success: false, error: 'Chat not found' };
    }

    const pinnedMessageIds = chatDoc.data().pinnedMessages || [];
    
    if (pinnedMessageIds.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch all pinned messages
    const messages = [];
    for (const messageId of pinnedMessageIds) {
      const messageDoc = await getDoc(doc(db, 'messages', messageId));
      if (messageDoc.exists()) {
        messages.push({
          id: messageDoc.id,
          ...messageDoc.data()
        });
      }
    }

    return { success: true, data: messages };
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a message is pinned
 */
export const isMessagePinned = async (chatId, messageId) => {
  try {
    if (!chatId || !messageId) {
      return { success: false, error: 'Missing required fields' };
    }

    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    
    if (!chatDoc.exists()) {
      return { success: false, error: 'Chat not found' };
    }

    const pinnedMessages = chatDoc.data().pinnedMessages || [];
    return { 
      success: true, 
      data: pinnedMessages.includes(messageId) 
    };
  } catch (error) {
    console.error('Error checking pin status:', error);
    return { success: false, error: error.message };
  }
};


/**
 * Add reaction to a message
 * FIXED: serverTimestamp() cannot be used inside arrayUnion()
 */
export const addReaction = async (messageId, userId, reaction) => {
  try {
    if (!messageId || !userId || !reaction) {
      return { success: false, error: 'Missing required fields' };
    }

    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const message = messageDoc.data();
    const currentReactions = message.reactions || [];
    
    // Check if user already has a reaction
    const existingReactionIndex = currentReactions.findIndex(
      r => r.userId === userId
    );

    let updatedReactions;

    if (existingReactionIndex >= 0) {
      // Update existing reaction
      updatedReactions = [...currentReactions];
      updatedReactions[existingReactionIndex] = {
        userId,
        reaction,
        timestamp: new Date().toISOString() // Use client timestamp instead of serverTimestamp
      };
    } else {
      // Add new reaction
      updatedReactions = [
        ...currentReactions,
        {
          userId,
          reaction,
          timestamp: new Date().toISOString() // Use client timestamp instead of serverTimestamp
        }
      ];
    }

    await updateDoc(messageRef, {
      reactions: updatedReactions
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding reaction:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove reaction from a message
 */
export const removeReaction = async (messageId, userId, reaction) => {
  try {
    if (!messageId || !userId || !reaction) {
      return { success: false, error: 'Missing required fields' };
    }

    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return { success: false, error: 'Message not found' };
    }

    const message = messageDoc.data();
    const currentReactions = message.reactions || [];
    
    // Filter out the reaction to remove
    const updatedReactions = currentReactions.filter(
      r => !(r.userId === userId && r.reaction === reaction)
    );
    
    await updateDoc(messageRef, {
      reactions: updatedReactions
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing reaction:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Alternative approach using arrayUnion without timestamp
 * This is cleaner but doesn't track when reactions were added
 */
export const addReactionSimple = async (messageId, userId, reaction) => {
  try {
    if (!messageId || !userId || !reaction) {
      return { success: false, error: 'Missing required fields' };
    }

    const messageRef = doc(db, 'messages', messageId);
    
    // Use arrayUnion without timestamp
    await updateDoc(messageRef, {
      reactions: arrayUnion({
        userId,
        reaction
        // No timestamp field to avoid serverTimestamp() issue
      })
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding reaction:', error);
    return { success: false, error: error.message };
  }
};
















/**
 * Get department staff by user ID
 * @param {string} userId - Staff user ID
 * @returns {Promise<Object>} Department staff data
 */
export const getDepartmentStaffByUser = async (userId) => {
  try {
    // Search across all departments for this staff member
    const departmentsResult = await getDepartments();
    if (departmentsResult.success) {
      for (const dept of departmentsResult.data) {
        const staffResult = await getDepartmentStaff(dept.id);
        if (staffResult.success) {
          const found = staffResult.data.find(s => s.id === userId);
          if (found) {
            return { 
              success: true, 
              data: { 
                ...found, 
                department: dept.name,
                departmentId: dept.id 
              } 
            };
          }
        }
      }
    }
    return { success: false, error: 'Staff not found' };
  } catch (error) {
    console.error('Error fetching department staff by user:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED SALARY SYSTEM ====================

/**
 * Get salary records with filters
 * @param {Object} filters - { month, year, userId, status, department }
 * @returns {Promise<Object>} Salary records
 */
export const getSalaryRecords = async (filters = {}) => {
  try {
    let constraints = [orderBy('year', 'desc'), orderBy('month', 'desc')];
    
    if (filters.userId) {
      constraints.unshift(where('userId', '==', filters.userId));
    }
    if (filters.status) {
      constraints.unshift(where('status', '==', filters.status));
    }
    if (filters.month) {
      constraints.unshift(where('month', '==', filters.month));
    }
    if (filters.year) {
      constraints.unshift(where('year', '==', filters.year));
    }
    
    let q = query(collection(db, 'salaryRecords'), ...constraints);
    const snapshot = await getDocs(q);
    
    let records = [];
    for (const doc of snapshot.docs) {
      const record = { id: doc.id, ...doc.data() };
      records.push(record);
    }
    
    // Apply department filter client-side if needed
    if (filters.department) {
      records = records.filter(r => r.userDepartment === filters.department);
    }
    
    return { success: true, data: records };
  } catch (error) {
    console.error('Error getting salary records:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate salary slip for a record
 * @param {string} salaryRecordId - Salary record ID
 * @returns {Promise<Object>} PDF as base64
 */
export const generateSalarySlip = async (salaryRecordId) => {
  try {
    if (!salaryRecordId) {
      return { success: false, error: 'Salary record ID is required' };
    }

    const salaryDoc = await getDoc(doc(db, 'salaryRecords', salaryRecordId));
    if (!salaryDoc.exists()) {
      return { success: false, error: 'Salary record not found' };
    }
    
    const salary = salaryDoc.data();
    
    // Validate required data
    if (!salary.userName && !salary.userId) {
      return { success: false, error: 'Salary record missing user information' };
    }

    // Safely extract payment info
    let paymentInfo = null;
    if (salary.status === 'paid') {
      paymentInfo = {
        paidAt: salary.paidAt?.toDate ? salary.paidAt.toDate() : (salary.paidAt || null),
        paidBy: salary.paidBy || 'System',
        paymentMethod: salary.paymentMethod || 'Bank Transfer',
        paymentReference: salary.paymentReference || 'N/A'
      };
    }
    
    // Prepare data for PDF with safe defaults
    const pdfData = {
      userId: salary.userId || 'N/A',
      userName: salary.userName || 'Unknown Employee',
      userRole: salary.userRole || 'Staff',
      userDepartment: salary.userDepartment || 'N/A',
      month: salary.month || new Date().getMonth() + 1,
      year: salary.year || new Date().getFullYear(),
      baseSalary: salary.baseSalary || 0,
      workingDays: salary.workingDays || 0,
      presentDays: salary.presentDays || 0,
      absentDays: salary.absentDays || 0,
      lateDays: salary.lateDays || 0,
      halfDays: salary.halfDays || 0,
      perDaySalary: salary.perDaySalary || ((salary.baseSalary || 0) / 26),
      calculatedSalary: salary.calculatedSalary || 0,
      status: salary.status || 'pending',
      paidAt: salary.paidAt,
      paidBy: salary.paidBy,
      paymentInfo: paymentInfo
    };
    
    // Import generatePDF dynamically to avoid circular dependencies
    const { generatePDF } = await import('../src/utils/helpers');
    
    const pdfBase64 = await generatePDF('salary-slip', pdfData);
    
    if (!pdfBase64) {
      return { success: false, error: 'Failed to generate PDF content' };
    }
    
    return { success: true, data: pdfBase64 };
  } catch (error) {
    console.error('Error generating salary slip:', error);
    return { success: false, error: error.message || 'Failed to generate salary slip' };
  }
};


















// ==================== ENHANCED ATTENDANCE FUNCTIONS ====================

/**
 * Get all staff for attendance marking (includes system users + department staff)
 * @returns {Promise<Object>} Combined staff list
 */
export const getAllStaffForAttendance = async () => {
  try {
    const allStaff = [];
    
    // 1. Get system users with base salary (active status)
    const systemRoles = ['doctor', 'receptionist', 'lab', 'accountant', 'admin', 'nurse'];
    const systemUsersPromises = systemRoles.map(role => getUsersByRole(role));
    const systemResults = await Promise.all(systemUsersPromises);
    
    for (const result of systemResults) {
      if (result.success) {
        const usersWithSalary = result.data.filter(u => 
          u.baseSalary && u.baseSalary > 0 && u.accountStatus === 'active'
        );
        allStaff.push(...usersWithSalary.map(u => ({
          id: u.id,
          userId: u.id,
          fullName: u.fullName,
          role: u.role,
          department: u.department || 'Administration',
          baseSalary: u.baseSalary,
          source: 'system',
          email: u.email,
          phone: u.phone,
          isSystemUser: true
        })));
      }
    }
    
    // 2. Get department staff (non-system users with salary)
    const departmentsResult = await getDepartments();
    if (departmentsResult.success) {
      for (const dept of departmentsResult.data) {
        const staffResult = await getDepartmentStaff(dept.id);
        if (staffResult.success && staffResult.data.length > 0) {
          const staffWithSalary = staffResult.data.filter(s => 
            s.salary && s.salary > 0 && s.status === 'active'
          );
          allStaff.push(...staffWithSalary.map(s => ({
            id: s.id,
            userId: s.id,
            fullName: s.name,
            role: s.role,
            department: dept.name,
            baseSalary: s.salary,
            source: 'department',
            departmentId: dept.id,
            email: s.email,
            phone: s.phone,
            isSystemUser: false
          })));
        }
      }
    }
    
    // Remove duplicates
    const uniqueStaff = allStaff.filter((staff, index, self) => 
      index === self.findIndex(s => s.id === staff.id)
    );
    
    return { success: true, data: uniqueStaff };
  } catch (error) {
    console.error('Error getting all staff for attendance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get complete attendance for a specific date (including unmarked staff as absent)
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<Object>} Complete attendance records
 */
export const getCompleteAttendanceByDate = async (date) => {
  try {
    // Get all staff first
    const staffResult = await getAllStaffForAttendance();
    if (!staffResult.success) {
      return staffResult;
    }
    
    const allStaff = staffResult.data;
    const staffMap = new Map();
    allStaff.forEach(staff => {
      staffMap.set(staff.userId, staff);
    });
    
    // Get attendance records for this date
    let attendanceSnapshot;
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', date)
      );
      attendanceSnapshot = await getDocs(attendanceQuery);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // Fallback: get all and filter
      const allAttendance = await getDocs(collection(db, 'attendance'));
      const filtered = [];
      allAttendance.forEach(doc => {
        if (doc.data().date === date) filtered.push(doc);
      });
      attendanceSnapshot = { docs: filtered, forEach: (cb) => filtered.forEach(cb) };
    }
    
    const attendanceRecords = [];
    const markedStaffIds = new Set();
    
    // Process existing attendance records
    for (const docSnap of attendanceSnapshot.docs) {
      const record = docSnap.data();
      markedStaffIds.add(record.userId);
      const staff = staffMap.get(record.userId);
      
      if (staff) {
        attendanceRecords.push({
          id: docSnap.id,
          userId: record.userId,
          fullName: staff.fullName,
          role: staff.role,
          department: staff.department,
          date: record.date,
          status: record.status,
          checkInTime: record.checkInTime,
          markedBy: record.markedBy,
          markedAt: record.markedAt?.toDate?.() || null,
          source: staff.source,
          baseSalary: staff.baseSalary
        });
        staffMap.delete(record.userId);
      }
    }
    
    // Add unmarked staff as absent
    for (const [userId, staff] of staffMap) {
      attendanceRecords.push({
        id: `absent-${userId}`,
        userId: userId,
        fullName: staff.fullName,
        role: staff.role,
        department: staff.department,
        date: date,
        status: 'absent',
        checkInTime: null,
        markedBy: null,
        markedAt: null,
        source: staff.source,
        baseSalary: staff.baseSalary,
        isAutoMarked: true
      });
    }
    
    // Sort by department then name
    attendanceRecords.sort((a, b) => {
      if (a.department !== b.department) return a.department.localeCompare(b.department);
      return a.fullName.localeCompare(b.fullName);
    });
    
    return { success: true, data: attendanceRecords };
  } catch (error) {
    console.error('Error getting complete attendance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk mark attendance for multiple staff
 * @param {Array} attendanceData - Array of {userId, status}
 * @param {string} date - Date string
 * @param {string} markedBy - User ID marking attendance
 * @returns {Promise<Object>} Success status
 */
export const bulkMarkAttendance = async (attendanceData, date, markedBy) => {
  try {
    if (!attendanceData || attendanceData.length === 0) {
      return { success: false, error: 'No attendance data provided' };
    }
    
    const batch = writeBatch(db);
    const results = [];
    
    for (const item of attendanceData) {
      const attendanceId = `${item.userId}_${date}`;
      const attendanceRef = doc(db, 'attendance', attendanceId);
      
      const attendanceRecord = {
        id: attendanceId,
        userId: item.userId,
        date: date,
        status: item.status,
        markedBy: markedBy,
        markedAt: serverTimestamp(),
        checkInTime: item.status === 'present' || item.status === 'late' ? new Date().toLocaleTimeString() : null,
        updatedAt: serverTimestamp()
      };
      
      batch.set(attendanceRef, attendanceRecord);
      results.push({ userId: item.userId, status: item.status });
    }
    
    await batch.commit();
    
    // Log bulk attendance
    await addDoc(collection(db, 'auditLogs'), {
      userId: markedBy,
      action: 'BULK_ATTENDANCE_MARKED',
      count: attendanceData.length,
      date: date,
      timestamp: serverTimestamp()
    });
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Error bulk marking attendance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get monthly attendance summary for a user
 * @param {string} userId - User ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<Object>} Attendance summary
 */
export const getUserMonthlyAttendance = async (userId, month, year) => {
  try {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    let attendanceDocs = [];
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snapshot = await getDocs(attendanceQuery);
      attendanceDocs = snapshot.docs;
    // eslint-disable-next-line no-unused-vars
    } catch (indexError) {
      // Fallback: get all and filter client-side
      const allQuery = query(collection(db, 'attendance'), where('userId', '==', userId));
      const allSnapshot = await getDocs(allQuery);
      attendanceDocs = allSnapshot.docs.filter(doc => {
        const date = doc.data().date;
        return date >= startDate && date <= endDate;
      });
    }
    
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    
    for (const doc of attendanceDocs) {
      const status = doc.data().status;
      switch (status) {
        case 'present': present++; break;
        case 'absent': absent++; break;
        case 'late': late++; break;
        case 'half-day': halfDay++; break;
      }
    }
    
    // Calculate working days (present = 1, half-day = 0.5, late = 0.5)
    const workingDays = present + (halfDay * 0.5) + (late * 0.5);
    
    return {
      success: true,
      data: {
        userId,
        month,
        year,
        present,
        absent,
        late,
        halfDay,
        workingDays,
        totalMarked: attendanceDocs.length
      }
    };
  } catch (error) {
    console.error('Error getting monthly attendance:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ENHANCED SALARY FUNCTIONS ====================

/**
 * Calculate salary for a user with attendance data
 * @param {string} userId - User ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {string} calculatedBy - Calculator user ID
 * @returns {Promise<Object>} Salary record
 */
export const calculateSalaryWithAttendance = async (userId, month, year, calculatedBy) => {
  try {
    // Get user details - could be system user or department staff
    let baseSalary = 0;
    let userRole = '';
    let userName = '';
    let userDepartment = '';
    
    // First check if system user
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      baseSalary = userData.baseSalary || 0;
      userRole = userData.role || 'staff';
      userName = userData.fullName || 'Unknown';
      userDepartment = userData.department || 'Administration';
    } else {
      // Check department staff
      const departmentsResult = await getDepartments();
      if (departmentsResult.success) {
        for (const dept of departmentsResult.data) {
          const staffQuery = query(
            collection(db, 'departmentStaff'),
            where('departmentId', '==', dept.id),
            where('id', '==', userId)
          );
          const staffSnapshot = await getDocs(staffQuery);
          if (!staffSnapshot.empty) {
            const staffData = staffSnapshot.docs[0].data();
            baseSalary = staffData.salary || 0;
            userRole = staffData.role || 'staff';
            userName = staffData.name || 'Unknown';
            userDepartment = dept.name;
            break;
          }
        }
      }
    }
    
    if (baseSalary === 0) {
      return { success: false, error: 'No base salary configured for this staff member' };
    }
    
    // Get monthly attendance
    const attendanceResult = await getUserMonthlyAttendance(userId, month, year);
    if (!attendanceResult.success) {
      return { success: false, error: attendanceResult.error };
    }
    
    const attendance = attendanceResult.data;
    const workingDays = attendance.workingDays;
    const perDaySalary = baseSalary / 26; // 26 working days assumption
    const calculatedSalary = workingDays * perDaySalary;
    
    // Check if salary already calculated for this month
    let existingRecord = null;
    let salaryRef;
    let isUpdate = false;
    
    try {
      const existingQuery = query(
        collection(db, 'salaryRecords'),
        where('userId', '==', userId),
        where('month', '==', month),
        where('year', '==', year)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        existingRecord = { id: existingSnapshot.docs[0].id, ...existingSnapshot.docs[0].data() };
        salaryRef = doc(db, 'salaryRecords', existingSnapshot.docs[0].id);
        isUpdate = true;
      } else {
        salaryRef = doc(collection(db, 'salaryRecords'));
      }
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      salaryRef = doc(collection(db, 'salaryRecords'));
    }
    
    const salaryRecord = {
      userId,
      userName,
      userRole,
      userDepartment,
      month,
      year,
      baseSalary,
      workingDays,
      presentDays: attendance.present,
      absentDays: attendance.absent,
      lateDays: attendance.late,
      halfDays: attendance.halfDay,
      perDaySalary,
      calculatedSalary,
      status: 'pending',
      calculatedBy,
      calculatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (isUpdate && existingRecord) {
      await updateDoc(salaryRef, { ...salaryRecord, updatedAt: serverTimestamp() });
      return { success: true, data: { id: salaryRef.id, ...salaryRecord, isUpdate: true } };
    } else {
      await setDoc(salaryRef, { id: salaryRef.id, ...salaryRecord });
      return { success: true, data: { id: salaryRef.id, ...salaryRecord } };
    }
  } catch (error) {
    console.error('Error calculating salary with attendance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate all pending salaries for a month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {string} calculatedBy - Calculator user ID
 * @returns {Promise<Object>} Results of calculation
 */
export const calculateAllSalariesForMonth = async (month, year, calculatedBy) => {
  try {
    // Get all staff with base salary
    const staffResult = await getAllStaffForAttendance();
    if (!staffResult.success) {
      return staffResult;
    }
    
    const allStaff = staffResult.data;
    const results = [];
    const errors = [];
    
    for (const staff of allStaff) {
      try {
        const result = await calculateSalaryWithAttendance(staff.userId, month, year, calculatedBy);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({ userId: staff.userId, name: staff.fullName, error: result.error });
        }
      } catch (error) {
        errors.push({ userId: staff.userId, name: staff.fullName, error: error.message });
      }
    }
    
    // Log bulk calculation
    await addDoc(collection(db, 'auditLogs'), {
      userId: calculatedBy,
      action: 'BULK_SALARY_CALCULATION',
      month,
      year,
      totalCalculated: results.length,
      totalErrors: errors.length,
      timestamp: serverTimestamp()
    });
    
    return { 
      success: true, 
      data: { 
        calculated: results, 
        errors,
        total: allStaff.length,
        successCount: results.length,
        errorCount: errors.length
      } 
    };
  } catch (error) {
    console.error('Error calculating all salaries:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get salary summary by department for a month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<Object>} Department salary summary
 */
export const getDepartmentSalarySummary = async (month, year) => {
  try {
    const result = await getSalaryRecords({ month, year });
    if (!result.success) {
      return result;
    }
    
    const records = result.data;
    const summary = {};
    
    for (const record of records) {
      const dept = record.userDepartment || 'Other';
      if (!summary[dept]) {
        summary[dept] = {
          totalBaseSalary: 0,
          totalCalculatedSalary: 0,
          paidAmount: 0,
          pendingAmount: 0,
          staffCount: 0,
          staffList: []
        };
      }
      
      summary[dept].totalBaseSalary += record.baseSalary || 0;
      summary[dept].totalCalculatedSalary += record.calculatedSalary || 0;
      
      if (record.status === 'paid') {
        summary[dept].paidAmount += record.calculatedSalary || 0;
      } else {
        summary[dept].pendingAmount += record.calculatedSalary || 0;
      }
      
      summary[dept].staffCount++;
      summary[dept].staffList.push({
        id: record.userId,
        name: record.userName,
        role: record.userRole,
        salary: record.calculatedSalary,
        status: record.status,
        workingDays: record.workingDays,
        absentDays: record.absentDays
      });
    }
    
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting department salary summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get salary payment history for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment history
 */
export const getUserSalaryHistory = async (userId) => {
  try {
    const result = await getSalaryRecords({ userId });
    if (!result.success) {
      return result;
    }
    
    const records = result.data;
    const history = {
      totalPaid: 0,
      totalPending: 0,
      totalCalculated: 0,
      lastPaidDate: null,
      records: records.map(r => ({
        month: `${r.month}/${r.year}`,
        baseSalary: r.baseSalary,
        calculatedSalary: r.calculatedSalary,
        status: r.status,
        workingDays: r.workingDays,
        absentDays: r.absentDays,
        paidAt: r.paidAt?.toDate?.() || null,
        paymentMethod: r.paymentMethod
      }))
    };
    
    for (const r of records) {
      history.totalCalculated += r.calculatedSalary;
      if (r.status === 'paid') {
        history.totalPaid += r.calculatedSalary;
        if (!history.lastPaidDate || (r.paidAt?.toDate?.() > history.lastPaidDate)) {
          history.lastPaidDate = r.paidAt?.toDate?.() || null;
        }
      } else {
        history.totalPending += r.calculatedSalary;
      }
    }
    
    return { success: true, data: history };
  } catch (error) {
    console.error('Error getting user salary history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get previous salaries summary
 * @param {number} userId - User ID (optional)
 * @returns {Promise<Object>} Previous salaries summary
 */
export const getPreviousSalariesSummary = async (userId = null) => {
  try {
    let constraints = [orderBy('year', 'desc'), orderBy('month', 'desc')];
    
    if (userId) {
      constraints.unshift(where('userId', '==', userId));
    }
    
    const q = query(collection(db, 'salaryRecords'), ...constraints);
    const snapshot = await getDocs(q);
    
    const salaries = [];
    for (const doc of snapshot.docs) {
      const record = doc.data();
      salaries.push({
        id: doc.id,
        month: record.month,
        year: record.year,
        userName: record.userName,
        userRole: record.userRole,
        userDepartment: record.userDepartment,
        baseSalary: record.baseSalary,
        calculatedSalary: record.calculatedSalary,
        status: record.status,
        workingDays: record.workingDays,
        paidAt: record.paidAt?.toDate?.() || null,
        paymentMethod: record.paymentMethod
      });
    }
    
    return { success: true, data: salaries };
  } catch (error) {
    console.error('Error getting previous salaries:', error);
    return { success: false, error: error.message };
  }
};

















// ==================== APPOINTMENT PAYMENT FUNCTIONS ====================

/**
 * Process appointment fee payment
 * @param {string} appointmentId - Appointment ID
 * @param {Object} paymentData - Payment data (method, proof, reference)
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Success status
 */
export const processAppointmentPayment = async (appointmentId, paymentData, patientId) => {
  try {
    if (!appointmentId || !paymentData || !patientId) {
      return { success: false, error: 'Missing required fields' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }
    
    const appointment = appointmentDoc.data();
    
    if (appointment.patientId !== patientId) {
      return { success: false, error: 'Unauthorized: This appointment does not belong to you' };
    }
    
    if (appointment.paymentStatus === 'paid') {
      return { success: false, error: 'Payment already processed for this appointment' };
    }
    
    if (appointment.status !== 'approved') {
      return { success: false, error: 'Appointment must be approved before payment' };
    }
    
    // Compress payment proof if exists
    let compressedProof = null;
    if (paymentData.proof) {
      compressedProof = compressData(paymentData.proof);
    }
    
    // Update appointment with payment info (without transaction to avoid issues)
    await updateDoc(appointmentRef, {
      paymentStatus: 'paid',
      paymentMethod: paymentData.method,
      paymentReference: paymentData.reference,
      paymentProof: compressedProof,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Create invoice for this appointment payment
    const invoiceRef = doc(collection(db, 'invoices'));
    const invoice = {
      id: invoiceRef.id,
      patientId: patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointmentId,
      type: 'appointment_fee',
      description: `Appointment fee for consultation with Dr. ${appointment.doctorName || 'Doctor'}`,
      amount: appointment.paymentAmount || 0,
      status: 'paid',
      paymentMethod: paymentData.method,
      paymentReference: paymentData.reference,
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: patientId
    };
    
    await setDoc(invoiceRef, invoice);
    
    // Update department revenue for accountant
    if (appointment.departmentId) {
      const deptRef = doc(db, 'departments', appointment.departmentId);
      await updateDoc(deptRef, {
        revenue: increment(appointment.paymentAmount || 0),
        collectedRevenue: increment(appointment.paymentAmount || 0),
        updatedAt: serverTimestamp()
      });
    }
    
    // Log payment
    await addDoc(collection(db, 'auditLogs'), {
      userId: patientId,
      action: 'APPOINTMENT_PAID',
      appointmentId,
      amount: appointment.paymentAmount,
      timestamp: serverTimestamp()
    });
    
    // Notify receptionist
    try {
      const receptionists = await getUsersByRole('receptionist');
      if (receptionists.success && receptionists.data && receptionists.data.length > 0) {
        const batch = writeBatch(db);
        receptionists.data.forEach(staff => {
          if (staff && staff.id) {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: staff.id,
              type: 'APPOINTMENT_PAID',
              title: 'Appointment Fee Paid',
              message: `Patient has paid appointment fee for Dr. ${appointment.doctorName || 'Doctor'}`,
              appointmentId,
              read: false,
              timestamp: serverTimestamp()
            });
          }
        });
        await batch.commit();
      }
    } catch (notifError) {
      console.error('Error notifying receptionists:', notifError);
      // Don't fail the operation for notification errors
    }
    
    return { success: true, data: { invoiceId: invoiceRef.id, appointmentId } };
  } catch (error) {
    console.error('Error processing appointment payment:', error);
    return { success: false, error: error.message || 'Failed to process payment' };
  }
};

export const getAppointmentPaymentReceipt = async (appointmentId) => {
  try {
    if (!appointmentId) {
      return { success: false, error: 'Appointment ID is required' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }
    
    const appointment = appointmentDoc.data();
    
    // Debug log
    console.log('Receipt data from appointment:', {
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      paymentMethod: appointment.paymentMethod,
      paymentAmount: appointment.paymentAmount
    });
    
    // Get doctor details with fallback
    let doctorName = 'Unknown Doctor';
    let doctorSpecialization = '';
    try {
      const doctorData = await getUserById(appointment.doctorId);
      if (doctorData.success && doctorData.data) {
        doctorName = doctorData.data.fullName || 'Unknown Doctor';
        doctorSpecialization = doctorData.data.specialization || '';
      }
    } catch (doctorError) {
      console.error('Error fetching doctor:', doctorError);
    }
    
    // Get patient details with fallback
    let patientName = 'Unknown Patient';
    let patientPhone = '';
    let patientEmail = '';
    try {
      const patientData = await getUserById(appointment.patientId);
      if (patientData.success && patientData.data) {
        patientName = patientData.data.fullName || 'Unknown Patient';
        patientPhone = patientData.data.phone || '';
        patientEmail = patientData.data.email || '';
      }
    } catch (patientError) {
      console.error('Error fetching patient:', patientError);
    }
    
    // Calculate amount
    const amount = appointment.paymentAmount || appointment.consultationFee || 1000;
    
    const receipt = {
      appointmentId: appointment.id,
      appointmentIdShort: appointment.id?.slice(-8) || 'N/A',
      patientName: patientName,
      patientPhone: patientPhone,
      patientEmail: patientEmail,
      doctorName: doctorName,
      doctorSpecialization: doctorSpecialization,
      amount: amount,
      paymentMethod: appointment.paymentMethod || 'Not specified',
      paymentReference: appointment.paymentReference || 'N/A',
      paidAt: appointment.paidAt?.toDate?.() || appointment.paidAt || null,
      date: appointment.date || 'N/A',
      time: appointment.time || 'N/A',
      challanNo: `APT-${(appointment.id?.slice(-8) || 'N/A')}`,
      status: appointment.paymentStatus || 'pending',
      reason: appointment.reason || 'Consultation',
      department: appointment.department || 'General'
    };
    
    return { success: true, data: receipt };
  } catch (error) {
    console.error('Error getting payment receipt:', error);
    return { success: false, error: error.message };
  }
};

export const verifyAndAssignAppointment = async (appointmentId, receptionistId) => {
  try {
    // Log the received parameters
    console.log('verifyAndAssignAppointment called with:', { appointmentId, receptionistId });
    
    if (!appointmentId) {
      return { success: false, error: 'Missing required fields: appointmentId is required' };
    }
    
    if (!receptionistId) {
      return { success: false, error: 'Missing required fields: receptionistId is required' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }
    
    const appointment = appointmentDoc.data();
    
    // Log the appointment data
    console.log('Appointment data:', {
      id: appointmentId,
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod,
      hasPaymentProof: !!appointment.paymentProof,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId
    });
    
    // Check if payment has been made
    if (appointment.paymentStatus !== 'paid' && appointment.paymentStatus !== 'confirmed') {
      return { success: false, error: `Payment not yet made by patient. Current status: ${appointment.paymentStatus}` };
    }
    
    // Check if appointment is already confirmed
    if (appointment.status === 'confirmed') {
      return { success: false, error: 'Appointment is already confirmed' };
    }
    
    // Determine if this is a cash payment
    const isCashPayment = appointment.paymentMethod === 'cash' || 
                          appointment.paymentMethod === 'Cash' || 
                          appointment.paymentMethod === 'CASH';
    
    // For non-cash payments, verify payment proof exists
    if (!isCashPayment && !appointment.paymentProof) {
      return { success: false, error: 'Payment proof not uploaded by patient. Please ask patient to upload payment receipt.' };
    }
    
    // Check if time slot is still available (optional, but recommended)
    try {
      const availabilityCheck = await checkSlotAvailability(
        appointment.doctorId,
        appointment.date,
        appointment.time,
        appointmentId // Exclude current appointment from check
      );
      
      if (!availabilityCheck.success) {
        // Log but don't fail - time slot check might have index issues
        console.warn('Availability check warning:', availabilityCheck.error);
      } else if (!availabilityCheck.available) {
        return { success: false, error: 'Time slot is no longer available. Please contact the patient to reschedule.' };
      }
    } catch (availabilityError) {
      // Don't block confirmation if availability check fails
      console.warn('Availability check failed (non-blocking):', availabilityError);
    }
    
    // Calculate payment amount - try multiple sources
    const paymentAmount = appointment.paymentAmount || appointment.consultationFee || 1000;
    
    // Update appointment to confirmed - ready for doctor
    await updateDoc(appointmentRef, {
      status: 'confirmed',
      paymentVerified: true,
      verifiedBy: receptionistId,
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Get doctor and patient details
    const [doctorData, patientData] = await Promise.all([
      getUserById(appointment.doctorId),
      getUserById(appointment.patientId)
    ]);
    
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';
    const doctorEmail = doctorData.success ? doctorData.data.email : '';
    const patientName = patientData.success ? patientData.data.fullName : 'Patient';
    const patientEmail = patientData.success ? patientData.data.email : '';
    
    // Safe format currency function
    const safeFormatCurrency = (amount) => {
      try {
        return new Intl.NumberFormat('en-PK', {
          style: 'currency',
          currency: 'PKR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount || 0);
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        return `PKR ${(amount || 0).toLocaleString()}`;
      }
    };
    
    // Create permanent chat between doctor and patient (only if not exists)
    try {
      console.log('Creating chat for doctor:', appointment.doctorId, 'patient:', appointment.patientId);
      const chatResult = await createOrGetChat(appointment.doctorId, appointment.patientId);
      if (chatResult.success && chatResult.isNew) {
        console.log('New permanent chat created between doctor and patient after payment');
      } else if (chatResult.success) {
        console.log('Existing chat found between doctor and patient');
      } else {
        console.warn('Chat creation failed:', chatResult.error);
      }
    } catch (chatError) {
      console.error('Error in chat creation (non-blocking):', chatError);
    }
    
    // Create invoice for this appointment
    let invoiceId = null;
    try {
      const invoiceRef = doc(collection(db, 'invoices'));
      const invoice = {
        id: invoiceRef.id,
        patientId: appointment.patientId,
        patientEmail: patientEmail,
        patientName: patientName,
        doctorId: appointment.doctorId,
        doctorName: doctorName,
        doctorEmail: doctorEmail,
        appointmentId: appointmentId,
        type: 'appointment_fee',
        description: `Consultation fee for Dr. ${doctorName}`,
        amount: paymentAmount,
        status: 'paid',
        paymentMethod: appointment.paymentMethod || (isCashPayment ? 'cash' : 'online'),
        paymentReference: appointment.paymentReference || `PAY-${appointmentId.slice(-8)}`,
        paidAt: appointment.paidAt || serverTimestamp(),
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        createdAt: serverTimestamp(),
        createdBy: receptionistId,
        challanNo: `APT-${appointmentId.slice(-8)}`
      };
      await setDoc(invoiceRef, invoice);
      invoiceId = invoiceRef.id;
      console.log('Invoice created:', invoiceId);
    } catch (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
    }
    
    // Update department revenue for accountant
    if (appointment.departmentId) {
      try {
        const deptRef = doc(db, 'departments', appointment.departmentId);
        await updateDoc(deptRef, {
          revenue: increment(paymentAmount),
          collectedRevenue: increment(paymentAmount),
          updatedAt: serverTimestamp()
        });
      } catch (deptError) {
        console.error('Error updating department revenue:', deptError);
      }
    }
    
    // Notify doctor that appointment is confirmed and paid
    try {
      const notificationMessage = isCashPayment
        ? `Appointment with ${patientName} on ${appointment.date} at ${appointment.time} has been confirmed. Cash payment of ${safeFormatCurrency(paymentAmount)} received at counter. You can now chat with the patient.`
        : `Appointment with ${patientName} on ${appointment.date} at ${appointment.time} has been confirmed. Payment of ${safeFormatCurrency(paymentAmount)} verified. You can now chat with the patient.`;
      
      await addDoc(collection(db, 'notifications'), {
        userId: appointment.doctorId,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Appointment Confirmed (Paid)',
        message: notificationMessage,
        appointmentId,
        patientId: appointment.patientId,
        patientName: patientName,
        read: false,
        timestamp: serverTimestamp(),
        priority: appointment.isEmergency ? 'high' : 'normal'
      });
    } catch (notifError) {
      console.error('Error notifying doctor:', notifError);
    }
    
    // Notify patient that appointment is confirmed
    try {
      const notificationMessage = isCashPayment
        ? `Your appointment with Dr. ${doctorName} on ${appointment.date} at ${appointment.time} has been confirmed. Cash payment received at counter. You can now chat with your doctor.`
        : `Your appointment with Dr. ${doctorName} on ${appointment.date} at ${appointment.time} has been confirmed. Payment verified. You can now chat with your doctor.`;
      
      await addDoc(collection(db, 'notifications'), {
        userId: appointment.patientId,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Appointment Confirmed',
        message: notificationMessage,
        appointmentId,
        doctorId: appointment.doctorId,
        doctorName: doctorName,
        read: false,
        timestamp: serverTimestamp(),
        invoiceId: invoiceId
      });
    } catch (notifError) {
      console.error('Error notifying patient:', notifError);
    }
    
    // Also notify reception staff that payment is confirmed (optional)
    try {
      await addDoc(collection(db, 'auditLogs'), {
        userId: receptionistId,
        action: 'APPOINTMENT_CONFIRMED',
        targetId: appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        paymentAmount: paymentAmount,
        paymentMethod: appointment.paymentMethod || (isCashPayment ? 'cash' : 'online'),
        paymentVerified: true,
        timestamp: serverTimestamp()
      });
    } catch (logError) {
      console.error('Error logging confirmation:', logError);
    }
    
    return { 
      success: true, 
      data: { 
        appointmentId, 
        invoiceId, 
        paymentAmount,
        paymentMethod: appointment.paymentMethod || (isCashPayment ? 'cash' : 'online'),
        isCashPayment
      } 
    };
  } catch (error) {
    console.error('Error verifying and assigning appointment:', error);
    return { success: false, error: error.message || 'Failed to verify payment' };
  }
};

/**
 * Reject appointment payment (receptionist action)
 * @param {string} appointmentId - Appointment ID
 * @param {string} reason - Rejection reason
 * @param {string} rejectedBy - Receptionist ID
 * @returns {Promise<Object>} Success status
 */
export const rejectAppointmentPayment = async (appointmentId, reason, rejectedBy) => {
  try {
    if (!appointmentId || !reason || !rejectedBy) {
      return { success: false, error: 'Missing required fields' };
    }

    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    // Reset payment status back to pending
    await updateDoc(appointmentRef, {
      paymentStatus: 'pending',
      paymentRejectionReason: reason,
      paymentRejectedAt: serverTimestamp(),
      paymentRejectedBy: rejectedBy,
      paymentProof: null, // Clear the proof to allow re-upload
      paymentReference: null,
      updatedAt: serverTimestamp()
    });

    // Get doctor details
    const doctorData = await getUserById(appointment.doctorId);
    const doctorName = doctorData.success ? doctorData.data.fullName : 'Doctor';

    // Notify patient about rejection
    await addDoc(collection(db, 'notifications'), {
      userId: appointment.patientId,
      type: 'PAYMENT_REJECTED',
      title: 'Payment Rejected',
      message: `Your payment for appointment with Dr. ${doctorName} on ${appointment.date} at ${appointment.time} was rejected. Reason: ${reason}. Please make a new payment.`,
      appointmentId,
      read: false,
      timestamp: serverTimestamp(),
      priority: 'high'
    });

    // Log rejection
    await addDoc(collection(db, 'auditLogs'), {
      userId: rejectedBy,
      action: 'PAYMENT_REJECTED',
      targetId: appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      reason,
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting payment:', error);
    return { success: false, error: error.message };
  }
};


// Add this function to check if a patient has already rated a doctor
export const hasPatientRatedDoctor = async (patientId, doctorId) => {
  try {
    if (!patientId || !doctorId) {
      return { success: false, error: 'Missing required fields', hasRated: false };
    }

    const q = query(
      collection(db, 'ratings'),
      where('patientId', '==', patientId),
      where('doctorId', '==', doctorId)
    );

    const snapshot = await getDocs(q);
    
    return { 
      success: true, 
      hasRated: !snapshot.empty,
      rating: snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
    };
  } catch (error) {
    console.error('Error checking existing rating:', error);
    return { success: false, error: error.message, hasRated: false };
  }
};
















// ==================== INVENTORY MANAGEMENT FUNCTIONS ====================

/**
 * Update inventory quantity (release/consume inventory)
 * @param {string} itemId - Inventory item ID
 * @param {number} quantity - Quantity to release (positive) or add (negative)
 * @param {string} reason - Reason for release (e.g., 'usage', 'damage', 'expiry')
 * @param {string} departmentId - Department using the item
 * @param {string} updatedBy - User ID updating inventory
 * @returns {Promise<Object>} Updated inventory
 */
export const releaseInventory = async (itemId, quantity, reason, departmentId, updatedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
      const itemDoc = await transaction.get(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Inventory item not found');
      }
      
      const item = itemDoc.data();
      const newQuantity = item.quantity - quantity;
      
      if (newQuantity < 0) {
        throw new Error('Insufficient inventory quantity');
      }
      
      // Update inventory quantity
      transaction.update(itemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp(),
        lastReleasedAt: serverTimestamp()
      });
      
      // Create consumption record
      const consumptionRef = doc(collection(db, 'inventoryConsumption'));
      const consumptionRecord = {
        id: consumptionRef.id,
        itemId: itemId,
        itemName: item.name,
        quantity: quantity,
        previousQuantity: item.quantity,
        newQuantity: newQuantity,
        reason: reason,
        departmentId: departmentId || null,
        unit: item.unit,
        value: (item.price || 0) * quantity,
        createdBy: updatedBy,
        createdAt: serverTimestamp()
      };
      transaction.set(consumptionRef, consumptionRecord);
      
      // If reason is 'usage', add to department expenses
      if (reason === 'usage' && departmentId) {
        const expenseRef = doc(collection(db, EXPENSE_COLLECTION));
        transaction.set(expenseRef, {
          category: 'supplies',
          amount: (item.price || 0) * quantity,
          description: `Inventory usage: ${item.name} x${quantity} ${item.unit}`,
          departmentId: departmentId,
          type: 'inventory_usage',
          itemId: itemId,
          createdAt: serverTimestamp(),
          createdBy: updatedBy,
          paymentMethod: 'internal'
        });
      }
      
      // Log the transaction
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: updatedBy,
        action: 'INVENTORY_RELEASED',
        itemId: itemId,
        itemName: item.name,
        quantity: quantity,
        reason: reason,
        newQuantity: newQuantity,
        timestamp: serverTimestamp()
      });
      
      return { 
        success: true, 
        data: { 
          itemId, 
          itemName: item.name,
          previousQuantity: item.quantity,
          newQuantity,
          releasedQuantity: quantity,
          reason 
        } 
      };
    });
  } catch (error) {
    console.error('Error releasing inventory:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get inventory consumption history
 * @param {Object} filters - { itemId, departmentId, startDate, endDate }
 * @returns {Promise<Object>} Consumption records
 */
export const getInventoryConsumption = async (filters = {}) => {
  try {
    let constraints = [orderBy('createdAt', 'desc')];
    
    if (filters.itemId) {
      constraints.unshift(where('itemId', '==', filters.itemId));
    }
    if (filters.departmentId) {
      constraints.unshift(where('departmentId', '==', filters.departmentId));
    }
    if (filters.startDate) {
      constraints.unshift(where('createdAt', '>=', filters.startDate));
    }
    if (filters.endDate) {
      constraints.unshift(where('createdAt', '<=', filters.endDate));
    }
    
    const q = query(collection(db, 'inventoryConsumption'), ...constraints);
    const snapshot = await getDocs(q);
    
    const records = [];
    for (const doc of snapshot.docs) {
      records.push({ id: doc.id, ...doc.data() });
    }
    
    // Calculate total consumption value
    const totalValue = records.reduce((sum, r) => sum + (r.value || 0), 0);
    
    return { 
      success: true, 
      data: { 
        records,
        summary: {
          totalRecords: records.length,
          totalValue: totalValue,
          byReason: records.reduce((acc, r) => {
            acc[r.reason] = (acc[r.reason] || 0) + (r.value || 0);
            return acc;
          }, {})
        }
      } 
    };
  } catch (error) {
    console.error('Error getting inventory consumption:', error);
    return { success: false, error: error.message };
  }
};



// ==================== DISCHARGE PATIENT ====================

export const dischargePatient = async (visitId, dischargeNotes, generateInvoice, dischargedBy) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const visitRef = doc(db, 'visits', visitId);
      const visitDoc = await transaction.get(visitRef);
      
      if (!visitDoc.exists()) {
        throw new Error('Visit not found');
      }
      
      const visit = visitDoc.data();
      
      // Update visit
      transaction.update(visitRef, {
        status: 'discharged',
        dischargeDate: serverTimestamp(),
        dischargeNotes,
        dischargedBy,
        locked: true,
        updatedAt: serverTimestamp()
      });
      
      // Release bed if assigned
      if (visit.bedId) {
        const bedRef = doc(db, 'beds', visit.bedId);
        transaction.update(bedRef, {
          status: 'available',
          patientId: null,
          releasedAt: serverTimestamp(),
          releasedBy: dischargedBy
        });
      }
      
      let invoiceId = null;
      
      // Generate final invoice
      if (generateInvoice) {
        const invoiceRef = doc(collection(db, 'invoices'));
        
        // Calculate total from visit
        const consultationFee = visit.consultationFee || 1000;
        const labFees = visit.labTests?.reduce((sum, test) => sum + (test.price || 0), 0) || 0;
        const procedureFees = visit.procedures?.reduce((sum, proc) => sum + (proc.price || 0), 0) || 0;
        const medicationFees = visit.medications?.reduce((sum, med) => sum + (med.price || 0), 0) || 0;
        
        const total = consultationFee + labFees + procedureFees + medicationFees;
        
        const invoice = {
          id: invoiceRef.id,
          patientId: visit.patientId,
          visitId,
          doctorId: visit.doctorId,
          items: [
            { description: 'Consultation Fee', amount: consultationFee, type: 'consultation' },
            ...(visit.labTests || []).map(test => ({ 
              description: `Lab Test: ${test.name}`, 
              amount: test.price || 0, 
              type: 'lab' 
            })),
            ...(visit.procedures || []).map(proc => ({ 
              description: `Procedure: ${proc.name}`, 
              amount: proc.price || 0, 
              type: 'procedure' 
            })),
            ...(visit.medications || []).map(med => ({ 
              description: `Medication: ${med.name}`, 
              amount: med.price || 0, 
              type: 'medication' 
            }))
          ].filter(item => item.amount > 0),
          subtotal: total,
          total,
          status: 'unpaid',
          createdAt: serverTimestamp(),
          createdBy: dischargedBy
        };
        
        transaction.set(invoiceRef, invoice);
        invoiceId = invoiceRef.id;
      }
      
      // Log discharge
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: dischargedBy,
        action: 'PATIENT_DISCHARGED',
        visitId,
        patientId: visit.patientId,
        invoiceId,
        timestamp: serverTimestamp()
      });
      
      return { success: true, data: { invoiceId } };
    });
  } catch (error) {
    console.error('Error discharging patient:', error);
    return { success: false, error: error.message };
  }
};



// Add to database.js

// Get service revenue statistics
export const getServiceRevenueStats = async () => {
  try {
    const appointmentsSnapshot = await getDocs(query(collection(db, 'appointments'), where('paymentStatus', '==', 'paid')));
    const byService = {};
    const serviceCount = {};
    
    for (const doc of appointmentsSnapshot.docs) {
      const apt = doc.data();
      const serviceName = apt.serviceName || 'Consultation';
      const amount = apt.paymentAmount || apt.consultationFee || 1000;
      
      byService[serviceName] = (byService[serviceName] || 0) + amount;
      serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
    }
    
    const popular = Object.entries(serviceCount)
      .map(([name, count]) => ({ name, count, revenue: byService[name] }))
      .sort((a, b) => b.count - a.count);
    
    return { success: true, data: { byService, popular } };
  } catch (error) {
    console.error('Error getting service revenue stats:', error);
    return { success: false, error: error.message };
  }
};

// Save pricing proposal (accountant submits, admin approves)
export const savePricingProposal = async (pricingData, userId) => {
  try {
    const proposalsRef = collection(db, 'pricingProposals');
    const proposal = {
      ...pricingData,
      status: 'pending',
      proposedBy: userId,
      proposedAt: new Date(),
      version: Date.now()
    };
    
    const docRef = await addDoc(proposalsRef, proposal);
    
    // Create audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: 'PRICING_PROPOSAL_SUBMITTED',
      userId: userId,
      timestamp: new Date(),
      details: { proposalId: docRef.id }
    });
    
    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    console.error('Error saving pricing proposal:', error);
    return { success: false, error: error.message };
  }
};

// Approve pricing proposal (admin only)
export const approvePricingProposal = async (proposalId, adminId) => {
  try {
    const proposalRef = doc(db, 'pricingProposals', proposalId);
    const proposalSnap = await getDoc(proposalRef);
    
    if (!proposalSnap.exists()) {
      return { success: false, error: 'Proposal not found' };
    }
    
    const proposal = proposalSnap.data();
    
    // Update the main pricing config
    const pricingRef = doc(db, 'pricingConfig', 'global');
    await setDoc(pricingRef, {
      ...proposal,
      lastApprovedBy: adminId,
      lastApprovedAt: new Date(),
      status: 'active'
    }, { merge: true });
    
    // Mark proposal as approved
    await updateDoc(proposalRef, {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: new Date()
    });
    
    // Create audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: 'PRICING_PROPOSAL_APPROVED',
      userId: adminId,
      timestamp: new Date(),
      details: { proposalId }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error approving pricing proposal:', error);
    return { success: false, error: error.message };
  }
};


// Add to database.js

// Get pending pricing proposals (for admin)
export const getPendingPricingProposals = async () => {
  try {
    const proposalsRef = collection(db, 'pricingProposals');
    const q = query(
      proposalsRef,
      where('status', '==', 'pending'),
      orderBy('proposedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const proposals = [];
    
    for (const doc of snapshot.docs) {
      const proposal = { id: doc.id, ...doc.data() };
      
      // Get proposer details
      if (proposal.proposedBy) {
        const userDoc = await getDoc(doc(db, 'users', proposal.proposedBy));
        if (userDoc.exists()) {
          proposal.proposerName = userDoc.data().fullName || userDoc.data().email;
        }
      }
      
      proposals.push(proposal);
    }
    
    return { success: true, data: proposals };
  } catch (error) {
    console.error('Error getting pricing proposals:', error);
    return { success: false, error: error.message };
  }
};

// Reject pricing proposal (admin only)
export const rejectPricingProposal = async (proposalId, adminId, reason) => {
  try {
    const proposalRef = doc(db, 'pricingProposals', proposalId);
    const proposalSnap = await getDoc(proposalRef);
    
    if (!proposalSnap.exists()) {
      return { success: false, error: 'Proposal not found' };
    }
    
    await updateDoc(proposalRef, {
      status: 'rejected',
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason
    });
    
    // Create audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: 'PRICING_PROPOSAL_REJECTED',
      userId: adminId,
      timestamp: new Date(),
      details: { proposalId, reason }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting pricing proposal:', error);
    return { success: false, error: error.message };
  }
};



// Add to database.js
export const getPaidAppointments = async (startDate, endDate) => {
  try {
    const { db } = await import('./firebase');
    const { collection, query, where, getDocs, orderBy, doc, getDoc } = await import('firebase/firestore');
    
    let appointmentsQuery;
    
    if (startDate && endDate) {
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('paymentStatus', 'in', ['paid', 'confirmed']),
        where('paidAt', '>=', startDate),
        where('paidAt', '<=', endDate),
        orderBy('paidAt', 'desc')
      );
    } else {
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('paymentStatus', 'in', ['paid', 'confirmed']),
        orderBy('paidAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(appointmentsQuery);
    const appointments = [];
    
    for (const aptDoc of snapshot.docs) {
      const apt = { id: aptDoc.id, ...aptDoc.data() };
      
      // Get patient name
      if (apt.patientId) {
        try {
          const patientDoc = await getDoc(doc(db, 'users', apt.patientId));
          if (patientDoc.exists()) {
            apt.patientName = patientDoc.data().fullName || patientDoc.data().email;
          }
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
          apt.patientName = 'Unknown';
        }
      }
      
      // Get doctor name
      if (apt.doctorId) {
        try {
          const doctorDoc = await getDoc(doc(db, 'users', apt.doctorId));
          if (doctorDoc.exists()) {
            apt.doctorName = doctorDoc.data().fullName;
          }
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
          apt.doctorName = 'Unknown';
        }
      }
      
      appointments.push(apt);
    }
    
    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error getting paid appointments:', error);
    return { success: false, error: error.message };
  }
};


// Update user salary (Admin function)
export const updateUserSalary = async (userId, newBaseSalary, reason, adminId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const oldSalary = userSnap.data().baseSalary || 0;
    
    // Update user document
    await updateDoc(userRef, {
      baseSalary: newBaseSalary,
      salaryUpdatedAt: new Date(),
      salaryUpdatedBy: adminId,
      previousSalary: oldSalary
    });
    
    // Create audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: 'SALARY_UPDATED',
      userId: adminId,
      targetUserId: userId,
      oldSalary: oldSalary,
      newSalary: newBaseSalary,
      reason: reason,
      timestamp: new Date()
    });
    
    return { success: true, message: 'Salary updated successfully' };
  } catch (error) {
    console.error('Error updating salary:', error);
    return { success: false, error: error.message };
  }
};

// Get salary payment history with user details
export const getSalaryPaymentHistory = async (filters = {}) => {
  try {
    let q = collection(db, 'salaryRecords');
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(where('userId', '==', filters.userId));
    }
    if (filters.status) {
      conditions.push(where('status', '==', filters.status));
    }
    if (filters.month) {
      conditions.push(where('month', '==', filters.month));
    }
    if (filters.year) {
      conditions.push(where('year', '==', filters.year));
    }
    
    if (conditions.length > 0) {
      q = query(q, ...conditions, orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const records = [];
    
    for (const doc of snapshot.docs) {
      const record = { id: doc.id, ...doc.data() };
      
      // Get user details
      if (record.userId) {
        const userDoc = await getDoc(doc(db, 'users', record.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          record.userName = userData.fullName || userData.email;
          record.userRole = userData.role;
          record.userDepartment = userData.department;
          record.userEmail = userData.email;
        }
      }
      
      records.push(record);
    }
    
    return { success: true, data: records };
  } catch (error) {
    console.error('Error getting salary payment history:', error);
    return { success: false, error: error.message };
  }
};

// In database.js, replace the getPatientFullHistory function with this:

export const getPatientFullHistory = async (userId) => {
  console.log('getPatientFullHistory called for userId:', userId);
  
  if (!userId) {
    console.error('No userId provided to getPatientFullHistory');
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { db } = await import('./firebase');
    const { collection, query, where, getDocs, getDoc, doc, orderBy } = await import('firebase/firestore');
    
    // Initialize empty result structure
    const result = {
      patient: {
        fullName: 'Unknown',
        email: '',
        phone: '',
        cnic: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        address: '',
        createdAt: null,
        accountStatus: 'active',
        allergies: []
      },
      appointments: [],
      visits: [],
      payments: [],
      stats: {
        totalVisits: 0,
        totalAppointments: 0,
        totalPaid: 0,
        totalPending: 0,
        totalPrescriptions: 0,
        totalLabTests: 0
      },
      recentActivity: [],
      vitalsHistory: []
    };
    
    // 1. Get patient basic info
    console.log('Fetching patient data for userId:', userId);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const patientData = userSnap.data();
      result.patient = {
        fullName: patientData.fullName || 'Unknown',
        email: patientData.email || '',
        phone: patientData.phone || '',
        cnic: patientData.cnic || '',
        dateOfBirth: patientData.dateOfBirth || '',
        gender: patientData.gender || '',
        bloodGroup: patientData.bloodGroup || '',
        address: patientData.address || '',
        createdAt: patientData.createdAt || null,
        accountStatus: patientData.accountStatus || 'active',
        allergies: patientData.allergies || []
      };
      console.log('Patient data loaded:', result.patient.fullName);
    } else {
      console.warn('Patient document not found for userId:', userId);
    }
    
    // 2. Get appointments
    try {
      console.log('Fetching appointments for patient:', userId);
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);
      
      for (const aptDoc of appointmentsSnap.docs) {
        const apt = { id: aptDoc.id, ...aptDoc.data() };
        
        // Get doctor name if available
        if (apt.doctorId) {
          try {
            const doctorDoc = await getDoc(doc(db, 'users', apt.doctorId));
            if (doctorDoc.exists()) {
              apt.doctorName = doctorDoc.data().fullName;
              apt.doctorSpecialization = doctorDoc.data().specialization;
            }
          } catch (e) {
            console.error('Error fetching doctor for appointment:', e);
            apt.doctorName = 'Unknown Doctor';
          }
        }
        
        result.appointments.push(apt);
        result.stats.totalAppointments++;
      }
      console.log(`Loaded ${result.appointments.length} appointments`);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
    
    // 3. Get visits (medical records) - THIS IS WHERE CONSULTATION DATA IS STORED
    try {
      console.log('Fetching visits for patient:', userId);
      const visitsQuery = query(
        collection(db, 'visits'),
        where('patientId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const visitsSnap = await getDocs(visitsQuery);
      
      for (const visitDoc of visitsSnap.docs) {
        const visitData = visitDoc.data();
        const visit = { 
          id: visitDoc.id, 
          ...visitData,
          // Ensure these arrays exist
          prescriptions: visitData.prescriptions || [],
          investigations: visitData.investigations || [],
          vitals: visitData.vitals || {},
          notes: visitData.notes || [],
          // Convert timestamps to proper format
          createdAt: visitData.createdAt?.toDate ? visitData.createdAt.toDate() : visitData.createdAt,
          updatedAt: visitData.updatedAt?.toDate ? visitData.updatedAt.toDate() : visitData.updatedAt
        };
        
        // Get doctor name if available
        if (visit.doctorId) {
          try {
            const doctorDoc = await getDoc(doc(db, 'users', visit.doctorId));
            if (doctorDoc.exists()) {
              visit.doctorName = doctorDoc.data().fullName;
            }
          } catch (e) {
            console.error('Error fetching doctor for visit:', e);
            visit.doctorName = 'Unknown Doctor';
          }
        }
        
        result.visits.push(visit);
        result.stats.totalVisits++;
        
        // Count prescriptions
        if (visit.prescriptions && Array.isArray(visit.prescriptions)) {
          result.stats.totalPrescriptions += visit.prescriptions.length;
        }
        
        // Count lab tests
        if (visit.investigations && Array.isArray(visit.investigations)) {
          result.stats.totalLabTests += visit.investigations.length;
        }
        
        // Extract vitals for history
        if (visit.vitals && Object.keys(visit.vitals).length > 0) {
          result.vitalsHistory.push({
            date: visit.createdAt,
            bp: visit.vitals.bp,
            heartRate: visit.vitals.heartRate,
            temperature: visit.vitals.temperature,
            sugar: visit.vitals.sugar,
            bmi: visit.vitals.bmi,
            respiratoryRate: visit.vitals.respiratoryRate,
            oxygenSaturation: visit.vitals.oxygenSaturation,
            weight: visit.vitals.weight,
            height: visit.vitals.height
          });
        }
      }
      console.log(`Loaded ${result.visits.length} visits with ${result.stats.totalPrescriptions} prescriptions and ${result.stats.totalLabTests} lab tests`);
    } catch (err) {
      console.error('Error fetching visits:', err);
    }
    
    // 4. Get payments/invoices
    try {
      console.log('Fetching payments for patient:', userId);
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('patientId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const invoicesSnap = await getDocs(invoicesQuery);
      
      for (const invDoc of invoicesSnap.docs) {
        const invoice = { id: invDoc.id, ...invDoc.data() };
        const amount = invoice.total || invoice.amount || 0;
        
        result.payments.push({
          id: invoice.id,
          amount: amount,
          status: invoice.status || 'pending',
          paymentMethod: invoice.paymentMethod,
          createdAt: invoice.createdAt?.toDate ? invoice.createdAt.toDate() : invoice.createdAt,
          invoiceId: invoice.id,
          serviceName: invoice.serviceName || 'Consultation'
        });
        
        if (invoice.status === 'paid' || invoice.status === 'completed') {
          result.stats.totalPaid += amount;
        } else {
          result.stats.totalPending += amount;
        }
      }
      console.log(`Loaded ${result.payments.length} payments`);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
    
    // 5. Build recent activity from visits (consultations)
    try {
      // Add visits to activity (these contain consultation data)
      result.visits.forEach(visit => {
        result.recentActivity.push({
          type: 'visit',
          description: `Medical consultation${visit.diagnosis ? ` - Diagnosis: ${visit.diagnosis}` : ''} with Dr. ${visit.doctorName || 'Doctor'}`,
          timestamp: visit.createdAt,
          status: visit.status,
          hasPrescriptions: (visit.prescriptions?.length || 0) > 0,
          prescriptionCount: visit.prescriptions?.length || 0
        });
      });
      
      // Add recent appointments to activity
      result.appointments.slice(0, 5).forEach(apt => {
        result.recentActivity.push({
          type: 'appointment',
          description: `Appointment with Dr. ${apt.doctorName || 'Doctor'} on ${apt.date || apt.scheduledDate || ''} at ${apt.time || ''}`,
          timestamp: apt.createdAt?.toDate ? apt.createdAt.toDate() : apt.createdAt,
          status: apt.status
        });
      });
      
      // Add recent payments to activity
      result.payments.slice(0, 5).forEach(payment => {
        result.recentActivity.push({
          type: 'payment',
          description: `Payment of ${formatCurrencyWithFallback(payment.amount)} for ${payment.serviceName || 'services'}`,
          timestamp: payment.createdAt,
          status: payment.status
        });
      });
      
      // Sort by timestamp (newest first)
      result.recentActivity.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
      
      result.recentActivity = result.recentActivity.slice(0, 10);
    } catch (err) {
      console.error('Error building recent activity:', err);
    }
    
    console.log('Patient history loaded successfully:', {
      patientName: result.patient.fullName,
      appointments: result.appointments.length,
      visits: result.visits.length,
      prescriptions: result.stats.totalPrescriptions,
      payments: result.payments.length
    });
    
    return { success: true, data: result };
    
  } catch (error) {
    console.error('Fatal error in getPatientFullHistory:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to load patient history',
      data: {
        patient: { fullName: 'Unknown' },
        appointments: [],
        visits: [],
        payments: [],
        stats: {
          totalVisits: 0,
          totalAppointments: 0,
          totalPaid: 0,
          totalPending: 0,
          totalPrescriptions: 0,
          totalLabTests: 0
        },
        recentActivity: [],
        vitalsHistory: []
      }
    };
  }
};

// Helper function for currency formatting
const formatCurrencyWithFallback = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount);
};

/**
 * Get staff-specific history (attendance, salary, etc.)
 * @param {string} userId - Staff user ID
 * @returns {Promise<Object>} Staff history data
 */
export const getStaffHistory = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Get user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    const user = { id: userDoc.id, ...userDoc.data() };

    // Fetch staff-specific data
    const [attendanceSnap, salarySnap, auditSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(200)
      )).catch(() => ({ docs: [] })),
      
      getDocs(query(
        collection(db, 'salaryRecords'),
        where('userId', '==', userId),
        orderBy('year', 'desc'),
        orderBy('month', 'desc'),
        limit(24)
      )).catch(() => ({ docs: [] })),
      
      getDocs(query(
        collection(db, 'auditLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      )).catch(() => ({ docs: [] }))
    ]);

    // Format attendance
    const attendance = attendanceSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.() || data.date,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      };
    });

    // Format salary records
    const salaryRecords = salarySnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paidAt: data.paidAt?.toDate?.() || data.paidAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      };
    });

    // Format audit logs
    const auditLogs = auditSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      };
    });

    // Calculate stats
    let totalPaidSalary = 0;
    let totalWorkingDays = 0;
    let presentDays = 0;
    
    salaryRecords.forEach(record => {
      if (record.status === 'paid') {
        totalPaidSalary += record.calculatedSalary || 0;
      }
      totalWorkingDays += record.workingDays || 0;
    });
    
    attendance.forEach(record => {
      if (record.status === 'present') {
        presentDays++;
      }
    });
    
    const attendanceRate = attendance.length > 0 
      ? ((presentDays / attendance.length) * 100).toFixed(1)
      : 0;
    
    const averageSalary = salaryRecords.length > 0
      ? salaryRecords.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0) / salaryRecords.length
      : 0;

    const history = {
      user: {
        department: user.department || 'N/A',
        createdAt: user.createdAt,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        baseSalary: user.baseSalary || 0
      },
      attendance: attendance,
      salaryRecords: salaryRecords,
      auditLogs: auditLogs
    };

    const stats = {
      totalPaidSalary,
      totalWorkingDays,
      presentDays,
      attendanceRate,
      totalSalaryRecords: salaryRecords.length,
      averageSalary,
      totalAttendanceRecords: attendance.length,
      pendingSalaryCount: salaryRecords.filter(r => r.status === 'pending').length,
      paidSalaryCount: salaryRecords.filter(r => r.status === 'paid').length
    };

    return { success: true, data: { history, stats } };
    
  } catch (error) {
    console.error('Error fetching staff history:', error);
    return { success: false, error: error.message };
  }
};


// Add this to database.js if not present
export const addPrescriptionToVisit = async (visitId, prescription, doctorId) => {
  try {
    const { db } = await import('./firebase');
    const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
    
    const visitRef = doc(db, 'visits', visitId);
    await updateDoc(visitRef, {
      prescriptions: arrayUnion({
        ...prescription,
        prescribedAt: new Date(),
        prescribedBy: doctorId
      })
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error adding prescription:', error);
    return { success: false, error: error.message };
  }
};

export const addInvestigationToVisit = async (visitId, investigation, doctorId) => {
  try {
    const { db } = await import('./firebase');
    const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
    
    const visitRef = doc(db, 'visits', visitId);
    await updateDoc(visitRef, {
      investigations: arrayUnion({
        ...investigation,
        orderedAt: new Date(),
        orderedBy: doctorId,
        status: 'pending'
      })
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error adding investigation:', error);
    return { success: false, error: error.message };
  }
};


// Add to database.js
export const getVisitByAppointmentId = async (appointmentId) => {
  try {
    const { db } = await import('./firebase');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const visitsQuery = query(
      collection(db, 'visits'),
      where('appointmentId', '==', appointmentId)
    );
    const snapshot = await getDocs(visitsQuery);
    
    if (!snapshot.empty) {
      const visit = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      return { success: true, data: visit };
    }
    
    return { success: false, error: 'No visit found for this appointment' };
  } catch (error) {
    console.error('Error fetching visit by appointment ID:', error);
    return { success: false, error: error.message };
  }
};