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
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import {
  getUsersByRole,
  calculateSalary,
  getPendingSalaryRecords
} from '../database';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SalaryCalculationModule = ({ onCalculated }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [staffList, setStaffList] = useState([]);
  const [pendingSalaries, setPendingSalaries] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [calculationResults, setCalculationResults] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalSalary: 0,
    pendingCount: 0,
    calculatedCount: 0,
    averageSalary: 0
  });

  const roles = [
    { value: 'all', label: 'All Staff', icon: faUsers },
    { value: 'doctor', label: 'Doctors', icon: faUserMd },
    { value: 'nurse', label: 'Nurses', icon: faUserNurse },
    { value: 'lab', label: 'Lab Staff', icon: faFlask },
    { value: 'receptionist', label: 'Receptionists', icon: faUserTie }
  ];

  // Fetch staff and pending salaries
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all staff with salary information
      const rolesToFetch = ['doctor', 'receptionist', 'lab', 'nurse'];
      const staffPromises = rolesToFetch.map(role => getUsersByRole(role));
      const staffResults = await Promise.all(staffPromises);
      
      const allStaff = staffResults.reduce((acc, result, index) => {
        if (result.success) {
          return [...acc, ...result.data
            .filter(s => s.baseSalary) // Only staff with base salary
            .map(s => ({
              ...s,
              role: rolesToFetch[index]
            }))
          ];
        }
        return acc;
      }, []);

      setStaffList(allStaff);

      // Fetch pending salary records
      const pendingResult = await getPendingSalaryRecords();
      if (pendingResult.success) {
        setPendingSalaries(pendingResult.data);
      }

    } catch (error) {
      console.error('Error fetching salary data:', error);
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate statistics
  useEffect(() => {
    const totalStaff = staffList.length;
    const totalSalary = staffList.reduce((sum, staff) => sum + (staff.baseSalary || 0), 0);
    const pendingCount = pendingSalaries.filter(s => 
      s.month === selectedMonth.getMonth() + 1 && 
      s.year === selectedMonth.getFullYear()
    ).length;

    setStats({
      totalStaff,
      totalSalary,
      pendingCount,
      calculatedCount: pendingSalaries.length,
      averageSalary: totalStaff > 0 ? totalSalary / totalStaff : 0
    });
  }, [staffList, pendingSalaries, selectedMonth]);

  // Calculate salary for a staff member
  const handleCalculateSalary = async (staffId) => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();

    // Check if already calculated
    const existing = pendingSalaries.find(s => 
      s.userId === staffId && 
      s.month === month && 
      s.year === year
    );

    if (existing) {
      toast.error('Salary already calculated for this month');
      return;
    }

    setCalculating(true);
    try {
      const result = await calculateSalary(staffId, month, year, currentUser.uid);
      
      if (result.success) {
        toast.success('Salary calculated successfully');
        setPendingSalaries(prev => [...prev, result.data]);
        
        // Add to calculation results for display
        setCalculationResults(prev => [...prev, result.data]);
        
        if (onCalculated) {
          onCalculated(result.data);
        }
      } else {
        toast.error(result.error || 'Failed to calculate salary');
      }
    } catch (error) {
      console.error('Error calculating salary:', error);
      toast.error('Failed to calculate salary');
    } finally {
      setCalculating(false);
    }
  };

  // Calculate all pending salaries
  const handleCalculateAll = async () => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();

    // Get staff without calculated salary
    const toCalculate = filteredStaff.filter(staff => 
      !pendingSalaries.find(s => 
        s.userId === staff.id && 
        s.month === month && 
        s.year === year
      )
    );

    if (toCalculate.length === 0) {
      toast.info('All salaries already calculated for this month');
      return;
    }

    if (!window.confirm(`Calculate salaries for ${toCalculate.length} staff members?`)) {
      return;
    }

    setCalculating(true);
    try {
      const results = [];
      for (const staff of toCalculate) {
        const result = await calculateSalary(staff.id, month, year, currentUser.uid);
        if (result.success) {
          results.push(result.data);
        }
      }

      setPendingSalaries(prev => [...prev, ...results]);
      setCalculationResults(prev => [...prev, ...results]);
      toast.success(`Calculated ${results.length} salaries successfully`);
      
      if (onCalculated) {
        onCalculated(results);
      }
    } catch (error) {
      console.error('Error calculating salaries:', error);
      toast.error('Failed to calculate some salaries');
    } finally {
      setCalculating(false);
    }
  };

  // Get salary for staff member
  const getSalaryRecord = (staffId) => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    
    return pendingSalaries.find(s => 
      s.userId === staffId && 
      s.month === month && 
      s.year === year
    );
  };

  // Filter staff based on role
  const filteredStaff = staffList.filter(staff => 
    filterRole === 'all' || staff.role === filterRole
  );

  // Calculate deduction percentage
  const calculateDeduction = (record) => {
    if (!record) return 0;
    const deduction = record.baseSalary - record.calculatedSalary;
    return ((deduction / record.baseSalary) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Calculation</h2>
            <p className="text-gray-600 dark:text-gray-400">Calculate monthly salaries based on attendance</p>
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
            <button
              onClick={handleCalculateAll}
              disabled={calculating || filteredStaff.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
            >
              {calculating ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCalculator} className="mr-2" />
                  Calculate All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStaff}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Base Salary</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSalary)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Salary</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.averageSalary)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">This Month Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Calculated</p>
          <p className="text-2xl font-bold text-purple-600">{stats.calculatedCount}</p>
        </div>
      </div>

      {/* Role Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {roles.map(role => (
            <button
              key={role.value}
              onClick={() => setFilterRole(role.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center ${
                filterRole === role.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={role.icon} className="mr-2" />
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Working Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Deductions
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
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No staff members found with salary configuration
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const salaryRecord = getSalaryRecord(staff.id);
                  
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <FontAwesomeIcon 
                              icon={
                                staff.role === 'doctor' ? faUserMd :
                                staff.role === 'nurse' ? faUserNurse :
                                staff.role === 'lab' ? faFlask :
                                staff.role === 'receptionist' ? faUserTie :
                                faUsers
                              } 
                              className="h-5 w-5 text-gray-500 dark:text-gray-400" 
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {staff.fullName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs">
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(staff.baseSalary || 0)}
                      </td>
                      {salaryRecord ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {salaryRecord.workingDays} days
                            {salaryRecord.absentDays > 0 && (
                              <span className="text-xs text-red-500 block">
                                ({salaryRecord.absentDays} absent, {salaryRecord.lateDays || 0} late)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-red-600 font-medium">
                              {formatCurrency(salaryRecord.baseSalary - salaryRecord.calculatedSalary)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({calculateDeduction(salaryRecord)}%)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              {formatCurrency(salaryRecord.calculatedSalary)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs">
                              Pending
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => {/* View details */}}
                              className="text-blue-600 hover:text-blue-700 mr-2"
                              title="View Details"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400" colSpan="3">
                            Not calculated for this month
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" colSpan="2">
                            <button
                              onClick={() => handleCalculateSalary(staff.id)}
                              disabled={calculating}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-xs"
                            >
                              Calculate
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Calculations */}
      {calculationResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Calculations</h3>
          <div className="space-y-3">
            {calculationResults.slice(0, 5).map((result) => (
              <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{result.userName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {result.month}/{result.year} • {result.workingDays} working days
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(result.calculatedSalary)}</p>
                  <p className="text-xs text-gray-500">
                    Base: {formatCurrency(result.baseSalary)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
        <div className="flex">
          <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mr-3 mt-1" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Salary Calculation Formula</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Net Salary = Base Salary - (Absent Days × Per Day Rate) - (Late Days × Half Day Rate)<br />
              Per Day Rate = Base Salary ÷ 26 working days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculationModule;