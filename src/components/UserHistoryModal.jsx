import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faMoneyBill,
  faFlask,
  faFileMedical,
  faClock,
  faStar,
  faHistory,
  faClipboardList,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { getUserHistory } from '../database';
import { formatDate, formatCurrency } from '../utils/helpers';

const UserHistoryModal = ({ userId, userName, userRole, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ✅ FIXED: Move the async logic directly inside useEffect
  useEffect(() => {
    let isMounted = true; // To prevent state updates if component unmounts
    
    const loadUserHistory = async () => {
      if (!userId) return;
      
      setLoading(true);
      const result = await getUserHistory(userId);
      
      // Only update state if component is still mounted
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

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [userId]); // ✅ Only depend on userId directly

  const tabs = [
    { id: 'overview', label: 'Overview', icon: faClipboardList },
    { id: 'appointments', label: 'Appointments', icon: faCalendarAlt },
    { id: 'visits', label: 'Medical Visits', icon: faFileMedical },
    { id: 'invoices', label: 'Payments', icon: faMoneyBill },
    { id: 'lab', label: 'Lab Tests', icon: faFlask },
    { id: 'attendance', label: 'Attendance', icon: faClock },
    { id: 'ratings', label: 'Ratings', icon: faStar },
    { id: 'audit', label: 'Audit Trail', icon: faHistory }
  ];

  const renderOverview = () => {
    if (!historyData) return null;
    const { history, stats } = historyData;

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-300">Appointments</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{stats.totalAppointments}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-300">Visits</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{stats.totalVisits}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
            <p className="text-sm text-purple-600 dark:text-purple-300">Total Paid</p>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{formatCurrency(stats.totalPaid)}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-300">Avg Rating</p>
            <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{stats.averageRating.toFixed(1)}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h4>
          <div className="space-y-3">
            {history.auditLogs && history.auditLogs.slice(0, 5).map((log, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faHistory} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{log.action}</p>
                  <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                </div>
              </div>
            ))}
            {(!history.auditLogs || history.auditLogs.length === 0) && (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAppointments = () => {
    if (!historyData?.history.appointments || historyData.history.appointments.length === 0) {
      return <p className="text-center text-gray-500 py-8">No appointments found</p>;
    }

    return (
      <div className="space-y-3">
        {historyData.history.appointments.map((apt, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{apt.date} at {apt.time}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Doctor: {apt.doctorName || 'N/A'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reason: {apt.reason}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                apt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {apt.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVisits = () => {
    if (!historyData?.history.visits || historyData.history.visits.length === 0) {
      return <p className="text-center text-gray-500 py-8">No medical visits found</p>;
    }

    return (
      <div className="space-y-3">
        {historyData.history.visits.map((visit, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(visit.createdAt)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Diagnosis: {visit.diagnosis || 'N/A'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Doctor: {visit.doctorName || 'N/A'}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                visit.status === 'active' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {visit.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInvoices = () => {
    if (!historyData?.history.invoices || historyData.history.invoices.length === 0) {
      return <p className="text-center text-gray-500 py-8">No invoices found</p>;
    }

    return (
      <div className="space-y-3">
        {historyData.history.invoices.map((invoice, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Invoice #{invoice.id?.slice(-6) || 'N/A'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(invoice.createdAt)}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">
                  Total: {formatCurrency(invoice.total)}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {invoice.status}
              </span>
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

    return (
      <div className="space-y-3">
        {historyData.history.attendance.map((record, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{record.date}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Marked by: {record.markedBy}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                record.status === 'present' ? 'bg-green-100 text-green-800' :
                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {record.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRatings = () => {
    if (!historyData?.history.ratings || historyData.history.ratings.length === 0) {
      return <p className="text-center text-gray-500 py-8">No ratings found</p>;
    }

    return (
      <div className="space-y-3">
        {historyData.history.ratings.map((rating, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <FontAwesomeIcon
                  key={star}
                  icon={faStar}
                  className={star <= rating.rating ? 'text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{rating.review || 'No review'}</p>
            <p className="text-xs text-gray-500 mt-1">{formatDate(rating.createdAt)}</p>
          </div>
        ))}
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
              <p className="text-xs text-gray-500 mt-1">Details: {JSON.stringify(log.details)}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {userName} • {userRole}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              {activeTab === 'appointments' && renderAppointments()}
              {activeTab === 'visits' && renderVisits()}
              {activeTab === 'invoices' && renderInvoices()}
              {activeTab === 'lab' && (
                <div className="space-y-3">
                  {historyData?.history.labRequests && historyData.history.labRequests.length > 0 ? (
                    historyData.history.labRequests.map((req, index) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{req.testName || 'Lab Test'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Requested: {formatDate(req.createdAt)}</p>
                            {req.results && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Results: {req.results}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            req.status === 'completed' ? 'bg-green-100 text-green-800' :
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No lab requests found</p>
                  )}
                </div>
              )}
              {activeTab === 'attendance' && renderAttendance()}
              {activeTab === 'ratings' && renderRatings()}
              {activeTab === 'audit' && renderAuditTrail()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHistoryModal;