import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlask,
  faCheckCircle,
  faClock,
  faFilter,
  faHourglassHalf,
  faBell,
  faMoon,
  faSort, faSortUp, faSortDown,
  faSun,
  faSearch,
  faUser,
  faUserMd,
  faChartLine,
  faListUl,
  faThLarge,
  faBars,
  faCog,
  faSignOutAlt as faLogout
} from '@fortawesome/free-solid-svg-icons';
import { logoutUser } from '../auth';
import {
  getLabRequests,
  updateLabRequestStatus,
  uploadLabResults,
  editLabResults,
  lockLabResults,
  getLabWorkloadStats,
  getTestCatalog,
  getLabRequestsByStatus,
  getUserNotifications,
  markNotificationAsRead
} from '../database';
import { formatDate} from '../utils/helpers';
import toast from 'react-hot-toast';
import LabDashboard from '../components/LabDashboard';
import LabRequestCard from '../components/LabRequestCard';
import LabResultsModal from '../components/LabResultsModal';
import hospitalLogo from '../../assets/logo.png';

const Lab = () => {
  const { currentUser, userDetails } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'priority', direction: 'desc' });
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Data states
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [inProgressRequests, setInProgressRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
    todayCompleted: 0,
    avgProcessingTime: 0
  });
  const [, setTestCatalog] = useState([]);

  // Modal states
  const [showResultModal, setShowResultModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalMode, setModalMode] = useState('upload'); // 'upload', 'view', 'edit'

  // Result form
  const [, setStartTime] = useState(null);

  // ========== FETCH FUNCTIONS ==========
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all requests
      const requestsResult = await getLabRequests({});
      if (requestsResult.success) {
        setRequests(requestsResult.data);
      }

      // Fetch pending requests
      const pendingResult = await getLabRequestsByStatus('pending');
      if (pendingResult.success) {
        setPendingRequests(pendingResult.data);
      }

      // Fetch in-progress requests
      const inProgressResult = await getLabRequestsByStatus('in-progress');
      if (inProgressResult.success) {
        setInProgressRequests(inProgressResult.data);
      }

      // Fetch completed requests
      const completedResult = await getLabRequestsByStatus('completed');
      if (completedResult.success) {
        setCompletedRequests(completedResult.data);
      }

      // Fetch workload stats
      const statsResult = await getLabWorkloadStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Fetch test catalog
      const catalogResult = await getTestCatalog();
      if (catalogResult.success) {
        setTestCatalog(catalogResult.data);
      }

      // Fetch notifications
      if (currentUser?.uid) {
        const notifResult = await getUserNotifications(currentUser.uid, 20);
        if (notifResult.success) {
          setNotifications(notifResult.data);
          setUnreadCount(notifResult.data.filter(n => !n.read).length);
        }
      }

    } catch (error) {
      console.error('Error fetching lab data:', error);
      toast.error('Failed to load lab data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchAllData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ========== HANDLER FUNCTIONS ==========
const handleStartTest = async (request) => {
  setSelectedRequest(request);
  setStartTime(new Date());
  setModalMode('upload');
  setShowResultModal(true);

  try {
    await updateLabRequestStatus(request.id, 'in-progress', {}, currentUser.uid);
    toast.success('Test started successfully');
    fetchAllData();
  } catch (error) {
    console.error('Error starting test:', error);
    toast.error('Failed to start test');
  }
};

const handleContinueTest = (request) => {
  setSelectedRequest(request);
  setModalMode('upload');
  setShowResultModal(true);
};

const handleViewResult = (request) => {
  setSelectedRequest(request);
  setModalMode('view');
  setShowViewModal(true);
};

const handleSubmitResults = async (resultData) => {
  try {
    const result = await uploadLabResults(selectedRequest.id, resultData, currentUser.uid);
    
    if (result.success) {
      toast.success('Lab results uploaded successfully');
      setShowResultModal(false);
      setSelectedRequest(null);
      fetchAllData();
    } else {
      toast.error(result.error || 'Failed to upload results');
    }
  } catch (error) {
    console.error('Error uploading results:', error);
    toast.error('Failed to upload results');
  }
};

const handleEditResults = async (resultData) => {
  try {
    const result = await editLabResults(selectedRequest.id, resultData, currentUser.uid);
    
    if (result.success) {
      toast.success('Results updated successfully');
      setShowResultModal(false);
      setSelectedRequest(null);
      fetchAllData();
    } else {
      toast.error(result.error || 'Failed to update results');
    }
  } catch (error) {
    console.error('Error editing results:', error);
    toast.error('Failed to update results');
  }
};

const handleLockResults = async (requestId) => {
  if (!window.confirm('Are you sure you want to lock these results? This action cannot be undone.')) {
    return;
  }

  try {
    const result = await lockLabResults(requestId, currentUser.uid);
    
    if (result.success) {
      toast.success('Results locked successfully');
      fetchAllData();
      if (showViewModal) setShowViewModal(false);
    } else {
      toast.error(result.error || 'Failed to lock results');
    }
  } catch (error) {
    console.error('Error locking results:', error);
    toast.error('Failed to lock results');
  }
};

const handleMarkNotificationRead = async (notificationId) => {
  try {
    await markNotificationAsRead(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// ===== ADD THIS FUNCTION HERE =====
const getSortIcon = (key) => {

  if (sortConfig.key !== key) return faSort;
  return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
};
// ==================================

const handleLogout = async () => {
  try {
    await logoutUser(currentUser.uid);
    navigate('/');
  } catch (error) {
    console.error('Error logging out:', error);
    toast.error('Failed to logout');
  }
};
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ========== FILTERED AND SORTED DATA ==========
  const getFilteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Filter by status tab
    if (activeTab !== 'dashboard' && activeTab !== 'all') {
      filtered = filtered.filter(r => r.status === activeTab);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(r => new Date(r.createdAt) <= new Date(dateRange.end));
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.patientName?.toLowerCase().includes(query) ||
        r.patientId?.toLowerCase().includes(query) ||
        r.doctorName?.toLowerCase().includes(query) ||
        r.id?.toLowerCase().includes(query) ||
        r.tests?.some(t => t.name?.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle special cases
      if (sortConfig.key === 'priority') {
        const priorityOrder = { urgent: 1, high: 2, normal: 3 };
        aVal = priorityOrder[a.priority] || 3;
        bVal = priorityOrder[b.priority] || 3;
      }

      if (sortConfig.key === 'createdAt' || sortConfig.key === 'completedAt' || sortConfig.key === 'startedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [requests, activeTab, filterPriority, filterStatus, dateRange, searchQuery, sortConfig]);

  // ========== TABS CONFIGURATION ==========
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faChartLine, count: null },
    { id: 'pending', label: 'Pending', icon: faClock, count: pendingRequests.length },
    { id: 'in-progress', label: 'In Progress', icon: faHourglassHalf, count: inProgressRequests.length },
    { id: 'completed', label: 'Completed', icon: faCheckCircle, count: completedRequests.length },
    { id: 'all', label: 'All Tests', icon: faListUl, count: requests.length }
  ];

  // ========== RENDER FUNCTIONS ==========
  const renderHeader = () => (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 ml-64">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Laboratory Portal
          </h2>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <FontAwesomeIcon icon={faThLarge} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients, tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition ${
              showFilters || filterPriority !== 'all' || filterStatus !== 'all' || dateRange.start
                ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faFilter} className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
            >
              <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-30">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 px-2 py-1 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <FontAwesomeIcon icon={faBell} className="h-8 w-8 text-gray-400 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkNotificationRead(notif.id)}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer transition ${
                          !notif.read ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            notif.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                            notif.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30' :
                            'bg-teal-100 dark:bg-teal-900/30'
                          }`}>
                            <FontAwesomeIcon 
                              icon={faBell} 
                              className={`h-4 w-4 ${
                                notif.priority === 'urgent' ? 'text-red-600 dark:text-red-400' :
                                notif.priority === 'high' ? 'text-orange-600 dark:text-orange-400' :
                                'text-teal-600 dark:text-teal-400'
                              }`} 
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(notif.timestamp)}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 ml-64">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={() => {
                setFilterPriority('all');
                setFilterStatus('all');
                setDateRange({ start: null, end: null });
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSidebar = () => (
    <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-teal-700 to-teal-900 text-white shadow-2xl z-30">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-teal-600">
          <div className="flex items-center space-x-3">
            <img src={hospitalLogo} alt="MediCare Plus" className="h-10 w-10 rounded-lg bg-white p-1" />
            <div>
              <h1 className="text-lg font-bold text-white">MediCare Plus</h1>
              <p className="text-xs text-teal-300">Laboratory Portal</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-teal-600">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-teal-600 rounded-xl flex items-center justify-center border-2 border-teal-400">
              <FontAwesomeIcon icon={faFlask} className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">{userDetails?.fullName?.split(' ')[0] || 'Lab Tech'}</p>
              <p className="text-xs text-teal-300">{userDetails?.email || 'lab@medicare.com'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white shadow-lg'
                      : 'text-teal-200 hover:bg-teal-600/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={tab.icon} className="mr-3" />
                    {tab.label}
                  </div>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      activeTab === tab.id
                        ? 'bg-teal-500 text-white'
                        : 'bg-teal-800 text-teal-200'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick Stats */}
        <div className="p-4 border-t border-teal-600 bg-teal-800/50">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-teal-300">Today's Workload:</span>
              <span className="text-white font-medium">{stats.total} tests</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-300">Avg. Processing:</span>
              <span className="text-white font-medium">{stats.avgProcessingTime}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-300">Completed Today:</span>
              <span className="text-white font-medium">{stats.todayCompleted}</span>
            </div>
          </div>
        </div>

        {/* Settings & Logout */}
        <div className="p-4 border-t border-teal-600 space-y-2">
          <button
            className="w-full flex items-center px-4 py-3 text-teal-200 hover:bg-teal-600 rounded-xl transition"
          >
            <FontAwesomeIcon icon={faCog} className="mr-3" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-teal-200 hover:bg-red-600 hover:text-white rounded-xl transition"
          >
            <FontAwesomeIcon icon={faLogout} className="mr-3" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return <LabDashboard stats={stats} urgentPending={pendingRequests.filter(r => r.priority === 'urgent').length} />;
    }

    const filteredRequests = getFilteredRequests;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tabs.find(t => t.id === activeTab)?.label} Tests
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({filteredRequests.length} {filteredRequests.length === 1 ? 'test' : 'tests'})
            </span>
          </h2>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading test requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faFlask} className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Test Requests Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || filterPriority !== 'all' || filterStatus !== 'all' || dateRange.start
                ? 'Try adjusting your filters'
                : 'No test requests available in this category'}
            </p>
            {(searchQuery || filterPriority !== 'all' || filterStatus !== 'all' || dateRange.start) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterPriority('all');
                  setFilterStatus('all');
                  setDateRange({ start: null, end: null });
                }}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRequests.map((request) => (
                  <LabRequestCard
                    key={request.id}
                    request={request}
                    type={activeTab}
                    onStart={handleStartTest}
                    onContinue={handleContinueTest}
                    onView={handleViewResult}
                    loading={loading}
                  />
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-teal-600" onClick={() => handleSort('priority')}>
                          <div className="flex items-center">
                            Priority
                            <FontAwesomeIcon icon={getSortIcon('priority')} className="ml-1" />
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Doctor
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tests
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>
                          <div className="flex items-center">
                            Requested
                            <FontAwesomeIcon icon={getSortIcon('createdAt')} className="ml-1" />
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredRequests.map((req) => {
                        const priorityColors = {
                          urgent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
                          high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
                          normal: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        };
                        const statusColors = {
                          pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
                          'in-progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                          completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        };

                        return (
                          <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${priorityColors[req.priority] || priorityColors.normal}`}>
                                {req.priority?.toUpperCase() || 'NORMAL'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mr-3">
                                  <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {req.patientName || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ID: {req.patientId?.slice(-6) || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                                  <FontAwesomeIcon icon={faUserMd} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-sm text-gray-900 dark:text-white">Dr. {req.doctorName || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {req.tests?.map(t => t.name).join(', ')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatDate(req.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusColors[req.status]}`}>
                                {req.status === 'in-progress' ? 'In Progress' : req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {activeTab === 'pending' && (
                                <button
                                  onClick={() => handleStartTest(req)}
                                  className="text-teal-600 hover:text-teal-700 mr-3 font-medium"
                                >
                                  Start
                                </button>
                              )}
                              {activeTab === 'in-progress' && (
                                <button
                                  onClick={() => handleContinueTest(req)}
                                  className="text-yellow-600 hover:text-yellow-700 mr-3 font-medium"
                                >
                                  Continue
                                </button>
                              )}
                              {activeTab === 'completed' && (
                                <button
                                  onClick={() => handleViewResult(req)}
                                  className="text-green-600 hover:text-green-700 mr-3 font-medium"
                                >
                                  View
                                </button>
                              )}
                              {(activeTab === 'all' || activeTab === 'dashboard') && req.status === 'pending' && (
                                <button
                                  onClick={() => handleStartTest(req)}
                                  className="text-teal-600 hover:text-teal-700 mr-3 font-medium"
                                >
                                  Start
                                </button>
                              )}
                              {(activeTab === 'all' || activeTab === 'dashboard') && req.status === 'in-progress' && (
                                <button
                                  onClick={() => handleContinueTest(req)}
                                  className="text-yellow-600 hover:text-yellow-700 mr-3 font-medium"
                                >
                                  Continue
                                </button>
                              )}
                              {(activeTab === 'all' || activeTab === 'dashboard') && req.status === 'completed' && (
                                <button
                                  onClick={() => handleViewResult(req)}
                                  className="text-green-600 hover:text-green-700 mr-3 font-medium"
                                >
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Don't render if no user
  if (!currentUser?.uid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {renderSidebar()}
      {renderHeader()}
      <div className="ml-64 pt-24 p-8">
        {renderContent()}
      </div>

      {/* Modals */}
      {showResultModal && (
        <LabResultsModal
          request={selectedRequest}
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedRequest(null);
          }}
          onSubmit={handleSubmitResults}
          loading={loading}
          mode={modalMode}
        />
      )}

      {showViewModal && (
        <LabResultsModal
          request={selectedRequest}
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
          onSubmit={handleEditResults}
          onLock={handleLockResults}
          loading={loading}
          mode="view"
        />
      )}
    </div>
  );
};

export default Lab;