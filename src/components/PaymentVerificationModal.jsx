import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCheck,
  faTimesCircle,
  faEye,
  faMoneyBillWave,
  faUniversity,
  faCreditCard,
  faReceipt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { verifyAndAssignAppointment, rejectAppointmentPayment, getUserById } from '../database';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const PaymentVerificationModal = ({ appointment, onClose, onVerified, onRejected, receptionistId }) => {
    
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [enrichedAppointment, setEnrichedAppointment] = useState(appointment);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Get appointment ID safely
  const getAppointmentId = () => {
    if (!appointment) return null;
    return appointment.id || appointment.appointmentId || appointment._id;
  };

  // Fetch missing patient and doctor details
  useEffect(() => {
    const enrichAppointmentDetails = async () => {
      if (!appointment) return;
      
      setLoadingDetails(true);
      try {
        const enriched = { ...appointment };
        
        // Fetch patient details if missing
        if (appointment.patientId && (!appointment.patientName || appointment.patientName === 'Unknown Patient')) {
          const patientResult = await getUserById(appointment.patientId);
          if (patientResult.success && patientResult.data) {
            enriched.patientName = patientResult.data.fullName || 'Unknown Patient';
            enriched.patientPhone = patientResult.data.phone || '';
            enriched.patientEmail = patientResult.data.email || '';
          }
        }
        
        // Fetch doctor details if missing
        if (appointment.doctorId && (!appointment.doctorName || appointment.doctorName === 'Unknown Doctor')) {
          const doctorResult = await getUserById(appointment.doctorId);
          if (doctorResult.success && doctorResult.data) {
            enriched.doctorName = doctorResult.data.fullName || 'Unknown Doctor';
            enriched.doctorSpecialization = doctorResult.data.specialization || '';
          }
        }
        
        setEnrichedAppointment(enriched);
      } catch (error) {
        console.error('Error enriching appointment:', error);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    enrichAppointmentDetails();
  }, [appointment]);

  const handleVerifyAndConfirm = async () => {
    const appointmentId = getAppointmentId();
    
    if (!appointmentId) {
      toast.error('Invalid appointment: No appointment ID found');
      console.error('Appointment object missing ID:', appointment);
      return;
    }
    
    if (!receptionistId) {
      toast.error('Receptionist ID not available. Please refresh and try again.');
      console.error('Receptionist ID is missing:', { receptionistId, appointmentId });
      return;
    }

    if (!window.confirm('Verify this payment and confirm the appointment?\n\nThis action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('Verifying payment with:', { 
        appointmentId: appointmentId, 
        receptionistId: receptionistId 
      });
      
      const result = await verifyAndAssignAppointment(appointmentId, receptionistId);
      
      console.log('Verification result:', result);
      
      if (result && result.success) {
        toast.success('Payment verified! Appointment confirmed.');
        if (onVerified) onVerified(appointmentId);
        onClose();
      } else {
        const errorMsg = result?.error || 'Failed to verify payment';
        toast.error(errorMsg);
        console.error('Verification failed:', result);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error(error.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    const appointmentId = getAppointmentId();
    
    if (!appointmentId) {
      toast.error('Invalid appointment: No appointment ID found');
      return;
    }
    
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    if (!receptionistId) {
      toast.error('Receptionist ID not available');
      return;
    }
    
    setLoading(true);
    try {
      const result = await rejectAppointmentPayment(appointmentId, rejectReason, receptionistId);
      
      if (result && result.success) {
        toast.success('Payment rejected. Patient has been notified.');
        if (onRejected) onRejected(appointmentId);
        setShowRejectModal(false);
        onClose();
      } else {
        toast.error(result?.error || 'Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewPaymentProof = () => {
    const proof = enrichedAppointment.paymentProof;
    if (proof) {
      const win = window.open();
      win.document.write(`
        <html>
          <head>
            <title>Payment Proof - APT-${enrichedAppointment.id?.slice(-8) || 'N/A'}</title>
            <style>
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #f0f0f0;
                font-family: Arial, sans-serif;
              }
              .container {
                max-width: 90%;
                max-height: 90vh;
                text-align: center;
              }
              .header {
                margin-bottom: 20px;
              }
              .header h2 {
                margin: 0;
                color: #333;
              }
              .header p {
                margin: 5px 0;
                color: #666;
              }
              img {
                max-width: 100%;
                max-height: 70vh;
                object-fit: contain;
                border: 1px solid #ddd;
                border-radius: 8px;
              }
              .footer {
                margin-top: 20px;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 8px;
              }
              button {
                margin-top: 20px;
                padding: 10px 20px;
                background: #4F46E5;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Payment Proof</h2>
                <p>Appointment ID: ${enrichedAppointment.id ? `APT-${enrichedAppointment.id.slice(-8)}` : 'N/A'}</p>
                <p>Patient: ${enrichedAppointment.patientName || 'N/A'}</p>
                <p>Doctor: Dr. ${enrichedAppointment.doctorName || 'N/A'}</p>
                <p>Amount: ${formatCurrency(enrichedAppointment.paymentAmount || enrichedAppointment.consultationFee || 1000)}</p>
                <p>Payment Method: ${enrichedAppointment.paymentMethod?.toUpperCase() || 'N/A'}</p>
                <p>Transaction ID: ${enrichedAppointment.paymentReference || 'N/A'}</p>
              </div>
              <img src="${proof}" alt="Payment Proof" />
              <div class="footer">
                <p><strong>Verification Instructions:</strong></p>
                <p>• Verify the transaction ID matches the receipt</p>
                <p>• Check the amount matches the appointment fee</p>
                <p>• Ensure the receipt is clear and valid</p>
              </div>
              <button onclick="window.print()">Print</button>
            </div>
          </body>
        </html>
      `);
    } else {
      toast.error('No payment proof available');
    }
  };

  const getPaymentMethodIcon = () => {
    switch (enrichedAppointment.paymentMethod) {
      case 'cash': return faMoneyBillWave;
      case 'bank': return faUniversity;
      case 'card': return faCreditCard;
      default: return faReceipt;
    }
  };

  const getPaymentMethodColor = () => {
    switch (enrichedAppointment.paymentMethod) {
      case 'cash': return 'text-green-600';
      case 'bank': return 'text-blue-600';
      case 'card': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const paymentAmount = enrichedAppointment.paymentAmount || enrichedAppointment.consultationFee || 1000;

  // Rejection Modal
  const RejectModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Reject Payment
          </h3>
          <button
            onClick={() => setShowRejectModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please provide a reason for rejecting this payment. The patient will be notified.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Payment proof unclear, Transaction ID mismatch, Amount incorrect, etc."
              autoFocus
            />
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
            <p className="text-xs text-red-800 dark:text-red-200">
              <span className="font-semibold">Note:</span> The patient will be notified and asked to 
              resubmit payment with correct details. The appointment will remain pending.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectPayment}
              disabled={loading || !rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                  Confirm Rejection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!appointment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <div className="text-center">
            <p className="text-red-600">Invalid appointment data</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl mr-2" />
            <span>Loading appointment details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Verify Payment
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Appointment ID</span>
              <span className="font-mono text-sm font-medium">
                APT-{enrichedAppointment.id?.slice(-8) || getAppointmentId()?.slice(-8) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Patient</span>
              <span className="font-medium">{enrichedAppointment.patientName || 'Loading...'}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Doctor</span>
              <span className="font-medium">Dr. {enrichedAppointment.doctorName || 'Loading...'}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Appointment Date</span>
              <span className="font-medium">{enrichedAppointment.date} at {enrichedAppointment.time}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium">Amount Paid</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(paymentAmount)}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <FontAwesomeIcon icon={faReceipt} className="mr-2 text-blue-500" />
              Payment Details
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={getPaymentMethodIcon()} className={`h-5 w-5 mr-2 ${getPaymentMethodColor()}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Payment Method</span>
                </div>
                <span className="text-sm font-medium capitalize">{enrichedAppointment.paymentMethod || 'Not specified'}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Transaction ID</span>
                <span className="text-sm font-mono">{enrichedAppointment.paymentReference || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Paid At</span>
                <span className="text-sm">{enrichedAppointment.paidAt ? formatDate(enrichedAppointment.paidAt) : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Payment Proof Section */}
          {enrichedAppointment.paymentProof && (
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <FontAwesomeIcon icon={faEye} className="mr-2 text-blue-500" />
                Payment Proof
              </h4>
              
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Uploaded Receipt/Screenshot</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleViewPaymentProof}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      View Full Image
                    </button>
                  </div>
                </div>
                
                {/* Thumbnail Preview */}
                <div 
                  className="mt-2 cursor-pointer rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600"
                  onClick={handleViewPaymentProof}
                >
                  <img 
                    src={enrichedAppointment.paymentProof} 
                    alt="Payment Proof" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Verification Checklist */}
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg mb-4">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              Verification Checklist
            </h4>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
              <li>Verify the transaction ID matches the bank statement/receipt</li>
              <li>Check that the amount matches the appointment fee</li>
              <li>Confirm the payment date is correct</li>
              <li>Ensure the payment proof is clear and valid</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
              Reject Payment
            </button>
            <button
              onClick={handleVerifyAndConfirm}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  Verify & Confirm Appointment
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && <RejectModal />}
    </>
  );
};

export default PaymentVerificationModal;