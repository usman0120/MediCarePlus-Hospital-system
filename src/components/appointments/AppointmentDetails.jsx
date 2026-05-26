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
  faComment,
  faBuilding,
  faCreditCard,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { generateAppointmentSlip } from '../../database';
import toast from 'react-hot-toast';

const AppointmentDetails = ({ appointment, onClose, role = 'patient' }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      case 'confirmed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'checked-in': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return faHourglassHalf;
      case 'approved': return faCheckCircle;
      case 'confirmed': return faCheckCircle;
      case 'checked-in': return faCheckCircle;
      case 'completed': return faCheckCircle;
      case 'rejected': return faTimesCircle;
      case 'cancelled': return faTimesCircle;
      default: return faCheckCircle;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved - Payment Pending';
      case 'confirmed': return 'Confirmed - Ready for Check-in';
      case 'checked-in': return 'Checked In - With Doctor';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1);
    }
  };

  const handlePrint = () => {
    generateAppointmentSlip(appointment);
    toast.success('Appointment slip downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appointment Details</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">ID: {appointment.id?.slice(-8)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Print Appointment Slip"
            >
              <FontAwesomeIcon icon={faPrint} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${getStatusColor(appointment.status)}`}>
                <FontAwesomeIcon icon={getStatusIcon(appointment.status)} />
                {getStatusText(appointment.status)}
              </span>
              {appointment.paymentStatus && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  appointment.paymentStatus === 'paid' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  <FontAwesomeIcon icon={faCreditCard} />
                  Payment: {appointment.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-semibold text-gray-900 dark:text-white">{appointment.date}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">{appointment.time}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Information */}
            {role !== 'patient' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faUserInjured} className="text-white text-sm" />
                  </div>
                  Patient Information
                </h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {appointment.patientName}
                    </span>
                  </div>
                  {appointment.patientPhone && (
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faPhone} className="mr-1 text-gray-500" />
                        {appointment.patientPhone}
                      </span>
                    </div>
                  )}
                  {appointment.patientEmail && (
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faEnvelope} className="mr-1 text-gray-500" />
                        {appointment.patientEmail}
                      </span>
                    </div>
                  )}
                  {appointment.patientCNIC && (
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">CNIC:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faIdCard} className="mr-1 text-gray-500" />
                        {appointment.patientCNIC}
                      </span>
                    </div>
                  )}
                  {appointment.patientGender && (
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Gender:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <FontAwesomeIcon icon={faVenusMars} className="mr-1 text-gray-500" />
                        {appointment.patientGender}
                      </span>
                    </div>
                  )}
                  {appointment.bloodGroup && (
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Blood Group:</span>
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faUserMd} className="text-white text-sm" />
                  </div>
                  Doctor Information
                </h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Dr. {appointment.doctorName}
                    </span>
                  </div>
                  {appointment.doctorSpecialization && (
                    <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Specialization:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {appointment.doctorSpecialization}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      <FontAwesomeIcon icon={faBuilding} className="mr-1 text-gray-500" />
                      {appointment.departmentName || appointment.department || 'N/A'}
                    </span>
                  </div>
                  {appointment.consultationFee && (
                    <div className="flex flex-wrap justify-between items-center py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Consultation Fee:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(appointment.consultationFee)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appointment Details */}
            <div className={`bg-gray-50 dark:bg-gray-700 rounded-xl p-5 ${role === 'patient' ? 'md:col-span-1' : 'md:col-span-2'}`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faClock} className="text-white text-sm" />
                </div>
                Appointment Details
              </h3>
              <div className="space-y-3">
                <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    <FontAwesomeIcon icon={faCalendar} className="mr-1 text-gray-500" />
                    {appointment.date}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Time:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    <FontAwesomeIcon icon={faClock} className="mr-1 text-gray-500" />
                    {appointment.time}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    <FontAwesomeIcon icon={faBuilding} className="mr-1 text-gray-500" />
                    {appointment.departmentName || appointment.department || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Booked On:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(appointment.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason for Visit */}
          {(appointment.reason || appointment.symptoms) && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faStethoscope} className="text-white text-sm" />
                </div>
                Reason for Visit
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {appointment.reason || appointment.symptoms}
              </p>
            </div>
          )}

          {/* Rejection Reason */}
          {appointment.status === 'rejected' && appointment.rejectionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-white text-sm" />
                </div>
                Rejection Reason
              </h3>
              <p className="text-red-700 dark:text-red-300">
                {appointment.rejectionReason}
              </p>
            </div>
          )}

          {/* Additional Notes */}
          {appointment.notes && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faComment} className="text-white text-sm" />
                </div>
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
  );
};

export default AppointmentDetails;