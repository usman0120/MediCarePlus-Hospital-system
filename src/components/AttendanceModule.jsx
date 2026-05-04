import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faUserMd,
  faUserNurse,
  faFlask,
  faUserTie,
  faUsers,
  faSearch,
  faSpinner,
  faUserClock,
  faUserMinus,
  faCalendarAlt,
  faFilter,
  faFileExcel,
  faSave,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import {
  getAllStaffForAttendance,
  getCompleteAttendanceByDate,
  markAttendance,
  bulkMarkAttendance,
  getDepartments
} from '../database';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AttendanceModule = ({ onAttendanceMarked }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [staffList, setStaffList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('present');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    notMarked: 0
  });

  // Staff roles for filtering
  const roles = [
    { value: 'all', label: 'All Staff', icon: faUsers },
    { value: 'doctor', label: 'Doctors', icon: faUserMd },
    { value: 'nurse', label: 'Nurses', icon: faUserNurse },
    { value: 'lab', label: 'Lab Staff', icon: faFlask },
    { value: 'receptionist', label: 'Receptionists', icon: faUserTie },
    { value: 'accountant', label: 'Accountants', icon: faUserClock },
    { value: 'admin', label: 'Admin', icon: faUserTie },
    { value: 'department_staff', label: 'Department Staff', icon: faUserNurse }
  ];

  // Fetch departments for filter
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

  // Fetch staff and attendance data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all staff with salary
      const staffResult = await getAllStaffForAttendance();
      if (staffResult.success) {
        setStaffList(staffResult.data);
      }

      // Fetch attendance for selected date
      const dateStr = selectedDate.toISOString().split('T')[0];
      const attendanceResult = await getCompleteAttendanceByDate(dateStr);
      
      if (attendanceResult.success) {
        setAttendanceRecords(attendanceResult.data);
        calculateStats(attendanceResult.data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDepartments();
    fetchData();
  }, [fetchDepartments, fetchData]);

  // Calculate attendance statistics
  const calculateStats = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const notMarked = records.filter(r => r.isAutoMarked === true && r.status === 'absent').length;

    setStats({ total, present, absent, late, leave, notMarked });
  };

  // Handle marking attendance for single staff
  const handleMarkAttendance = async (userId, status) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setSaving(true);
    try {
      const result = await markAttendance(userId, dateStr, status, currentUser.uid);
      
      if (result.success) {
        toast.success(`Attendance marked as ${status}`);
        await fetchData(); // Refresh data
        
        if (onAttendanceMarked) {
          onAttendanceMarked(result.data);
        }
      } else {
        toast.error(result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk attendance marking
  const handleBulkMarkAttendance = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const unmarkedStaff = filteredStaff.filter(s => {
      const record = attendanceRecords.find(r => r.userId === s.userId);
      return !record || record.isAutoMarked;
    });

    if (unmarkedStaff.length === 0) {
      toast.info('All staff already marked for this date');
      setShowBulkModal(false);
      return;
    }

    const attendanceData = unmarkedStaff.map(staff => ({
      userId: staff.userId,
      status: bulkStatus
    }));

    setSaving(true);
    try {
      const result = await bulkMarkAttendance(attendanceData, dateStr, currentUser.uid);
      
      if (result.success) {
        toast.success(`Marked ${result.data.length} staff as ${bulkStatus}`);
        await fetchData();
        setShowBulkModal(false);
      } else {
        toast.error(result.error || 'Failed to mark bulk attendance');
      }
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
      toast.error('Failed to mark bulk attendance');
    } finally {
      setSaving(false);
    }
  };

  // Handle mark all present for filtered staff
  const handleMarkFilteredPresent = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const unmarkedFiltered = filteredStaff.filter(s => {
      const record = attendanceRecords.find(r => r.userId === s.userId);
      return !record || record.isAutoMarked;
    });

    if (unmarkedFiltered.length === 0) {
      toast.info('All filtered staff already marked');
      return;
    }

    if (!window.confirm(`Mark ${unmarkedFiltered.length} staff as present?`)) return;

    const attendanceData = unmarkedFiltered.map(staff => ({
      userId: staff.userId,
      status: 'present'
    }));

    setSaving(true);
    try {
      const result = await bulkMarkAttendance(attendanceData, dateStr, currentUser.uid);
      if (result.success) {
        toast.success(`Marked ${result.data.length} staff as present`);
        await fetchData();
      }
    } catch (error) {
      console.error('Error marking filtered present:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status, isAutoMarked) => {
    if (isAutoMarked && status === 'absent') {
      return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
    }
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return faCheckCircle;
      case 'absent':
        return faTimesCircle;
      case 'late':
        return faExclamationTriangle;
      case 'leave':
        return faUserMinus;
      default:
        return faClock;
    }
  };

  // Filter staff based on role, department, and search
  const filteredStaff = staffList.filter(staff => {
    const matchesRole = filterRole === 'all' || 
      (filterRole === 'department_staff' ? !staff.isSystemUser : staff.role === filterRole);
    const matchesDepartment = filterDepartment === 'all' || staff.department === filterDepartment;
    const matchesSearch = searchQuery === '' || 
      staff.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phone?.includes(searchQuery);
    return matchesRole && matchesDepartment && matchesSearch;
  });

  // Get attendance record for a staff member
  const getAttendanceForStaff = (userId) => {
    return attendanceRecords.find(r => r.userId === userId);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Role', 'Department', 'Status', 'Check In Time', 'Base Salary'];
    const rows = filteredStaff.map(staff => {
      const attendance = getAttendanceForStaff(staff.userId);
      return [
        staff.fullName,
        staff.role,
        staff.department,
        attendance?.status || 'Not Marked',
        attendance?.checkInTime || '--:--',
        staff.baseSalary?.toLocaleString() || '0'
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported successfully');
  };

  // Get attendance rate
  const getAttendanceRate = () => {
    if (stats.total === 0) return 0;
    const totalMarked = stats.present + stats.late + stats.leave;
    return ((totalMarked / stats.total) * 100).toFixed(1);
  };

  // Get present rate
  const getPresentRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.present / stats.total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Attendance</h2>
            <p className="text-gray-600 dark:text-gray-400">Mark daily attendance for all staff including department staff</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Includes system users and department staff with base salary configuration
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500" />
              <DatePicker
                selected={selectedDate}
                onChange={setSelectedDate}
                dateFormat="MMMM d, yyyy"
                className="bg-transparent focus:outline-none text-gray-900 dark:text-white w-36"
              />
            </div>
            <button
              onClick={handleMarkFilteredPresent}
              disabled={saving || filteredStaff.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              Mark Filtered Present
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              Bulk Mark
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faFileExcel} className="mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Late</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Leave</p>
          <p className="text-2xl font-bold text-blue-600">{stats.leave}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-gray-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Not Marked</p>
          <p className="text-2xl font-bold text-gray-600">{stats.notMarked}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow p-4 text-white">
          <p className="text-sm text-blue-100">Present Rate</p>
          <p className="text-2xl font-bold">{getAttendanceRate()}%</p>
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
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none cursor-pointer"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            {filterRole === 'department_staff' && departments.length > 0 && (
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
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
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Check In Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl" />
                    <p className="mt-2 text-gray-500">Loading staff data...</p>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No staff members found
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const attendance = getAttendanceForStaff(staff.userId);
                  
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                            <span className="text-sm font-bold">
                              {staff.fullName?.charAt(0).toUpperCase()}
                            </span>
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
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                          staff.role === 'doctor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          staff.role === 'nurse' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {staff.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {staff.baseSalary > 0 ? `PKR ${staff.baseSalary.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendance ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center w-fit ${getStatusBadgeColor(attendance.status, attendance.isAutoMarked)}`}>
                            <FontAwesomeIcon icon={getStatusIcon(attendance.status)} className="mr-1" />
                            {attendance.status}
                            {attendance.isAutoMarked && <span className="ml-1 text-xs">(auto)</span>}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs">
                            Not Marked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {attendance?.checkInTime || '--:--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleMarkAttendance(staff.userId, 'present')}
                            disabled={saving}
                            className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400 dark:hover:bg-green-800 transition"
                            title="Mark Present"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAttendance(staff.userId, 'late')}
                            disabled={saving}
                            className="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-400 dark:hover:bg-yellow-800 transition"
                            title="Mark Late"
                          >
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAttendance(staff.userId, 'absent')}
                            disabled={saving}
                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 transition"
                            title="Mark Absent"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAttendance(staff.userId, 'leave')}
                            disabled={saving}
                            className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 transition"
                            title="Mark Leave"
                          >
                            <FontAwesomeIcon icon={faUserMinus} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Mark Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Bulk Mark Attendance</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Mark attendance for all unmarked staff for {selectedDate.toLocaleDateString()}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Status
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkMarkAttendance}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
              >
                {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> : <FontAwesomeIcon icon={faSave} className="mr-2" />}
                Mark All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="mr-2 text-blue-500" />
            Attendance Summary
          </h3>
          <span className="text-sm text-gray-500">
            Date: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Present Rate</p>
            <p className="text-xl font-bold text-green-600">{getPresentRate()}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Absent Rate</p>
            <p className="text-xl font-bold text-red-600">
              {stats.total > 0 ? ((stats.absent / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Late Rate</p>
            <p className="text-xl font-bold text-yellow-600">
              {stats.total > 0 ? ((stats.late / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Leave Rate</p>
            <p className="text-xl font-bold text-blue-600">
              {stats.total > 0 ? ((stats.leave / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
            <p className={`text-xl font-bold ${getAttendanceRate() >= 80 ? 'text-purple-600' : 'text-orange-600'}`}>
              {getAttendanceRate()}%
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Attendance Completion</span>
            <span>{getAttendanceRate()}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getAttendanceRate()}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModule;