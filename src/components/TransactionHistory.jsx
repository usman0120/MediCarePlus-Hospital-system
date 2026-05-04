import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faDownload, faEye } from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const TransactionHistory = ({ transactions, onRefresh }) => {
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.paymentAmount || t.consultationFee || 0), 0);
  
  const handleExportCSV = () => {
    const headers = ['Date', 'Challan No', 'Patient', 'Doctor', 'Amount', 'Method', 'Status', 'Transaction ID'];
    const rows = transactions.map(t => [
      t.transactionDate ? formatDate(t.transactionDate) : 'N/A',
      t.challanNo,
      t.patientName,
      `Dr. ${t.doctorName}`,
      (t.paymentAmount || t.consultationFee || 0).toString(),
      t.paymentMethod || 'cash',
      t.status || 'pending',
      t.paymentReference || 'N/A'
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

  return (
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
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
                    {tx.challanNo}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tx.patientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    Dr. {tx.doctorName}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                    {formatCurrency(tx.paymentAmount || tx.consultationFee || 1000)}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">
                    {tx.paymentMethod || 'cash'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tx.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      tx.paymentStatus === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.status || tx.paymentStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">
                    {tx.paymentReference || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="text-blue-600 hover:text-blue-700"
                      title="View Details"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;