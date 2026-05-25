import React, { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faChartLine,
  faChartPie,
  faDollarSign,
  faUsers,
  faArrowUp,
  faBalanceScale,
  faFileExport,
  faPrint,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/helpers';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const HospitalHistoryModal = ({  yearlyStats, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState(null);

  // Fetch real-time financial data
  useEffect(() => {
    const fetchRealTimeData = async () => {
      setLoading(true);
      try {
        const { db } = await import('../firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        // Get appointments data
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('paymentStatus', 'in', ['paid', 'confirmed'])
        );
        const appointmentsSnap = await getDocs(appointmentsQuery);
        
        let totalRevenue = 0;
        let appointmentCount = 0;
        let revenueByYear = {};
        let revenueByMonth = {};
        let patientVisits = {};
        
        for (const aptDoc of appointmentsSnap.docs) {
          const apt = aptDoc.data();
          let amount = apt.paymentAmount || apt.consultationFee || 0;
          if (typeof amount === 'string') amount = parseFloat(amount);
          if (isNaN(amount)) amount = 0;
          
          totalRevenue += amount;
          appointmentCount++;
          
          // Group by year
          const paidDate = apt.paidAt?.toDate?.() || apt.createdAt?.toDate?.() || new Date();
          const year = paidDate.getFullYear();
          const month = paidDate.getMonth() + 1;
          
          revenueByYear[year] = (revenueByYear[year] || 0) + amount;
          
          const monthKey = `${year}-${month}`;
          revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + amount;
          
          // Count patient visits
          if (apt.patientId) {
            patientVisits[apt.patientId] = (patientVisits[apt.patientId] || 0) + 1;
          }
        }
        
        // Get expenses
        let totalExpenses = 0;
        let expensesByYear = {};
        
        // Expenses from expenses collection
        const expensesSnap = await getDocs(collection(db, 'expenses'));
        for (const expDoc of expensesSnap.docs) {
          const exp = expDoc.data();
          const amount = exp.amount || 0;
          totalExpenses += amount;
          
          const expDate = exp.createdAt?.toDate?.() || new Date();
          const year = expDate.getFullYear();
          expensesByYear[year] = (expensesByYear[year] || 0) + amount;
        }
        
        // Salary expenses
        const salarySnap = await getDocs(query(collection(db, 'salaryRecords'), where('status', '==', 'paid')));
        for (const salDoc of salarySnap.docs) {
          const sal = salDoc.data();
          const amount = sal.calculatedSalary || 0;
          totalExpenses += amount;
          
          const salDate = sal.paidAt?.toDate?.() || new Date();
          const year = salDate.getFullYear();
          expensesByYear[year] = (expensesByYear[year] || 0) + amount;
        }
        
        // Purchase orders
        const purchasesSnap = await getDocs(query(collection(db, 'purchaseOrders'), where('status', '==', 'delivered')));
        for (const poDoc of purchasesSnap.docs) {
          const po = poDoc.data();
          const amount = po.total || 0;
          totalExpenses += amount;
          
          const poDate = po.deliveredAt?.toDate?.() || new Date();
          const year = poDate.getFullYear();
          expensesByYear[year] = (expensesByYear[year] || 0) + amount;
        }
        
        // Get total patients count
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'patient')));
        const totalPatients = usersSnap.size;
        
        setRealTimeData({
          totalRevenue,
          totalExpenses,
          totalProfit: totalRevenue - totalExpenses,
          totalPatients,
          totalAppointments: appointmentCount,
          revenueByYear,
          expensesByYear,
          revenueByMonth,
          uniquePatients: Object.keys(patientVisits).length
        });
        
      } catch (error) {
        console.error('Error fetching real-time data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealTimeData();
  }, []);

  // Process data for charts - combine real-time data with history data
  const chartData = useMemo(() => {
    // Use real-time data if available, otherwise fallback to yearlyStats
    const years = new Set();
    const revenueMap = {};
    const expensesMap = {};
    const profitMap = {};
    
    // Add data from yearlyStats
    if (yearlyStats && yearlyStats.length > 0) {
      yearlyStats.forEach(stat => {
        years.add(stat.year.toString());
        revenueMap[stat.year] = stat.revenue || 0;
        expensesMap[stat.year] = stat.expenses || 0;
        profitMap[stat.year] = (stat.revenue || 0) - (stat.expenses || 0);
      });
    }
    
    // Override with real-time data if available
    if (realTimeData) {
      Object.entries(realTimeData.revenueByYear || {}).forEach(([year, revenue]) => {
        years.add(year);
        revenueMap[year] = revenue;
      });
      Object.entries(realTimeData.expensesByYear || {}).forEach(([year, expenses]) => {
        years.add(year);
        expensesMap[year] = expenses;
        profitMap[year] = (revenueMap[year] || 0) - expenses;
      });
    }
    
    const sortedYears = Array.from(years).sort();
    
    const filtered = selectedYear === 'all' 
      ? sortedYears 
      : sortedYears.filter(year => year === selectedYear);

    return {
      years: filtered,
      revenue: filtered.map(year => revenueMap[year] || 0),
      expenses: filtered.map(year => expensesMap[year] || 0),
      profits: filtered.map(year => profitMap[year] || 0),
      patients: filtered.map(year => yearlyStats?.find(s => s.year.toString() === year)?.patientCount || 0),
      appointments: filtered.map(year => yearlyStats?.find(s => s.year.toString() === year)?.appointmentCount || 0),
      operations: filtered.map(year => yearlyStats?.find(s => s.year.toString() === year)?.operationCount || 0)
    };
  }, [yearlyStats, selectedYear, realTimeData]);

  // Calculate summary statistics using real-time data
  const summaryStats = useMemo(() => {
    if (loading) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        avgMonthlyRevenue: 0,
        growthRate: 0,
        bestYear: null,
        worstYear: null,
        totalPatients: 0,
        totalAppointments: 0,
        totalOperations: 0,
        patientGrowth: 0,
        profitMargin: 0
      };
    }

    // Use real-time data for totals
    const totalRevenue = realTimeData?.totalRevenue || 0;
    const totalExpenses = realTimeData?.totalExpenses || 0;
    const totalProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    const totalPatients = realTimeData?.totalPatients || 0;
    const totalAppointments = realTimeData?.totalAppointments || 0;
    
    // Calculate growth rate from yearly data
    let growthRate = 0;
    let bestYear = null;
    let worstYear = null;
    
    if (chartData.years.length >= 2) {
      const firstYearRevenue = chartData.revenue[0];
      const lastYearRevenue = chartData.revenue[chartData.revenue.length - 1];
      growthRate = firstYearRevenue > 0 ? ((lastYearRevenue - firstYearRevenue) / firstYearRevenue) * 100 : 0;
    }
    
    // Find best and worst years by profit
    chartData.years.forEach((year, index) => {
      const profit = chartData.profits[index];
      if (bestYear === null || profit > bestYear.profit) {
        bestYear = { year, profit };
      }
      if (worstYear === null || profit < worstYear.profit) {
        worstYear = { year, profit };
      }
    });
    
    const avgMonthlyRevenue = totalRevenue / 12;

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      profitMargin,
      avgMonthlyRevenue,
      growthRate,
      bestYear,
      worstYear,
      totalPatients,
      totalAppointments,
      totalOperations: yearlyStats?.reduce((sum, s) => sum + (s.operationCount || 0), 0) || 0,
      patientGrowth: growthRate
    };
  }, [yearlyStats, chartData, realTimeData, loading]);

  // Department performance data from real appointments
  const departmentData = useMemo(() => {
    if (!realTimeData?.revenueByDepartment) return [];
    
    return Object.entries(realTimeData.revenueByDepartment || {})
      .map(([name, data]) => ({
        name,
        revenue: data.revenue || 0,
        patients: data.patients || 0,
        procedures: data.procedures || 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [realTimeData]);

  const handleExportData = () => {
    const exportData = {
      summary: summaryStats,
      yearlyStats: chartData,
      departmentData,
      exportedAt: new Date().toISOString(),
      source: 'real-time'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-financial-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-3xl" />
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-100">
            <FontAwesomeIcon icon={faArrowUp} className="mr-1" />
            <span className="text-sm">{summaryStats.growthRate.toFixed(1)}% growth</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Patients</p>
              <p className="text-2xl font-bold">{summaryStats.totalPatients.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faUsers} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-100">
            <FontAwesomeIcon icon={faArrowUp} className="mr-1" />
            <span className="text-sm">{summaryStats.patientGrowth.toFixed(1)}% growth</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Net Profit</p>
              <p className={`text-2xl font-bold ${summaryStats.totalProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                {formatCurrency(Math.abs(summaryStats.totalProfit))}
              </p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faBalanceScale} className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex flex-col text-purple-100">
            <span className="text-sm">{summaryStats.totalProfit >= 0 ? 'Profit' : 'Loss'}</span>
            <span className="text-xs">Margin: {summaryStats.profitMargin.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Total Appointments</p>
              <p className="text-2xl font-bold">{summaryStats.totalAppointments.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faCalendarAlt} className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Best & Worst Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaryStats.bestYear && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Best Year</h4>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{summaryStats.bestYear.year}</p>
            <p className="text-green-700 dark:text-green-300 mt-2">
              Profit: {formatCurrency(summaryStats.bestYear.profit)}
            </p>
          </div>
        )}

        {summaryStats.worstYear && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Worst Year</h4>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summaryStats.worstYear.year}</p>
            <p className="text-red-700 dark:text-red-300 mt-2">
              {summaryStats.worstYear.profit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(summaryStats.worstYear.profit))}
            </p>
          </div>
        )}
      </div>

      {/* Main Chart - Revenue vs Expenses */}
      {chartData.years.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Performance Over Time</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Bar
              </button>
            </div>
          </div>
          <div className="h-80">
            {chartType === 'line' ? (
              <Line
                data={{
                  labels: chartData.years,
                  datasets: [
                    {
                      label: 'Revenue',
                      data: chartData.revenue,
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      tension: 0.4,
                      fill: true
                    },
                    {
                      label: 'Expenses',
                      data: chartData.expenses,
                      borderColor: 'rgb(239, 68, 68)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      tension: 0.4,
                      fill: true
                    },
                    {
                      label: 'Profit',
                      data: chartData.profits,
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (value) => formatCurrency(value) }
                    }
                  }
                }}
              />
            ) : (
              <Bar
                data={{
                  labels: chartData.years,
                  datasets: [
                    {
                      label: 'Revenue',
                      data: chartData.revenue,
                      backgroundColor: 'rgba(34, 197, 94, 0.5)',
                      borderColor: 'rgb(34, 197, 94)',
                      borderWidth: 1
                    },
                    {
                      label: 'Expenses',
                      data: chartData.expenses,
                      backgroundColor: 'rgba(239, 68, 68, 0.5)',
                      borderColor: 'rgb(239, 68, 68)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (value) => formatCurrency(value) }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderYearlyBreakdown = () => (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Years</option>
            {chartData.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Yearly Stats Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Yearly Financial Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit/Loss</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Patients</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Appointments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {chartData.years.map((year, index) => {
                const revenue = chartData.revenue[index];
                const expenses = chartData.expenses[index];
                const profit = revenue - expenses;
                const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                return (
                  <tr key={year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">{formatCurrency(revenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">{formatCurrency(expenses)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(Math.abs(profit))}
                      <span className="text-xs ml-1">{profit >= 0 ? 'profit' : 'loss'}</span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {margin.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                      {yearlyStats?.find(s => s.year.toString() === year)?.patientCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                      {yearlyStats?.find(s => s.year.toString() === year)?.appointmentCount || 0}
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

  const renderPatientStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-blue-100">Total Patients</p>
          <p className="text-3xl font-bold">{summaryStats.totalPatients.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-green-100">Total Appointments</p>
          <p className="text-3xl font-bold">{summaryStats.totalAppointments.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-purple-100">Active Patients</p>
          <p className="text-3xl font-bold">{realTimeData?.uniquePatients?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Patient Growth Chart */}
      {chartData.years.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patient Growth Over Time</h3>
          <div className="h-80">
            <Line
              data={{
                labels: chartData.years,
                datasets: [
                  {
                    label: 'Patients',
                    data: chartData.patients,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                  },
                  {
                    label: 'Appointments',
                    data: chartData.appointments,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={faChartLine} className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Hospital Financial Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faChartPie} className="mr-2" />
            Financial Overview
          </button>
          <button
            onClick={() => setActiveTab('yearly')}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              activeTab === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
            Yearly Breakdown
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              activeTab === 'patients'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} className="mr-2" />
            Patient Statistics
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'yearly' && renderYearlyBreakdown()}
          {activeTab === 'patients' && renderPatientStats()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center flex-wrap gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Data source: Real-time financial data
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faPrint} className="mr-2" />
              Print
            </button>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faFileExport} className="mr-2" />
              Export Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalHistoryModal;