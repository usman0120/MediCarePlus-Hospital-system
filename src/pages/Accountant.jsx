import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faChartLine,
  faBoxes,
  faShoppingCart,
  faMoneyBillWave,
  faClock,
  faPlus,
  faSpinner,
  faSignOutAlt,
  faCheckCircle,
  faTimesCircle,
  faEye,
  faFileExport,
  faSync,
  faBalanceScale,
  faCalculator,
  faTruck,
  faExclamationTriangle,
  faTimes,
  faInfoCircle,
  faMoneyCheck,
  faWallet,
  faDownload,
  faUsers,
  faBuilding,
  faReceipt,
  faHistory,
  faBell,
  faArrowLeft,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { logoutUser } from '../auth';
import {
  // Inventory Management
  getInventoryWithFinancials,
  generateInventoryReport,
  
  // Purchase Orders
  createPurchaseOrder,
  getPurchaseOrdersByStatus,
  updatePurchaseOrderStatus,
  
  // Financial
  getFinancialSummary,
  getMonthlyRevenueTrend,
  getExpensesByCategory,
  addExpense,
  
  // Department
  getDepartments,
  setDepartmentBudget,
  
  // Alerts
  getPendingAlerts,
  
  // Export
  exportCollection,
  
  // Enhanced Salary Functions
  getSalaryRecords,
  getPreviousSalariesSummary,
  getAllStaffForAttendance
} from '../database';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Import the merged Salary Calculation Module
import SalaryCalculationModule from '../components/SalaryCalculationModule';
import AttendanceModule from '../components/AttendanceModule';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

