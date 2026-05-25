import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faClock,
  faHistory,
  faClipboardList,
  faSpinner,
  faDollarSign
} from '@fortawesome/free-solid-svg-icons';
import { getStaffHistory} from '../database';
import { formatDate, formatCurrency } from '../utils/helpers';

const UserHistoryModal = ({ userId, userName, userRole, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let isMounted = true;
    
    const loadUserHistory = async () => {
      if (!userId) return;
      
      setLoading(true);
      const result = await getStaffHistory(userId);
      
      if (isMounted) {
        if (result.success) {
          setHistoryData(result.data);
        } else {
          console.error('Failed to load user history:', result.error);
        }
        setLoading(false);
      }
    };

    loadUserHistory();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Tabs for Staff Users (removed lab, ratings, etc.)
  const tabs = [
    { id: 'overview', label: 'Overview', icon: faClipboardList },
    { id: 'salary', label: 'Salary History', icon: faDollarSign },
    { id: 'attendance', label: 'Attendance', icon: faClock },
    { id: 'audit', label: 'Audit Trail', icon: faHistory }
  ];

const renderOverview = () => {
  if (!historyData) return null;
  const { history, stats } = historyData;

  return (
    <div className="space-y-6">
      {/* Employee Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-blue-600 dark:text-blue-300">Employee Name</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{history.user?.fullName || userName}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 dark:text-blue-300">Role</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{history.user?.role || userRole}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 dark:text-blue-300">Department</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{history.user?.department || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 dark:text-blue-300">Base Salary</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(history.user?.baseSalary || 0)}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg text-center">
          <p className="text-sm text-green-600 dark:text-green-300">Total Salary Received</p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">{formatCurrency(stats.totalPaidSalary || 0)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-center">
          <p className="text-sm text-blue-600 dark:text-blue-300">Total Working Days</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{stats.totalWorkingDays || 0}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg text-center">
          <p className="text-sm text-yellow-600 dark:text-yellow-300">Present Days</p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{stats.presentDays || 0}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg text-center">
          <p className="text-sm text-purple-600 dark:text-purple-300">Attendance Rate</p>
          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
            {stats.attendanceRate ? `${stats.attendanceRate}%` : '0%'}
          </p>
        </div>
      </div>
      
      {/* Average Salary Card */}
      <div className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <p className="text-sm text-indigo-600 dark:text-indigo-300">Average Monthly Salary</p>
          <p className="text-xl font-bold text-indigo-800 dark:text-indigo-200">{formatCurrency(stats.averageSalary || 0)}</p>
        </div>
      </div>

      {/* Recent Salary Activity */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Salary History</h4>
        <div className="space-y-3">
          {history.salaryRecords && history.salaryRecords.length > 0 ? (
            history.salaryRecords.slice(0, 5).map((record, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faDollarSign} className="text-green-500 mt-1" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {record.month}/{record.year}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Amount: {formatCurrency(record.calculatedSalary)} | Working Days: {record.workingDays || 0}
                  </p>
                  {record.absentDays > 0 && (
                    <p className="text-xs text-red-500">Absent: {record.absentDays} days</p>
                  )}
                  {record.lateDays > 0 && (
                    <p className="text-xs text-yellow-500">Late: {record.lateDays} days</p>
                  )}
                  {record.paidAt && (
                    <p className="text-xs text-gray-500 mt-1">Paid on: {formatDate(record.paidAt)}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No salary records found</p>
          )}
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h4>
        <div className="space-y-3">
          {history.auditLogs && history.auditLogs.length > 0 ? (
            history.auditLogs.slice(0, 5).map((log, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faHistory} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{log.action}</p>
                  <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

  const renderSalaryHistory = () => {
    if (!historyData?.history.salaryRecords || historyData.history.salaryRecords.length === 0) {
      return <p className="text-center text-gray-500 py-8">No salary records found</p>;
    }

    return (
      <div className="space-y-3">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Earned</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(historyData.stats.totalPaidSalary || 0)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">Average Salary</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(historyData.stats.averageSalary || 0)}</p>
          </div>
        </div>

        {historyData.history.salaryRecords.map((record, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Period: {record.month}/{record.year}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Base Salary: {formatCurrency(record.baseSalary)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Working Days: {record.workingDays || 0} / 26
                </p>
                {record.absentDays > 0 && (
                  <p className="text-sm text-red-600">Absent Days: {record.absentDays}</p>
                )}
                {record.lateDays > 0 && (
                  <p className="text-sm text-yellow-600">Late Days: {record.lateDays}</p>
                )}
                <p className="text-lg font-bold text-green-600 mt-2">
                  Net Salary: {formatCurrency(record.calculatedSalary)}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {record.status}
                </span>
                {record.paidAt && (
                  <p className="text-xs text-gray-500 mt-2">Paid: {formatDate(record.paidAt)}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAttendance = () => {
    if (!historyData?.history.attendance || historyData.history.attendance.length === 0) {
      return <p className="text-center text-gray-500 py-8">No attendance records found</p>;
    }

    // Group attendance by month
    const groupedByMonth = historyData.history.attendance.reduce((acc, record) => {
      const monthYear = new Date(record.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(record);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {Object.entries(groupedByMonth).map(([monthYear, records]) => {
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;
          const late = records.filter(r => r.status === 'late').length;
          const total = records.length;
          const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

          return (
            <div key={monthYear} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                <h4 className="font-semibold text-gray-900 dark:text-white">{monthYear}</h4>
                <div className="flex space-x-3 text-sm">
                  <span className="text-green-600">Present: {present}</span>
                  <span className="text-red-600">Absent: {absent}</span>
                  <span className="text-yellow-600">Late: {late}</span>
                  <span className="text-blue-600">Rate: {rate}%</span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1">
                  {records.map((record, idx) => (
                    <div
                      key={idx}
                      className={`p-2 text-center rounded-lg text-sm ${
                        record.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                      title={`${record.date} - ${record.status}`}
                    >
                      {new Date(record.date).getDate()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAuditTrail = () => {
    if (!historyData?.history.auditLogs || historyData.history.auditLogs.length === 0) {
      return <p className="text-center text-gray-500 py-8">No audit records found</p>;
    }

    return (
      <div className="space-y-3">
        {historyData.history.auditLogs.map((log, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(log.timestamp)}
            </p>
            {log.details && (
              <p className="text-xs text-gray-500 mt-1">
                Details: {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800">
          <div>
            <h2 className="text-xl font-bold text-white">Staff History</h2>
            <p className="text-sm text-blue-200">
              {userName} • {userRole}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition flex items-center whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-3xl" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'salary' && renderSalaryHistory()}
              {activeTab === 'attendance' && renderAttendance()}
              {activeTab === 'audit' && renderAuditTrail()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHistoryModal;