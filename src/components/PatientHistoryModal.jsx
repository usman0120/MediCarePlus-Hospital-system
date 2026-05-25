import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faMoneyBill,
  faFileMedical,
  faClipboardList,
  faSpinner,
  faPrescription,
  faEye,
  faHeartbeat,
  faPills,
  faDownload,
  faPrint,
  faStethoscope,
  faNotesMedical,
  faSyringe,
  faUserMd
} from '@fortawesome/free-solid-svg-icons';
import { getPatientFullHistory } from '../database';
import { formatDate, formatCurrency } from '../utils/helpers';
import { generatePDF } from '../utils/helpers';
import EMRForm from './EMRForm';
import toast from 'react-hot-toast';

const PatientHistoryModal = ({ userId, userName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEMR, setSelectedEMR] = useState(null);
  const [showEMRModal, setShowEMRModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadPatientHistory = async () => {
      if (!userId) {
        console.log('No userId provided to PatientHistoryModal');
        if (isMounted) {
          toast.error('Invalid user ID');
          setLoading(false);
        }
        return;
      }
      
      console.log('Loading patient history for userId:', userId);
      setLoading(true);
      
      try {
        const result = await getPatientFullHistory(userId);
        console.log('getPatientFullHistory result:', result);
        
        if (isMounted) {
          if (result && result.success) {
            setHistoryData(result.data);
            console.log('Patient history loaded successfully:', result.data?.patient?.fullName);
          } else {
            const errorMsg = result?.error || 'Failed to load patient history';
            console.error('Failed to load patient history:', errorMsg);
            toast.error(errorMsg);
            setHistoryData({
              patient: { fullName: userName || 'Unknown' },
              appointments: [],
              visits: [],
              payments: [],
              stats: {
                totalVisits: 0,
                totalAppointments: 0,
                totalPrescriptions: 0
              },
              recentActivity: [],
              vitalsHistory: []
            });
          }
        }
      } catch (error) {
        console.error('Error in loadPatientHistory:', error);
        if (isMounted) {
          toast.error(error.message || 'Error loading patient history');
          setHistoryData({
            patient: { fullName: userName || 'Unknown' },
            appointments: [],
            visits: [],
            payments: [],
            stats: {
              totalVisits: 0,
              totalAppointments: 0,
              totalPrescriptions: 0
            },
            recentActivity: [],
            vitalsHistory: []
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatientHistory();

    return () => {
      isMounted = false;
    };
  }, [userId, userName]);

  const handleExportSummary = async () => {
    setExporting(true);
    try {
      const patientData = {
        patientName: historyData?.patient?.fullName || userName,
        patientId: userId,
        patientDOB: historyData?.patient?.dateOfBirth,
        bloodGroup: historyData?.patient?.bloodGroup,
        mrn: userId?.slice(-8),
        medicalHistory: historyData?.visits?.map(visit => ({
          date: visit.createdAt,
          condition: visit.diagnosis,
          treatment: visit.treatmentPlan,
          chiefComplaint: visit.chiefComplaint,
          vitals: visit.vitals
        })) || [],
        allergies: historyData?.patient?.allergies || [],
        prescriptions: historyData?.visits?.flatMap(v => v.prescriptions || []) || [],
        stats: historyData?.stats
      };

      const pdfBase64 = await generatePDF('medical-summary', patientData);
      
      if (pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfBase64}`;
        link.download = `patient-summary-${userName.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        toast.success('Patient summary downloaded');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error exporting summary:', error);
      toast.error('Failed to export summary');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const config = {
      'paid': 'bg-green-100 text-green-800',
      'completed': 'bg-green-100 text-green-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'scheduled': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'active': 'bg-green-100 text-green-800',
      'discharged': 'bg-purple-100 text-purple-800'
    };
    return config[status] || 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: faClipboardList },
    { id: 'appointments', label: 'Appointments', icon: faCalendarAlt },
    { id: 'medical', label: 'Medical Records', icon: faFileMedical },
    { id: 'prescriptions', label: 'Prescriptions', icon: faPrescription },
    { id: 'payments', label: 'Payment History', icon: faMoneyBill }
  ];

  const renderOverview = () => {
    if (!historyData) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }
    
    const { patient = {}, stats = {}, recentActivity = [], vitalsHistory = [] } = historyData;

    return (
      <div className="space-y-6">
        {/* Patient Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Patient Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient?.fullName || userName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Contact</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Email</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Blood Group</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient?.bloodGroup || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Gender</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{patient?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Date of Birth</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient?.dateOfBirth || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Registered On</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(patient?.createdAt) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(patient?.accountStatus || 'active')}`}>
                {patient?.accountStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards - Removed Total Paid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-center">
            <p className="text-sm text-blue-600 dark:text-blue-300">Total Visits</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{stats?.totalVisits || 0}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg text-center">
            <p className="text-sm text-purple-600 dark:text-purple-300">Appointments</p>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{stats?.totalAppointments || 0}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg text-center">
            <p className="text-sm text-yellow-600 dark:text-yellow-300">Prescriptions</p>
            <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{stats?.totalPrescriptions || 0}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg text-center">
            <p className="text-sm text-green-600 dark:text-green-300">Medications</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{stats?.totalPrescriptions || 0}</p>
          </div>
        </div>

        {/* Vitals Summary */}
        {vitalsHistory && vitalsHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <FontAwesomeIcon icon={faHeartbeat} className="mr-2 text-red-500" />
              Vitals History
            </h4>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">BP</th>
                    <th className="px-3 py-2 text-left">Heart Rate</th>
                    <th className="px-3 py-2 text-left">Temperature</th>
                    <th className="px-3 py-2 text-left">Sugar</th>
                    <th className="px-3 py-2 text-left">BMI</th>
                    <th className="px-3 py-2 text-left">Weight</th>
                    <th className="px-3 py-2 text-left">Height</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsHistory.map((vitals, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2">{formatDate(vitals?.date)}</td>
                      <td className="px-3 py-2">{vitals?.bp || 'N/A'}</td>
                      <td className="px-3 py-2">{vitals?.heartRate || 'N/A'}</td>
                      <td className="px-3 py-2">{vitals?.temperature || 'N/A'}</td>
                      <td className="px-3 py-2">{vitals?.sugar || 'N/A'}</td>
                      <td className="px-3 py-2">{vitals?.bmi || 'N/A'}</td>
                      <td className="px-3 py-2">{vitals?.weight || 'N/A'}</td>
                      <td className="px-3 py-2">{vitals?.height || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <FontAwesomeIcon 
                    icon={activity?.type === 'appointment' ? faCalendarAlt : 
                          activity?.type === 'payment' ? faMoneyBill : 
                          activity?.type === 'visit' ? faFileMedical : faClipboardList} 
                    className="text-gray-400 mt-1" 
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity?.description || 'No description'}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity?.timestamp)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAppointments = () => {
    if (!historyData?.appointments || historyData.appointments.length === 0) {
      return <p className="text-center text-gray-500 py-8">No appointments found</p>;
    }

    return (
      <div className="space-y-3 max-h-[calc(90vh-200px)] overflow-y-auto">
        {historyData.appointments.map((apt, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="font-medium text-gray-900 dark:text-white">{apt.date} at {apt.time}</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Doctor: Dr. {apt.doctorName || 'N/A'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department: {apt.department || 'N/A'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reason: {apt.reason || apt.symptoms || 'N/A'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMedicalRecords = () => {
    if (!historyData?.visits || historyData.visits.length === 0) {
      return <p className="text-center text-gray-500 py-8">No medical records found</p>;
    }

    return (
      <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
        {historyData.visits.map((visit, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Visit Date: {formatDate(visit.createdAt)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <FontAwesomeIcon icon={faUserMd} className="mr-1 w-3 h-3" />
                  Doctor: Dr. {visit.doctorName || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department: {visit.department || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedEMR(visit);
                  setShowEMRModal(true);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center"
              >
                <FontAwesomeIcon icon={faEye} className="mr-1" />
                View Full EMR
              </button>
            </div>
            
            {/* Chief Complaint */}
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <FontAwesomeIcon icon={faStethoscope} className="mr-1 text-teal-500" />
                Chief Complaint
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded mt-1">
                {visit.chiefComplaint || 'N/A'}
              </p>
            </div>

            {/* Diagnosis */}
            {visit.diagnosis && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <FontAwesomeIcon icon={faNotesMedical} className="mr-1 text-blue-500" />
                  Diagnosis
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded mt-1">
                  {visit.diagnosis}
                </p>
              </div>
            )}

            {/* Vitals */}
            {visit.vitals && Object.keys(visit.vitals).some(key => visit.vitals[key]) && (
              <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <FontAwesomeIcon icon={faHeartbeat} className="mr-1 text-red-500" />
                  Vitals
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {visit.vitals.bp && <div><span className="text-gray-500">BP:</span> <span className="font-medium">{visit.vitals.bp}</span></div>}
                  {visit.vitals.heartRate && <div><span className="text-gray-500">Heart Rate:</span> <span className="font-medium">{visit.vitals.heartRate}</span></div>}
                  {visit.vitals.temperature && <div><span className="text-gray-500">Temp:</span> <span className="font-medium">{visit.vitals.temperature}°C</span></div>}
                  {visit.vitals.sugar && <div><span className="text-gray-500">Sugar:</span> <span className="font-medium">{visit.vitals.sugar}</span></div>}
                  {visit.vitals.weight && <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{visit.vitals.weight} kg</span></div>}
                  {visit.vitals.height && <div><span className="text-gray-500">Height:</span> <span className="font-medium">{visit.vitals.height} cm</span></div>}
                  {visit.vitals.bmi && <div><span className="text-gray-500">BMI:</span> <span className="font-medium">{visit.vitals.bmi}</span></div>}
                  {visit.vitals.oxygenSaturation && <div><span className="text-gray-500">O2 Sat:</span> <span className="font-medium">{visit.vitals.oxygenSaturation}%</span></div>}
                </div>
              </div>
            )}

            {/* Treatment Plan */}
            {visit.treatmentPlan && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <FontAwesomeIcon icon={faSyringe} className="mr-1 text-green-500" />
                  Treatment Plan
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded mt-1">
                  {visit.treatmentPlan}
                </p>
              </div>
            )}

            {/* Prescriptions Summary */}
            {visit.prescriptions && visit.prescriptions.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <FontAwesomeIcon icon={faPills} className="mr-1 text-purple-500" />
                  Prescriptions ({visit.prescriptions.length})
                </p>
                <div className="mt-1 space-y-1">
                  {visit.prescriptions.slice(0, 3).map((rx, idx) => (
                    <p key={idx} className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-1 rounded">
                      • {rx.medicineName} - {rx.dose} ({rx.frequency})
                    </p>
                  ))}
                  {visit.prescriptions.length > 3 && (
                    <p className="text-xs text-gray-500">+{visit.prescriptions.length - 3} more medications</p>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {visit.followUpDate && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                  Follow-up: {formatDate(visit.followUpDate)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPrescriptions = () => {
    const allPrescriptions = historyData?.visits?.flatMap(visit => 
      (visit.prescriptions || []).map(rx => ({
        ...rx,
        visitDate: visit.createdAt,
        doctorName: visit.doctorName,
        visitId: visit.id
      }))
    ) || [];

    if (allPrescriptions.length === 0) {
      return <p className="text-center text-gray-500 py-8">No prescriptions found</p>;
    }

    return (
      <div className="space-y-3 max-h-[calc(90vh-200px)] overflow-y-auto">
        {allPrescriptions.map((rx, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <p className="font-medium text-gray-900 dark:text-white">{rx.medicineName}</p>
                  {rx.dispenseAsWritten && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">DAW</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Dose:</span> {rx.dose} • 
                  <span className="font-medium ml-2">Frequency:</span> {rx.frequency} • 
                  <span className="font-medium ml-2">Route:</span> {rx.route || 'oral'}
                </p>
                {rx.duration && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Duration:</span> {rx.duration}
                  </p>
                )}
                {rx.quantity && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Quantity:</span> {rx.quantity}
                  </p>
                )}
                {rx.refills > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Refills:</span> {rx.refills}
                  </p>
                )}
                {rx.instructions && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic bg-white dark:bg-gray-800 p-2 rounded">
                    "{rx.instructions}"
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <FontAwesomeIcon icon={faUserMd} className="mr-1 w-3 h-3" />
                  Prescribed by: Dr. {rx.doctorName || 'N/A'} on {formatDate(rx.visitDate)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPayments = () => {
    if (!historyData?.payments || historyData.payments.length === 0) {
      return <p className="text-center text-gray-500 py-8">No payment records found</p>;
    }

    return (
      <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
        {historyData.payments.map((payment, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {payment.serviceName || 'Payment'} - Invoice #{payment.invoiceId?.slice(-8) || payment.id?.slice(-8)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(payment.createdAt)}</p>
                <p className="text-sm font-semibold text-green-600 mt-1">
                  Amount: {formatCurrency(payment.amount || payment.total || 0)}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(payment.status || payment.paymentStatus || 'pending')}`}>
                  {payment.status || payment.paymentStatus || 'pending'}
                </span>
                {payment.paymentMethod && (
                  <p className="text-xs text-gray-500 mt-1">Method: {payment.paymentMethod}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800">
            <div>
              <h2 className="text-xl font-bold text-white">Patient Health History</h2>
              <p className="text-sm text-blue-200">{userName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportSummary}
                disabled={exporting}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-1" />
                {exporting ? 'Exporting...' : 'Export Summary'}
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm flex items-center"
              >
                <FontAwesomeIcon icon={faPrint} className="mr-1" />
                Print
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition flex items-center whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-3xl" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'appointments' && renderAppointments()}
                {activeTab === 'medical' && renderMedicalRecords()}
                {activeTab === 'prescriptions' && renderPrescriptions()}
                {activeTab === 'payments' && renderPayments()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* EMR Modal */}
      {showEMRModal && selectedEMR && (
        <EMRForm
          visit={selectedEMR}
          patient={historyData?.patient}
          onClose={() => {
            setShowEMRModal(false);
            setSelectedEMR(null);
          }}
          readOnly={true}
          showPrintButton={true}
          showDownloadButton={true}
        />
      )}
    </>
  );
};

export default PatientHistoryModal;