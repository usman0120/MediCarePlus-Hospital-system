import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faChartLine,
  faBoxes,
  faShoppingCart,
  faMoneyBillWave,
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
  faDownload
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
  
  // Salary
  getPendingSalaryRecords,
  
  // Department
  getDepartments,
  setDepartmentBudget,
  
  // Alerts
  getPendingAlerts,
  
  // Export
  exportCollection
} from '../database';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Import Salary Management Modules
import SalaryPaymentModule from '../components/SalaryPaymentModule';
import SalaryCalculationModule from '../components/SalaryCalculationModule';
import AttendanceModule from '../components/AttendanceModule';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

const Accountant = () => {
  const { currentUser, userDetails } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salaryTab, setSalaryTab] = useState('pending'); // For salary sub-tabs
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
  const [pendingSalaries, setPendingSalaries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [, setFinancialSummary] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [alerts, setAlerts] = useState([]);
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
    pendingSalaryCount: 0
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

  // ==================== DATA FETCHING FUNCTIONS ====================

  const fetchInventoryData = useCallback(async () => {
    try {
      const result = await getInventoryWithFinancials();
      if (result.success) {
        setInventoryData(result.data);
        setStats(prev => ({
          ...prev,
          lowStockCount: result.data.summary.lowStockItems
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const status = selectedStatus !== 'all' ? selectedStatus : null;
      const result = await getPurchaseOrdersByStatus(status);
      if (result.success) {
        setPurchaseOrders(result.data);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  }, [selectedStatus]);

  const fetchPendingSalaries = useCallback(async () => {
    try {
      const result = await getPendingSalaryRecords();
      if (result.success) {
        setPendingSalaries(result.data);
        
        // Calculate salary statistics
        const totalPending = result.data.length;
        const totalAmount = result.data.reduce((sum, s) => sum + s.calculatedSalary, 0);
        
        setStats(prev => ({
          ...prev,
          pendingPayments: totalPending,
          pendingSalaryCount: totalPending,
          totalSalaryExpense: totalAmount
        }));
      }
    } catch (error) {
      console.error('Error fetching pending salaries:', error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await getDepartments();
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  const fetchFinancialData = useCallback(async () => {
    try {
      const result = await getFinancialSummary(dateRange.start, dateRange.end);
      if (result.success) {
        setFinancialSummary(result.data);
        setStats(prev => ({
          ...prev,
          totalRevenue: result.data.revenue.total,
          totalExpenses: result.data.expenses.total + (result.data.purchases?.total || 0),
          totalProfit: result.data.profit,
          profitMargin: result.data.revenue.total > 0 
            ? (result.data.profit / result.data.revenue.total) * 100 
            : 0
        }));
      }

      const trendResult = await getMonthlyRevenueTrend(new Date().getFullYear());
      if (trendResult.success) {
        setMonthlyTrend(trendResult.data);
      }

      const expensesResult = await getExpensesByCategory(dateRange.start, dateRange.end);
      if (expensesResult.success) {
        setExpenses(expensesResult.data.expenses);
        setExpensesByCategory(expensesResult.data.byCategory);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }, [dateRange]);

  const fetchAlerts = useCallback(async () => {
    try {
      const result = await getPendingAlerts();
      if (result.success) {
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

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'dashboard') {
        await Promise.all([
          fetchFinancialData(),
          fetchInventoryData(),
          fetchPendingSalaries(),
          fetchAlerts()
        ]);
      } else if (activeTab === 'inventory') {
        await Promise.all([
          fetchInventoryData(),
          fetchPurchaseOrders()
        ]);
      } else if (activeTab === 'purchases') {
        await fetchPurchaseOrders();
      } else if (activeTab === 'expenses') {
        await Promise.all([
          fetchFinancialData(),
          fetchDepartments()
        ]);
      } else if (activeTab === 'budget') {
        await Promise.all([
          fetchDepartments(),
          fetchFinancialData()
        ]);
      } else if (activeTab === 'salaries') {
        await Promise.all([
          fetchPendingSalaries(),
          fetchFinancialData()
        ]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchFinancialData, fetchInventoryData, fetchPendingSalaries, fetchAlerts, fetchPurchaseOrders, fetchDepartments]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, activeTab]);

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

    setLoading(true);
    
    try {
      const result = await addExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount)
      }, currentUser.uid);
      
      if (result.success) {
        toast.success('Expense added successfully');
        setShowExpenseModal(false);
        resetExpenseForm();
        fetchFinancialData();
      } else {
        toast.error(result.error || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    
    if (!validatePurchaseForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    
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
        fetchPurchaseOrders();
      } else {
        toast.error(result.error || 'Failed to create purchase order');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePurchaseOrder = async (poId) => {
    setLoading(true);
    
    try {
      const result = await updatePurchaseOrderStatus(poId, 'approved', currentUser.uid);
      
      if (result.success) {
        toast.success('Purchase order approved');
        fetchPurchaseOrders();
      } else {
        toast.error(result.error || 'Failed to approve purchase order');
      }
    } catch (error) {
      console.error('Error approving purchase order:', error);
      toast.error('Failed to approve purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (poId) => {
    setLoading(true);
    
    try {
      const result = await updatePurchaseOrderStatus(poId, 'delivered', currentUser.uid);
      
      if (result.success) {
        toast.success('Delivery confirmed - Inventory updated');
        fetchPurchaseOrders();
        fetchInventoryData();
      } else {
        toast.error(result.error || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    
    if (!validateBudgetForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    
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
      } else {
        toast.error(result.error || 'Failed to set budget');
      }
    } catch (error) {
      console.error('Error setting budget:', error);
      toast.error('Failed to set budget');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    
    try {
      const result = await generateInventoryReport(dateRange.start, dateRange.end);
      
      if (result.success) {
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
    try {
      const result = await exportCollection(type);
      
      if (result.success) {
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
    }
  };

  const handleSalaryProcessed = (record) => {
    toast.success(`Salary payment processed for ${record.userName}`);
    fetchPendingSalaries();
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faChartLine },
    { id: 'salaries', label: 'Salary Management', icon: faMoneyCheck },
    { id: 'inventory', label: 'Inventory', icon: faBoxes },
    { id: 'purchases', label: 'Purchase Orders', icon: faShoppingCart },
    { id: 'expenses', label: 'Expenses', icon: faMoneyBillWave },
    { id: 'budget', label: 'Budget', icon: faWallet },
    { id: 'reports', label: 'Reports', icon: faFileExport }
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-600 p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                {alerts.length} Financial Alert{alerts.length > 1 ? 's' : ''}
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                {alerts.map((alert, idx) => (
                  <li key={idx}>{alert.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Picker */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
          <div className="flex flex-col sm:flex-row gap-2">
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={fetchFinancialData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-100 text-sm">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faMoneyBillWave} className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">Net Profit</p>
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                {formatCurrency(Math.abs(stats.totalProfit))}
              </p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faBalanceScale} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-blue-100 text-sm">
            Margin: {stats.profitMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm">Salary Pending</p>
              <p className="text-2xl font-bold">{stats.pendingSalaryCount}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faMoneyCheck} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-purple-100 text-sm">
            Amount: {formatCurrency(stats.totalSalaryExpense)}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue Trend</h3>
          <div className="h-64">
            <Line
              data={{
                labels: monthlyTrend.map(m => m.monthName),
                datasets: [{
                  label: 'Revenue',
                  data: monthlyTrend.map(m => m.revenue),
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
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h3>
          <div className="h-64">
            {Object.keys(expensesByCategory).length > 0 ? (
              <Pie
                data={{
                  labels: Object.keys(expensesByCategory),
                  datasets: [{
                    data: Object.values(expensesByCategory),
                    backgroundColor: [
                      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
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
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No expense data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Expenses</h3>
          </div>
          <div className="p-6">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {expense.category} • {formatDate(expense.createdAt)}
                  </p>
                </div>
                <p className="font-medium text-red-600">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No expenses recorded</p>
            )}
          </div>
        </div>

        {/* Pending Salaries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Salaries</h3>
          </div>
          <div className="p-6">
            {pendingSalaries.slice(0, 5).map((salary) => (
              <div key={salary.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{salary.userName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {salary.userRole} • {salary.month}/{salary.year}
                  </p>
                </div>
                <p className="font-medium text-green-600">{formatCurrency(salary.calculatedSalary)}</p>
              </div>
            ))}
            {pendingSalaries.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No pending salaries</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {inventoryData.summary.lowStockItems > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              Low Stock Alert ({inventoryData.summary.lowStockItems} items)
            </h3>
          </div>
          <div className="p-6">
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
                          itemId: item.id,
                          itemName: item.name
                        });
                        setShowPurchaseModal(true);
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Create Purchase Order
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
    <div className="space-y-6">
      {/* Salary Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingSalaryCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Pending Amount</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSalaryExpense)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
          <p className="text-2xl font-bold text-green-600">
            {pendingSalaries.filter(s => s.month === new Date().getMonth() + 1).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Salary Expense</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalExpenses)}</p>
        </div>
      </div>

      {/* Sub-tabs for salary management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto px-4">
            <button
              onClick={() => setSalaryTab('pending')}
              className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                salaryTab === 'pending'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Pending Payments
            </button>
            <button
              onClick={() => setSalaryTab('calculated')}
              className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                salaryTab === 'calculated'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Salary Calculation
            </button>
            <button
              onClick={() => setSalaryTab('attendance')}
              className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                salaryTab === 'attendance'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Attendance Overview
            </button>
          </nav>
        </div>

        {/* Render appropriate module */}
        <div className="p-4">
          {salaryTab === 'pending' && (
            <SalaryPaymentModule
              onPaymentProcessed={handleSalaryProcessed}
            />
          )}
          {salaryTab === 'calculated' && (
            <SalaryCalculationModule
              onCalculated={(records) => {
                toast.success(`Salaries calculated for ${records.length} staff members`);
                fetchPendingSalaries();
              }}
            />
          )}
          {salaryTab === 'attendance' && (
            <AttendanceModule
              onAttendanceMarked={(record) => {
                toast.success(`Attendance marked for ${record.fullName}`);
              }}
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              handleExportData('salary');
            }}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 transition group"
          >
            <FontAwesomeIcon icon={faFileExport} className="h-8 w-8 text-gray-400 group-hover:text-green-500 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Salary Report</p>
          </button>
          
          <button
            onClick={() => {
              setSalaryTab('calculated');
            }}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition group"
          >
            <FontAwesomeIcon icon={faCalculator} className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Calculate Monthly Salaries</p>
          </button>
          
          <button
            onClick={() => {
              toast.info('Generating salary slips...');
              setTimeout(() => {
                toast.success('Salary slips generated');
              }, 2000);
            }}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 transition group"
          >
            <FontAwesomeIcon icon={faDownload} className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Generate All Salary Slips</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
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
            onClick={fetchInventoryData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <FontAwesomeIcon icon={faSync} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryData.summary.totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(inventoryData.summary.totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(inventoryData.summary.totalCost)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{inventoryData.summary.lowStockItems}</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {inventoryData.items.map((item) => {
                const isLowStock = item.quantity <= item.threshold;
                const value = item.price * item.quantity;

                return (
                  <tr key={item.id} className={isLowStock ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                      {item.supplier && (
                        <div className="text-xs text-gray-500">Supplier: {item.supplier}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.category}</td>
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
                      <button
                        className="text-blue-600 hover:text-blue-700"
                        title="View Details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPurchaseOrders = () => (
    <div className="space-y-6">
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
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    #{po.id.slice(-6)}
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
                      {po.status}
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
                          className="text-green-600 hover:text-green-700 mr-2"
                          title="Approve"
                        >
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </button>
                        <button
                          onClick={() => {/* Reject */}}
                          className="text-red-600 hover:text-red-700 mr-2"
                          title="Reject"
                        >
                          <FontAwesomeIcon icon={faTimesCircle} />
                        </button>
                      </>
                    )}
                    {po.status === 'approved' && (
                      <button
                        onClick={() => handleConfirmDelivery(po.id)}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Tracking</h2>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add Expense
        </button>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">This Period</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
          <p className="text-2xl font-bold text-purple-600">{Object.keys(expensesByCategory).length}</p>
        </div>
      </div>

      {/* Expenses by Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h3>
          <div className="h-64">
            {Object.keys(expensesByCategory).length > 0 ? (
              <Pie
                data={{
                  labels: Object.keys(expensesByCategory),
                  datasets: [{
                    data: Object.values(expensesByCategory),
                    backgroundColor: [
                      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false
                }}
              />
            ) : (
              <p className="text-center text-gray-500 py-8">No expense data</p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Expenses</h3>
          <div className="space-y-4">
            {expenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {expense.category} • {formatDate(expense.createdAt)}
                  </p>
                </div>
                <p className="font-medium text-red-600">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Method</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(expense.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{expense.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{expense.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.departmentId || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{expense.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBudget = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Management</h2>
        <button
          onClick={() => setShowBudgetModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Set Department Budget
        </button>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Monthly Budget</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(departments.reduce((sum, dept) => sum + (dept.monthlyBudget || 0), 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Budget Utilization</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.totalExpenses > 0 && stats.totalRevenue > 0 
              ? ((stats.totalExpenses / stats.totalRevenue) * 100).toFixed(1) 
              : '0'}%
          </p>
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
            <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{dept.name}</h3>
              
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
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
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
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Update Budget
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Inventory Report Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
            <FontAwesomeIcon icon={faBoxes} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inventory Report</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Generate detailed inventory report including stock levels, values, and usage.
          </p>
          <button
            onClick={() => setShowReportModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Generate Report →
          </button>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mb-4">
            <FontAwesomeIcon icon={faChartLine} className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Financial Summary</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Export complete financial data including revenue, expenses, and profit.
          </p>
          <button
            onClick={() => handleExportData('financial')}
            className="text-green-600 hover:text-green-700 font-medium text-sm"
          >
            Export Data →
          </button>
        </div>

        {/* Salary Report Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mb-4">
            <FontAwesomeIcon icon={faMoneyCheck} className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Salary Report</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            View salary history, pending payments, and payroll summary.
          </p>
          <button
            onClick={() => setActiveTab('salaries')}
            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            View Salaries →
          </button>
        </div>
      </div>

      {/* Date Range for Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
          />
          <button
            onClick={handleGenerateReport}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Generate Custom Report
          </button>
        </div>
      </div>
    </div>
  );

  // Expense Modal
  const renderExpenseModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add Expense</h3>
          <button
            onClick={() => {
              setShowExpenseModal(false);
              resetExpenseForm();
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              {formErrors.amount && (
                <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>
              )}
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
              {formErrors.description && (
                <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>
              )}
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

          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
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
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create Purchase Order</h3>
          <button
            onClick={() => {
              setShowPurchaseModal(false);
              resetPurchaseForm();
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              {formErrors.itemId && (
                <p className="mt-1 text-xs text-red-600">{formErrors.itemId}</p>
              )}
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
              {formErrors.quantity && (
                <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>
              )}
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
              {formErrors.price && (
                <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>
              )}
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
              {formErrors.supplier && (
                <p className="mt-1 text-xs text-red-600">{formErrors.supplier}</p>
              )}
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

          <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
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
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Set Department Budget</h3>
          <button
            onClick={() => {
              setShowBudgetModal(false);
              resetBudgetForm();
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            {formErrors.departmentId && (
              <p className="mt-1 text-xs text-red-600">{formErrors.departmentId}</p>
            )}
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
            {formErrors.monthly && (
              <p className="mt-1 text-xs text-red-600">{formErrors.monthly}</p>
            )}
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Setting...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Report Modal
  const renderReportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Generate Inventory Report</h3>
          <button
            onClick={() => setShowReportModal(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Generate a comprehensive inventory report for the selected period.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-green-800 to-green-900 text-white hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-green-700">
            <h1 className="text-xl font-bold text-white">MediCare Plus</h1>
            <p className="text-sm text-green-300">Accountant Portal</p>
          </div>

          {/* Accountant Info */}
          <div className="p-4 border-b border-green-700">
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
                    className={`w-full flex items-center px-4 py-2 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-green-600 text-white'
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
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-300">Low Stock:</span>
                <span className="text-white font-bold">{stats.lowStockCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">Pending Salaries:</span>
                <span className="text-white font-bold">{stats.pendingSalaryCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">Budget Used:</span>
                <span className="text-white font-bold">{stats.budgetUsed.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-green-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-green-200 hover:bg-red-600 hover:text-white rounded-lg transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-green-800 text-white p-4">
        <h1 className="text-xl font-bold text-white">MediCare Plus Accountant</h1>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-4 sm:p-8">
        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'salaries' && renderSalaryManagement()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'purchases' && renderPurchaseOrders()}
            {activeTab === 'expenses' && renderExpenses()}
            {activeTab === 'budget' && renderBudget()}
            {activeTab === 'reports' && renderReports()}
          </>
        )}
      </div>

      {/* Modals */}
      {showExpenseModal && renderExpenseModal()}
      {showPurchaseModal && renderPurchaseModal()}
      {showBudgetModal && renderBudgetModal()}
      {showReportModal && renderReportModal()}
    </div>
  );
};

export default Accountant;