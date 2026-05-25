import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faTimes,
  faSave,
  faPlus,
  faTrash,
  faStethoscope,
  faPills,
  faCalendarCheck,
  faNotesMedical,
  faExclamationTriangle,
  faLock,
  faPrint,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { validateVitals } from '../utils/helpers';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const EMRForm = ({ 
  visit, 
  patient, 
  onSave, 
  onClose, 
  readOnly = false,
  onPrint,
  onDownload,
  showPrintButton = false,
  showDownloadButton = false
}) => {
  // Initialize state with conditional logic based on visit prop
  const [formData, setFormData] = useState(() => {
    if (!visit) {
      return {
        chiefComplaint: '',
        symptoms: '',
        diagnosis: '',
        vitals: {
          bp: '',
          heartRate: '',
          temperature: '',
          sugar: '',
          oxygenLevel: '',
          respiratoryRate: '',
          height: '',
          weight: '',
          bmi: ''
        },
        notes: [],
        prescriptions: [],
        followUpDate: '',
        treatmentPlan: '',
        allergies: [],
        pastMedicalHistory: '',
        familyHistory: '',
        socialHistory: '',
        reviewOfSystems: '',
        physicalExam: '',
        assessment: '',
        plan: '',
        investigations: [],
        differentialDiagnosis: [],
        complications: '',
        prognosis: '',
        patientEducation: '',
        referrals: [],
        followUpInstructions: '',
        emergencyInstructions: '',
        warnings: []
      };
    }

    return {
      chiefComplaint: visit.chiefComplaint || '',
      symptoms: visit.symptoms || '',
      diagnosis: visit.diagnosis || '',
      vitals: {
        bp: visit.vitals?.bp || '',
        heartRate: visit.vitals?.heartRate || '',
        temperature: visit.vitals?.temperature || '',
        sugar: visit.vitals?.sugar || '',
        oxygenLevel: visit.vitals?.oxygenLevel || '',
        respiratoryRate: visit.vitals?.respiratoryRate || '',
        height: visit.vitals?.height || '',
        weight: visit.vitals?.weight || '',
        bmi: visit.vitals?.bmi || ''
      },
      notes: visit.notes || [],
      prescriptions: visit.prescriptions || [],
      followUpDate: visit.followUpDate || '',
      treatmentPlan: visit.treatmentPlan || '',
      allergies: visit.allergies || [],
      pastMedicalHistory: visit.pastMedicalHistory || '',
      familyHistory: visit.familyHistory || '',
      socialHistory: visit.socialHistory || '',
      reviewOfSystems: visit.reviewOfSystems || '',
      physicalExam: visit.physicalExam || '',
      assessment: visit.assessment || '',
      plan: visit.plan || '',
      investigations: visit.investigations || [],
      differentialDiagnosis: visit.differentialDiagnosis || [],
      complications: visit.complications || '',
      prognosis: visit.prognosis || '',
      patientEducation: visit.patientEducation || '',
      referrals: visit.referrals || [],
      followUpInstructions: visit.followUpInstructions || '',
      emergencyInstructions: visit.emergencyInstructions || '',
      warnings: visit.warnings || []
    };
  });

  const [newNote, setNewNote] = useState('');
  const [newPrescription, setNewPrescription] = useState({
    medicineName: '',
    dose: '',
    frequency: '',
    duration: '',
    instructions: '',
    route: 'oral',
    quantity: '',
    refills: 0,
    dispenseAsWritten: false
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [newInvestigation, setNewInvestigation] = useState('');
  const [newDifferential, setNewDifferential] = useState('');
  const [newReferral, setNewReferral] = useState({
    to: '',
    reason: '',
    urgency: 'routine'
  });
  const [activeTab, setActiveTab] = useState('chiefComplaint');
  const [bmiUnit, setBmiUnit] = useState('metric'); // metric or imperial

  // Calculate BMI
  const calculateBMI = () => {
    const { height, weight } = formData.vitals;
    if (!height || !weight) return;

    let heightInMeters = parseFloat(height);
    let weightInKg = parseFloat(weight);

    if (bmiUnit === 'imperial') {
      // Convert inches to meters
      heightInMeters = heightInMeters * 0.0254;
      // Convert pounds to kg
      weightInKg = weightInKg * 0.453592;
    }

    if (heightInMeters > 0 && weightInKg > 0) {
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      handleVitalChange('bmi', bmi.toFixed(1));
    }
  };

  // Get BMI category
  const getBMICategory = (bmi) => {
    const bmiNum = parseFloat(bmi);
    if (!bmiNum) return '';
    if (bmiNum < 18.5) return 'Underweight';
    if (bmiNum < 25) return 'Normal weight';
    if (bmiNum < 30) return 'Overweight';
    if (bmiNum < 35) return 'Obese Class I';
    if (bmiNum < 40) return 'Obese Class II';
    return 'Obese Class III';
  };

  // Handle vital change
  const handleVitalChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: value
      }
    }));

    // Auto-calculate BMI when height or weight changes
    if (field === 'height' || field === 'weight') {
      setTimeout(calculateBMI, 100);
    }
  };

  // Add note
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      notes: [...prev.notes, {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: newNote,
        timestamp: new Date().toISOString(),
        author: patient?.doctorName || 'Doctor'
      }]
    }));
    setNewNote('');
  };

  // Remove note
  const handleRemoveNote = (noteId) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== noteId)
    }));
  };

  // Add prescription
  const handleAddPrescription = () => {
    if (!newPrescription.medicineName || !newPrescription.dose || !newPrescription.frequency) {
      toast.error('Please fill in medicine name, dose, and frequency');
      return;
    }

    setFormData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...newPrescription,
        createdAt: new Date().toISOString()
      }]
    }));

    setNewPrescription({
      medicineName: '',
      dose: '',
      frequency: '',
      duration: '',
      instructions: '',
      route: 'oral',
      quantity: '',
      refills: 0,
      dispenseAsWritten: false
    });
  };

  // Remove prescription
  const handleRemovePrescription = (rxId) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter(rx => rx.id !== rxId)
    }));
  };

  // Add allergy
  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return;

    setFormData(prev => ({
      ...prev,
      allergies: [...prev.allergies, {
        id: `allergy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newAllergy,
        reaction: '',
        severity: 'mild',
        dateIdentified: new Date().toISOString()
      }]
    }));
    setNewAllergy('');
  };

  // Add investigation
  const handleAddInvestigation = () => {
    if (!newInvestigation.trim()) return;

    setFormData(prev => ({
      ...prev,
      investigations: [...prev.investigations, {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newInvestigation,
        ordered: true,
        status: 'pending',
        orderedAt: new Date().toISOString()
      }]
    }));
    setNewInvestigation('');
  };

  // Add differential diagnosis
  const handleAddDifferential = () => {
    if (!newDifferential.trim()) return;

    setFormData(prev => ({
      ...prev,
      differentialDiagnosis: [...prev.differentialDiagnosis, {
        id: `diff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newDifferential,
        likelihood: 'possible',
        notes: ''
      }]
    }));
    setNewDifferential('');
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (readOnly) return;

    // Validate vitals
    const vitalsValidation = validateVitals(formData.vitals);
    if (!vitalsValidation.isValid) {
      const firstError = Object.values(vitalsValidation.errors)[0];
      toast.error(firstError);
      return;
    }

    // Validate required fields
    if (!formData.chiefComplaint) {
      toast.error('Chief complaint is required');
      return;
    }

    if (!formData.diagnosis) {
      toast.error('Diagnosis is required');
      return;
    }

    onSave(formData);
  };

  // Handle print
  const handlePrint = () => {
    if (onPrint) {
      onPrint(formData);
    } else {
      window.print();
    }
  };

const handleDownload = async () => {
  if (onDownload) {
    onDownload(formData);
  } else {
    // Prepare prescription data
    const prescriptionData = {
      doctorName: patient?.doctorName || 'Doctor',
      licenseNumber: patient?.licenseNumber || 'N/A',
      patientName: patient?.fullName || visit?.patientName,
      patientAge: patient?.age,
      patientWeight: formData.vitals?.weight,
      diagnosis: formData.diagnosis,
      medicines: formData.prescriptions.map(rx => ({
        name: rx.medicineName,
        dose: rx.dose,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions
      })),
      notes: formData.notes?.map(n => n.text).join('\n'),
      followUpDate: formData.followUpDate
    };
    
    try {
      const { generatePDF } = await import('../utils/helpers');
      const pdfBase64 = await generatePDF('prescription', prescriptionData);
      
      if (pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfBase64}`;
        link.download = `prescription-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        toast.success('Prescription downloaded');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading prescription:', error);
      toast.error('Failed to download prescription');
    }
  }
};

  // Render tabs
  const tabs = [
    { id: 'chiefComplaint', label: 'Chief Complaint', icon: faStethoscope },
    { id: 'vitals', label: 'Vitals', icon: faHeartbeat },
    { id: 'diagnosis', label: 'Diagnosis & Plan', icon: faNotesMedical },
    { id: 'prescriptions', label: 'Prescriptions', icon: faPills },
    { id: 'history', label: 'Medical History', icon: faCalendarCheck },
    { id: 'notes', label: 'Clinical Notes', icon: faNotesMedical }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Electronic Medical Record
            </h2>
            {visit?.locked && (
              <span className="inline-flex items-center px-3 py-1 mt-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-sm">
                <FontAwesomeIcon icon={faLock} className="mr-2" />
                Record Locked - Read Only
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {showPrintButton && (
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center"
              >
                <FontAwesomeIcon icon={faPrint} className="mr-2" />
                Print
              </button>
            )}
            {showDownloadButton && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        {/* Patient Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Patient Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {patient?.fullName || visit?.patientName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Age / Gender</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {patient?.age || 'N/A'} / {patient?.gender || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Blood Group</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {patient?.bloodGroup || visit?.bloodGroup || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Visit Date</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDate(visit?.createdAt) || new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Warnings/Alerts */}
        {formData.warnings && formData.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 rounded">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Important Warnings</h4>
                <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                  {formData.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chief Complaint Tab */}
          {activeTab === 'chiefComplaint' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chief Complaint *
                </label>
                <textarea
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Primary reason for visit in patient's own words..."
                  required
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  History of Presenting Illness
                </label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Detailed description of symptoms, onset, duration, severity, aggravating/relieving factors..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review of Systems
                </label>
                <textarea
                  value={formData.reviewOfSystems}
                  onChange={(e) => setFormData({ ...formData, reviewOfSystems: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Constitutional, HEENT, Cardiovascular, Respiratory, GI, GU, Musculoskeletal, Neurological, Psychiatric..."
                  disabled={readOnly || visit?.locked}
                />
              </div>
            </div>
          )}

          {/* Vitals Tab */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Blood Pressure (mmHg)
                  </label>
                  <input
                    type="text"
                    value={formData.vitals.bp}
                    onChange={(e) => handleVitalChange('bp', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="120/80"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    value={formData.vitals.heartRate}
                    onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="72"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.vitals.temperature}
                    onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="36.5"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={formData.vitals.sugar}
                    onChange={(e) => handleVitalChange('sugar', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="100"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    O2 Saturation (%)
                  </label>
                  <input
                    type="number"
                    value={formData.vitals.oxygenLevel}
                    onChange={(e) => handleVitalChange('oxygenLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="98"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Respiratory Rate
                  </label>
                  <input
                    type="number"
                    value={formData.vitals.respiratoryRate}
                    onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="16"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-4 mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      BMI Calculator
                    </label>
                    <select
                      value={bmiUnit}
                      onChange={(e) => setBmiUnit(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      disabled={readOnly || visit?.locked}
                    >
                      <option value="metric">Metric (cm/kg)</option>
                      <option value="imperial">Imperial (in/lb)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.vitals.height}
                        onChange={(e) => handleVitalChange('height', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={bmiUnit === 'metric' ? "Height (cm)" : "Height (in)"}
                        disabled={readOnly || visit?.locked}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.vitals.weight}
                        onChange={(e) => handleVitalChange('weight', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={bmiUnit === 'metric' ? "Weight (kg)" : "Weight (lb)"}
                        disabled={readOnly || visit?.locked}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.vitals.bmi}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        placeholder="BMI"
                      />
                      {formData.vitals.bmi && (
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                          {getBMICategory(formData.vitals.bmi)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diagnosis & Plan Tab */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Diagnosis *
                </label>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Primary diagnosis..."
                  required
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Differential Diagnosis
                </label>
                <div className="space-y-2">
                  {formData.differentialDiagnosis.map((diff) => (
                    <div key={diff.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{diff.name}</p>
                        <p className="text-xs text-gray-500">Likelihood: {diff.likelihood}</p>
                      </div>
                      {!readOnly && !visit?.locked && (
                        <button
                          type="button"
                          onClick={() => {
                            const newDiffs = formData.differentialDiagnosis.filter(d => d.id !== diff.id);
                            setFormData({ ...formData, differentialDiagnosis: newDiffs });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!readOnly && !visit?.locked && (
                  <div className="flex mt-2 space-x-2">
                    <input
                      type="text"
                      value={newDifferential}
                      onChange={(e) => setNewDifferential(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add differential diagnosis..."
                    />
                    <select
                      value={newDifferential.likelihood}
                      onChange={(e) => setNewDifferential({ ...newDifferential, likelihood: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="possible">Possible</option>
                      <option value="likely">Likely</option>
                      <option value="unlikely">Unlikely</option>
                      <option value="ruled-out">Ruled Out</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDifferential}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Physical Examination Findings
                </label>
                <textarea
                  value={formData.physicalExam}
                  onChange={(e) => setFormData({ ...formData, physicalExam: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="General, Systemic examination findings..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assessment
                </label>
                <textarea
                  value={formData.assessment}
                  onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Clinical assessment and impression..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Treatment Plan
                </label>
                <textarea
                  value={formData.treatmentPlan}
                  onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Outline treatment plan..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Investigations Ordered
                </label>
                <div className="space-y-2">
                  {formData.investigations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-900 dark:text-white">{inv.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        inv.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
                {!readOnly && !visit?.locked && (
                  <div className="flex mt-2 space-x-2">
                    <input
                      type="text"
                      value={newInvestigation}
                      onChange={(e) => setNewInvestigation(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add investigation..."
                    />
                    <button
                      type="button"
                      onClick={handleAddInvestigation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {formData.prescriptions.map((rx) => (
                  <div key={rx.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">{rx.medicineName}</h4>
                          {rx.dispenseAsWritten && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                              DAW
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {rx.dose} • {rx.frequency} • {rx.route}
                        </p>
                        {rx.duration && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Duration: {rx.duration}</p>
                        )}
                        {rx.quantity && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {rx.quantity}</p>
                        )}
                        {rx.refills > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Refills: {rx.refills}</p>
                        )}
                        {rx.instructions && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            "{rx.instructions}"
                          </p>
                        )}
                      </div>
                      {!readOnly && !visit?.locked && (
                        <button
                          type="button"
                          onClick={() => handleRemovePrescription(rx.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!readOnly && !visit?.locked && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Add New Prescription</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newPrescription.medicineName}
                        onChange={(e) => setNewPrescription({ ...newPrescription, medicineName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Medicine Name"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newPrescription.dose}
                        onChange={(e) => setNewPrescription({ ...newPrescription, dose: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Dose (e.g., 500mg)"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newPrescription.frequency}
                        onChange={(e) => setNewPrescription({ ...newPrescription, frequency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Frequency"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newPrescription.duration}
                        onChange={(e) => setNewPrescription({ ...newPrescription, duration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Duration"
                      />
                    </div>
                    <div>
                      <select
                        value={newPrescription.route}
                        onChange={(e) => setNewPrescription({ ...newPrescription, route: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="oral">Oral</option>
                        <option value="topical">Topical</option>
                        <option value="intravenous">Intravenous</option>
                        <option value="intramuscular">Intramuscular</option>
                        <option value="subcutaneous">Subcutaneous</option>
                        <option value="inhalation">Inhalation</option>
                        <option value="rectal">Rectal</option>
                        <option value="vaginal">Vaginal</option>
                        <option value="otic">Otic (Ear)</option>
                        <option value="ophthalmic">Ophthalmic (Eye)</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newPrescription.quantity}
                        onChange={(e) => setNewPrescription({ ...newPrescription, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Quantity"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={newPrescription.refills}
                        onChange={(e) => setNewPrescription({ ...newPrescription, refills: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Refills"
                        min="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <textarea
                        value={newPrescription.instructions}
                        onChange={(e) => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Special instructions"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newPrescription.dispenseAsWritten}
                          onChange={(e) => setNewPrescription({ ...newPrescription, dispenseAsWritten: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Dispense as written (no substitutions)
                        </span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPrescription}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add to Prescription
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Medical History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Past Medical History
                </label>
                <textarea
                  value={formData.pastMedicalHistory}
                  onChange={(e) => setFormData({ ...formData, pastMedicalHistory: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Chronic conditions, past illnesses, hospitalizations..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Family History
                </label>
                <textarea
                  value={formData.familyHistory}
                  onChange={(e) => setFormData({ ...formData, familyHistory: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Family history of diseases..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Social History
                </label>
                <textarea
                  value={formData.socialHistory}
                  onChange={(e) => setFormData({ ...formData, socialHistory: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Smoking, alcohol, occupation, living situation..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allergies
                </label>
                <div className="space-y-2">
                  {formData.allergies.map((allergy) => (
                    <div key={allergy.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{allergy.name}</p>
                        <p className="text-xs text-gray-500">Severity: {allergy.severity}</p>
                      </div>
                      {!readOnly && !visit?.locked && (
                        <button
                          type="button"
                          onClick={() => {
                            const newAllergies = formData.allergies.filter(a => a.id !== allergy.id);
                            setFormData({ ...formData, allergies: newAllergies });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!readOnly && !visit?.locked && (
                  <div className="flex mt-2 space-x-2">
                    <input
                      type="text"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add allergy..."
                    />
                    <select
                      value={newAllergy.severity}
                      onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddAllergy}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clinical Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {formData.notes.map((note) => (
                  <div key={note.id} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{note.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(note.timestamp).toLocaleString()} - {note.author}
                      </p>
                    </div>
                    {!readOnly && !visit?.locked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(note.id)}
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!readOnly && !visit?.locked && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Add a clinical note..."
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Patient Education
                </label>
                <textarea
                  value={formData.patientEducation}
                  onChange={(e) => setFormData({ ...formData, patientEducation: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Information provided to patient..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Referrals
                </label>
                <div className="space-y-2">
                  {formData.referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">To: {ref.to}</p>
                        <p className="text-xs text-gray-500">Reason: {ref.reason}</p>
                        <p className="text-xs text-gray-500">Urgency: {ref.urgency}</p>
                      </div>
                      {!readOnly && !visit?.locked && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRefs = formData.referrals.filter(r => r.id !== ref.id);
                            setFormData({ ...formData, referrals: newRefs });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!readOnly && !visit?.locked && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <input
                      type="text"
                      value={newReferral.to}
                      onChange={(e) => setNewReferral({ ...newReferral, to: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Refer to..."
                    />
                    <input
                      type="text"
                      value={newReferral.reason}
                      onChange={(e) => setNewReferral({ ...newReferral, reason: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Reason..."
                    />
                    <select
                      value={newReferral.urgency}
                      onChange={(e) => setNewReferral({ ...newReferral, urgency: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Follow-up Instructions
                </label>
                <textarea
                  value={formData.followUpInstructions}
                  onChange={(e) => setFormData({ ...formData, followUpInstructions: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Instructions for follow-up..."
                  disabled={readOnly || visit?.locked}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={readOnly || visit?.locked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emergency Instructions
                  </label>
                  <textarea
                    value={formData.emergencyInstructions}
                    onChange={(e) => setFormData({ ...formData, emergencyInstructions: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Emergency contact instructions..."
                    disabled={readOnly || visit?.locked}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          {!readOnly && !visit?.locked && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 py-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Save EMR
              </button>
            </div>
          )}

          {/* Read-only footer */}
          {readOnly && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EMRForm;