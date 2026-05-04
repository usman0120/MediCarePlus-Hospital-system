/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarPlus,
  faCalendarCheck,
  faFileMedical,
  faFlask,
  faFileInvoice,
  faStar,
  faMessage,
  faUser,
  faComment,
  faSpinner,
  faSignOutAlt,
  faHospital,
  faDownload,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faHistory,
  faCreditCard,
  faUserMd,
  faEye,
  faBell,
  faCog,
  faMoon,
  faSun,
  faTimes,
  faEdit,
  faPaperclip
} from '@fortawesome/free-solid-svg-icons';
import { logoutUser, resetPassword } from '../auth';
import {
  getAppointmentsByPatient,
  getVisitsByPatient,
  getInvoicesByPatient,
  getLabResultsByPatient,
  getPatientDashboardStats,
  getPatientMedicalHistory,
  updatePatientProfile,
  cancelAppointment,
  getPublicDoctors,
  getPublicDepartments,
  submitRating,
  downloadPrescription,
  getPendingAlerts,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  searchDoctors,
  getUnreadMessageCount,
  processPayment,
  getPaymentHistory,
  submitDeactivationRequest,
  getDoctorRatings,
  getDoctorById
} from '../database';
import { 
  formatDate, 
  formatCurrency,
  handleFirebaseError,
  validateEmail,
  compressData,
} from '../utils/helpers';
import { validateProfile } from '../utils/validators';
import toast from 'react-hot-toast';
import Chat from '../components/Chat';
import Invoice from '../components/Invoice';
import EMRForm from '../components/EMRForm';
import SearchBar from '../components/SearchBar';
import AppointmentBooking from '../components/appointments/AppointmentBooking';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentDetails from '../components/appointments/AppointmentDetails';

