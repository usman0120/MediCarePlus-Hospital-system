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
  faUserMinus
} from '@fortawesome/free-solid-svg-icons';
import {
  getUsersByRole,
  markAttendance,
  getStaffAttendance,
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
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    { value: 'support', label: 'Support Staff', icon: faUserClock }
  ];

  // Fetch staff list and attendance records
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all staff by roles
      const rolesToFetch = ['doctor', 'receptionist', 'lab', 'nurse', 'support'];
      const staffPromises = rolesToFetch.map(role => getUsersByRole(role));
      const staffResults = await Promise.all(staffPromises);
      
      const allStaff = staffResults.reduce((acc, result, index) => {
        if (result.success) {
          return [...acc, ...result.data.map(s => ({
            ...s,
            role: rolesToFetch[index]
          }))];
        }
        return acc;
      }, []);

      setStaffList(allStaff);

      // Fetch attendance for selected date
      const dateStr = selectedDate.toISOString().split('T')[0];
      const attendanceResult = await getStaffAttendance(dateStr);
      
      if (attendanceResult.success) {
        setAttendanceRecords(attendanceResult.data);
        calculateStats(allStaff, attendanceResult.data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate attendance statistics
  const calculateStats = (staff, records) => {
    const total = staff.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const notMarked = total - records.length;

    setStats({ total, present, absent, late, leave, notMarked });
  };

  // Handle marking attendance
  const handleMarkAttendance = async (staffId, status) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setLoading(true);
    try {
      const result = await markAttendance(staffId, dateStr, status, currentUser.uid);
      
      if (result.success) {
        toast.success(`Attendance marked as ${status} for ${result.data.fullName}`);
        
        // Update local state
        const newRecord = result.data;
        setAttendanceRecords(prev => {
          const filtered = prev.filter(r => r.userId !== staffId);
          return [...filtered, newRecord];
        });

        // Recalculate stats
        calculateStats(staffList, [...attendanceRecords.filter(r => r.userId !== staffId), newRecord]);

        if (onAttendanceMarked) {
          onAttendanceMarked(newRecord);
        }
      } else {
        toast.error(result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk attendance (all present)
  const handleMarkAllPresent = async () => {
    if (!window.confirm('Mark all staff as present for today?')) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    setLoading(true);
    
    try {
      const promises = filteredStaff
        .filter(s => !attendanceRecords.find(r => r.userId === s.id))
        .map(s => markAttendance(s.id, dateStr, 'present', currentUser.uid));
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success).length;
      
      toast.success(`Marked ${successful} staff as present`);
      await fetchData();
    } catch (error) {
      console.error('Error marking bulk attendance:', error);
      toast.error('Failed to mark bulk attendance');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
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

  // Filter staff based on role and search
  const filteredStaff = staffList.filter(staff => {
    const matchesRole = filterRole === 'all' || staff.role === filterRole;
    const matchesSearch = searchQuery === '' || 
      staff.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phone?.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Attendance</h2>
            <p className="text-gray-600 dark:text-gray-400">Mark daily attendance for all staff</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <DatePicker
              selected={selectedDate}
              onChange={setSelectedDate}
              dateFormat="MMMM d, yyyy"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleMarkAllPresent}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              Mark All Present
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Late</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">On Leave</p>
          <p className="text-2xl font-bold text-blue-600">{stats.leave}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-gray-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Not Marked</p>
          <p className="text-2xl font-bold text-gray-600">{stats.notMarked}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
      </div>

      {/* Attendance Table */}
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
                  Department
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
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl" />
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No staff members found
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const attendance = attendanceRecords.find(r => r.userId === staff.id);
                  
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
                                faUserClock
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {staff.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendance ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center w-fit ${getStatusBadgeColor(attendance.status)}`}>
                            <FontAwesomeIcon icon={getStatusIcon(attendance.status)} className="mr-1" />
                            {attendance.status}
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
                            onClick={() => handleMarkAttendance(staff.id, 'present')}
                            disabled={loading || attendance?.status === 'present'}
                            className={`p-2 rounded-lg ${
                              attendance?.status === 'present'
                                ? 'bg-green-100 text-green-400 cursor-not-allowed'
                                : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400 dark:hover:bg-green-800'
                            }`}
                            title="Mark Present"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAttendance(staff.id, 'late')}
                            disabled={loading || attendance?.status === 'late'}
                            className={`p-2 rounded-lg ${
                              attendance?.status === 'late'
                                ? 'bg-yellow-100 text-yellow-400 cursor-not-allowed'
                                : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-400 dark:hover:bg-yellow-800'
                            }`}
                            title="Mark Late"
                          >
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAttendance(staff.id, 'absent')}
                            disabled={loading || attendance?.status === 'absent'}
                            className={`p-2 rounded-lg ${
                              attendance?.status === 'absent'
                                ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800'
                            }`}
                            title="Mark Absent"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAttendance(staff.id, 'leave')}
                            disabled={loading || attendance?.status === 'leave'}
                            className={`p-2 rounded-lg ${
                              attendance?.status === 'leave'
                                ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800'
                            }`}
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

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Attendance Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Present Rate</p>
            <p className="text-xl font-bold text-green-600">
              {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0}%
            </p>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Completion</p>
            <p className="text-xl font-bold text-purple-600">
              {stats.total > 0 ? (((stats.present + stats.absent + stats.late + stats.leave) / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModule;