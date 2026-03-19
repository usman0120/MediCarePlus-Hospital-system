import React, { useState, useMemo } from 'react';
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
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../utils/helpers';
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

const HospitalHistoryModal = ({ historyData, yearlyStats, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState('all');
  const [chartType, setChartType] = useState('line');

  // Process data for charts
  const chartData = useMemo(() => {
    if (!yearlyStats || yearlyStats.length === 0) {
      return {
        years: [],
        revenue: [],
        expenses: [],
        profits: [],
        patients: [],
        appointments: [],
        operations: []
      };
    }

    const filtered = selectedYear === 'all' 
      ? yearlyStats 
      : yearlyStats.filter(stat => stat.year.toString() === selectedYear);

    return {
      years: filtered.map(stat => stat.year.toString()),
      revenue: filtered.map(stat => stat.revenue || 0),
      expenses: filtered.map(stat => stat.expenses || 0),
      profits: filtered.map(stat => (stat.revenue || 0) - (stat.expenses || 0)),
      patients: filtered.map(stat => stat.patientCount || 0),
      appointments: filtered.map(stat => stat.appointmentCount || 0),
      operations: filtered.map(stat => stat.operationCount || 0)
    };
  }, [yearlyStats, selectedYear]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!yearlyStats || yearlyStats.length === 0) {
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
        patientGrowth: 0
      };
    }

    const totalRevenue = yearlyStats.reduce((sum, stat) => sum + (stat.revenue || 0), 0);
    const totalExpenses = yearlyStats.reduce((sum, stat) => sum + (stat.expenses || 0), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const avgMonthlyRevenue = totalRevenue / (yearlyStats.length * 12);
    
    // Calculate growth rate
    const firstYear = yearlyStats[0];
    const lastYear = yearlyStats[yearlyStats.length - 1];
    const growthRate = firstYear?.revenue ? 
      ((lastYear?.revenue - firstYear?.revenue) / firstYear.revenue) * 100 : 0;

    // Find best and worst years by profit
    const yearsWithProfit = yearlyStats.map(stat => ({
      year: stat.year,
      profit: (stat.revenue || 0) - (stat.expenses || 0)
    }));

    const bestYear = yearsWithProfit.reduce((best, current) => 
      current.profit > (best?.profit || -Infinity) ? current : best, null);
    
    const worstYear = yearsWithProfit.reduce((worst, current) => 
      current.profit < (worst?.profit || Infinity) ? current : worst, null);

    const totalPatients = yearlyStats.reduce((sum, stat) => sum + (stat.patientCount || 0), 0);
    const totalAppointments = yearlyStats.reduce((sum, stat) => sum + (stat.appointmentCount || 0), 0);
    const totalOperations = yearlyStats.reduce((sum, stat) => sum + (stat.operationCount || 0), 0);

    const patientGrowth = firstYear?.patientCount ?
      ((lastYear?.patientCount - firstYear?.patientCount) / firstYear.patientCount) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      avgMonthlyRevenue,
      growthRate,
      bestYear,
      worstYear,
      totalPatients,
      totalAppointments,
      totalOperations,
      patientGrowth
    };
  }, [yearlyStats]);

  // Department performance data
  const departmentData = useMemo(() => {
    if (!historyData?.departments) return [];

    return Object.entries(historyData.departments).map(([name, data]) => ({
      name,
      revenue: data.revenue || 0,
      patients: data.patientCount || 0,
      procedures: data.procedureCount || 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [historyData]);

  // Monthly trends for selected year
  const monthlyData = useMemo(() => {
    if (!historyData?.monthly || selectedYear === 'all') return [];

    return (historyData.monthly[selectedYear] || []).map(month => ({
      month: new Date(0, month.month - 1).toLocaleString('default', { month: 'short' }),
      revenue: month.revenue || 0,
      expenses: month.expenses || 0,
      patients: month.patients || 0
    }));
  }, [historyData, selectedYear]);

  const handleExportData = () => {
    const exportData = {
      summary: summaryStats,
      yearlyStats,
      departmentData,
      monthlyData,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderOverview = () => (
    <div className="space-y-6">
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
            <span className="text-sm">{summaryStats.growthRate.toFixed(1)}% vs first year</span>
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
          <div className="mt-4 flex items-center text-purple-100">
            <span className="text-sm">{summaryStats.totalProfit >= 0 ? 'Profit' : 'Loss'}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Avg Monthly Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(summaryStats.avgMonthlyRevenue)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <FontAwesomeIcon icon={faChartLine} className="h-6 w-6" />
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

      {/* Main Chart */}
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
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.parsed.y !== null) {
                          label += formatCurrency(context.parsed.y);
                        }
                        return label;
                      }
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
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.parsed.y !== null) {
                          label += formatCurrency(context.parsed.y);
                        }
                        return label;
                      }
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
          )}
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Department</th>
                <th className="text-right py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</th>
                <th className="text-right py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Patients</th>
                <th className="text-right py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Procedures</th>
              </tr>
            </thead>
            <tbody>
              {departmentData.map((dept, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 text-gray-900 dark:text-white">{dept.name}</td>
                  <td className="py-3 text-right text-green-600 font-medium">{formatCurrency(dept.revenue)}</td>
                  <td className="py-3 text-right text-blue-600 font-medium">{dept.patients}</td>
                  <td className="py-3 text-right text-purple-600 font-medium">{dept.procedures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Revenue Distribution */}
      {departmentData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Department</h3>
          <div className="h-64">
            <Pie
              data={{
                labels: departmentData.map(d => d.name),
                datasets: [{
                  data: departmentData.map(d => d.revenue),
                  backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
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
            {yearlyStats?.map(stat => (
              <option key={stat.year} value={stat.year}>{stat.year}</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Year</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Profit/Loss</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Margin</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Patients</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Appointments</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {yearlyStats?.map((stat) => {
                const profit = (stat.revenue || 0) - (stat.expenses || 0);
                const margin = stat.revenue ? (profit / stat.revenue) * 100 : 0;

                return (
                  <tr key={stat.year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {stat.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      {formatCurrency(stat.revenue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                      {formatCurrency(stat.expenses || 0)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(Math.abs(profit))}
                      <span className="text-xs ml-1">{profit >= 0 ? 'profit' : 'loss'}</span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {margin.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                      {stat.patientCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                      {stat.appointmentCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                      {stat.operationCount || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Breakdown for Selected Year */}
      {selectedYear !== 'all' && monthlyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Breakdown for {selectedYear}
          </h3>
          <div className="h-80">
            <Bar
              data={{
                labels: monthlyData.map(m => m.month),
                datasets: [
                  {
                    label: 'Revenue',
                    data: monthlyData.map(m => m.revenue),
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                  },
                  {
                    label: 'Expenses',
                    data: monthlyData.map(m => m.expenses),
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
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.parsed.y !== null) {
                          label += formatCurrency(context.parsed.y);
                        }
                        return label;
                      }
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

          {/* Monthly Data Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Month</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Expenses</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Profit</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Patients</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month, index) => {
                  const profit = month.revenue - month.expenses;
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-900 dark:text-white">{month.month}</td>
                      <td className="py-2 text-right text-green-600">{formatCurrency(month.revenue)}</td>
                      <td className="py-2 text-right text-red-600">{formatCurrency(month.expenses)}</td>
                      <td className={`py-2 text-right font-medium ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(Math.abs(profit))}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">{month.patients}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
          <p className="text-purple-100">Total Operations</p>
          <p className="text-3xl font-bold">{summaryStats.totalOperations.toLocaleString()}</p>
        </div>
      </div>

      {/* Patient Growth Chart */}
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
              plugins: {
                legend: {
                  position: 'top',
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>

      {/* Patient Demographics (if available) */}
      {historyData?.demographics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patients by Age Group</h3>
            <div className="h-64">
              <Pie
                data={{
                  labels: Object.keys(historyData.demographics.ageGroups || {}),
                  datasets: [{
                    data: Object.values(historyData.demographics.ageGroups || {}),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false
                }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patients by Gender</h3>
            <div className="h-64">
              <Pie
                data={{
                  labels: Object.keys(historyData.demographics.gender || {}),
                  datasets: [{
                    data: Object.values(historyData.demographics.gender || {}),
                    backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56']
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false
                }}
              />
            </div>
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
            <h2 className="text-xl font-semibold text-white">Hospital History & Analytics</h2>
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
            Overview
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
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {historyData?.lastUpdated ? formatDate(historyData.lastUpdated) : 'N/A'}
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
              Export Data
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