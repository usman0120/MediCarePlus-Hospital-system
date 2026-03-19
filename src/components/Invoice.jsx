import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faUpload,
  faCheckCircle,
  faClock,
  faExclamationTriangle,
  faPrint,
  faCreditCard,
  faMoneyBill,
  faUniversity
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../utils/helpers';
import { processPayment } from '../database';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Invoice = ({ invoice, patientView = false, onPaymentConfirm }) => {
  const { currentUser } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentProof, setPaymentProof] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return faCheckCircle;
      case 'pending':
        return faClock;
      case 'overdue':
        return faExclamationTriangle;
      default:
        return faFileInvoice;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof({
        name: file.name,
        type: file.type,
        data: reader.result.split(',')[1]
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePayment = async () => {
    if (!paymentProof && paymentMethod !== 'cash') {
      toast.error('Please upload payment proof');
      return;
    }

    setLoading(true);

    const paymentData = {
      method: paymentMethod,
      transactionId: transactionId || undefined,
      proof: paymentProof?.data,
      paidAt: new Date()
    };

    const result = await processPayment(
      invoice.id,
      paymentData,
      patientView ? null : currentUser.uid
    );

    if (result.success) {
      toast.success(patientView ? 'Payment submitted for verification' : 'Payment confirmed');
      setShowPaymentModal(false);
      if (onPaymentConfirm) {
        onPaymentConfirm();
      }
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  const renderPaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {patientView ? 'Make Payment' : 'Confirm Payment'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 border rounded-lg flex flex-col items-center ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <FontAwesomeIcon icon={faMoneyBill} className="h-6 w-6 mb-1" />
                <span className="text-xs">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 border rounded-lg flex flex-col items-center ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <FontAwesomeIcon icon={faCreditCard} className="h-6 w-6 mb-1" />
                <span className="text-xs">Card</span>
              </button>
              <button
                onClick={() => setPaymentMethod('bank')}
                className={`p-3 border rounded-lg flex flex-col items-center ${
                  paymentMethod === 'bank'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <FontAwesomeIcon icon={faUniversity} className="h-6 w-6 mb-1" />
                <span className="text-xs">Bank</span>
              </button>
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter transaction ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Proof
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 dark:bg-gray-700 text-gray-500 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-500 transition">
                    <FontAwesomeIcon icon={faUpload} className="h-8 w-8 mb-2" />
                    <span className="text-sm">Click to upload receipt/screenshot</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {paymentProof && (
                  <p className="mt-2 text-sm text-green-600">
                    Uploaded: {paymentProof.name}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : patientView ? 'Submit Payment' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Invoice Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={faFileInvoice} className="h-6 w-6 text-gray-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Invoice #{invoice.id?.slice(-8) || 'N/A'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Date: {formatDate(invoice.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm flex items-center ${getStatusColor(invoice.status)}`}>
                <FontAwesomeIcon icon={getStatusIcon(invoice.status)} className="mr-2" />
                {invoice.status?.toUpperCase()}
              </span>
              <button
                onClick={() => window.print()}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FontAwesomeIcon icon={faPrint} />
              </button>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        {!patientView && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Patient</p>
                <p className="font-medium text-gray-900 dark:text-white">{invoice.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Doctor</p>
                <p className="font-medium text-gray-900 dark:text-white">Dr. {invoice.doctorName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Items */}
        <div className="px-6 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Description</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Quantity</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Unit Price</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 text-gray-900 dark:text-white">{item.description}</td>
                  <td className="py-3 text-right text-gray-900 dark:text-white">{item.quantity || 1}</td>
                  <td className="py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(item.unitPrice || item.amount)}
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.calculatedAmount || item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="pt-4 text-right font-semibold text-gray-900 dark:text-white">
                  Subtotal:
                </td>
                <td className="pt-4 text-right font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.subtotal || invoice.total)}
                </td>
              </tr>
              {invoice.tax && (
                <tr>
                  <td colSpan="3" className="text-right text-gray-600 dark:text-gray-400">
                    Tax ({invoice.taxRate}%):
                  </td>
                  <td className="text-right text-gray-900 dark:text-white">
                    {formatCurrency(invoice.tax)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan="3" className="text-right text-lg font-bold text-gray-900 dark:text-white">
                  Total:
                </td>
                <td className="text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Info */}
        {invoice.payment && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Payment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Method</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {invoice.payment.method?.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Transaction ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {invoice.payment.transactionId || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Paid On</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(invoice.payment.paidAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Confirmed By</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {invoice.payment.confirmedBy || 'Pending'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {invoice.status !== 'paid' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            {patientView ? (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                Pay Now
              </button>
            ) : (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Confirm Payment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && renderPaymentModal()}
    </>
  );
};

export default Invoice;