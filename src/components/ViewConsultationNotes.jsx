// components/ViewConsultationNotes.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faStethoscope,
  faNotesMedical,
  faPrescription,
  faHeartbeat,
  faFlask,
  faCalendarAlt,
  faClock,
  faSyringe,
  faPills
} from '@fortawesome/free-solid-svg-icons';
import { formatDate } from '../utils/helpers';

const ViewConsultationNotes = ({ visit, patientName, doctorName, onClose }) => {
  if (!visit) return null;

  // Extract data from visit object with fallbacks
  const {
    chiefComplaint,
    diagnosis,
    prescription,
    precautions,
    followUpNotes,
    notes,
    vitals = {},
    prescriptions = [],
    investigations = [],
    consultationDate,
    createdAt
  } = visit;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Consultation Notes</h2>
            <p className="text-sm text-blue-200">
              Patient: {patientName || 'Unknown'} | Dr. {doctorName || 'Unknown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {/* Date */}
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Consultation Date: {formatDate(consultationDate || createdAt)}
                <FontAwesomeIcon icon={faClock} className="ml-4 mr-2" />
                Time: {new Date(createdAt?.toDate?.() || createdAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Chief Complaint */}
            {chiefComplaint && (
              <div className="border-l-4 border-teal-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-teal-500" />
                  Chief Complaint
                </label>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {chiefComplaint}
                </p>
              </div>
            )}

            {/* Diagnosis */}
            {diagnosis && (
              <div className="border-l-4 border-blue-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faHeartbeat} className="mr-2 text-blue-500" />
                  Diagnosis
                </label>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {diagnosis}
                </p>
              </div>
            )}

            {/* Vitals */}
            {vitals && Object.keys(vitals).some(key => vitals[key]) && (
              <div className="border-l-4 border-purple-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faHeartbeat} className="mr-2 text-purple-500" />
                  Vitals
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {vitals.bp && (
                    <div><span className="text-gray-500">BP:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.bp}</span></div>
                  )}
                  {vitals.heartRate && (
                    <div><span className="text-gray-500">Heart Rate:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.heartRate}</span></div>
                  )}
                  {vitals.temperature && (
                    <div><span className="text-gray-500">Temperature:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.temperature}°C</span></div>
                  )}
                  {vitals.respiratoryRate && (
                    <div><span className="text-gray-500">Respiratory Rate:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.respiratoryRate}</span></div>
                  )}
                  {vitals.oxygenSaturation && (
                    <div><span className="text-gray-500">O₂ Saturation:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.oxygenSaturation}%</span></div>
                  )}
                  {vitals.weight && (
                    <div><span className="text-gray-500">Weight:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.weight} kg</span></div>
                  )}
                  {vitals.height && (
                    <div><span className="text-gray-500">Height:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.height} cm</span></div>
                  )}
                  {vitals.bmi && (
                    <div><span className="text-gray-500">BMI:</span> <span className="text-gray-800 dark:text-gray-200">{vitals.bmi}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Prescription (simple text) */}
            {prescription && (
              <div className="border-l-4 border-green-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faPrescription} className="mr-2 text-green-500" />
                  Prescription
                </label>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {prescription}
                </p>
              </div>
            )}

            {/* Prescriptions array (from EMR) */}
            {prescriptions && prescriptions.length > 0 && (
              <div className="border-l-4 border-green-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faPills} className="mr-2 text-green-500" />
                  Medications ({prescriptions.length})
                </label>
                <div className="space-y-2">
                  {prescriptions.map((med, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="font-medium text-gray-900 dark:text-white">{med.medicineName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {med.dose} - {med.frequency}
                        {med.duration && ` for ${med.duration}`}
                      </p>
                      {med.instructions && (
                        <p className="text-xs text-gray-500 mt-1">💊 {med.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Precautions */}
            {precautions && (
              <div className="border-l-4 border-yellow-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-yellow-500" />
                  Precautions / Instructions
                </label>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {precautions}
                </p>
              </div>
            )}

            {/* Investigations / Lab Tests */}
            {investigations && investigations.length > 0 && (
              <div className="border-l-4 border-orange-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faFlask} className="mr-2 text-orange-500" />
                  Lab Tests & Investigations ({investigations.length})
                </label>
                <div className="space-y-2">
                  {investigations.map((test, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{test.name}</p>
                        <p className="text-xs text-gray-500">Category: {test.category}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        test.urgency === 'stat' ? 'bg-red-100 text-red-800' :
                        test.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {test.urgency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Notes */}
            {followUpNotes && (
              <div className="border-l-4 border-indigo-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faSyringe} className="mr-2 text-indigo-500" />
                  Follow-up Notes
                </label>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {followUpNotes}
                </p>
              </div>
            )}

            {/* Additional Notes */}
            {notes && notes !== '' && (
              <div className="border-l-4 border-gray-500 pl-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-gray-500" />
                  Additional Notes
                </label>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {notes}
                </p>
              </div>
            )}

            {!chiefComplaint && !diagnosis && !prescription && (!prescriptions || prescriptions.length === 0) && !precautions && (
              <div className="text-center py-8 text-gray-500">
                No consultation notes available for this appointment.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewConsultationNotes;