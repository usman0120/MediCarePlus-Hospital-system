// components/ConsultationNotesModal.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faSpinner,
  faStethoscope,
  faNotesMedical,
  faPrescription,
  faHeartbeat,
  faFlask
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

const ConsultationNotesModal = ({ appointment, patient, doctorId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState({
    chiefComplaint: appointment?.reason || '',
    diagnosis: '',
    prescription: '',
    precautions: '',
    followUpNotes: ''
  });

  const handleChange = (field, value) => {
    setNotes(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!notes.chiefComplaint) {
      toast.error('Please enter chief complaint');
      return;
    }

    setLoading(true);
    
    try {
      // Create visit record with consultation notes
      const visitData = {
        patientId: patient.id,
        doctorId: doctorId,
        appointmentId: appointment.id,
        department: appointment.department,
        status: 'completed',
        chiefComplaint: notes.chiefComplaint,
        diagnosis: notes.diagnosis,
        prescription: notes.prescription,
        precautions: notes.precautions,
        followUpNotes: notes.followUpNotes,
        consultationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const { createVisit } = await import('../database');
      const visitResult = await createVisit(visitData);
      
      if (!visitResult.success) {
        throw new Error(visitResult.error || 'Failed to save consultation notes');
      }
      
      toast.success('Consultation notes saved successfully!');
      
      if (onSuccess) {
        onSuccess({
          visitId: visitResult.data.id,
          notes: notes
        });
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error saving consultation notes:', error);
      toast.error(error.message || 'Failed to save consultation notes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-600 to-teal-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Consultation Notes</h2>
            <p className="text-sm text-teal-200">
              Patient: {patient?.fullName}
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
            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-teal-500" />
                Chief Complaint <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes.chiefComplaint}
                onChange={(e) => handleChange('chiefComplaint', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="What brings the patient in today?"
              />
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FontAwesomeIcon icon={faHeartbeat} className="mr-2 text-teal-500" />
                Diagnosis
              </label>
              <textarea
                value={notes.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Diagnosis or findings..."
              />
            </div>

            {/* Prescription */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FontAwesomeIcon icon={faPrescription} className="mr-2 text-teal-500" />
                Prescription
              </label>
              <textarea
                value={notes.prescription}
                onChange={(e) => handleChange('prescription', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Medicines with dosage and frequency..."
              />
            </div>

            {/* Precautions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-teal-500" />
                Precautions / Instructions
              </label>
              <textarea
                value={notes.precautions}
                onChange={(e) => handleChange('precautions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Dietary restrictions, activity limitations, etc."
              />
            </div>

            {/* Follow-up Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FontAwesomeIcon icon={faFlask} className="mr-2 text-teal-500" />
                Follow-up Notes
              </label>
              <textarea
                value={notes.followUpNotes}
                onChange={(e) => handleChange('followUpNotes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Follow-up instructions, next visit date, etc."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Save Consultation Notes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationNotesModal;