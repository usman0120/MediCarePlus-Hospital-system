import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBed,
  faUserInjured,
  faCheckCircle,
  faClock,
  faExclamationTriangle,
  faHeartbeat,
  faSyringe,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const BedGrid = ({ beds = [], onAssign, onRelease, readOnly = false }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBed, setSelectedBed] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const getBedTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'icu':
        return 'border-red-300 bg-red-50 dark:bg-red-900';
      case 'general':
        return 'border-green-300 bg-green-50 dark:bg-green-900';
      case 'emergency':
        return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900';
      case 'isolation':
        return 'border-purple-300 bg-purple-50 dark:bg-purple-900';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100 dark:bg-green-800';
      case 'occupied':
        return 'text-red-600 bg-red-100 dark:bg-red-800';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-800';
      case 'reserved':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-800';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return faCheckCircle;
      case 'occupied':
        return faUserInjured;
      case 'maintenance':
        return faExclamationTriangle;
      case 'reserved':
        return faClock;
      default:
        return faBed;
    }
  };

  const filteredBeds = beds.filter(bed => {
    if (filter !== 'all' && bed.status !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        bed.id?.toLowerCase().includes(searchLower) ||
        bed.type?.toLowerCase().includes(searchLower) ||
        bed.patientName?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleBedClick = (bed) => {
    if (readOnly) {
      setSelectedBed(bed);
      return;
    }

    if (bed.status === 'available') {
      setSelectedBed(bed);
      setShowAssignmentModal(true);
    } else if (bed.status === 'occupied' && onRelease) {
      if (window.confirm('Are you sure you want to release this bed?')) {
        onRelease(bed.id);
      }
    }
  };

  const handleAssignBed = (patientId) => {
    if (!patientId) {
      toast.error('Please select a patient');
      return;
    }
    onAssign(selectedBed.id, patientId);
    setShowAssignmentModal(false);
    setSelectedBed(null);
  };

  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
    occupancyRate: beds.length ? ((beds.filter(b => b.status === 'occupied').length / beds.length) * 100).toFixed(1) : 0
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Beds</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Occupied</p>
          <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Occupancy Rate</p>
          <p className="text-2xl font-bold text-blue-600">{stats.occupancyRate}%</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Beds</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by bed ID, type, or patient..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Occupied</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Maintenance</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Reserved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredBeds.map((bed) => (
          <div
            key={bed.id}
            onClick={() => handleBedClick(bed)}
            className={`relative border-2 rounded-lg p-4 cursor-pointer transition transform hover:scale-105 ${getBedTypeColor(bed.type)} ${
              bed.status === 'available' ? 'hover:border-green-500' : ''
            }`}
          >
            {/* Bed Number */}
            <div className="absolute top-2 left-2 text-xs font-semibold text-gray-500">
              #{bed.id?.slice(-4)}
            </div>

            {/* Status Badge */}
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs ${getStatusColor(bed.status)}`}>
              <FontAwesomeIcon icon={getStatusIcon(bed.status)} className="mr-1" />
              {bed.status}
            </div>

            {/* Bed Type Icon */}
            <div className="mt-6 mb-2 text-center">
              <FontAwesomeIcon 
                icon={bed.type?.toLowerCase() === 'icu' ? faHeartbeat : 
                      bed.type?.toLowerCase() === 'emergency' ? faExclamationTriangle :
                      bed.type?.toLowerCase() === 'isolation' ? faSyringe : faBed} 
                className="h-8 w-8 text-gray-600 dark:text-gray-400" 
              />
            </div>

            {/* Bed Type */}
            <p className="text-center font-semibold text-gray-900 dark:text-white mb-1">
              {bed.type || 'General'}
            </p>

            {/* Patient Info if occupied */}
            {bed.status === 'occupied' && bed.patientName && (
              <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={bed.patientName}>
                  <FontAwesomeIcon icon={faUserInjured} className="mr-1" />
                  {bed.patientName}
                </p>
                {bed.assignedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Since: {new Date(bed.assignedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Daily Rate */}
            {bed.dailyRate && (
              <p className="text-xs text-gray-500 mt-1 text-center">
                {formatCurrency(bed.dailyRate)}/day
              </p>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredBeds.length === 0 && (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faBed} className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No beds found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters or search term
          </p>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedBed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Assign Bed #{selectedBed.id?.slice(-4)}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Patient ID or Name
                </label>
                <input
                  type="text"
                  id="patientId"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter patient ID or search..."
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <FontAwesomeIcon icon={faBed} className="mr-2" />
                  Bed Type: {selectedBed.type}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Daily Rate: {formatCurrency(selectedBed.dailyRate || 0)}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedBed(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const patientId = document.getElementById('patientId').value;
                    handleAssignBed(patientId);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Assign Bed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bed Details Modal (Read-only) */}
      {selectedBed && readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Bed Details
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bed ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedBed.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedBed.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(selectedBed.status)}`}>
                    {selectedBed.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Daily Rate</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(selectedBed.dailyRate || 0)}
                  </p>
                </div>
              </div>

              {selectedBed.patientName && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedBed.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Since</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(selectedBed.assignedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Assigned By</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedBed.assignedBy}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedBed(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedGrid;