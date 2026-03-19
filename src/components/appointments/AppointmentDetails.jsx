import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faUserMd,
  faUserInjured,
  faCalendarAlt,
  faStethoscope,
  faPhone,
  faEnvelope,
  faIdCard,
  faVenusMars,
  faCalendar,
  faHeart,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faPrint,
  faComment
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { generateAppointmentSlip } from '../../database';

const AppointmentDetails = ({ appointment, onClose, role = 'patient' }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'checked-in': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-purple-600 bg-purple-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return faHourglassHalf;
      case 'approved': return faCheckCircle;
      case 'rejected': return faTimesCircle;
      case 'checked-in': return faCheckCircle;
      case 'completed': return faCheckCircle;
      case 'cancelled': return faTimesCircle;
      default: return faCheckCircle;
    }
  };

  const handlePrint = () => {
    generateAppointmentSlip(appointment);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appointment Details</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Print Appointment Slip"
            >
              <FontAwesomeIcon icon={faPrint} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center ${getStatusColor(appointment.status)}`}>
                <FontAwesomeIcon icon={getStatusIcon(appointment.status)} className="mr-2" />
                {appointment.status?.toUpperCase()}
              </span>
              {appointment.isEmergency && (
                <span className="px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm font-semibold animate-pulse">
                  EMERGENCY
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Appointment ID: {appointment.id?.slice(-8)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Information */}
            {role !== 'patient' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FontAwesomeIcon icon={faUserInjured} className="mr-2 text-blue-500" />
                  Patient Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {appointment.patientName}
                    </span>
                  </div>
                  {appointment.patientPhone && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faPhone} className="mr-1 text-gray-500" />
                        {appointment.patientPhone}
                      </span>
                    </div>
                  )}
                  {appointment.patientEmail && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faEnvelope} className="mr-1 text-gray-500" />
                        {appointment.patientEmail}
                      </span>
                    </div>
                  )}
                  {appointment.patientCNIC && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">CNIC:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faIdCard} className="mr-1 text-gray-500" />
                        {appointment.patientCNIC}
                      </span>
                    </div>
                  )}
                  {appointment.patientGender && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Gender:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faVenusMars} className="mr-1 text-gray-500" />
                        {appointment.patientGender}
                      </span>
                    </div>
                  )}
                  {appointment.patientAge && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Age:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faCalendar} className="mr-1 text-gray-500" />
                        {appointment.patientAge} years
                      </span>
                    </div>
                  )}
                  {appointment.bloodGroup && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Blood Group:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faHeart} className="mr-1 text-red-500" />
                        {appointment.bloodGroup}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Doctor Information */}
            {role === 'patient' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FontAwesomeIcon icon={faUserMd} className="mr-2 text-green-500" />
                  Doctor Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Dr. {appointment.doctorName}
                    </span>
                  </div>
                  {appointment.doctorSpecialization && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Specialization:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {appointment.doctorSpecialization}
                      </span>
                    </div>
                  )}
<div className="flex items-start">
  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Department:</span>
  <span className="text-sm font-medium text-gray-900 dark:text-white">
    {appointment.departmentName || appointment.department || 'N/A'}
  </span>
</div>
                  {appointment.consultationFee && (
                    <div className="flex items-start">
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Fee:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(appointment.consultationFee)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appointment Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-purple-500" />
                Appointment Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {appointment.date}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Time:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {appointment.time}
                  </span>
                </div>
<div className="flex items-start">
  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Department:</span>
  <span className="text-sm font-medium text-gray-900 dark:text-white">
    {appointment.departmentName || appointment.department || 'N/A'}
  </span>
</div>
                <div className="flex items-start">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Booked On:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(appointment.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason for Visit */}
            <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-orange-500" />
                Reason for Visit
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {appointment.reason || appointment.symptoms || 'No reason provided'}
              </p>
            </div>

            {/* Rejection Reason */}
            {appointment.status === 'rejected' && appointment.rejectionReason && (
              <div className="md:col-span-2 bg-red-50 dark:bg-red-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center">
                  <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                  Rejection Reason
                </h3>
                <p className="text-red-700 dark:text-red-300">
                  {appointment.rejectionReason}
                </p>
              </div>
            )}

            {/* Notes/Comments */}
            {appointment.notes && (
              <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <FontAwesomeIcon icon={faComment} className="mr-2 text-blue-500" />
                  Additional Notes
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;