const Patient = () => {
  const { currentUser, userDetails, refreshUserDetails } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  
  // Data states
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Doctor discovery
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorDetails, setDoctorDetails] = useState(null);
  const [doctorRatings, setDoctorRatings] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [chatDoctor, setChatDoctor] = useState(null);

  // Appointment states - simplified
  const [showBooking, setShowBooking] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  // Rating
  const [showRating, setShowRating] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  // Medical records viewing
  const [selectedEMR, setSelectedEMR] = useState(null);
  const [showEMRView, setShowEMRView] = useState(false);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    emergencyContact: '',
    address: '',
    bloodGroup: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    cnic: ''
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Payment
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentProof, setPaymentProof] = useState(null);
  const [transactionId, setTransactionId] = useState('');

  // File upload for payment proof
  const [uploadingFile, setUploadingFile] = useState(false);

  // Password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Get uid safely
  const uid = currentUser?.uid;

  // Fetch doctor ratings
  const fetchDoctorRatings = useCallback(async (doctorId) => {
    if (!doctorId) return;
    
    setLoadingRatings(true);
    const result = await getDoctorRatings(doctorId);
    if (result?.success) {
      setDoctorRatings(result.data);
    }
    setLoadingRatings(false);
  }, []);

  // Fetch functions with error handling
  const fetchDashboardData = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    
    try {
      const [statsResult, appointmentsResult, visitsResult, invoicesResult, labResultsResult, alertsResult, unreadResult] = await Promise.allSettled([
        getPatientDashboardStats(uid),
        getAppointmentsByPatient(uid),
        getVisitsByPatient(uid),
        getInvoicesByPatient(uid),
        getLabResultsByPatient(uid),
        getPendingAlerts(),
        getUnreadMessageCount(uid)
      ]);

      if (statsResult.status === 'fulfilled' && statsResult.value?.success) 
        setStats(statsResult.value.data);
      if (appointmentsResult.status === 'fulfilled' && appointmentsResult.value?.success) 
        setAppointments(appointmentsResult.value.data);
      if (visitsResult.status === 'fulfilled' && visitsResult.value?.success) 
        setVisits(visitsResult.value.data);
      if (invoicesResult.status === 'fulfilled' && invoicesResult.value?.success) 
        setInvoices(invoicesResult.value.data);
      if (labResultsResult.status === 'fulfilled' && labResultsResult.value?.success) 
        setLabResults(labResultsResult.value.data);
      if (alertsResult.status === 'fulfilled' && alertsResult.value?.success) 
        setNotifications(alertsResult.value.data);
      if (unreadResult.status === 'fulfilled' && unreadResult.value?.success) 
        setUnreadCount(unreadResult.value.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const fetchAppointments = useCallback(async () => {
    if (!uid) return;
    const result = await getAppointmentsByPatient(uid);
    if (result?.success) setAppointments(result.data);
  }, [uid]);

  const fetchVisits = useCallback(async () => {
    if (!uid) return;
    const result = await getVisitsByPatient(uid);
    if (result?.success) setVisits(result.data);
  }, [uid]);

  const fetchInvoices = useCallback(async () => {
    if (!uid) return;
    const result = await getInvoicesByPatient(uid);
    if (result?.success) setInvoices(result.data);
    
    const paymentResult = await getPaymentHistory(uid);
    if (paymentResult?.success) setPaymentHistory(paymentResult.data);
  }, [uid]);

  const fetchLabResults = useCallback(async () => {
    if (!uid) return;
    const result = await getLabResultsByPatient(uid);
    if (result?.success) setLabResults(result.data);
  }, [uid]);

  const fetchDoctors = useCallback(async (searchTerm = '') => {
    if (searchTerm) {
      const result = await searchDoctors(searchTerm);
      if (result?.success) setDoctors(result.data);
    } else {
      const result = await getPublicDoctors();
      if (result?.success) setDoctors(result.data);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    const result = await getPublicDepartments();
    if (result?.success) setDepartments(result.data);
  }, []);

  const fetchMedicalHistory = useCallback(async () => {
    if (!uid) return;
    const result = await getPatientMedicalHistory(uid);
    if (result?.success) setMedicalHistory(result.data);
  }, [uid]);

  // Load data based on active tab
  useEffect(() => {
    if (!uid) return;

    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'dashboard') {
          await fetchDashboardData();
        } else if (activeTab === 'appointments') {
          await fetchAppointments();
        } else if (activeTab === 'medical-records') {
          await fetchVisits();
        } else if (activeTab === 'lab-results') {
          await fetchLabResults();
        } else if (activeTab === 'billing') {
          await fetchInvoices();
        } else if (activeTab === 'doctors') {
          await Promise.all([fetchDoctors(searchQuery), fetchDepartments()]);
        } else if (activeTab === 'history') {
          await fetchMedicalHistory();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, uid, searchQuery, fetchDashboardData, fetchAppointments, 
      fetchVisits, fetchLabResults, fetchInvoices, fetchDoctors, 
      fetchDepartments, fetchMedicalHistory]);

  // Initialize profile form when user details load
  useEffect(() => {
    if (userDetails) {
      setProfileForm({
        fullName: userDetails.fullName || '',
        phone: userDetails.phone || '',
        emergencyContact: userDetails.emergencyContact || '',
        address: userDetails.address || '',
        bloodGroup: userDetails.bloodGroup || '',
        email: userDetails.email || '',
        dateOfBirth: userDetails.dateOfBirth || '',
        gender: userDetails.gender || '',
        cnic: userDetails.cnic || ''
      });
    }
  }, [userDetails]);

const handleChatWithDoctor = (doctorId, doctorName) => {
  setChatDoctor({ id: doctorId, fullName: doctorName });
  setActiveTab('chat');
};

// Fix handleCancelAppointment to refresh data properly
const handleCancelAppointment = async (appointmentId) => {
  if (!window.confirm('Are you sure you want to cancel this appointment?')) {
    return;
  }

  const reason = prompt('Please provide a reason for cancellation (optional):');
  
  setLoading(true);
  const result = await cancelAppointment(appointmentId, uid, reason || '');
  
  if (result?.success) {
    toast.success('Appointment cancelled successfully');
    await fetchAppointments();
    await fetchDashboardData();
  } else {
    handleFirebaseError(result?.error);
  }
  setLoading(false);
};

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    const result = await submitRating({
      patientId: uid,
      doctorId: selectedVisit?.doctorId,
      visitId: selectedVisit?.id,
      rating,
      review,
      createdAt: new Date()
    });

    if (result?.success) {
      toast.success('Thank you for your feedback!');
      setShowRating(false);
      setSelectedVisit(null);
      setRating(0);
      setReview('');
      setHoverRating(0);
    } else {
      handleFirebaseError(result?.error);
    }
    setLoading(false);
  };

  // Handle doctor selection
  const handleDoctorSelect = async (doctorId) => {
    if (doctorId) {
      const result = await getDoctorById(doctorId);
      if (result?.success) {
        setDoctorDetails(result.data);
        await fetchDoctorRatings(doctorId);
      }
    }
  };

  // Handle prescription download
  const handleDownloadPrescription = async (prescription) => {
    try {
      if (prescription?.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${prescription.pdfBase64}`;
        link.download = `prescription-${prescription.id}.pdf`;
        link.click();
        toast.success('Prescription downloaded');
      } else if (prescription?.id) {
        const result = await downloadPrescription(prescription.id);
        if (result?.success) {
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${result.data}`;
          link.download = `prescription-${prescription.id}.pdf`;
          link.click();
          toast.success('Prescription downloaded');
        }
      }
    } catch (error) {
      console.error('Error downloading prescription:', error);
      toast.error('Failed to download prescription');
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    const validation = validateProfile(profileForm);
    if (!validation.isValid) {
      setProfileErrors(validation.errors);
      toast.error(Object.values(validation.errors)[0]);
      return;
    }
    
    setLoading(true);
    const result = await updatePatientProfile(uid, profileForm, uid);
    
    if (result?.success) {
      toast.success('Profile updated successfully');
      setEditingProfile(false);
      setProfileErrors({});
      await refreshUserDetails();
    } else {
      handleFirebaseError(result?.error);
    }
    setLoading(false);
  };

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }
    
    if (!validateEmail(resetEmail)) {
      toast.error('Please enter a valid email');
      return;
    }
    
    setLoading(true);
    
    const result = await resetPassword(resetEmail);
    
    if (result?.success) {
      toast.success(result.message || 'Password reset email sent! Check your inbox.');
      setShowPasswordReset(false);
      setResetEmail('');
    } else {
      const errorMessage = result?.error || 'Failed to send password reset email';
      toast.error(errorMessage);
      console.error('Password reset error:', errorMessage);
    }
    
    setLoading(false);
  };

  // Handle account deactivation request
  const handleDeactivationRequest = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deactivation (optional)');
      return;
    }
    
    setLoading(true);
    const result = await submitDeactivationRequest(
      uid, 
      deleteReason, 
      userDetails?.email, 
      userDetails?.fullName
    );
    
    if (result?.success) {
      toast.success(
        <div>
          <p className="font-medium">Deactivation request submitted!</p>
          <p className="text-sm">An admin will review your request shortly.</p>
        </div>,
        { duration: 5000 }
      );
      setShowDeleteConfirm(false);
      setDeleteReason('');
    } else {
      handleFirebaseError(result?.error);
    }
    setLoading(false);
  };

  // Handle payment
  const handlePayment = async (invoiceId) => {
    if (!paymentProof && paymentMethod !== 'cash') {
      toast.error('Please upload payment proof');
      return;
    }

    setLoading(true);
    
    let proofData = null;
    if (paymentProof) {
      proofData = await compressData(paymentProof);
    }

    const paymentData = {
      method: paymentMethod,
      transactionId: transactionId || undefined,
      proof: proofData,
      paidAt: new Date()
    };

    const result = await processPayment(invoiceId, paymentData, uid);

    if (result?.success) {
      toast.success('Payment submitted for verification');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentProof(null);
      setTransactionId('');
      fetchInvoices();
    } else {
      handleFirebaseError(result?.error);
    }
    setLoading(false);
  };

  const handlePaySuccess = async (appointmentId, paymentData) => {
  setLoading(true);
  try {
    // Refresh appointments to show updated status
    await fetchAppointments();
    await fetchDashboardData();
    toast.success('Payment submitted successfully! Waiting for verification.');
  } catch (error) {
    console.error('Error after payment:', error);
  } finally {
    setLoading(false);
  }
};
const handleRateDoctor = async (ratingData) => {
  setLoading(true);
  try {
    await fetchAppointments();
    toast.success('Thank you for your feedback!');
  } catch (error) {
    console.error('Error after rating:', error);
  } finally {
    setLoading(false);
  }
};

  // Handle file upload for payment proof
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploadingFile(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result);
      setUploadingFile(false);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle notification read
  const handleNotificationRead = async (notificationId) => {
    const result = await markNotificationAsRead(notificationId);
    if (result?.success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead(uid);
    if (result?.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser(uid);
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Reset booking form
  const resetBookingForm = () => {
    setDoctorDetails(null);
    setTimeSlots([]);
  };

  // Get appointment status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: faClock },
      'approved': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: faCheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: faTimesCircle },
      'checked-in': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: faUser },
      'completed': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: faCheckCircle },
      'cancelled': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: faTimesCircle },
      'no-show': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: faExclamationTriangle }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <FontAwesomeIcon icon={config.icon} className="mr-1" />
        {status === 'approved' ? 'Confirmed' : status}
      </span>
    );
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faHospital },
    { id: 'doctors', label: 'Find Doctors', icon: faUserMd },
    { id: 'appointments', label: 'Appointments', icon: faCalendarCheck },
    { id: 'medical-records', label: 'Medical Records', icon: faFileMedical },
    { id: 'lab-results', label: 'Lab Results', icon: faFlask },
    { id: 'billing', label: 'Billing', icon: faFileInvoice },
    { id: 'history', label: 'Health History', icon: faHistory },
    { id: 'profile', label: 'Profile', icon: faUser }
  ];

  // Don't render if no user
  if (!uid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-10">
        <div className="flex items-center justify-between px-6 py-3 ml-64">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {tabs.find(t => t.id === activeTab)?.label || 'Patient Portal'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="w-64">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search doctors, appointments..."
                onResultSelect={(result) => {
                  if (result.type === 'doctor') {
                    setSelectedDoctor(result);
                    setShowDoctorProfile(true);
                  } else if (result.type === 'appointment') {
                    setSelectedAppointment(result);
                    setShowAppointmentDetails(true);
                  }
                }}
                data={[]}
                searchKeys={['fullName', 'specialization', 'department']}
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
                aria-label="Notifications"
              >
                <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-gray-500">No notifications</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationRead(notif.id)}
                          className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer ${
                            !notif?.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{notif?.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{notif?.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notif?.createdAt ? formatDate(notif.createdAt) : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Toggle theme"
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="h-5 w-5" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Settings"
            >
              <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="absolute right-0 top-12 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowPasswordReset(true);
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-yellow-600"
                >
                  Request Account Deactivation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg z-20">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">MediCare Plus</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Patient Portal</p>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">{userDetails?.fullName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">ID: {uid?.slice(-8)}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-3 w-5" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Chat Button with Unread Badge */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chat')}
              className="w-full flex items-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition relative"
            >
              <FontAwesomeIcon icon={faMessage} className="mr-3" />
              <span className="text-sm">Chat with Doctor</span>
              {unreadCount > 0 && (
                <span className="absolute right-3 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900 rounded-lg transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'doctors' && renderDoctors()}
            {activeTab === 'appointments' && renderAppointments()}
            {activeTab === 'medical-records' && renderMedicalRecords()}
            {activeTab === 'lab-results' && renderLabResults()}
            {activeTab === 'billing' && renderBilling()}
            {activeTab === 'history' && renderHealthHistory()}
            {activeTab === 'profile' && renderProfile()}
{activeTab === 'chat' && (
  <div className="h-full">
    {chatDoctor ? (
      <Chat
        userId={uid}
        userRole="patient"
        otherUserId={chatDoctor.id}
        otherUserName={`Dr. ${chatDoctor.fullName}`}
        onClose={() => {
          setChatDoctor(null);
        }}
        onMessageRead={() => setUnreadCount(prev => Math.max(0, prev - 1))}
      />
    ) : (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <FontAwesomeIcon icon={faMessage} className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select a Doctor to Chat</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose a doctor from your confirmed or completed appointments to start chatting.
        </p>
        
        {/* Show unique list of doctors from appointments - include MORE statuses */}
        <div className="max-w-md mx-auto">
          <h4 className="text-left font-medium text-gray-700 dark:text-gray-300 mb-3">Your Doctors</h4>
          <div className="space-y-3">
            {(() => {
              // Get unique doctors from appointments - include all active statuses
              const uniqueDoctors = new Map();
              appointments
                .filter(apt => {
                  // Include appointments that have progressed past pending
                  const activeStatuses = ['approved', 'confirmed', 'checked-in', 'in-progress', 'completed'];
                  return activeStatuses.includes(apt.status);
                })
                .forEach(apt => {
                  if (apt.doctorId && !uniqueDoctors.has(apt.doctorId)) {
                    uniqueDoctors.set(apt.doctorId, {
                      id: apt.doctorId,
                      name: apt.doctorName,
                      specialization: apt.doctorSpecialization
                    });
                  }
                });
              
              const doctorsList = Array.from(uniqueDoctors.values());
              console.log('Doctors available for chat:', doctorsList);
              
              return doctorsList;
            })().map(doctor => (
              <button
                key={doctor.id}
                onClick={() => {
                  setChatDoctor({ id: doctor.id, fullName: doctor.name });
                }}
                className="w-full flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition text-left"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                  <FontAwesomeIcon icon={faUserMd} className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">Dr. {doctor.name}</p>
                  {doctor.specialization && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.specialization}</p>
                  )}
                </div>
                <FontAwesomeIcon icon={faComment} className="text-green-600 dark:text-green-400" />
              </button>
            ))}
            
            {appointments.filter(apt => apt.status === 'approved' || apt.status === 'confirmed' || apt.status === 'checked-in' || apt.status === 'completed').length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 py-4">
                No doctors available for chat. Once your appointment is confirmed (after payment), you can chat here.
              </p>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
)}
          </>
        )}
      </div>

      {/* Modals */}
      {renderBookingModal()}
      {renderAppointmentDetailsModal()}
      {renderRatingModal()}
      {renderEMRViewModal()}
      {renderPaymentModal()}
      {renderPasswordResetModal()}
      {renderDeactivationModal()}
      {renderDoctorProfileModal()}
    </div>
  );

  // Dashboard render
  function renderDashboard() {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {userDetails?.fullName?.split(' ')[0] || 'Patient'}!</h2>
          <p className="text-blue-100">Here's your health summary for today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming Appointments</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.upcomingAppointments || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            {stats?.upcomingAppointments > 0 && (
              <button
                onClick={() => setActiveTab('appointments')}
                className="text-sm text-green-600 hover:text-green-700 mt-2"
              >
                Next: {appointments.find(a => a?.status === 'approved')?.date}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unread Messages</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {unreadCount}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <FontAwesomeIcon icon={faMessage} className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => setActiveTab('chat')}
                className="text-sm text-green-600 hover:text-green-700 mt-2"
              >
                {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Bills</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.pendingBills || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <FontAwesomeIcon icon={faFileInvoice} className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            {stats?.pendingBills > 0 && (
              <button
                onClick={() => setActiveTab('billing')}
                className="text-sm text-red-600 hover:text-red-700 mt-2"
              >
                Total: {formatCurrency(invoices.filter(i => i?.status === 'unpaid').reduce((sum, i) => sum + (i?.total || 0), 0))}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Visits</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.totalVisits || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <FontAwesomeIcon icon={faFileMedical} className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            {stats?.totalVisits > 0 && visits?.length > 0 && (
              <button
                onClick={() => setActiveTab('history')}
                className="text-sm text-gray-600 hover:text-gray-700 mt-2"
              >
                Last visit: {visits[0]?.createdAt ? formatDate(visits[0].createdAt) : ''}
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => {
                setActiveTab('doctors');
                setShowBooking(true);
              }}
              className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition text-center group"
            >
              <FontAwesomeIcon icon={faCalendarPlus} className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Book Appointment</p>
            </button>

            <button
              onClick={() => setActiveTab('medical-records')}
              className="p-4 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition text-center group"
            >
              <FontAwesomeIcon icon={faFileMedical} className="h-6 w-6 text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">View Records</p>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-800 transition text-center group"
            >
              <FontAwesomeIcon icon={faCreditCard} className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mb-2 group-hover:scale-110 transition" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Pay Bills</p>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition text-center group relative"
            >
              <FontAwesomeIcon icon={faMessage} className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Chat with Doctor</p>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Appointments</h3>
            <button
              onClick={() => setActiveTab('appointments')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {appointments?.slice(0, 5).map((apt) => (
              <div key={apt?.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faUserMd} className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Dr. {apt?.doctorName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {apt?.date} at {apt?.time} • {apt?.department}
                    </p>
                  </div>
                </div>
                {apt?.status && getStatusBadge(apt.status)}
              </div>
            ))}
            {(!appointments || appointments.length === 0) && (
              <p className="text-gray-500 text-center py-4">No recent appointments</p>
            )}
          </div>
        </div>

        {/* Recent Lab Results */}
        {labResults?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Lab Results</h3>
              <button
                onClick={() => setActiveTab('lab-results')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View All
              </button>
            </div>
            <div className="p-6">
              {labResults.slice(0, 3).map((result) => (
                <div key={result?.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{result?.testName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {result?.completedAt ? formatDate(result.completedAt) : ''} • Dr. {result?.doctorName}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEMR(result);
                      setShowEMRView(true);
                    }}
                    className="text-blue-600 hover:text-blue-700"
                    title="View Result"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Doctors Discovery render
  function renderDoctors() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Find a Doctor</h2>
          <div className="w-64">
            <SearchBar
              onSearch={fetchDoctors}
              placeholder="Search by name or specialization..."
              data={doctors}
              searchKeys={['fullName', 'specialization', 'department']}
              onResultSelect={(doctor) => {
                setSelectedDoctor(doctor);
                setShowDoctorProfile(true);
              }}
            />
          </div>
        </div>

        {/* Department Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedDoctor(null)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
              !selectedDoctor
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Departments
          </button>
          {departments.map(dept => (
            <button
              key={dept?.id}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                selectedDoctor === dept?.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => {/* Filter by department */}}
            >
              {dept?.name}
            </button>
          ))}
        </div>

        {/* Doctor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors
            .filter(doc => !selectedDoctor || doc?.id === selectedDoctor?.id)
            .map((doctor) => (
              <div key={doctor?.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      {doctor?.profileImage ? (
                        <img 
                          src={doctor.profileImage} 
                          alt={doctor.fullName}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faUserMd} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dr. {doctor?.fullName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{doctor?.specialization}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Experience:</span> {doctor?.experience || 0} years
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Consultation Fee:</span> {doctor?.consultationFee ? formatCurrency(doctor.consultationFee) : formatCurrency(1000)}
                    </p>
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FontAwesomeIcon
                            key={star}
                            icon={faStar}
                            className={`h-4 w-4 ${
                              star <= Math.round(doctor?.avgRating || 0)
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ({doctor?.ratings || 0} reviews)
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        handleDoctorSelect(doctor.id);
                        setShowDoctorProfile(true);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setDoctorDetails(doctor);
                        setShowBooking(true);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {doctors.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faUserMd} className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No doctors found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    );
  }

function renderAppointments () {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h2>
        <button
          onClick={() => setShowBooking(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
          Book New Appointment
        </button>
      </div>

      <AppointmentList
        appointments={appointments}
        role="patient"
        onCancel={handleCancelAppointment}
        onViewDetails={(appointment) => {
          setSelectedAppointment(appointment);
          setShowAppointmentDetails(true);
        }}
        onChatWithDoctor={handleChatWithDoctor}
        onPaySuccess={handlePaySuccess}
        onRateDoctor={handleRateDoctor}
        loading={loading}
        showFilters={true}
      />
    </div>
  );
};

  // Medical Records render
  function renderMedicalRecords() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Records</h2>

        {!visits || visits.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faFileMedical} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Medical Records</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your medical records will appear here after your first visit.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((visit) => (
              <div key={visit?.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Visit Date</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {visit?.createdAt ? formatDate(visit.createdAt) : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Doctor</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">Dr. {visit?.doctorName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{visit?.department}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEMR(visit);
                        setShowEMRView(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-2" />
                      View Details
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chief Complaint</p>
                      <p className="text-gray-900 dark:text-white">{visit?.chiefComplaint || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Diagnosis</p>
                      <p className="text-gray-900 dark:text-white">{visit?.diagnosis || 'Not specified'}</p>
                    </div>
                  </div>

                  {visit?.vitals && Object.keys(visit.vitals).length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Vitals</p>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">BP</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.vitals.bp || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Sugar</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.vitals.sugar || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Heart Rate</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.vitals.heartRate || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Temperature</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.vitals.temperature || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {visit?.prescriptions && visit.prescriptions.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Prescriptions</p>
                      <div className="space-y-2">
                        {visit.prescriptions.map((pres, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{pres?.medicineName}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {pres?.dose} - {pres?.frequency} for {pres?.duration}
                              </p>
                              {pres?.instructions && (
                                <p className="text-xs text-gray-500 mt-1">{pres.instructions}</p>
                              )}
                            </div>
                            <button
                              onClick={() => pres && handleDownloadPrescription(pres)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Download Prescription"
                            >
                              <FontAwesomeIcon icon={faDownload} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit?.followUpDate && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <FontAwesomeIcon icon={faCalendarCheck} className="mr-2" />
                        Follow-up scheduled for {formatDate(visit.followUpDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Lab Results render
  function renderLabResults() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Results</h2>

        {!labResults || labResults.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faFlask} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Lab Results</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your lab results will appear here once completed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {labResults.map((result) => (
              <div key={result?.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {result?.testName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Requested by: Dr. {result?.doctorName} on {result?.requestedAt ? formatDate(result.requestedAt) : ''}
                    </p>
                    {result?.completedAt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Completed: {formatDate(result.completedAt)}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    result?.status === 'completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {result?.status}
                  </span>
                </div>

                {result?.status === 'completed' && result?.results && (
                  <>
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Results</p>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{result.results}</p>
                    </div>

                    {result?.notes && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{result.notes}</p>
                      </div>
                    )}

                    {result?.files && Object.keys(result.files).length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Attachments</p>
                        <div className="space-y-2">
                          {Object.entries(result.files).map(([filename, base64]) => (
                            <button
                              key={filename}
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `data:application/octet-stream;base64,${base64}`;
                                link.download = filename;
                                link.click();
                              }}
                              className="flex items-center text-blue-600 hover:text-blue-700"
                            >
                              <FontAwesomeIcon icon={faDownload} className="mr-2" />
                              {filename}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Billing render
  function renderBilling() {
    const pendingInvoices = invoices?.filter(i => i?.status === 'unpaid' || i?.status === 'pending') || [];
    const paidInvoices = invoices?.filter(i => i?.status === 'paid') || [];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Invoices</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Due</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(pendingInvoices.reduce((sum, inv) => sum + (inv?.total || 0), 0))}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(paidInvoices.reduce((sum, inv) => sum + (inv?.total || 0), 0))}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Invoices</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingInvoices.length}</p>
          </div>
        </div>

        {/* Pending Invoices */}
        {pendingInvoices.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Invoices</h3>
            </div>
            <div className="p-6 space-y-4">
              {pendingInvoices.map((invoice) => (
                <Invoice 
                  key={invoice?.id} 
                  invoice={invoice} 
                  patientView={true}
                  onPaymentComplete={() => {
                    setSelectedInvoice(invoice);
                    setShowPaymentModal(true);
                  }}
                  onPaymentConfirm={() => fetchInvoices()}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paid Invoices */}
        {paidInvoices.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {paidInvoices.map((invoice) => (
                  <div key={invoice?.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Invoice #{invoice?.id?.slice(-8)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Paid on {invoice?.paidAt ? formatDate(invoice.paidAt) : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice?.total || 0)}</p>
                      <p className="text-xs text-green-600">Paid via {invoice?.payment?.method}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {invoices?.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faFileInvoice} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Invoices</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your invoices will appear here after your visits.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Health History render
  function renderHealthHistory() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Health History Summary</h2>

        {!medicalHistory ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Visits</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{medicalHistory.totalVisits || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">First Visit</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {medicalHistory.firstVisit ? formatDate(medicalHistory.firstVisit) : 'N/A'}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Visit</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {medicalHistory.lastVisit ? formatDate(medicalHistory.lastVisit) : 'N/A'}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Treating Doctors</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {medicalHistory.treatingDoctors?.length || 0}
                </p>
              </div>
            </div>

            {/* Conditions */}
            {medicalHistory.uniqueConditions?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Medical Conditions</h3>
                <div className="flex flex-wrap gap-2">
                  {medicalHistory.uniqueConditions.map((condition, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {medicalHistory.uniqueMedications?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Medications Taken</h3>
                <div className="flex flex-wrap gap-2">
                  {medicalHistory.uniqueMedications.map((medication, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm"
                    >
                      {medication}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {medicalHistory.allergies?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Allergies</h3>
                <div className="flex flex-wrap gap-2">
                  {medicalHistory.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Visits by Year */}
            {medicalHistory.visitsByYear && Object.keys(medicalHistory.visitsByYear).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visits by Year</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(medicalHistory.visitsByYear).map(([year, count]) => (
                    <div key={year} className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{year}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common Diagnoses */}
            {medicalHistory.commonDiagnosis?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Common Diagnoses</h3>
                <div className="space-y-3">
                  {medicalHistory.commonDiagnosis.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">{item?.diagnosis}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item?.count} time{item?.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Profile render
  function renderProfile() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <FontAwesomeIcon icon={editingProfile ? faTimes : faEdit} className="mr-2" />
            {editingProfile ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {editingProfile ? (
          <form onSubmit={handleProfileUpdate} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    profileErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {profileErrors.fullName && (
                  <p className="text-sm text-red-600 mt-1">{profileErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    profileErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {profileErrors.phone && (
                  <p className="text-sm text-red-600 mt-1">{profileErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  value={profileForm.emergencyContact}
                  onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Blood Group
                </label>
                <select
                  value={profileForm.bloodGroup}
                  onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <textarea
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> : null}
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Full Name</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{userDetails?.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{userDetails?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{userDetails?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">CNIC</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{userDetails?.cnic || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date of Birth</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {userDetails?.dateOfBirth ? new Date(userDetails.dateOfBirth).toLocaleDateString() : 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Blood Group</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{userDetails?.bloodGroup || 'Not specified'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Address</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{userDetails?.address || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Booking Modal
  function renderBookingModal() {
    if (!showBooking) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Book Appointment
            </h3>
            <button
              onClick={() => {
                setShowBooking(false);
                resetBookingForm();
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <AppointmentBooking
            patientId={uid}
            initialDoctorId={doctorDetails?.id}
            onSuccess={() => {
              setShowBooking(false);
              resetBookingForm();
              fetchAppointments();
              toast.success('Appointment request submitted! Waiting for approval.');
            }}
            onCancel={() => {
              setShowBooking(false);
              resetBookingForm();
            }}
          />
        </div>
      </div>
    );
  }

  // Appointment Details Modal
  function renderAppointmentDetailsModal() {
    if (!showAppointmentDetails || !selectedAppointment) return null;

    return (
      <AppointmentDetails
        appointment={selectedAppointment}
        role="patient"
        onClose={() => {
          setShowAppointmentDetails(false);
          setSelectedAppointment(null);
        }}
      />
    );
  }

  // Rating Modal
  function renderRatingModal() {
    if (!showRating || !selectedVisit) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Rate Your Experience</h3>
          
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              How was your visit with Dr. {selectedVisit?.doctorName}?
            </p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transform hover:scale-110 transition"
                >
                  <FontAwesomeIcon
                    icon={faStar}
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Write a Review (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Share your experience with the doctor..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRating(false);
                setSelectedVisit(null);
                setRating(0);
                setReview('');
                setHoverRating(0);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRating}
              disabled={loading || !rating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> : null}
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Modal
  function renderPaymentModal() {
    if (!showPaymentModal || !selectedInvoice) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Make Payment</h3>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedInvoice(null);
                setPaymentProof(null);
                setTransactionId('');
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Invoice #{selectedInvoice?.id?.slice(-8)}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(selectedInvoice?.total || 0)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="card">Credit/Debit Card</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash (Pay at Hospital)</option>
              </select>
            </div>

            {paymentMethod !== 'cash' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter transaction ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Payment Proof
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 dark:bg-gray-700 text-gray-500 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-500 transition">
                      <FontAwesomeIcon icon={faPaperclip} className="h-8 w-8 mb-2" />
                      <span className="text-sm">Click to upload receipt/screenshot</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                    </label>
                  </div>
                  {paymentProof && (
                    <p className="mt-2 text-sm text-green-600">
                      File uploaded successfully
                    </p>
                  )}
                  {uploadingFile && (
                    <p className="mt-2 text-sm text-blue-600">
                      Uploading...
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice(null);
                  setPaymentProof(null);
                  setTransactionId('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayment(selectedInvoice.id)}
                disabled={loading || (paymentMethod !== 'cash' && !paymentProof)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> : null}
                {loading ? 'Processing...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password Reset Modal
  function renderPasswordResetModal() {
    if (!showPasswordReset) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Reset Password</h3>
            <button
              onClick={() => setShowPasswordReset(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Enter your email address below. We'll send you a link to reset your password.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPasswordReset(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !resetEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Deactivation Request Modal
  function renderDeactivationModal() {
    if (!showDeleteConfirm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-yellow-600">Request Account Deactivation</h3>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteReason('');
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your account will be deactivated and you won't be able to log in until an admin reviews your request. 
                This action can be reversed by an admin.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for deactivation (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="Please tell us why you're deactivating your account (optional)..."
              />
            </div>

            <p className="text-xs text-gray-500">
              Note: Your data will be preserved. You can reactivate your account by contacting support.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivationRequest}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EMR View Modal
  function renderEMRViewModal() {
    if (!showEMRView || !selectedEMR) return null;

    return (
      <EMRForm
        visit={selectedEMR}
        patient={userDetails}
        onSave={() => {}} // No-op since it's read-only
        onClose={() => {
          setShowEMRView(false);
          setSelectedEMR(null);
        }}
        readOnly={true}
      />
    );
  }

  // Doctor Profile Modal
  function renderDoctorProfileModal() {
    if (!showDoctorProfile || !selectedDoctor) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                {selectedDoctor?.profileImage ? (
                  <img 
                    src={selectedDoctor.profileImage} 
                    alt={selectedDoctor.fullName}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <FontAwesomeIcon icon={faUserMd} className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Dr. {selectedDoctor?.fullName}</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400">{selectedDoctor?.specialization}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDoctorProfile(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Experience</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDoctor?.experience || 0} years</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Consultation Fee</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDoctor?.consultationFee ? formatCurrency(selectedDoctor.consultationFee) : formatCurrency(1000)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Languages</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDoctor?.languages?.join(', ') || 'English, Urdu'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Qualifications</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDoctor?.qualifications?.join(', ') || 'MBBS, FCPS'}
              </p>
            </div>
          </div>

          {/* About */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h4>
            <p className="text-gray-700 dark:text-gray-300">
              {selectedDoctor?.about || 'No description available'}
            </p>
          </div>

          {/* Education */}
          {selectedDoctor?.education?.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Education</h4>
              <ul className="space-y-2">
                {selectedDoctor.education.map((edu, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">
                    • {edu.degree} from {edu.institution} ({edu.year})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Awards */}
          {selectedDoctor?.awards?.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Awards & Recognition</h4>
              <ul className="space-y-2">
                {selectedDoctor.awards.map((award, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">
                    • {award}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ratings Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Patient Reviews</h4>
            
            {/* Rating Summary */}
            <div className="flex items-center mb-4">
              <div className="flex items-center mr-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesomeIcon
                    key={star}
                    icon={faStar}
                    className={`h-5 w-5 ${
                      star <= Math.round(selectedDoctor?.avgRating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDoctor?.avgRating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                ({selectedDoctor?.ratings || 0} reviews)
              </span>
            </div>

            {/* Individual Reviews */}
            {loadingRatings ? (
              <div className="flex justify-center py-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600" />
              </div>
            ) : doctorRatings.length > 0 ? (
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {doctorRatings.map((rating, index) => (
                  <div key={rating.id || index} className="border-t border-gray-200 dark:border-gray-700 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mr-2">
                          <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {rating.patientName || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FontAwesomeIcon
                            key={star}
                            icon={faStar}
                            className={`h-3 w-3 ${
                              star <= rating.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rating.review && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm ml-10">{rating.review}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 ml-10">
                      {rating.createdAt ? formatDate(rating.createdAt) : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No reviews yet</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDoctorProfile(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowDoctorProfile(false);
                setShowBooking(true);
                setDoctorDetails(selectedDoctor);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default Patient;