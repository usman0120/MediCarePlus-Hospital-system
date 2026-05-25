// components/TransactionHistory.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faDownload, faEye, faPrint } from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const TransactionHistory = ({ transactions, onRefresh, onViewDetails, showFinancialImpact = true }) => {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // FIX: Properly calculate total revenue from valid amounts with better debugging
  const totalRevenue = transactions.reduce((sum, t) => {
    // Try multiple possible amount fields
    let amount = t.paymentAmount || t.amount || t.consultationFee || 0;
    
    // If it's a string, parse it
    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }
    
    // Ensure it's a valid number
    const validAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
    
    console.log('Transaction amount:', validAmount); // Debug log
    
    return sum + validAmount;
  }, 0);
  
  const totalTax = transactions.reduce((sum, t) => {
    let amount = t.paymentAmount || t.amount || t.consultationFee || 0;
    if (typeof amount === 'string') amount = parseFloat(amount);
    const validAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
    const taxRate = t.taxRate || 0.17;
    return sum + (validAmount * taxRate);
  }, 0);
  
  const netRevenue = totalRevenue - totalTax;
  
  console.log('TransactionHistory - Total Revenue:', totalRevenue); // Debug lo
  
  const handleExportCSV = () => {
    const headers = ['Date', 'Challan No', 'Patient', 'Doctor', 'Service', 'Amount', 'Tax', 'Net Amount', 'Method', 'Status', 'Transaction ID'];
    const rows = transactions.map(t => [
      t.transactionDate ? formatDate(t.transactionDate) : 'N/A',
      t.challanNo || `APT-${t.id?.slice(-8)}`,
      t.patientName,
      `Dr. ${t.doctorName}`,
      t.serviceName || 'Consultation',
      (t.paymentAmount || t.consultationFee || t.amount || 0).toString(),
      ((t.paymentAmount || t.consultationFee || t.amount || 0) * (t.taxRate || 0.17)).toFixed(2),
      ((t.paymentAmount || t.consultationFee || t.amount || 0) * (1 - (t.taxRate || 0.17))).toFixed(2),
      t.paymentMethod || 'cash',
      t.status || t.paymentStatus || 'pending',
      t.paymentReference || t.transactionId || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export successful');
  };

  const handlePrintReceipt = (transaction) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${transaction.challanNo || `APT-${transaction.id?.slice(-8)}`}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>MediCare Plus Hospital</h2>
              <p>Payment Receipt</p>
            </div>
            <div class="row"><strong>Receipt No:</strong> ${transaction.challanNo || `APT-${transaction.id?.slice(-8)}`}</div>
            <div class="row"><strong>Date:</strong> ${transaction.transactionDate ? formatDate(transaction.transactionDate) : 'N/A'}</div>
            <div class="row"><strong>Patient:</strong> ${transaction.patientName}</div>
            <div class="row"><strong>Doctor:</strong> Dr. ${transaction.doctorName}</div>
            <div class="row"><strong>Service:</strong> ${transaction.serviceName || 'Consultation'}</div>
            <div class="row"><strong>Payment Method:</strong> ${(transaction.paymentMethod || 'cash').toUpperCase()}</div>
            <div class="row"><strong>Amount:</strong> ${formatCurrency(transaction.paymentAmount || transaction.consultationFee || transaction.amount || 0)}</div>
            <div class="row total"><strong>Total Paid:</strong> ${formatCurrency(transaction.paymentAmount || transaction.consultationFee || transaction.amount || 0)}</div>
            <div class="footer">
              <p>Thank you for choosing MediCare Plus</p>
              <p>This is a computer generated receipt</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
    if (onViewDetails) onViewDetails(transaction);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
            <p className="text-sm text-gray-500">Total Revenue: {formatCurrency(totalRevenue)}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center text-sm"
            >
              <FontAwesomeIcon icon={faSync} className="mr-1" />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center text-sm"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-1" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Financial Summary Section */}
        {showFinancialImpact && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Gross Revenue</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tax (17%)</p>
                <p className="text-lg font-bold text-yellow-600">{formatCurrency(totalTax)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Revenue</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(netRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-lg font-bold text-purple-600">{transactions.length}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto p-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Challan No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tx.transactionDate ? formatDate(tx.transactionDate) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                      {tx.challanNo || `APT-${tx.id?.slice(-8)}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tx.patientName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      Dr. {tx.doctorName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tx.serviceName || 'Consultation'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                      {formatCurrency(tx.paymentAmount || tx.consultationFee || tx.amount || 1000)}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">
                      {tx.paymentMethod || 'cash'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tx.status === 'confirmed' || tx.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        tx.paymentStatus === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.status || tx.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(tx)}
                          className="text-blue-600 hover:text-blue-700"
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(tx)}
                          className="text-gray-600 hover:text-gray-700"
                          title="Print Receipt"
                        >
                          <FontAwesomeIcon icon={faPrint} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Transaction Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faSync} className="rotate-45" size="lg" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Transaction ID</p>
                  <p className="text-sm font-mono">{selectedTransaction.id?.slice(-12)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Challan No</p>
                  <p className="text-sm font-mono">{selectedTransaction.challanNo || `APT-${selectedTransaction.id?.slice(-8)}`}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient Name:</span>
                  <span className="font-medium">{selectedTransaction.patientName}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Doctor:</span>
                  <span>Dr. {selectedTransaction.doctorName}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Service:</span>
                  <span>{selectedTransaction.serviceName || 'Consultation'}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Date & Time:</span>
                  <span>{formatDate(selectedTransaction.transactionDate)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedTransaction.paymentAmount || selectedTransaction.consultationFee || selectedTransaction.amount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax ({(selectedTransaction.taxRate || 17)}%):</span>
                  <span>{formatCurrency(((selectedTransaction.paymentAmount || selectedTransaction.consultationFee || selectedTransaction.amount || 0) * (selectedTransaction.taxRate || 0.17)))}</span>
                </div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-300">
                  <span>Total Paid:</span>
                  <span className="text-green-600">{formatCurrency(selectedTransaction.paymentAmount || selectedTransaction.consultationFee || selectedTransaction.amount || 0)}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{selectedTransaction.paymentMethod || 'cash'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference/Transaction ID:</span>
                <span className="font-mono text-sm">{selectedTransaction.paymentReference || selectedTransaction.transactionId || 'N/A'}</span>
              </div>
              
              {selectedTransaction.notes && (
                <div>
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => handlePrintReceipt(selectedTransaction)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center"
                >
                  <FontAwesomeIcon icon={faPrint} className="mr-2" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionHistory;