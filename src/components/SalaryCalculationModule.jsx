import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalculator,
  faSpinner,
  faEye,
  faCalendarAlt,
  faUserMd,
  faUserNurse,
  faFlask,
  faUserTie,
  faUsers,
  faInfoCircle,
  faBuilding,
  faMoneyCheck,
  faDownload,
  faSearch,
  faHistory,
  faCashRegister,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faReceipt,
  faShare,
  faArrowLeft,
  faArrowRight,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import {
  getSalaryRecords,
  calculateSalaryWithAttendance,
  calculateAllSalariesForMonth,
  processSalaryPayment,
  generateSalarySlip,
  getUserSalaryHistory,
  getDepartmentSalarySummary,
  getAllStaffForAttendance
} from '../database';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SalaryCalculationModule = ({ onSalaryProcessed }) => {
  const { currentUser } = useAuth();
  
  // State for view management
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, calculations, payments, history
  
  // State for loading
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // State for date selection
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [, setSelectedMonthNum] = useState(new Date().getMonth() + 1);
  
  // State for filters
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for data
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [, setPendingRecords] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [departmentSummary, setDepartmentSummary] = useState({});
  
  // State for modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
const [processingPayment, setProcessingPayment] = useState(false);
  
  // State for stats
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalBaseSalary: 0,
    totalCalculated: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    paidCount: 0,
    averageSalary: 0
  });
  
  // Payment data state
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: ''
  });
  
  const [receiptData, setReceiptData] = useState(null);
  const [receiptPdf, setReceiptPdf] = useState(null);
  
  // Roles for filtering
  const roles = [
    { value: 'all', label: 'All Staff', icon: faUsers },
    { value: 'doctor', label: 'Doctors', icon: faUserMd },
    { value: 'nurse', label: 'Nurses', icon: faUserNurse },
    { value: 'lab', label: 'Lab Staff', icon: faFlask },
    { value: 'receptionist', label: 'Receptionists', icon: faUserTie },
    { value: 'accountant', label: 'Accountants', icon: faCashRegister },
    { value: 'admin', label: 'Admin', icon: faUserTie }
  ];
  
  const fetchAccountBalance = useCallback(async () => {
  try {
    const { db } = await import('../firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const accountRef = doc(db, 'accounts', 'main');
    const accountSnap = await getDoc(accountRef);
    
    if (accountSnap.exists()) {
      setAccountBalance(accountSnap.data().balance || 0);
    }
  } catch (error) {
    console.error('Error fetching account balance:', error);
  }
}, []);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      // Fetch salary records for selected month
      const recordsResult = await getSalaryRecords({ month, year });
      if (recordsResult.success) {
        setSalaryRecords(recordsResult.data);
        const pending = recordsResult.data.filter(r => r.status === 'pending');
        const paid = recordsResult.data.filter(r => r.status === 'paid');
        setPendingRecords(pending);
        
        // Calculate stats
        const totalCalculated = recordsResult.data.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0);
        const totalPaid = paid.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0);
        const totalPending = pending.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalCalculated,
          totalPaid,
          totalPending,
          pendingCount: pending.length,
          paidCount: paid.length
        }));
      }
      
      // Fetch all staff for calculation
      const staffResult = await getAllStaffForAttendance();
      if (staffResult.success) {
        setStaffList(staffResult.data);
        const totalBaseSalary = staffResult.data.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
        setStats(prev => ({
          ...prev,
          totalStaff: staffResult.data.length,
          totalBaseSalary,
          averageSalary: staffResult.data.length > 0 ? totalBaseSalary / staffResult.data.length : 0
        }));
      }
      
      // Fetch department summary
      const deptSummaryResult = await getDepartmentSalarySummary(month, year);
      if (deptSummaryResult.success) {
        setDepartmentSummary(deptSummaryResult.data);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);
  