const Accountant = () => {
  const { currentUser, userDetails } = useAuth();
  const navigate = useNavigate();
  
  // State for view management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salaryView, setSalaryView] = useState('calculation'); // calculation, history
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSalaryHistoryModal, setShowSalaryHistoryModal] = useState(false);
  const [selectedSalaryHistory, setSelectedSalaryHistory] = useState(null);

  // Data states
  const [inventoryData, setInventoryData] = useState({
    items: [],
    summary: {
      totalItems: 0,
      totalValue: 0,
      totalCost: 0,
      lowStockItems: 0,
      monthlyUsage: {}
    },
    recentPurchases: []
  });
  
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [, setFinancialSummary] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [salaryHistorySummary, setSalaryHistorySummary] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  // Stats state with proper initialization
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    profitMargin: 0,
    pendingPayments: 0,
    lowStockCount: 0,
    monthlyBudget: 0,
    budgetUsed: 0,
    totalSalaryExpense: 0,
    paidSalaryCount: 0,
    pendingSalaryCount: 0,
    totalPaidSalary: 0,
    thisMonthSalary: 0
  });

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    category: 'operations',
    amount: '',
    description: '',
    departmentId: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    reference: ''
  });

  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '',
    quantity: '',
    price: '',
    supplier: '',
    supplierContact: '',
    expectedDelivery: '',
    notes: '',
    paymentTerms: 'due_on_delivery'
  });

  const [budgetForm, setBudgetForm] = useState({
    departmentId: '',
    monthly: '',
    year: new Date().getFullYear(),
    notes: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ==================== DATA FETCHING FUNCTIONS ====================

  const fetchInventoryData = useCallback(async () => {
    try {
      const result = await getInventoryWithFinancials();
      if (result.success && result.data) {
        setInventoryData(result.data);
        setStats(prev => ({
          ...prev,
          lowStockCount: result.data.summary?.lowStockItems || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory data');
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const status = selectedStatus !== 'all' ? selectedStatus : null;
      const result = await getPurchaseOrdersByStatus(status);
      if (result.success && result.data) {
        setPurchaseOrders(result.data);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to load purchase orders');
    }
  }, [selectedStatus]);

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await getDepartments();
      if (result.success && result.data) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  const fetchFinancialData = useCallback(async () => {
    try {
      const result = await getFinancialSummary(dateRange.start, dateRange.end);
      if (result.success && result.data) {
        setFinancialSummary(result.data);
        const revenue = result.data.revenue?.total || 0;
        const expenses = (result.data.expenses?.total || 0) + (result.data.purchases?.total || 0);
        const profit = result.data.profit || 0;
        
        setStats(prev => ({
          ...prev,
          totalRevenue: revenue,
          totalExpenses: expenses,
          totalProfit: profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
        }));
      }

      const trendResult = await getMonthlyRevenueTrend(new Date().getFullYear());
      if (trendResult.success && trendResult.data) {
        setMonthlyTrend(trendResult.data);
      }

      const expensesResult = await getExpensesByCategory(dateRange.start, dateRange.end);
      if (expensesResult.success && expensesResult.data) {
        setExpenses(expensesResult.data.expenses || []);
        setExpensesByCategory(expensesResult.data.byCategory || {});
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }, [dateRange]);

  const fetchSalaryData = useCallback(async () => {
    try {
      // Fetch all staff for count
      const staffResult = await getAllStaffForAttendance();
      if (staffResult.success) {
        setStaffList(staffResult.data);
      }
      
      // Fetch salary records for current month
      const recordsResult = await getSalaryRecords({
        month: selectedPeriod.month,
        year: selectedPeriod.year
      });
      
      if (recordsResult.success && recordsResult.data) {
        const pending = recordsResult.data.filter(r => r.status === 'pending');
        const paid = recordsResult.data.filter(r => r.status === 'paid');
        const totalPendingAmount = pending.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0);
        const totalPaidAmount = paid.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0);
        
        setStats(prev => ({
          ...prev,
          pendingSalaryCount: pending.length,
          paidSalaryCount: paid.length,
          totalSalaryExpense: totalPendingAmount + totalPaidAmount,
          totalPaidSalary: totalPaidAmount,
          thisMonthSalary: recordsResult.data.reduce((sum, r) => sum + (r.calculatedSalary || 0), 0)
        }));
      }
      
      // Fetch previous salaries summary
      const historyResult = await getPreviousSalariesSummary();
      if (historyResult.success && historyResult.data) {
        const groupedByMonth = historyResult.data.reduce((acc, record) => {
          const key = `${record.year}-${record.month}`;
          if (!acc[key]) {
            acc[key] = {
              month: record.month,
              year: record.year,
              total: 0,
              paid: 0,
              pending: 0,
              count: 0
            };
          }
          acc[key].total += record.calculatedSalary || 0;
          acc[key].count++;
          if (record.status === 'paid') {
            acc[key].paid += record.calculatedSalary || 0;
          } else {
            acc[key].pending += record.calculatedSalary || 0;
          }
          return acc;
        }, {});
        setSalaryHistorySummary(Object.values(groupedByMonth).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        }));
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
    }
  }, [selectedPeriod]);

  const fetchAlerts = useCallback(async () => {
    try {
      const result = await getPendingAlerts();
      if (result.success && result.data) {
        setAlerts(result.data.filter(alert => 
          alert.type === 'LOW_STOCK' || 
          alert.type === 'BUDGET_WARNING' ||
          alert.type === 'PAYMENT_DUE'
        ));
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const promises = [];
      
      if (activeTab === 'dashboard') {
        promises.push(fetchFinancialData(), fetchInventoryData(), fetchSalaryData(), fetchAlerts());
      } else if (activeTab === 'inventory') {
        promises.push(fetchInventoryData(), fetchPurchaseOrders());
      } else if (activeTab === 'purchases') {
        promises.push(fetchPurchaseOrders());
      } else if (activeTab === 'expenses') {
        promises.push(fetchFinancialData(), fetchDepartments());
      } else if (activeTab === 'budget') {
        promises.push(fetchDepartments(), fetchFinancialData());
      } else if (activeTab === 'salaries') {
        promises.push(fetchSalaryData(), fetchDepartments());
      }
      
      await Promise.all(promises);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh some data');
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchFinancialData, fetchInventoryData, fetchSalaryData, fetchAlerts, fetchPurchaseOrders, fetchDepartments]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDepartments(),
          fetchInventoryData()
        ]);
        
        if (activeTab === 'dashboard') {
          await Promise.all([
            fetchFinancialData(),
            fetchSalaryData(),
            fetchAlerts()
          ]);
        } else if (activeTab === 'inventory') {
          await fetchPurchaseOrders();
        } else if (activeTab === 'purchases') {
          await fetchPurchaseOrders();
        } else if (activeTab === 'expenses') {
          await fetchFinancialData();
        } else if (activeTab === 'budget') {
          await fetchFinancialData();
        } else if (activeTab === 'salaries') {
          await fetchSalaryData();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [activeTab, fetchFinancialData, fetchInventoryData, fetchSalaryData, fetchAlerts, fetchPurchaseOrders, fetchDepartments]);

  // ==================== VALIDATION FUNCTIONS ====================

  const validateExpenseForm = () => {
    const errors = {};

    if (!expenseForm.amount || expenseForm.amount <= 0) {
      errors.amount = 'Please enter a valid amount';
    }

    if (!expenseForm.description?.trim()) {
      errors.description = 'Description is required';
    }

    if (!expenseForm.category) {
      errors.category = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePurchaseForm = () => {
    const errors = {};

    if (!purchaseForm.itemId) {
      errors.itemId = 'Please select an item';
    }

    if (!purchaseForm.quantity || purchaseForm.quantity <= 0) {
      errors.quantity = 'Please enter a valid quantity';
    }

    if (!purchaseForm.price || purchaseForm.price <= 0) {
      errors.price = 'Please enter a valid price';
    }

    if (!purchaseForm.supplier?.trim()) {
      errors.supplier = 'Supplier name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBudgetForm = () => {
    const errors = {};

    if (!budgetForm.departmentId) {
      errors.departmentId = 'Please select a department';
    }

    if (!budgetForm.monthly || budgetForm.monthly <= 0) {
      errors.monthly = 'Please enter a valid budget amount';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== HANDLER FUNCTIONS ====================

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (!validateExpenseForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setFormSubmitting(true);
    
    try {
      const result = await addExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount)
      }, currentUser.uid);
      
      if (result.success) {
        toast.success('Expense added successfully');
        setShowExpenseModal(false);
        resetExpenseForm();
        await fetchFinancialData();
      } else {
        toast.error(result.error || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    
    if (!validatePurchaseForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setFormSubmitting(true);
    
    try {
      const result = await createPurchaseOrder({
        ...purchaseForm,
        quantity: Number(purchaseForm.quantity),
        price: Number(purchaseForm.price)
      }, currentUser.uid);
      
      if (result.success) {
        toast.success('Purchase order created successfully');
        setShowPurchaseModal(false);
        resetPurchaseForm();
        await fetchPurchaseOrders();
      } else {
        toast.error(result.error || 'Failed to create purchase order');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleApprovePurchaseOrder = async (poId) => {
    setFormSubmitting(true);
    
    try {
      const result = await updatePurchaseOrderStatus(poId, 'approved', currentUser.uid);
      
      if (result.success) {
        toast.success('Purchase order approved');
        await fetchPurchaseOrders();
      } else {
        toast.error(result.error || 'Failed to approve purchase order');
      }
    } catch (error) {
      console.error('Error approving purchase order:', error);
      toast.error('Failed to approve purchase order');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelivery = async (poId) => {
    setFormSubmitting(true);
    
    try {
      const result = await updatePurchaseOrderStatus(poId, 'delivered', currentUser.uid);
      
      if (result.success) {
        toast.success('Delivery confirmed - Inventory updated');
        await Promise.all([fetchPurchaseOrders(), fetchInventoryData()]);
      } else {
        toast.error(result.error || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    
    if (!validateBudgetForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setFormSubmitting(true);
    
    try {
      const result = await setDepartmentBudget(
        budgetForm.departmentId,
        {
          monthly: Number(budgetForm.monthly),
          year: budgetForm.year,
          notes: budgetForm.notes
        },
        currentUser.uid
      );
      
      if (result.success) {
        toast.success('Budget set successfully');
        setShowBudgetModal(false);
        resetBudgetForm();
        await fetchDepartments();
      } else {
        toast.error(result.error || 'Failed to set budget');
      }
    } catch (error) {
      console.error('Error setting budget:', error);
      toast.error('Failed to set budget');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    
    try {
      const result = await generateInventoryReport(dateRange.start, dateRange.end);
      
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('Report generated successfully');
        setShowReportModal(false);
      } else {
        toast.error(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (type) => {
    setLoading(true);
    try {
      const result = await exportCollection(type);
      
      if (result.success && result.data) {
        const jsonString = atob(result.data);
        const data = JSON.parse(jsonString);
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('Export completed successfully');
      } else {
        toast.error(result.error || 'Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryProcessed = () => {
    toast.success('Salary processed successfully');
    fetchSalaryData();
    fetchFinancialData();
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category: 'operations',
      amount: '',
      description: '',
      departmentId: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      reference: ''
    });
    setFormErrors({});
  };

  const resetPurchaseForm = () => {
    setPurchaseForm({
      itemId: '',
      quantity: '',
      price: '',
      supplier: '',
      supplierContact: '',
      expectedDelivery: '',
      notes: '',
      paymentTerms: 'due_on_delivery'
    });
    setFormErrors({});
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      departmentId: '',
      monthly: '',
      year: new Date().getFullYear(),
      notes: ''
    });
    setFormErrors({});
  };

  const handleLogout = async () => {
    try {
      await logoutUser(currentUser.uid);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: faChartLine },
    { id: 'salaries', label: 'Salary Management', icon: faMoneyCheck },
    { id: 'inventory', label: 'Inventory', icon: faBoxes },
    { id: 'purchases', label: 'Purchase Orders', icon: faShoppingCart },
    { id: 'expenses', label: 'Expenses', icon: faMoneyBillWave },
    { id: 'budget', label: 'Budget', icon: faWallet },
    { id: 'reports', label: 'Reports', icon: faFileExport }
  ], []);

  const renderDashboard = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 rounded-lg p-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                {alerts.length} Financial Alert{alerts.length > 1 ? 's' : ''}
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside mt-1">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <li key={idx}>{alert.message}</li>
                ))}
                {alerts.length > 3 && (
                  <li>And {alerts.length - 3} more alerts...</li>
                )}
              </ul>
            </div>
            <button
              onClick={() => setAlerts([])}
              className="text-yellow-600 hover:text-yellow-700"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      )}

      {/* Date Range Picker & Refresh */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
            <div className="flex gap-2">
              <DatePicker
                selected={dateRange.start}
                onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholderText="Start Date"
              />
              <span className="text-gray-500">to</span>
              <DatePicker
                selected={dateRange.end}
                onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholderText="End Date"
              />
            </div>
            <button
              onClick={fetchFinancialData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Apply
            </button>
          </div>
          <button
            onClick={refreshAllData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center text-sm"
          >
            <FontAwesomeIcon icon={faSync} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white transform hover:scale-105 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-5 text-white transform hover:scale-105 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExpenses)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FontAwesomeIcon icon={faMoneyBillWave} className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white transform hover:scale-105 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${stats.totalProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                {formatCurrency(Math.abs(stats.totalProfit))}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FontAwesomeIcon icon={faBalanceScale} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-blue-100 text-sm">
            Margin: {stats.profitMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-5 text-white transform hover:scale-105 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm font-medium">This Month Salary</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.thisMonthSalary)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FontAwesomeIcon icon={faMoneyCheck} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-purple-100 text-sm">
            {stats.pendingSalaryCount} pending / {stats.paidSalaryCount} paid
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="mr-2 text-blue-500" />
            Monthly Revenue Trend
          </h3>
          <div className="h-64">
            {monthlyTrend.length > 0 ? (
              <Line
                data={{
                  labels: monthlyTrend.map(m => m.monthName?.slice(0, 3) || ''),
                  datasets: [{
                    label: 'Revenue',
                    data: monthlyTrend.map(m => m.revenue || 0),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => formatCurrency(ctx.raw)
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2 text-red-500" />
            Expenses by Category
          </h3>
          <div className="h-64">
            {Object.keys(expensesByCategory).length > 0 ? (
              <Pie
                data={{
                  labels: Object.keys(expensesByCategory).map(k => k.replace('_', ' ').toUpperCase()),
                  datasets: [{
                    data: Object.values(expensesByCategory),
                    backgroundColor: [
                      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                      '#CDDC39', '#9C27B0', '#FF9800', '#795548', '#607D8B', '#E91E63'
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
                        boxWidth: 12,
                        font: { size: 11 }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const label = ctx.label || '';
                          const value = ctx.raw || 0;
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No expense data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Expenses</h3>
          </div>
          <div className="p-5">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {expense.category?.replace('_', ' ')} • {formatDate(expense.createdAt)}
                  </p>
                </div>
                <p className="font-medium text-red-600">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">No expenses recorded</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Statistics</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
              <p className="text-blue-600 dark:text-blue-400 text-sm">Total Staff</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{staffList.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
              <p className="text-green-600 dark:text-green-400 text-sm">Departments</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{departments.length}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 text-center">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.lowStockCount}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center">
              <p className="text-purple-600 dark:text-purple-400 text-sm">Pending Payments</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.pendingSalaryCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {inventoryData.summary.lowStockItems > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/30 rounded-t-xl">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              Low Stock Alert ({inventoryData.summary.lowStockItems} items)
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryData.items
                .filter(item => item.quantity <= item.threshold)
                .slice(0, 6)
                .map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Current: {item.quantity} {item.unit} • Threshold: {item.threshold}
                    </p>
                    <button
                      onClick={() => {
                        setPurchaseForm({
                          ...purchaseForm,
                          itemId: item.id
                        });
                        setShowPurchaseModal(true);
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Create Purchase Order →
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSalaryManagement = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Salary Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{staffList.length}</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">This Month Salary</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.thisMonthSalary)}</p>
            </div>
            <FontAwesomeIcon icon={faMoneyCheck} className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalSalaryExpense - stats.totalPaidSalary)}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-xs text-gray-500 mt-1">{stats.pendingSalaryCount} staff pending</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalPaidSalary)}</p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="h-8 w-8 text-purple-400" />
          </div>
          <p className="text-xs text-gray-500 mt-1">{stats.paidSalaryCount} staff paid</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Salary Period:</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => {
                  const newMonth = selectedPeriod.month === 1 ? 12 : selectedPeriod.month - 1;
                  const newYear = selectedPeriod.month === 1 ? selectedPeriod.year - 1 : selectedPeriod.year;
                  setSelectedPeriod({ month: newMonth, year: newYear });
                  fetchSalaryData();
                }}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[150px] text-center">
                {new Date(selectedPeriod.year, selectedPeriod.month - 1).toLocaleString('default', { month: 'long' })} {selectedPeriod.year}
              </span>
              <button
                onClick={() => {
                  const newMonth = selectedPeriod.month === 12 ? 1 : selectedPeriod.month + 1;
                  const newYear = selectedPeriod.month === 12 ? selectedPeriod.year + 1 : selectedPeriod.year;
                  setSelectedPeriod({ month: newMonth, year: newYear });
                  fetchSalaryData();
                }}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod({
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                  });
                  fetchSalaryData();
                }}
                className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition"
              >
                Current Month
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setSalaryView('calculation')}
              className={`px-4 py-2 rounded-lg transition flex items-center ${
                salaryView === 'calculation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faCalculator} className="mr-2" />
              Calculate Salaries
            </button>
            <button
              onClick={() => setSalaryView('history')}
              className={`px-4 py-2 rounded-lg transition flex items-center ${
                salaryView === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faHistory} className="mr-2" />
              History & Receipts
            </button>
          </div>
        </div>
      </div>

      {/* Render appropriate view */}
      {salaryView === 'calculation' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <SalaryCalculationModule onSalaryProcessed={handleSalaryProcessed} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Previous Salaries Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FontAwesomeIcon icon={faHistory} className="mr-2 text-purple-500" />
              Previous Months Salary Summary
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Staff Count</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Salary</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Pending</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistorySummary.map((summary, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium">
                        {new Date(summary.year, summary.month - 1).toLocaleString('default', { month: 'long' })} {summary.year}
                      </td>
                      <td className="px-4 py-3 text-right">{summary.count}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(summary.total)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(summary.paid)}</td>
                      <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(summary.pending)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedSalaryHistory(summary);
                            setShowSalaryHistoryModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 transition"
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {salaryHistorySummary.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No salary history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => handleExportData('salary')}
                className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 transition group text-center"
              >
                <FontAwesomeIcon icon={faFileExport} className="h-8 w-8 text-gray-400 group-hover:text-green-500 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Salary Report</p>
              </button>
              
              <button
                onClick={() => {
                  setSelectedPeriod({
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                  });
                  setSalaryView('calculation');
                }}
                className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition group text-center"
              >
                <FontAwesomeIcon icon={faCalculator} className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Calculate Monthly Salaries</p>
              </button>
              
              <button
                onClick={() => handleExportData('attendance')}
                className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 transition group text-center"
              >
                <FontAwesomeIcon icon={faDownload} className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Attendance Report</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
          >
            <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
            New Purchase Order
          </button>
          <button
            onClick={refreshAllData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center"
          >
            <FontAwesomeIcon icon={faSync} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryData.summary.totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(inventoryData.summary.totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(inventoryData.summary.totalCost)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{inventoryData.summary.lowStockItems}</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {inventoryData.items.map((item) => {
                const isLowStock = item.quantity <= item.threshold;
                const value = (item.price || 0) * (item.quantity || 0);

                return (
                  <tr key={item.id} className={isLowStock ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                      {item.supplier && (
                        <div className="text-xs text-gray-500">Supplier: {item.supplier}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.category || 'General'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatCurrency(value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        isLowStock 
                          ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {isLowStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setPurchaseForm({
                            ...purchaseForm,
                            itemId: item.id
                          });
                          setShowPurchaseModal(true);
                        }}
                        className="text-green-600 hover:text-green-700 mr-2"
                        title="Create Purchase Order"
                      >
                        <FontAwesomeIcon icon={faShoppingCart} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {inventoryData.items.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No inventory items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPurchaseOrders = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            New Purchase Order
          </button>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pendingApproval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={refreshAllData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center"
          >
            <FontAwesomeIcon icon={faSync} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    #{po.id?.slice(-6) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {po.itemName || po.itemId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{po.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{po.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(po.price)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatCurrency(po.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      po.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      po.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      po.status === 'pendingApproval' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {po.status?.replace('pendingApproval', 'Pending') || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(po.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {po.status === 'pendingApproval' && (
                      <>
                        <button
                          onClick={() => handleApprovePurchaseOrder(po.id)}
                          disabled={formSubmitting}
                          className="text-green-600 hover:text-green-700 mr-2"
                          title="Approve"
                        >
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-700"
                          title="Reject"
                        >
                          <FontAwesomeIcon icon={faTimesCircle} />
                        </button>
                      </>
                    )}
                    {po.status === 'approved' && (
                      <button
                        onClick={() => handleConfirmDelivery(po.id)}
                        disabled={formSubmitting}
                        className="text-blue-600 hover:text-blue-700"
                        title="Confirm Delivery"
                      >
                        <FontAwesomeIcon icon={faTruck} />
                      </button>
                    )}
                    {po.status === 'delivered' && (
                      <span className="text-green-600">
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Tracking</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Expense
          </button>
          <button
            onClick={refreshAllData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center"
          >
            <FontAwesomeIcon icon={faSync} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">This Period</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(expenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
          <p className="text-2xl font-bold text-purple-600">{Object.keys(expensesByCategory).length}</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(expense.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.category?.replace('_', ' ') || 'General'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{expense.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.departmentId || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.paymentMethod?.replace('_', ' ') || 'Cash'}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No expenses recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBudget = () => {
    const totalMonthlyBudget = departments.reduce((sum, dept) => sum + (dept.monthlyBudget || 0), 0);
    const totalSpent = stats.totalExpenses || 0;
    const totalRevenue = stats.totalRevenue || 1;
    const budgetUtilization = totalRevenue > 0 ? (totalSpent / totalRevenue) * 100 : 0;

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBudgetModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Set Department Budget
            </button>
            <button
              onClick={refreshAllData}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faSync} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Monthly Budget</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMonthlyBudget)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <p className="text-sm text-gray-600 dark:text-gray-400">Budget Utilization</p>
            <p className="text-2xl font-bold text-green-600">{budgetUtilization.toFixed(1)}%</p>
          </div>
        </div>

        {/* Department Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const budget = dept.monthlyBudget || 0;
            const spent = dept.spentThisMonth || 0;
            const remaining = budget - spent;
            const usagePercentage = budget > 0 ? (spent / budget) * 100 : 0;

            return (
              <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 hover:shadow-xl transition">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                  <FontAwesomeIcon icon={faBuilding} className="text-gray-400" />
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Budget</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(budget)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Spent</p>
                    <p className="text-lg font-medium text-red-600">{formatCurrency(spent)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                    <p className={`text-lg font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(remaining))}
                      {remaining < 0 && ' (Over budget)'}
                    </p>
                  </div>

                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-blue-600">
                          {usagePercentage.toFixed(1)}% Used
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-blue-200">
                      <div
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full ${
                          usagePercentage > 90 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBudgetForm({
                        departmentId: dept.id,
                        monthly: dept.monthlyBudget || '',
                        year: new Date().getFullYear(),
                        notes: ''
                      });
                      setShowBudgetModal(true);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Update Budget →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {departments.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <FontAwesomeIcon icon={faWallet} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Departments Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Configure departments in the admin panel to manage budgets.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Inventory Report Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition group">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl mb-4 group-hover:scale-110 transition">
            <FontAwesomeIcon icon={faBoxes} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inventory Report</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Generate detailed inventory report including stock levels, values, and usage.
          </p>
          <button
            onClick={() => setShowReportModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
          >
            Generate Report <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </button>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition group">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl mb-4 group-hover:scale-110 transition">
            <FontAwesomeIcon icon={faChartLine} className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Financial Summary</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Export complete financial data including revenue, expenses, and profit.
          </p>
          <button
            onClick={() => handleExportData('financial')}
            className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
          >
            Export Data <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </button>
        </div>

        {/* Salary Report Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition group">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl mb-4 group-hover:scale-110 transition">
            <FontAwesomeIcon icon={faMoneyCheck} className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Salary Report</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            View salary history, pending payments, and payroll summary.
          </p>
          <button
            onClick={() => {
              setActiveTab('salaries');
              setSalaryView('history');
            }}
            className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center"
          >
            View Salaries <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Date Range for Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Custom Report Period</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <DatePicker
            selectsRange={true}
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={(update) => {
              setDateRange({
                start: update[0],
                end: update[1]
              });
            }}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholderText="Select date range"
          />
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Custom Report'}
          </button>
        </div>
      </div>
    </div>
  );

  // Salary History Modal
  const renderSalaryHistoryModal = () => (
    showSalaryHistoryModal && selectedSalaryHistory && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Salary Details - {new Date(selectedSalaryHistory.year, selectedSalaryHistory.month - 1).toLocaleString('default', { month: 'long' })} {selectedSalaryHistory.year}
            </h3>
            <button
              onClick={() => {
                setShowSalaryHistoryModal(false);
                setSelectedSalaryHistory(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-blue-600">{selectedSalaryHistory.count}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Total Salary</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedSalaryHistory.total)}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(selectedSalaryHistory.paid)}</p>
            </div>
          </div>
          
          <div className="text-center text-gray-500 py-8">
            <FontAwesomeIcon icon={faReceipt} className="h-12 w-12 mb-3 text-gray-400" />
            <p>Select a staff member to view individual salary history and receipts</p>
            <button
              onClick={() => {
                setShowSalaryHistoryModal(false);
                setSalaryView('history');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Salary History
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Expense Modal
  const renderExpenseModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add Expense</h3>
          <button
            onClick={() => {
              setShowExpenseModal(false);
              resetExpenseForm();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="operations">Operations</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="supplies">Supplies</option>
                <option value="equipment">Equipment</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
              {formErrors.category && <p className="mt-1 text-xs text-red-600">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {formErrors.amount && <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                rows="2"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Describe the expense..."
              />
              {formErrors.description && <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={expenseForm.departmentId}
                onChange={(e) => setExpenseForm({ ...expenseForm, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">General</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference/Receipt #
              </label>
              <input
                type="text"
                value={expenseForm.reference}
                onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Expenses will be recorded and reflected in financial reports.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(false);
                resetExpenseForm();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {formSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Purchase Order Modal
  const renderPurchaseModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create Purchase Order</h3>
          <button
            onClick={() => {
              setShowPurchaseModal(false);
              resetPurchaseForm();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Item <span className="text-red-500">*</span>
              </label>
              <select
                value={purchaseForm.itemId}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, itemId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.itemId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Item</option>
                {inventoryData.items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Current: {item.quantity} {item.unit})
                  </option>
                ))}
              </select>
              {formErrors.itemId && <p className="mt-1 text-xs text-red-600">{formErrors.itemId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
                min="1"
              />
              {formErrors.quantity && <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Price (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={purchaseForm.price}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, price: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={purchaseForm.supplier}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.supplier ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Supplier name"
              />
              {formErrors.supplier && <p className="mt-1 text-xs text-red-600">{formErrors.supplier}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier Contact
              </label>
              <input
                type="text"
                value={purchaseForm.supplierContact}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierContact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Phone or email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Delivery
              </label>
              <input
                type="date"
                value={purchaseForm.expectedDelivery}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, expectedDelivery: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Terms
              </label>
              <select
                value={purchaseForm.paymentTerms}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="due_on_delivery">Due on Delivery</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
                <option value="prepaid">Prepaid</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>

            <div className="col-span-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Total Amount:</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency((Number(purchaseForm.quantity) || 0) * (Number(purchaseForm.price) || 0))}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Purchase orders require approval. Once delivered, inventory will be automatically updated.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowPurchaseModal(false);
                resetPurchaseForm();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {formSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Purchase Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Budget Modal
  const renderBudgetModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Set Department Budget</h3>
          <button
            onClick={() => {
              setShowBudgetModal(false);
              resetBudgetForm();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <form onSubmit={handleSetBudget} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={budgetForm.departmentId}
              onChange={(e) => setBudgetForm({ ...budgetForm, departmentId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                formErrors.departmentId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            {formErrors.departmentId && <p className="mt-1 text-xs text-red-600">{formErrors.departmentId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Budget (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={budgetForm.monthly}
              onChange={(e) => setBudgetForm({ ...budgetForm, monthly: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                formErrors.monthly ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="0"
              min="0"
            />
            {formErrors.monthly && <p className="mt-1 text-xs text-red-600">{formErrors.monthly}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Year
            </label>
            <input
              type="number"
              value={budgetForm.year}
              onChange={(e) => setBudgetForm({ ...budgetForm, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 5}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={budgetForm.notes}
              onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowBudgetModal(false);
                resetBudgetForm();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {formSubmitting ? 'Setting...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Report Modal
  const renderReportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Generate Inventory Report</h3>
          <button
            onClick={() => setShowReportModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Generate a comprehensive inventory report for the selected period.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              The report will include:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside mt-2">
              <li>Current inventory levels and values</li>
              <li>Purchases made during the period</li>
              <li>Usage and consumption data</li>
              <li>Low stock alerts</li>
              <li>Supplier information</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loading && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-green-800 to-green-900 text-white hidden lg:block z-20">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-green-700">
            <h1 className="text-xl font-bold text-white">MediCare Plus</h1>
            <p className="text-sm text-green-300 mt-1">Accountant Portal</p>
          </div>

          {/* Accountant Info */}
          <div className="p-5 border-b border-green-700">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faCalculator} className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-white">{userDetails?.fullName || 'Accountant'}</p>
                <p className="text-xs text-green-300">Finance Manager</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition ${
                      activeTab === tab.id
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-green-200 hover:bg-green-700'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-3" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Stats */}
          <div className="p-4 border-t border-green-700">
            <div className="bg-green-700/30 rounded-xl p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-300">Staff:</span>
                <span className="text-white font-bold">{staffList.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">Pending Salaries:</span>
                <span className="text-white font-bold">{stats.pendingSalaryCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">Low Stock Items:</span>
                <span className="text-white font-bold">{stats.lowStockCount}</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-green-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-green-200 hover:bg-red-600 hover:text-white rounded-xl transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-green-800 to-green-900 text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">MediCare Plus</h1>
            <p className="text-xs text-green-300">Accountant Portal</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-green-700 rounded-lg"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden p-4">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-4 sm:p-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'salaries' && renderSalaryManagement()}
        {activeTab === 'inventory' && renderInventory()}
        {activeTab === 'purchases' && renderPurchaseOrders()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'budget' && renderBudget()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Modals */}
      {showExpenseModal && renderExpenseModal()}
      {showPurchaseModal && renderPurchaseModal()}
      {showBudgetModal && renderBudgetModal()}
      {showReportModal && renderReportModal()}
      {showSalaryHistoryModal && renderSalaryHistoryModal()}
    </div>
  );
};

export default Accountant;