import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import AppointmentCard from './AppointmentCard';
import SearchBar from '../SearchBar';

const AppointmentList = ({ 
  appointments = [], 
  role = 'patient',
  title = 'Appointments',
  onApprove,
  onReject,
  onCheckIn,
  onCancel,
  onViewDetails,
  onChatWithDoctor, // Add this prop
  loading = false,
  showFilters = true
}) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Inside the component, add:
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Remove the isMounted ref check from useMemo
  const filteredAppointments = useMemo(() => {
    // Remove this line: if (!isMounted.current) return [];
    
    let filtered = [...appointments];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(apt => apt.status === filter);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(apt => {
        if (role === 'patient') {
          return (
            apt.doctorName?.toLowerCase().includes(term) ||
            apt.department?.toLowerCase().includes(term) ||
            apt.reason?.toLowerCase().includes(term)
          );
        } else {
          return (
            apt.patientName?.toLowerCase().includes(term) ||
            apt.patientPhone?.includes(term) ||
            apt.reason?.toLowerCase().includes(term)
          );
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else if (sortBy === 'priority') {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return 0;
      }
      return 0;
    });

    return filtered;
  }, [appointments, filter, searchTerm, sortBy, role]);

  // Memoize stats calculation
  const stats = useMemo(() => {
    const getStatusCount = (status) => {
      return appointments.filter(apt => apt.status === status).length;
    };

    return {
      total: appointments.length,
      pending: getStatusCount('pending'),
      approved: getStatusCount('approved'),
      checkedIn: getStatusCount('checked-in'),
      completed: getStatusCount('completed'),
      rejected: getStatusCount('rejected'),
      cancelled: getStatusCount('cancelled'),
      emergency: appointments.filter(apt => apt.isEmergency).length
    };
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {stats.emergency > 0 && (
          <div className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm font-semibold animate-pulse">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
            {stats.emergency} Emergency {stats.emergency === 1 ? 'Case' : 'Cases'}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('all')}
          >
            <p className="text-xs">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </button>
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'pending' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('pending')}
          >
            <p className="text-xs">Pending</p>
            <p className="text-lg font-bold">{stats.pending}</p>
          </button>
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'approved' 
                ? 'bg-green-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('approved')}
          >
            <p className="text-xs">Approved</p>
            <p className="text-lg font-bold">{stats.approved}</p>
          </button>
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'checked-in' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('checked-in')}
          >
            <p className="text-xs">Checked In</p>
            <p className="text-lg font-bold">{stats.checkedIn}</p>
          </button>
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'completed' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('completed')}
          >
            <p className="text-xs">Completed</p>
            <p className="text-lg font-bold">{stats.completed}</p>
          </button>
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'cancelled' 
                ? 'bg-gray-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('cancelled')}
          >
            <p className="text-xs">Cancelled</p>
            <p className="text-lg font-bold">{stats.cancelled}</p>
          </button>
          <button 
            className={`p-3 rounded-lg cursor-pointer transition ${
              filter === 'rejected' 
                ? 'bg-red-600 text-white' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`} 
            onClick={() => setFilter('rejected')}
          >
            <p className="text-xs">Rejected</p>
            <p className="text-lg font-bold">{stats.rejected}</p>
          </button>
        </div>
      )}

      {/* Search and Sort */}
      {showFilters && (
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <SearchBar
              placeholder={role === 'patient' ? "Search by doctor, department..." : "Search by patient name, phone..."}
              onSearch={setSearchTerm}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="priority">Sort by Priority</option>
          </select>
        </div>
      )}

      {/* Appointment List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <FontAwesomeIcon icon={faCalendarAlt} className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No appointments found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter !== 'all' ? 'Try changing your filter' : 'No appointments to display'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              role={role}
              onApprove={onApprove}
              onReject={onReject}
              onCheckIn={onCheckIn}
              onCancel={onCancel}
              onViewDetails={onViewDetails}
              onChatWithDoctor={onChatWithDoctor} // This prop is now defined
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentList;