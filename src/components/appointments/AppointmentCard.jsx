import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faUserInjured,
  faCheckCircle,
  faTimesCircle,
  faComment,
  faHourglassHalf,
  faStethoscope,
  faPhone,
  faEnvelope,
  faNotesMedical,
  faMoneyBillWave,
  faPrint,
  faStar,
  faCalendarAlt,
  faChevronRight,
  faMapMarkerAlt,
  faCreditCard
} from '@fortawesome/free-solid-svg-icons';
import { generateAppointmentSlip } from '../../database';
import PaymentModal from '../PaymentModal';
import RatingModal from '../RatingModal';
import toast from 'react-hot-toast';

const AppointmentCard = ({ 
  appointment, 
  role = 'patient',
  onApprove, 
  onReject, 
  onCheckIn,
  onCancel,
  onViewDetails,
  onStartConsultation,  
  onViewConsultationNotes,
  onChatWithDoctor,
  onPaySuccess,
  onRateDoctor,
  onMarkCompleted,
  showActions = true 
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'checked-in':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'no-show':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return faHourglassHalf;
      case 'approved':
      case 'confirmed':
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

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'Approved - Payment Pending';
      case 'confirmed': return 'Confirmed - Ready for Check-in';
      case 'checked-in': return 'Checked In - With Doctor';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1);
    }
  };

  const handlePrintSlip = () => {
    generateAppointmentSlip(appointment);
    toast.success('Appointment slip downloaded');
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

  const canRate = () => {
    return appointment.status === 'completed' && role === 'patient';
  };

  const needsPayment = () => {
    return role === 'patient' && appointment.status === 'approved' && appointment.paymentStatus !== 'paid';
  };

  const handlePaymentSuccess = (paymentData) => {
    setShowPaymentModal(false);
    if (onPaySuccess) {
      onPaySuccess(appointment.id, paymentData);
    }
    toast.success('Payment submitted. Waiting for verification.');
  };

  const handleRatingSuccess = (ratingData) => {
    setShowRatingModal(false);
    if (onRateDoctor) {
      onRateDoctor(ratingData);
    }
    toast.success('Thank you for your feedback!');
  };

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${
        appointment.status === 'pending' ? 'border-l-4 border-l-yellow-500' :
        appointment.status === 'confirmed' ? 'border-l-4 border-l-green-500' :
        appointment.status === 'checked-in' ? 'border-l-4 border-l-purple-500' :
        appointment.status === 'completed' ? 'border-l-4 border-l-gray-500' : ''
      }`}>
        
        {/* Card Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(appointment.status)}`}>
                <FontAwesomeIcon icon={getStatusIcon(appointment.status)} className="text-xs" />
                {getStatusText(appointment.status)}
              </span>
              {role === 'patient' && appointment.paymentStatus && (
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                  appointment.paymentStatus === 'paid' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  <FontAwesomeIcon icon={faCreditCard} className="text-xs" />
                  {appointment.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintSlip}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Print Appointment Slip"
              >
                <FontAwesomeIcon icon={faPrint} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <FontAwesomeIcon icon={faChevronRight} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {/* Left Section - Person Info */}
            <div className="flex-1">
              {role === 'patient' ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {appointment.doctorName?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">
                      Dr. {appointment.doctorName || 'Not Assigned'}
                    </p>
                    {appointment.doctorSpecialization && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {appointment.doctorSpecialization}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {appointment.patientName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">
                      {appointment.patientName || 'Unknown Patient'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      {appointment.patientPhone && (
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faPhone} className="text-xs" />
                          {appointment.patientPhone}
                        </span>
                      )}
                      {appointment.patientEmail && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                          {appointment.patientEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section - Date & Time */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-semibold text-gray-900 dark:text-white">{appointment.date}</p>
              </div>
              <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">{appointment.time}</p>
              </div>
            </div>
          </div>

          {/* Fee Display */}
          {(role === 'patient' || role === 'receptionist') && appointment.paymentAmount && (
            <div className="mt-3 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Consultation Fee</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(appointment.paymentAmount)}
                </p>
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
              {/* Reason */}
              {appointment.reason && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faNotesMedical} />
                    Reason for Visit
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.reason}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {appointment.status === 'rejected' && appointment.rejectionReason && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faTimesCircle} />
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">{appointment.rejectionReason}</p>
                </div>
              )}

              {/* Department Info for non-patient roles */}
              {role !== 'patient' && appointment.department && (
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400" />
                  <span>Department: {appointment.department}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap justify-end gap-2">
              {/* Receptionist Actions */}
              {role === 'receptionist' && appointment.status === 'pending' && (
                <>
                  <button
                    onClick={() => onApprove(appointment.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(appointment.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex items-center gap-1"
                  >
                    <FontAwesomeIcon icon={faTimesCircle} />
                    Reject
                  </button>
                </>
              )}

              {/* Receptionist - Check In Patient */}
              {role === 'receptionist' && appointment.status === 'confirmed' && onCheckIn && (
                <button
                  onClick={() => onCheckIn(appointment.id)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faUserInjured} />
                  Check In
                </button>
              )}

              {/* Receptionist - Verify Payment */}
              {role === 'receptionist' && appointment.paymentStatus === 'paid' && appointment.status === 'approved' && onCheckIn && (
                <button
                  onClick={() => onCheckIn(appointment.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Verify & Assign
                </button>
              )}

              {/* Doctor Actions */}
              {role === 'doctor' && (
                <>
                  {(appointment.status === 'confirmed' || appointment.status === 'checked-in') && (
                    <button
                      onClick={() => onStartConsultation && onStartConsultation(appointment)}
                      className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faStethoscope} />
                      Start Consultation
                    </button>
                  )}
                  {(appointment.status === 'checked-in' || appointment.status === 'in-progress') && onMarkCompleted && (
                    <button
                      onClick={() => onMarkCompleted(appointment.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      Complete Visit
                    </button>
                  )}
                  {onChatWithDoctor && (
                    <button
                      onClick={() => onChatWithDoctor(appointment.patientId, appointment.patientName)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
                      disabled={!appointment.patientId}
                    >
                      <FontAwesomeIcon icon={faComment} />
                      Chat
                    </button>
                  )}
                </>
              )}

              {/* Patient Actions - Cancel */}
              {role === 'patient' && canCancel() && (
                <button
                  onClick={() => onCancel(appointment.id)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faTimesCircle} />
                  Cancel
                </button>
              )}

              {/* Patient Actions - View Notes */}
              {role === 'patient' && onViewConsultationNotes && appointment.status === 'completed' && (
                <button
                  onClick={() => onViewConsultationNotes(appointment)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faNotesMedical} />
                  View Notes
                </button>
              )}

              {/* Patient Actions - Pay Fee */}
              {needsPayment() && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                  Pay Now
                </button>
              )}

              {/* Patient Actions - Chat with Doctor */}
              {role === 'patient' && (appointment.status === 'confirmed' || appointment.status === 'checked-in' || appointment.status === 'completed') && onChatWithDoctor && (
                <button
                  onClick={() => onChatWithDoctor(appointment.doctorId, appointment.doctorName)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faComment} />
                  Chat
                </button>
              )}

              {/* Patient Actions - Rate Doctor */}
              {canRate() && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faStar} />
                  Rate
                </button>
              )}

              {/* View Details - Common */}
              <button
                onClick={() => onViewDetails(appointment)}
                className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faCalendarAlt} />
                Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          appointment={appointment}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          doctor={{ id: appointment.doctorId, fullName: appointment.doctorName }}
          patientId={appointment.patientId}
          onClose={() => setShowRatingModal(false)}
          onSuccess={handleRatingSuccess}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

// Helper function for formatting currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default AppointmentCard;