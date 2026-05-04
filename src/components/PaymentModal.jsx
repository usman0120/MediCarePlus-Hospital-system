import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faCreditCard,
  faMoneyBillWave,
  faUniversity,
  faUpload,
  faCheckCircle,
  faReceipt,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { processAppointmentPayment } from '../database';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';

const PaymentModal = ({ appointment, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Default to cash
  const [transactionId, setTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Enhanced payment details
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    branchCode: '',
    iban: '',
    transferDate: new Date().toISOString().split('T')[0]
  });
  
  const [cardDetails, setCardDetails] = useState({
    cardHolderName: '',
    lastFourDigits: '',
    cardType: 'visa',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  const methods = [
    { id: 'cash', label: 'Cash (Hospital)', icon: faMoneyBillWave, requiresProof: false },
    { id: 'bank', label: 'Bank Transfer', icon: faUniversity, requiresProof: true },
    { id: 'card', label: 'Credit/Debit Card', icon: faCreditCard, requiresProof: true }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result);
      setUploading(false);
      toast.success('Payment proof uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const validatePaymentDetails = () => {
    if (paymentMethod === 'cash') {
      // Cash payment only requires confirmation from reception
      return { valid: true, missing: [] };
    }
    
    if (paymentMethod === 'bank') {
      const missing = [];
      if (!bankDetails.accountHolderName.trim()) missing.push('Account Holder Name');
      if (!bankDetails.bankName.trim()) missing.push('Bank Name');
      if (!bankDetails.accountNumber.trim()) missing.push('Account Number');
      if (!bankDetails.iban.trim()) missing.push('IBAN');
      if (!transactionId.trim()) missing.push('Transaction ID / Reference');
      if (!paymentProof) missing.push('Payment Proof');
      
      return { 
        valid: missing.length === 0, 
        missing,
        type: 'bank'
      };
    }
    
    if (paymentMethod === 'card') {
      const missing = [];
      if (!cardDetails.cardHolderName.trim()) missing.push('Card Holder Name');
      if (!cardDetails.lastFourDigits.trim() || cardDetails.lastFourDigits.length < 4) missing.push('Last 4 Digits of Card');
      if (!transactionId.trim()) missing.push('Transaction ID');
      if (!paymentProof) missing.push('Payment Proof');
      
      return { 
        valid: missing.length === 0, 
        missing,
        type: 'card'
      };
    }
    
    return { valid: false, missing: ['Invalid payment method'] };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    const validation = validatePaymentDetails();
    if (!validation.valid) {
      toast.error(`Please provide: ${validation.missing.join(', ')}`);
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Processing payment for appointment:', appointment.id);
      
      // Prepare payment data with enhanced details
      const paymentData = {
        method: paymentMethod,
        reference: transactionId || (paymentMethod === 'cash' ? `CASH-${Date.now()}` : `TRX-${Date.now()}`),
        proof: paymentProof,
        paymentDetails: {}
      };
      
      if (paymentMethod === 'bank') {
        paymentData.paymentDetails = {
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          branchCode: bankDetails.branchCode || 'N/A',
          iban: bankDetails.iban,
          transferDate: bankDetails.transferDate
        };
      } else if (paymentMethod === 'card') {
        paymentData.paymentDetails = {
          cardHolderName: cardDetails.cardHolderName,
          lastFourDigits: cardDetails.lastFourDigits,
          cardType: cardDetails.cardType,
          transactionDate: cardDetails.transactionDate
        };
      } else if (paymentMethod === 'cash') {
        paymentData.paymentDetails = {
          paidAtCounter: true,
          receiptIssued: true
        };
      }
      
      const result = await processAppointmentPayment(
        appointment.id,
        paymentData,
        appointment.patientId
      );
      
      console.log('Payment result:', result);
      
      if (result && result.success) {
        const successMessage = paymentMethod === 'cash' 
          ? 'Cash payment recorded. Reception will confirm the appointment.'
          : 'Payment submitted successfully! Waiting for verification.';
        
        toast.success(successMessage);
        
        if (onSuccess) onSuccess(result.data);
        
        // Don't close immediately for cash payment to show success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorMsg = result?.error || 'Payment failed. Please try again.';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Pay Appointment Fee
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Appointment Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Appointment with</p>
          <p className="font-medium text-gray-900 dark:text-white">Dr. {appointment.doctorName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.date} at {appointment.time}</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(appointment.paymentAmount || appointment.consultationFee || 1000)}
          </p>
          <p className="text-xs text-gray-500">Appointment Fee (Non-refundable)</p>
          <p className="text-xs text-gray-500 mt-1">Challan No: APT-{appointment.id?.slice(-8)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id);
                    // Reset method-specific fields when switching
                    if (method.id === 'cash') {
                      setTransactionId('');
                      setPaymentProof(null);
                    }
                  }}
                  className={`p-3 rounded-lg border-2 text-center transition ${
                    paymentMethod === method.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <FontAwesomeIcon icon={method.icon} className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-xs">{method.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID / Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction ID / Reference {paymentMethod !== 'cash' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={paymentMethod === 'cash' ? "Cash receipt number (optional)" : "Enter transaction ID"}
            />
          </div>

          {/* Bank Transfer Details */}
          {paymentMethod === 'bank' && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <FontAwesomeIcon icon={faUniversity} className="mr-2 text-blue-500" />
                Bank Transfer Details
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankDetails.accountHolderName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="As per bank records"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., HBL, UBL, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Account number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    value={bankDetails.branchCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, branchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IBAN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankDetails.iban}
                    onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="PK36XXXX..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transfer Date
                </label>
                <input
                  type="date"
                  value={bankDetails.transferDate}
                  onChange={(e) => setBankDetails({ ...bankDetails, transferDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Card Payment Details */}
          {paymentMethod === 'card' && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <FontAwesomeIcon icon={faCreditCard} className="mr-2 text-blue-500" />
                Card Payment Details
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Card Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardDetails.cardHolderName}
                  onChange={(e) => setCardDetails({ ...cardDetails, cardHolderName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Name on card"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Card Type
                  </label>
                  <select
                    value={cardDetails.cardType}
                    onChange={(e) => setCardDetails({ ...cardDetails, cardType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last 4 Digits <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength="4"
                    pattern="\d{4}"
                    value={cardDetails.lastFourDigits}
                    onChange={(e) => setCardDetails({ ...cardDetails, lastFourDigits: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="1234"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={cardDetails.transactionDate}
                  onChange={(e) => setCardDetails({ ...cardDetails, transactionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Payment Proof Upload (for non-cash payments) */}
          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Payment Proof <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 dark:bg-gray-700 text-gray-500 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-500 transition">
                  <FontAwesomeIcon icon={faUpload} className="h-8 w-8 mb-2" />
                  <span className="text-sm">
                    {paymentProof ? 'File uploaded successfully' : 'Click to upload receipt/screenshot'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF (Max 5MB)</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && (
                <p className="mt-2 text-sm text-blue-600">Uploading...</p>
              )}
              {paymentProof && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                  Receipt uploaded
                </p>
              )}
            </div>
          )}

          {/* Security Note */}
          <div className={`p-3 rounded-lg ${paymentMethod === 'cash' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
            <div className="flex items-start">
              <FontAwesomeIcon icon={faShieldAlt} className={`mr-2 mt-0.5 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-yellow-600'}`} />
              <div>
                <p className={`text-xs ${paymentMethod === 'cash' ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {paymentMethod === 'cash' 
                    ? 'Cash payments will be verified at the reception counter. Please bring the exact amount.'
                    : 'Your payment proof will be verified by our reception team. Please ensure all details are correct.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faReceipt} className="mr-2" />
                  {paymentMethod === 'cash' ? 'Confirm Cash Payment' : 'Submit Payment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;