useEffect(() => {
  fetchAllData();
  fetchAccountBalance();
}, [fetchAllData, fetchAccountBalance]);
  
  // Handle month change
  const handleMonthChange = (date) => {
    setSelectedMonth(date);
    setSelectedMonthNum(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
  };
  
  // Calculate salary for a single staff
  const handleCalculateSalary = async (staff) => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    
    setProcessing(true);
    try {
      const result = await calculateSalaryWithAttendance(staff.userId, month, year, currentUser.uid);
      
      if (result.success) {
        toast.success(`${staff.fullName}: Salary calculated successfully`);
        await fetchAllData();
      } else {
        toast.error(result.error || `Failed to calculate salary for ${staff.fullName}`);
      }
    } catch (error) {
      console.error('Error calculating salary:', error);
      toast.error(`Failed to calculate salary for ${staff.fullName}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Calculate all pending salaries
  const handleCalculateAll = async () => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    
    // Get staff without calculated salary
    const existingUserIds = new Set(salaryRecords.map(r => r.userId));
    const toCalculate = staffList.filter(staff => !existingUserIds.has(staff.userId));
    
    if (toCalculate.length === 0) {
      toast.info('All salaries already calculated for this month');
      return;
    }
    
    if (!window.confirm(`Calculate salaries for ${toCalculate.length} staff members?`)) {
      return;
    }
    
    setProcessing(true);
    try {
      const result = await calculateAllSalariesForMonth(month, year, currentUser.uid);
      
      if (result.success) {
        toast.success(`Calculated ${result.data.successCount} salaries successfully`);
        if (result.data.errorCount > 0) {
          toast.warning(`${result.data.errorCount} staff had errors (no salary configured)`);
        }
        await fetchAllData();
      } else {
        toast.error(result.error || 'Failed to calculate salaries');
      }
    } catch (error) {
      console.error('Error calculating all salaries:', error);
      toast.error('Failed to calculate salaries');
    } finally {
      setProcessing(false);
    }
  };
  
const handleProcessPayment = async () => {
  if (!selectedRecord) return;
  
  // Check if account has sufficient balance
  if (accountBalance < selectedRecord.calculatedSalary) {
    toast.error(
      <div>
        <p className="font-medium">Insufficient Account Balance!</p>
        <p className="text-sm mt-1">
          Required: {formatCurrency(selectedRecord.calculatedSalary)}<br />
          Available: {formatCurrency(accountBalance)}<br />
          Please recharge the account first.
        </p>
      </div>,
      { duration: 5000 }
    );
    return;
  }
  
  setProcessingPayment(true);
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
      
      // Generate receipt
      const receiptResult = await generateSalarySlip(selectedRecord.id);
      if (receiptResult.success) {
        setReceiptPdf(receiptResult.data);
      }
      
      await fetchAllData();
      await fetchAccountBalance(); // Refresh account balance
      
      setShowPaymentModal(false);
      setSelectedRecord(null);
      setPaymentData({
        paymentMethod: 'bank_transfer',
        paymentReference: '',
        notes: ''
      });
      
      if (onSalaryProcessed) {
        onSalaryProcessed(selectedRecord);
      }
    } else {
      toast.error(result.error || 'Failed to process payment');
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    toast.error('Failed to process payment');
  } finally {
    setProcessingPayment(false);
  }
};
  
const handleShowReceipt = async (record) => {
  console.log('Generating receipt for record:', record);
  
  if (!record || !record.id) {
    toast.error('Invalid salary record');
    return;
  }
  
  setLoading(true);
  try {
    const result = await generateSalarySlip(record.id);
    console.log('Generate salary slip result:', result);
    
    if (result.success && result.data) {
      setReceiptData(record);
      setReceiptPdf(result.data);
      setShowReceiptModal(true);
      toast.success('Receipt generated successfully');
    } else {
      console.error('Failed to generate receipt:', result.error);
      toast.error(result.error || 'Failed to generate receipt');
    }
  } catch (error) {
    console.error('Error generating receipt:', error);
    toast.error(error.message || 'Failed to generate receipt');
  } finally {
    setLoading(false);
  }
};
  
  // View salary history for a user
  const handleViewHistory = async (user) => {
    setLoading(true);
    try {
      const result = await getUserSalaryHistory(user.userId);
      if (result.success) {
        setHistoryData(result.data);
        setSelectedHistoryUser(user);
        setShowHistoryModal(true);
      } else {
        toast.error('Failed to load salary history');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load salary history');
    } finally {
      setLoading(false);
    }
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return faClock;
      case 'paid':
        return faCheckCircle;
      default:
        return faExclamationTriangle;
    }
  };
  
  // Filter staff for calculation view
  const filteredStaff = staffList.filter(staff => {
    const matchesRole = filterRole === 'all' || staff.role === filterRole;
    const matchesSearch = searchQuery === '' || 
      staff.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });
  
  // Filter records for payments view
  const filteredRecords = salaryRecords.filter(record => {
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      record.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || record.userDepartment === filterDepartment;
    return matchesStatus && matchesSearch && matchesDepartment;
  });
  
  // Get record for staff
  const getSalaryRecordForStaff = (userId) => {
    return salaryRecords.find(r => r.userId === userId);
  };
  
  // Department list for filter
  const departments = [...new Set(salaryRecords.map(r => r.userDepartment).filter(Boolean))];
  
  // Download PDF
  const downloadPDF = () => {
    if (receiptPdf) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${receiptPdf}`;
      link.download = `salary_slip_${receiptData?.userName}_${receiptData?.month}_${receiptData?.year}.pdf`;
      link.click();
      toast.success('Receipt downloaded');
    }
  };
  
  // Share PDF
  const sharePDF = async () => {
    if (receiptPdf) {
      try {
        const blob = base64ToBlob(receiptPdf, 'application/pdf');
        const file = new File([blob], `salary_slip_${receiptData?.userName}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share) {
          await navigator.share({
            title: 'Salary Slip',
            text: `Salary slip for ${receiptData?.userName} - ${receiptData?.month}/${receiptData?.year}`,
            files: [file]
          });
          toast.success('Shared successfully');
        } else {
          downloadPDF();
        }
      } catch (error) {
        console.error('Error sharing:', error);
        downloadPDF();
      }
    }
  };
  
  const base64ToBlob = (base64, type) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };
  
  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Staff</p>
              <p className="text-3xl font-bold">{stats.totalStaff}</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="text-4xl text-blue-200 opacity-50" />
          </div>
          <p className="text-blue-100 text-xs mt-2">With salary configured</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Monthly Payroll</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.totalBaseSalary)}</p>
            </div>
            <FontAwesomeIcon icon={faMoneyCheck} className="text-4xl text-purple-200 opacity-50" />
          </div>
          <p className="text-purple-100 text-xs mt-2">Total base salary</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Pending Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.totalPending)}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="text-4xl text-yellow-200 opacity-50" />
          </div>
          <p className="text-yellow-100 text-xs mt-2">{stats.pendingCount} staff pending</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Paid Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-green-200 opacity-50" />
          </div>
          <p className="text-green-100 text-xs mt-2">{stats.paidCount} staff paid</p>
        </div>
      </div>
      
      {/* Department Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FontAwesomeIcon icon={faBuilding} className="mr-2 text-blue-500" />
          Department Salary Summary - {selectedMonth.toLocaleString('default', { month: 'long' })} {selectedYear}
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Department</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Staff Count</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Base Salary</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Calculated</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Paid</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Pending</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(departmentSummary).map(([dept, data]) => (
                <tr key={dept} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{dept}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{data.staffCount}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(data.totalBaseSalary)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(data.totalCalculatedSalary)}</td>
                  <td className="px-4 py-3 text-right text-sm text-green-600">{formatCurrency(data.paidAmount)}</td>
                  <td className="px-4 py-3 text-right text-sm text-yellow-600">{formatCurrency(data.pendingAmount)}</td>
                </tr>
              ))}
              {Object.keys(departmentSummary).length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No salary data for this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveView('calculations')}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 transition flex items-center justify-between group"
        >
          <div>
            <FontAwesomeIcon icon={faCalculator} className="text-3xl mb-2" />
            <h3 className="text-lg font-semibold">Calculate Salaries</h3>
            <p className="text-blue-100 text-sm">Calculate monthly salaries from attendance</p>
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="text-2xl opacity-50 group-hover:opacity-100 transition" />
        </button>
        
        <button
          onClick={() => setActiveView('payments')}
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-6 transition flex items-center justify-between group"
        >
          <div>
            <FontAwesomeIcon icon={faMoneyCheck} className="text-3xl mb-2" />
            <h3 className="text-lg font-semibold">Process Payments</h3>
            <p className="text-green-100 text-sm">Process pending salary payments</p>
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="text-2xl opacity-50 group-hover:opacity-100 transition" />
        </button>
        
        <button
          onClick={() => setActiveView('history')}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-6 transition flex items-center justify-between group"
        >
          <div>
            <FontAwesomeIcon icon={faHistory} className="text-3xl mb-2" />
            <h3 className="text-lg font-semibold">Salary History</h3>
            <p className="text-purple-100 text-sm">View previous salaries and receipts</p>
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="text-2xl opacity-50 group-hover:opacity-100 transition" />
        </button>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FontAwesomeIcon icon={faHistory} className="mr-2 text-purple-500" />
          Recent Salary Activity
        </h3>
        
        <div className="space-y-3">
          {salaryRecords.slice(0, 5).map(record => (
            <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${record.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{record.userName}</p>
                  <p className="text-xs text-gray-500">{record.userRole} • {record.userDepartment}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">{formatCurrency(record.calculatedSalary)}</p>
                <p className="text-xs text-gray-500">{record.workingDays} working days</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(record.status)}`}>
                {record.status}
              </span>
            </div>
          ))}
          {salaryRecords.length === 0 && (
            <p className="text-center text-gray-500 py-8">No salary records for this month</p>
          )}
        </div>
      </div>
    </div>
  );
  
  // Calculations View
  const renderCalculations = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => setActiveView('dashboard')}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center text-sm"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
              Back to Dashboard
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Calculations</h2>
            <p className="text-gray-600 dark:text-gray-400">Calculate monthly salaries based on attendance records</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500" />
              <DatePicker
                selected={selectedMonth}
                onChange={handleMonthChange}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                className="bg-transparent focus:outline-none text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleCalculateAll}
              disabled={processing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
            >
              {processing ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              ) : (
                <FontAwesomeIcon icon={faCalculator} className="mr-2" />
              )}
              Calculate All
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredStaff.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Calculated This Month</p>
          <p className="text-2xl font-bold text-green-600">{salaryRecords.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Calculation</p>
          <p className="text-2xl font-bold text-yellow-600">{staffList.length - salaryRecords.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Payroll</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalBaseSalary)}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role.value}
                onClick={() => setFilterRole(role.value)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center ${
                  filterRole === role.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={role.icon} className="mr-1" />
                {role.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Staff Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl" />
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No staff members found
                  </td>
                </tr>
              ) : (
                filteredStaff.map(staff => {
                  const record = getSalaryRecordForStaff(staff.userId);
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                            <span className="text-sm font-bold">{staff.fullName?.charAt(0)}</span>
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 dark:text-white">{staff.fullName}</p>
                            <p className="text-xs text-gray-500">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs capitalize">
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {staff.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        {formatCurrency(staff.baseSalary)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {record ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(record.status)}`}>
                            {record.status}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Not Calculated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {record ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleShowReceipt(record)}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                              title="View Receipt"
                            >
                              <FontAwesomeIcon icon={faReceipt} />
                            </button>
                            <button
                              onClick={() => handleViewHistory(staff)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                              title="View History"
                            >
                              <FontAwesomeIcon icon={faHistory} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCalculateSalary(staff)}
                            disabled={processing}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            Calculate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4">
        <div className="flex">
          <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mr-3 mt-1" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Salary Calculation Formula</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Net Salary = Base Salary - (Absent Days × Per Day Rate) - (Late Days × Half Day Rate × Per Day Rate)<br />
              Per Day Rate = Base Salary ÷ 26 working days | Half Day Rate = 0.5 × Per Day Rate (for late arrivals)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Payments View
  const renderPayments = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => setActiveView('dashboard')}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center text-sm"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
              Back to Dashboard
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Payments</h2>
            <p className="text-gray-600 dark:text-gray-400">Process pending salary payments</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500" />
              <DatePicker
                selected={selectedMonth}
                onChange={handleMonthChange}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                className="bg-transparent focus:outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Pending Payments</p>
              <p className="text-3xl font-bold">{stats.pendingCount}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="text-4xl text-yellow-200 opacity-50" />
          </div>
          <p className="text-yellow-100 text-xs mt-2">Amount: {formatCurrency(stats.totalPending)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Paid This Month</p>
              <p className="text-3xl font-bold">{stats.paidCount}</p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-green-200 opacity-50" />
          </div>
          <p className="text-green-100 text-xs mt-2">Amount: {formatCurrency(stats.totalPaid)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Payroll</p>
              <p className="text-3xl font-bold">{salaryRecords.length}</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="text-4xl text-blue-200 opacity-50" />
          </div>
          <p className="text-blue-100 text-xs mt-2">Staff with calculated salary</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Salary Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Working Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No salary records found for this period
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                          <span className="text-sm font-bold">{record.userName?.charAt(0)}</span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900 dark:text-white">{record.userName}</p>
                          <p className="text-xs text-gray-500">ID: {record.userId?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs capitalize">
                        {record.userRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {record.userDepartment || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">
                      {formatCurrency(record.baseSalary)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium">{record.workingDays || 0}</span>
                      {record.absentDays > 0 && (
                        <span className="text-xs text-red-500 block">
                          ({record.absentDays} absent)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-green-600">{formatCurrency(record.calculatedSalary)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit mx-auto ${getStatusBadge(record.status)}`}>
                        <FontAwesomeIcon icon={getStatusIcon(record.status)} className="mr-1 text-xs" />
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
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
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                            title="Process Payment"
                          >
                            <FontAwesomeIcon icon={faMoneyCheck} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleShowReceipt(record)}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                          title="View Receipt"
                        >
                          <FontAwesomeIcon icon={faReceipt} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  // History View
  const renderHistory = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => setActiveView('dashboard')}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center text-sm"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
              Back to Dashboard
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salary History</h2>
            <p className="text-gray-600 dark:text-gray-400">View previous salaries, receipts, and payment records</p>
          </div>
        </div>
      </div>
      
      {/* Staff Quick Access */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <FontAwesomeIcon icon={faUsers} className="mr-2 text-blue-500" />
          Staff Quick Access
        </h3>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {staffList.slice(0, 20).map(staff => (
            <button
              key={staff.id}
              onClick={() => handleViewHistory(staff)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm hover:bg-blue-100 dark:hover:bg-blue-900 transition"
            >
              {staff.fullName}
            </button>
          ))}
          {staffList.length > 20 && (
            <span className="px-3 py-1 text-gray-500 text-sm">+{staffList.length - 20} more</span>
          )}
        </div>
      </div>
      
      {/* Previous Salaries Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FontAwesomeIcon icon={faHistory} className="mr-2 text-purple-500" />
          Previous Months Summary
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month/Year</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Staff</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Payroll</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Paid</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Pending</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Group records by month/year */}
              {Object.entries(
                salaryRecords.reduce((acc, record) => {
                  const key = `${record.year}-${record.month}`;
                  if (!acc[key]) {
                    acc[key] = {
                      month: record.month,
                      year: record.year,
                      totalStaff: 0,
                      totalPayroll: 0,
                      totalPaid: 0,
                      totalPending: 0
                    };
                  }
                  acc[key].totalStaff++;
                  acc[key].totalPayroll += record.calculatedSalary || 0;
                  if (record.status === 'paid') {
                    acc[key].totalPaid += record.calculatedSalary || 0;
                  } else {
                    acc[key].totalPending += record.calculatedSalary || 0;
                  }
                  return acc;
                }, {})
              ).sort((a, b) => {
                const [yearA, monthA] = a[0].split('-');
                const [yearB, monthB] = b[0].split('-');
                if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
                return parseInt(monthB) - parseInt(monthA);
              }).map(([key, data]) => (
                <tr key={key} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium">
                    {new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' })} {data.year}
                  </td>
                  <td className="px-4 py-3 text-right">{data.totalStaff}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(data.totalPayroll)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(data.totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(data.totalPending)}</td>
                  <td className="px-4 py-3 text-center">
                    {data.totalPending === 0 ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Fully Paid</span>
                    ) : data.totalPaid === 0 ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Partially Paid</span>
                    )}
                  </td>
                </tr>
              ))}
              {salaryRecords.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No salary records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
const renderPaymentModal = () => (
  showPaymentModal && selectedRecord && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Process Salary Payment</h3>
          <button
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedRecord(null);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimesCircle} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Account Balance Warning */}
          <div className={`p-3 rounded-lg ${accountBalance < selectedRecord.calculatedSalary ? 'bg-red-50 dark:bg-red-900/30 border border-red-200' : 'bg-green-50 dark:bg-green-900/30'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Account Balance:</span>
              <span className={`font-bold ${accountBalance < selectedRecord.calculatedSalary ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(accountBalance)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm font-medium">Salary Amount:</span>
              <span className="font-bold text-purple-600">{formatCurrency(selectedRecord.calculatedSalary)}</span>
            </div>
            {accountBalance < selectedRecord.calculatedSalary && (
              <div className="mt-2 text-xs text-red-600 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                Insufficient balance. Please recharge the account first.
              </div>
            )}
          </div>
          
          {/* Employee Info */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.userName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRecord.userRole} • {selectedRecord.userDepartment}
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mt-2">
              <span>Working: {selectedRecord.workingDays} days</span>
              <span>Absent: {selectedRecord.absentDays || 0}</span>
              <span>Late: {selectedRecord.lateDays || 0}</span>
            </div>
          </div>
          
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cash">💵 Cash</option>
              <option value="check">📄 Check</option>
              <option value="online">💳 Online Payment</option>
            </select>
          </div>
          
          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Reference (Optional)
            </label>
            <input
              type="text"
              value={paymentData.paymentReference}
              onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Transaction ID, check number, etc."
            />
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>
          
          {/* Action Buttons */}
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
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessPayment}
              disabled={processingPayment || accountBalance < selectedRecord.calculatedSalary}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {processingPayment ? (
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
  )
);
  
  // Details Modal
  const renderDetailsModal = () => (
    showDetailsModal && selectedRecord && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Salary Details</h3>
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedRecord(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faTimesCircle} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.userName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedRecord.userRole}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedRecord.userDepartment || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Month/Year</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(selectedRecord.year, selectedRecord.month - 1).toLocaleString('default', { month: 'long' })} {selectedRecord.year}
                </p>
              </div>
            </div>
            
            {/* Salary Calculation */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Salary Breakdown</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Base Salary:</span>
                  <span className="font-medium">{formatCurrency(selectedRecord.baseSalary)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Working Days:</span>
                  <span className="font-medium">{selectedRecord.workingDays} / 26 days</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Per Day Rate:</span>
                  <span className="font-medium">{formatCurrency(selectedRecord.perDaySalary)}</span>
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
                      {selectedRecord.paidAt ? formatDate(selectedRecord.paidAt.toDate()) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 dark:text-green-300">Payment Method:</p>
                    <p className="font-medium text-green-800 dark:text-green-200 capitalize">
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
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => handleShowReceipt(selectedRecord)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
              >
                <FontAwesomeIcon icon={faReceipt} className="mr-2" />
                View Receipt
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );
  
  // Receipt Modal
  const renderReceiptModal = () => (
    showReceiptModal && receiptData && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Salary Receipt</h3>
            <button
              onClick={() => {
                setShowReceiptModal(false);
                setReceiptData(null);
                setReceiptPdf(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faTimesCircle} />
            </button>
          </div>
          
          {/* Receipt Preview Placeholder */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <div className="text-center mb-3">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">MediCare Plus Hospital</h4>
              <p className="text-xs text-gray-500">Salary Slip</p>
            </div>
            <div className="border-t border-gray-200 my-3"></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-gray-600">Employee:</p>
              <p className="font-medium">{receiptData.userName}</p>
              <p className="text-gray-600">Role:</p>
              <p className="font-medium capitalize">{receiptData.userRole}</p>
              <p className="text-gray-600">Period:</p>
              <p className="font-medium">{receiptData.month}/{receiptData.year}</p>
              <p className="text-gray-600">Working Days:</p>
              <p className="font-medium">{receiptData.workingDays} days</p>
              <p className="text-gray-600">Base Salary:</p>
              <p className="font-medium">{formatCurrency(receiptData.baseSalary)}</p>
              <p className="text-gray-600">Net Salary:</p>
              <p className="font-bold text-green-600">{formatCurrency(receiptData.calculatedSalary)}</p>
              {receiptData.status === 'paid' && (
                <>
                  <p className="text-gray-600">Payment Date:</p>
                  <p className="font-medium">{receiptData.paidAt ? formatDate(receiptData.paidAt.toDate()) : 'N/A'}</p>
                  <p className="text-gray-600">Payment Method:</p>
                  <p className="font-medium capitalize">{receiptData.paymentMethod || 'Bank Transfer'}</p>
                </>
              )}
            </div>
            <div className="border-t border-gray-200 my-3"></div>
            <div className="text-center text-xs text-gray-400">
              <p>This is a computer generated receipt</p>
              <p>Generated on {new Date().toLocaleString()}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowReceiptModal(false);
                setReceiptData(null);
                setReceiptPdf(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Close
            </button>
            <button
              onClick={sharePDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faShare} className="mr-2" />
              Share
            </button>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    )
  );
  
  // History Modal
  const renderHistoryModal = () => (
    showHistoryModal && selectedHistoryUser && historyData && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Salary History</h3>
              <p className="text-sm text-gray-600">{selectedHistoryUser.fullName} • {selectedHistoryUser.role}</p>
            </div>
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedHistoryUser(null);
                setHistoryData(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faTimesCircle} />
            </button>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Total Earned</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(historyData.totalCalculated)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Total Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(historyData.totalPaid)}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(historyData.totalPending)}</p>
            </div>
          </div>
          
          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Base Salary</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Working Days</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Net Salary</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {historyData.records.map((record, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2 text-sm">{record.month}</td>
                    <td className="px-4 py-2 text-right text-sm">{formatCurrency(record.baseSalary)}</td>
                    <td className="px-4 py-2 text-right text-sm">{record.workingDays}</td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-green-600">
                      {formatCurrency(record.calculatedSalary)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => {
                          // Find the full record and show receipt
                          const fullRecord = salaryRecords.find(r => 
                            r.month === parseInt(record.month.split('/')[0]) && 
                            r.year === parseInt(record.month.split('/')[1])
                          );
                          if (fullRecord) {
                            setShowHistoryModal(false);
                            handleShowReceipt(fullRecord);
                          }
                        }}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <FontAwesomeIcon icon={faReceipt} />
                      </button>
                    </td>
                  </tr>
                ))}
                {historyData.records.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No salary history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  );
  
  return (
    <div className="p-6">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'calculations' && renderCalculations()}
      {activeView === 'payments' && renderPayments()}
      {activeView === 'history' && renderHistory()}
      
      {/* Modals */}
      {renderPaymentModal()}
      {renderDetailsModal()}
      {renderReceiptModal()}
      {renderHistoryModal()}
    </div>
  );
};

export default SalaryCalculationModule;