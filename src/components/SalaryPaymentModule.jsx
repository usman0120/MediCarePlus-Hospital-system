import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyCheck,
  faDownload,
  faEye,
  faSpinner,
  faSearch,
  faCalendarAlt,
  faUserMd,
  faUserNurse,
  faFlask,
  faUserTie,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import {
  getPendingSalaryRecords,
  processSalaryPayment,
} from '../database';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SalaryPaymentModule = ({ onPaymentProcessed }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalPaid: 0,
    pendingAmount: 0,
    paidAmount: 0,
    staffCount: 0
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: ''
  });

  // Fetch salary records
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingSalaryRecords();
      
      if (result.success) {
        setSalaryRecords(result.data);
        filterRecords(result.data, filterStatus, searchQuery, selectedMonth);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching salary records:', error);
      toast.error('Failed to load salary records');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter records based on status, search, and month
  const filterRecords = (records, status, query, month) => {
    let filtered = records.filter(r => 
      r.month === month.getMonth() + 1 && 
      r.year === month.getFullYear()
    );

    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(r => 
        r.userName?.toLowerCase().includes(lowerQuery) ||
        r.userRole?.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredRecords(filtered);
  };

  // Calculate statistics
  const calculateStats = (records) => {
    const pending = records.filter(r => r.status === 'pending');
    const paid = records.filter(r => r.status === 'paid');

    setStats({
      totalPending: pending.length,
      totalPaid: paid.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.calculatedSalary, 0),
      paidAmount: paid.reduce((sum, r) => sum + r.calculatedSalary, 0),
      staffCount: new Set(records.map(r => r.userId)).size
    });
  };

  // Handle filter changes
  useEffect(() => {
    filterRecords(salaryRecords, filterStatus, searchQuery, selectedMonth);
  }, [filterStatus, searchQuery, selectedMonth, salaryRecords]);

  // Handle payment processing
  const handleProcessPayment = async () => {
    if (!selectedRecord) return;

    setProcessing(true);
    try {
      const result = await processSalaryPayment(
        selectedRecord.id,
        {
          ...paymentData,
          processedAt: new Date()
        },
        currentUser.uid
      );

      if (result.success) {
        toast.success('Salary payment processed successfully');
        
        // Update local state
        const updatedRecords = salaryRecords.map(r =>
          r.id === selectedRecord.id
            ? { ...r, status: 'paid', paidAt: new Date() }
            : r
        );
        
        setSalaryRecords(updatedRecords);
        calculateStats(updatedRecords);
        
        setShowPaymentModal(false);
        setSelectedRecord(null);
        setPaymentData({
          paymentMethod: 'bank_transfer',
          paymentReference: '',
          notes: ''
        });

        if (onPaymentProcessed) {
          onPaymentProcessed(selectedRecord);
        }
      } else {
        toast.error(result.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  // Handle generate salary slip
  const handleGenerateSlip = () => {
    // Use PDFGenerator to create salary slip
    // This would call a function to generate PDF
    toast.success('Salary slip generated');
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Payment Management</h2>
            <p className="text-gray-600 dark:text-gray-400">Process and manage salary payments</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
              <DatePicker
                selected={selectedMonth}
                onChange={setSelectedMonth}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.totalPending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paid This Month</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalPaid}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Amount</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.pendingAmount)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paid Amount</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Staff Members</p>
          <p className="text-2xl font-bold text-purple-600">{stats.staffCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === 'paid'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      {/* Salary Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Month/Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Working Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No salary records found for this period
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon 
                            icon={
                              record.userRole === 'doctor' ? faUserMd :
                              record.userRole === 'nurse' ? faUserNurse :
                              record.userRole === 'lab' ? faFlask :
                              record.userRole === 'receptionist' ? faUserTie :
                              faUsers
                            } 
                            className="h-5 w-5 text-gray-500 dark:text-gray-400" 
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {record.userName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {record.userId?.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs">
                        {record.userRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.month}/{record.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(record.baseSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.workingDays} days
                      {record.absentDays > 0 && (
                        <span className="text-xs text-red-500 block">
                          ({record.absentDays} absent)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(record.calculatedSalary)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 mr-2"
                        title="View Details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      
                      {record.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowPaymentModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 mr-2"
                          title="Process Payment"
                        >
                          <FontAwesomeIcon icon={faMoneyCheck} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleGenerateSlip(record)}
                        className="text-purple-600 hover:text-purple-700"
                        title="Download Salary Slip"
                      >
                        <FontAwesomeIcon icon={faDownload} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Process Salary Payment</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.userName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRecord.month}/{selectedRecord.year} • {selectedRecord.userRole}
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(selectedRecord.calculatedSalary)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentData.paymentReference}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Transaction ID, check number, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedRecord(null);
                    setPaymentData({
                      paymentMethod: 'bank_transfer',
                      paymentReference: '',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPayment}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
                >
                  {processing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faMoneyCheck} className="mr-2" />
                      Process Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Salary Details</h3>
            
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Employee Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.userRole}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Month/Year</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.month}/{selectedRecord.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedRecord.status)}`}>
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              {/* Salary Calculation */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Salary Breakdown</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Base Salary:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedRecord.baseSalary)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Working Days:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedRecord.workingDays} days
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Per Day Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedRecord.perDaySalary)}
                    </span>
                  </div>
                  
                  {selectedRecord.absentDays > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Absent Days ({selectedRecord.absentDays}):</span>
                      <span>-{formatCurrency(selectedRecord.absentDays * selectedRecord.perDaySalary)}</span>
                    </div>
                  )}
                  
                  {selectedRecord.lateDays > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Late Days ({selectedRecord.lateDays}):</span>
                      <span>-{formatCurrency(selectedRecord.lateDays * selectedRecord.perDaySalary * 0.5)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-900 dark:text-white">Net Salary:</span>
                      <span className="text-green-600">{formatCurrency(selectedRecord.calculatedSalary)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {selectedRecord.status === 'paid' && (
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Payment Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-green-700 dark:text-green-300">Paid On:</p>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {formatDate(selectedRecord.paidAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 dark:text-green-300">Payment Method:</p>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {selectedRecord.paymentMethod || 'Bank Transfer'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-green-700 dark:text-green-300">Reference:</p>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {selectedRecord.paymentReference || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRecord(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleGenerateSlip(selectedRecord)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                >
                  <FontAwesomeIcon icon={faDownload} className="mr-2" />
                  Download Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryPaymentModule;