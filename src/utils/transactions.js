import { db } from '../firebase';
import { runTransaction, doc, collection, increment, serverTimestamp, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Complex transactions that involve multiple collections

export const processCompletePayment = async (invoiceId, paymentData, confirmedBy) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // Get invoice
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await transaction.get(invoiceRef);
      
      if (!invoiceDoc.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceDoc.data();
      
      if (invoice.status === 'paid') {
        throw new Error('Invoice already paid');
      }

      // Update invoice
      transaction.update(invoiceRef, {
        status: 'paid',
        payment: {
          ...paymentData,
          confirmedBy,
          confirmedAt: serverTimestamp(),
          method: paymentData.method
        },
        locked: true,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update department revenue
      if (invoice.departmentId) {
        const deptRef = doc(db, 'departments', invoice.departmentId);
        transaction.update(deptRef, {
          collectedRevenue: increment(invoice.total),
          updatedAt: serverTimestamp()
        });
      }

      // Create receipt
      const receiptRef = doc(collection(db, 'receipts'));
      transaction.set(receiptRef, {
        invoiceId,
        patientId: invoice.patientId,
        amount: invoice.total,
        paymentMethod: paymentData.method,
        transactionId: paymentData.transactionId,
        receiptNumber: `RCP-${Date.now()}`,
        generatedAt: serverTimestamp(),
        generatedBy: confirmedBy
      });

      // Log transaction
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: confirmedBy,
        action: 'PAYMENT_PROCESSED',
        invoiceId,
        amount: invoice.total,
        timestamp: serverTimestamp()
      });

      return { receiptId: receiptRef.id };
    });

    toast.success('Payment processed successfully');
    return { success: true, data: result };
  } catch (error) {
    console.error('Payment processing error:', error);
    toast.error(error.message);
    return { success: false, error: error.message };
  }
};

export const performOperationWithInventory = async (operationId, doctorId) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // Get operation
      const operationRef = doc(db, 'operations', operationId);
      const operationDoc = await transaction.get(operationRef);
      
      if (!operationDoc.exists()) {
        throw new Error('Operation not found');
      }

      const operation = operationDoc.data();

      // Verify checklist
      const checklist = operation.checklist || {};
      const requiredChecks = ['staffConfirmed', 'equipmentConfirmed', 'consentConfirmed', 'riskAcknowledged'];
      const missingChecks = requiredChecks.filter(check => !checklist[check]);

      if (missingChecks.length > 0) {
        throw new Error(`Missing checklist items: ${missingChecks.join(', ')}`);
      }

      // Deduct inventory items
      for (const equipment of operation.requiredEquipment || []) {
        const equipRef = doc(db, 'inventory', equipment.id);
        const equipDoc = await transaction.get(equipRef);
        
        if (!equipDoc.exists()) {
          throw new Error(`Equipment not found: ${equipment.name}`);
        }

        const inventory = equipDoc.data();
        if (inventory.quantity < equipment.quantity) {
          throw new Error(`Insufficient ${equipment.name}. Available: ${inventory.quantity}`);
        }

        transaction.update(equipRef, {
          quantity: increment(-equipment.quantity),
          lastUsed: serverTimestamp(),
          usedIn: arrayUnion(operationId)
        });
      }

      // Update operation status
      transaction.update(operationRef, {
        status: 'in-progress',
        startedAt: serverTimestamp(),
        startedBy: doctorId,
        updatedAt: serverTimestamp()
      });

      // Create operation charges in invoice
      if (operation.patientId) {
        const invoiceRef = doc(collection(db, 'invoices'));
        transaction.set(invoiceRef, {
          patientId: operation.patientId,
          operationId,
          type: 'operation',
          items: [
            {
              description: `Operation - ${operation.operationType}`,
              amount: operation.charges || 0,
              operationDetails: operation
            }
          ],
          total: operation.charges || 0,
          status: 'unpaid',
          departmentId: operation.departmentId,
          createdAt: serverTimestamp(),
          createdBy: doctorId
        });
      }

      return { success: true };
    });

    toast.success('Operation started successfully');
    return result;
  } catch (error) {
    console.error('Operation start error:', error);
    toast.error(error.message);
    return { success: false, error: error.message };
  }
};

export const transferPatientWithBilling = async (patientId, fromBedId, toBedId, transferredBy) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // Release current bed
      if (fromBedId) {
        const fromBedRef = doc(db, 'beds', fromBedId);
        const fromBedDoc = await transaction.get(fromBedRef);
        
        if (fromBedDoc.exists()) {
          transaction.update(fromBedRef, {
            status: 'available',
            patientId: null,
            releasedAt: serverTimestamp(),
            releasedBy: transferredBy
          });
        }
      }

      // Assign new bed
      const toBedRef = doc(db, 'beds', toBedId);
      const toBedDoc = await transaction.get(toBedRef);
      
      if (!toBedDoc.exists()) {
        throw new Error('Target bed not found');
      }

      const toBed = toBedDoc.data();
      
      if (toBed.status !== 'available') {
        throw new Error('Target bed is not available');
      }

      transaction.update(toBedRef, {
        status: 'occupied',
        patientId,
        assignedAt: serverTimestamp(),
        assignedBy: transferredBy
      });

      // Update patient
      const patientRef = doc(db, 'users', patientId);
      transaction.update(patientRef, {
        currentBedId: toBedId,
        updatedAt: serverTimestamp()
      });

      // Create bed transfer charge
      if (toBed.transferCharge) {
        const invoiceRef = doc(collection(db, 'invoices'));
        transaction.set(invoiceRef, {
          patientId,
          type: 'bed_transfer',
          items: [
            {
              description: `Bed transfer to ${toBed.type}`,
              amount: toBed.transferCharge,
              fromBed: fromBedId,
              toBed: toBedId
            }
          ],
          total: toBed.transferCharge,
          status: 'unpaid',
          createdAt: serverTimestamp(),
          createdBy: transferredBy
        });
      }

      // Log transfer
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: transferredBy,
        action: 'PATIENT_TRANSFERRED',
        patientId,
        fromBedId,
        toBedId,
        timestamp: serverTimestamp()
      });

      return { success: true };
    });

    toast.success('Patient transferred successfully');
    return result;
  } catch (error) {
    console.error('Patient transfer error:', error);
    toast.error(error.message);
    return { success: false, error: error.message };
  }
};

export const processBulkSalary = async (salaryRecords, processedBy) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      const results = [];

      for (const record of salaryRecords) {
        const salaryRef = doc(db, 'salaryRecords', record.id);
        const salaryDoc = await transaction.get(salaryRef);
        
        if (!salaryDoc.exists()) {
          throw new Error(`Salary record not found: ${record.id}`);
        }

        const salary = salaryDoc.data();
        
        if (salary.status === 'paid') {
          throw new Error(`Salary already paid for record: ${record.id}`);
        }

        // Update salary record
        transaction.update(salaryRef, {
          status: 'paid',
          paidAt: serverTimestamp(),
          paidBy: processedBy,
          paymentReference: `PAY-${Date.now()}-${record.id}`
        });

        // Create transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'salary_payment',
          userId: salary.userId,
          amount: salary.calculatedSalary,
          month: salary.month,
          year: salary.year,
          salaryRecordId: record.id,
          processedBy,
          processedAt: serverTimestamp(),
          reference: `SAL-${salary.month}-${salary.year}-${salary.userId}`
        });

        results.push({
          salaryId: record.id,
          userId: salary.userId,
          amount: salary.calculatedSalary
        });
      }

      // Log bulk operation
      const logRef = doc(collection(db, 'auditLogs'));
      transaction.set(logRef, {
        userId: processedBy,
        action: 'BULK_SALARY_PROCESSED',
        count: salaryRecords.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
        timestamp: serverTimestamp()
      });

      return { success: true, results };
    });

    toast.success(`Processed ${salaryRecords.length} salary records`);
    return result;
  } catch (error) {
    console.error('Bulk salary error:', error);
    toast.error(error.message);
    return { success: false, error: error.message };
  }
};