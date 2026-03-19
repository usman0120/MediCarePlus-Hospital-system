import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faClock,
  faUserMd,
  faUserInjured,
  faCheckCircle,
  faTimesCircle,
  faComment,
  faHourglassHalf,
  faPhone,
  faEnvelope,
  faNotesMedical,
  faPrint,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { generateAppointmentSlip } from '../../database';

const AppointmentCard = ({ 
  appointment, 
  role = 'patient',
  onApprove, 
  onReject, 
  onCheckIn,
  onCancel,
  onViewDetails,
  onChatWithDoctor,
  showActions = true 
}) => {

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'checked-in':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'no-show':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return faHourglassHalf;
    case 'approved':
    case 'scheduled':
    case 'checked-in':
    case 'completed':
      return faCheckCircle;
    case 'cancelled':
    case 'rejected':
    case 'no-show':
      return faTimesCircle;
    default:
      return faCalendarCheck;
  }
};

  const handlePrintSlip = () => {
    generateAppointmentSlip(appointment);
  };

  const isPastAppointment = () => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    return appointmentDate < new Date();
  };

  const canCancel = () => {
    if (role !== 'patient') return false;
    if (appointment.status === 'completed' || appointment.status === 'cancelled') return false;
    if (appointment.status === 'approved' && isPastAppointment()) return false;
    return true;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${
      appointment.isEmergency ? 'border-red-500' : 'border-blue-500'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          {appointment.isEmergency && (
            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-semibold animate-pulse">
              EMERGENCY
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center ${getStatusColor(appointment.status)}`}>
            <FontAwesomeIcon icon={getStatusIcon(appointment.status)} className="mr-1" />
            {appointment.status?.toUpperCase()}
          </span>
        </div>
        <button
          onClick={handlePrintSlip}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Print Appointment Slip"
        >
          <FontAwesomeIcon icon={faPrint} />
        </button>
      </div>

      {/* Patient/Doctor Info */}
      <div className="mb-3">
        {role === 'patient' ? (
          <div className="flex items-center">
            <FontAwesomeIcon icon={faUserMd} className="text-blue-500 mr-2" />
            <span className="font-medium text-gray-900 dark:text-white">
              Dr. {appointment.doctorName || 'Not Assigned'}
            </span>
            {appointment.doctorSpecialization && (
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                ({appointment.doctorSpecialization})
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <FontAwesomeIcon icon={faUserInjured} className="text-green-500 mr-2" />
            <span className="font-medium text-gray-900 dark:text-white">
              {appointment.patientName || 'Unknown Patient'}
            </span>
          </div>
        )}
      </div>

      {/* Appointment Details */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 w-4" />
          {appointment.date}
        </div>
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <FontAwesomeIcon icon={faClock} className="mr-2 w-4" />
          {appointment.time}
        </div>
        {role !== 'patient' && (
          <>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <FontAwesomeIcon icon={faPhone} className="mr-2 w-4" />
              {appointment.patientPhone || 'N/A'}
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400 truncate">
              <FontAwesomeIcon icon={faEnvelope} className="mr-2 w-4" />
              {appointment.patientEmail || 'N/A'}
            </div>
          </>
        )}
      </div>

      {/* Reason */}
      {appointment.reason && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-gray-500" />
            {appointment.reason}
          </p>
        </div>
      )}

      {/* Rejection Reason */}
      {appointment.status === 'rejected' && appointment.rejectionReason && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-200">
            <span className="font-semibold">Rejection Reason:</span> {appointment.rejectionReason}
          </p>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {/* Receptionist Actions */}
          {role === 'receptionist' && appointment.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(appointment.id)}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              >
                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                Approve
              </button>
              <button
                onClick={() => onReject(appointment.id)}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
                Reject
              </button>
            </>
          )}

          {role === 'receptionist' && appointment.status === 'approved' && (
            <button
              onClick={() => onCheckIn(appointment.id)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
              Check In
            </button>
          )}

          {/* Doctor Actions */}
          {role === 'doctor' && appointment.status === 'checked-in' && (
            <button
              onClick={() => onViewDetails(appointment)}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
            >
              Start Consultation
            </button>
          )}

{/* Add Chat button for doctors */}
{role === 'doctor' && (appointment.status === 'approved' || appointment.status === 'checked-in') && onChatWithDoctor && (
  <button
    onClick={() => onChatWithDoctor(appointment.patientId, appointment.patientName)}
    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center"
  >
    <FontAwesomeIcon icon={faComment} className="mr-1" />
    Chat
  </button>
)}
          {/* Patient Actions */}
          {role === 'patient' && canCancel() && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              Cancel Appointment
            </button>
          )}

{/* Add Chat button for approved appointments */}
{role === 'patient' && appointment.status === 'approved' && onChatWithDoctor && (
  <button
    onClick={() => onChatWithDoctor(appointment.doctorId, appointment.doctorName)}
    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center"
  >
    <FontAwesomeIcon icon={faComment} className="mr-1" />
    Chat
  </button>
)}

          {/* View Details (common) */}
          <button
            onClick={() => onViewDetails(appointment)}
            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;