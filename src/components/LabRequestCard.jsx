import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlask,
  faClock,
  faHourglassHalf,
  faCheckCircle,
  faExclamationTriangle,
  faCalendarAlt,
  faUser,
  faUserMd,
  faPlay,
  faRedoAlt,
  faEye,
  faFileAlt,
  faTag
} from '@fortawesome/free-solid-svg-icons';
import { formatDate } from '../utils/helpers';

const LabRequestCard = ({ request, type, onStart, onContinue, onView, loading }) => {
  const getPriorityConfig = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-800 dark:text-red-300',
          border: 'border-red-300 dark:border-red-700',
          badge: '🔴 Urgent',
          icon: faExclamationTriangle,
          glow: 'shadow-red-200 dark:shadow-red-900/50'
        };
      case 'high':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-800 dark:text-orange-300',
          border: 'border-orange-300 dark:border-orange-700',
          badge: '🟡 High',
          icon: faClock,
          glow: 'shadow-orange-200 dark:shadow-orange-900/50'
        };
      default:
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-300',
          border: 'border-green-300 dark:border-green-700',
          badge: '🟢 Normal',
          icon: faFlask,
          glow: 'shadow-green-200 dark:shadow-green-900/50'
        };
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-300',
          icon: faClock,
          label: 'Pending'
        };
      case 'in-progress':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-800 dark:text-blue-300',
          icon: faHourglassHalf,
          label: 'In Progress'
        };
      case 'completed':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-300',
          icon: faCheckCircle,
          label: 'Completed'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-800 dark:text-gray-300',
          icon: faTag,
          label: status
        };
    }
  };

  const priority = getPriorityConfig(request.priority);
  const status = getStatusConfig(request.status);

  const getActionButton = () => {
    switch (type) {
      case 'pending':
        return (
          <button
            onClick={() => onStart(request)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <FontAwesomeIcon icon={faPlay} className="mr-2" />
            )}
            Start Test
          </button>
        );
      case 'in-progress':
        return (
          <button
            onClick={() => onContinue(request)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            <FontAwesomeIcon icon={faRedoAlt} className="mr-2" />
            Continue
          </button>
        );
      case 'completed':
        return (
          <button
            onClick={() => onView(request)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            <FontAwesomeIcon icon={faEye} className="mr-2" />
            View Results
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${priority.border} overflow-hidden group ${priority.glow}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${priority.bg} ${priority.text} flex items-center`}>
              <FontAwesomeIcon icon={priority.icon} className="mr-1.5" />
              {priority.badge}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status.bg} ${status.text} flex items-center`}>
              <FontAwesomeIcon icon={status.icon} className="mr-1.5" />
              {status.label}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
            ID: {request.id?.slice(-8)}
          </span>
        </div>

        {/* Patient & Doctor Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Patient</p>
              <p className="font-medium text-gray-900 dark:text-white">{request.patientName || 'Unknown'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ID: {request.patientId?.slice(-6) || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faUserMd} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Doctor</p>
              <p className="font-medium text-gray-900 dark:text-white">Dr. {request.doctorName || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Tests */}
        {request.tests && request.tests.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <FontAwesomeIcon icon={faFileAlt} className="mr-1.5 text-teal-500" />
              Required Tests ({request.tests.length})
            </p>
            <div className="space-y-2">
              {request.tests.map((test, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{test.name}</p>
                  {test.instructions && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                      📝 {test.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-1.5 text-teal-500" />
            <span>Requested: {formatDate(request.createdAt)}</span>
          </div>
          {request.startedAt && (
            <div className="flex items-center">
              <FontAwesomeIcon icon={faHourglassHalf} className="mr-1.5 text-blue-500" />
              <span>Started: {formatDate(request.startedAt)}</span>
            </div>
          )}
          {request.completedAt && (
            <div className="flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5 text-green-500" />
              <span>Completed: {formatDate(request.completedAt)}</span>
            </div>
          )}
        </div>

        {/* Doctor's Notes */}
        {request.notes && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Doctor's Notes:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{request.notes}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4">
          {getActionButton()}
        </div>
      </div>
    </div>
  );
};

export default LabRequestCard;