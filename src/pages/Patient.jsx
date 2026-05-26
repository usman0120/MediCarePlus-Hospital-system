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
  faFileInvoice,
  faStar,
  faMessage,
  faUser,
  faComment,
  faCalendarAlt,
  faMoneyBill,
  faReceipt,
  faSpinner,
  faSignOutAlt,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faHistory,
  faCreditCard,
  faUserMd,
  faCog,
  faMoon,
  faSun,
  faTimes,
  faEdit,
  faPaperclip,
  faStethoscope,
  faPills,
  faMicroscope,
  faNotesMedical,
  faChevronRight,
  faHome,
  faCalendarWeek,
  faIdCard,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faCalendar,
  faVenusMars,
  faTint,
} from '@fortawesome/free-solid-svg-icons';
import { logoutUser, resetPassword } from '../auth';
import {
  getAppointmentsByPatient,
  getVisitsByPatient,
  getInvoicesByPatient,
  getPatientDashboardStats,
  getPatientMedicalHistory,
  updatePatientProfile,
  cancelAppointment,
  getPublicDoctors,
  getPublicDepartments,
  submitRating,
  searchDoctors,
  getUnreadMessageCount,
  processPayment,
  getPaymentHistory,
  submitDeactivationRequest,
  getDoctorRatings,
  getDoctorById,
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
import PatientHistoryModal from '../components/PatientHistoryModal';
import ViewConsultationNotes from '../components/ViewConsultationNotes';

const Patient = () => {
  const { currentUser, userDetails, refreshUserDetails } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const uid = currentUser?.uid;
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data states
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
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

  // Appointment states
  const [showBooking, setShowBooking] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  // History Modal
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);

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
  const [uploadingFile, setUploadingFile] = useState(false);

  // Consultation Notes
  const [showConsultationNotes, setShowConsultationNotes] = useState(false);
  const [selectedVisitForNotes, setSelectedVisitForNotes] = useState(null);

  // Password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

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
      const [statsResult, appointmentsResult, visitsResult, invoicesResult, unreadResult] = await Promise.allSettled([
        getPatientDashboardStats(uid),
        getAppointmentsByPatient(uid),
        getVisitsByPatient(uid),
        getInvoicesByPatient(uid),
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

  // WebSocket/Real-time data sync effect
  useEffect(() => {
    if (!uid) return;

    // Set up a polling interval for real-time updates
    const intervalId = setInterval(async () => {
      if (activeTab === 'dashboard') {
        const appointmentsResult = await getAppointmentsByPatient(uid);
        if (appointmentsResult?.success) {
          setAppointments(appointmentsResult.data);
        }
        
        const invoicesResult = await getInvoicesByPatient(uid);
        if (invoicesResult?.success) {
          setInvoices(invoicesResult.data);
        }
        
        const unreadResult = await getUnreadMessageCount(uid);
        if (unreadResult?.success) {
          setUnreadCount(unreadResult.data);
        }
      } else if (activeTab === 'appointments') {
        const appointmentsResult = await getAppointmentsByPatient(uid);
        if (appointmentsResult?.success) {
          setAppointments(appointmentsResult.data);
        }
      } else if (activeTab === 'history') {
        const visitsResult = await getVisitsByPatient(uid);
        if (visitsResult?.success) {
          setVisits(visitsResult.data);
        }
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [uid, activeTab]);

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
        } else if (activeTab === 'history') {
          await Promise.all([fetchVisits(), fetchMedicalHistory()]);
        } else if (activeTab === 'billing') {
          await fetchInvoices();
        } else if (activeTab === 'doctors') {
          await Promise.all([fetchDoctors(searchQuery), fetchDepartments()]);
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
      fetchVisits, fetchInvoices, fetchDoctors, fetchDepartments, fetchMedicalHistory]);

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

  const handleViewConsultationNotes = async (appointment) => {
    setLoading(true);
    try {
      const visit = visits.find(v => v.appointmentId === appointment.id);
      
      if (visit) {
        setSelectedVisitForNotes(visit);
        setShowConsultationNotes(true);
      } else {
        const { getVisitByAppointmentId } = await import('../database');
        const result = await getVisitByAppointmentId(appointment.id);
        if (result.success && result.data) {
          setSelectedVisitForNotes(result.data);
          setShowConsultationNotes(true);
        } else {
          toast.info('No consultation notes available for this appointment');
        }
      }
    } catch (error) {
      console.error('Error fetching consultation notes:', error);
      toast.error('Failed to load consultation notes');
    } finally {
      setLoading(false);
    }
  };

  const handleChatWithDoctor = (doctorId, doctorName) => {
    setChatDoctor({ id: doctorId, fullName: doctorName });
    setActiveTab('chat');
  };

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

  const handleDoctorSelect = async (doctorId) => {
    if (doctorId) {
      const result = await getDoctorById(doctorId);
      if (result?.success) {
        setDoctorDetails(result.data);
        await fetchDoctorRatings(doctorId);
      }
    }
  };

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

  const handleDeactivationRequest = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deactivation');
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

  const handlePaySuccess = async () => {
    setLoading(true);
    try {
      await fetchAppointments();
      await fetchDashboardData();
      toast.success('Payment submitted successfully! Waiting for verification.');
    } catch (error) {
      console.error('Error after payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateDoctor = async () => {
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

  const resetBookingForm = () => {
    setDoctorDetails(null);
    setTimeSlots([]);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: faClock },
      'approved': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: faCheckCircle },
      'confirmed': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: faCheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: faTimesCircle },
      'checked-in': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: faUser },
      'completed': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: faCheckCircle },
      'cancelled': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: faTimesCircle },
      'no-show': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: faExclamationTriangle }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    const displayText = status === 'approved' ? 'Confirmed' : status === 'checked-in' ? 'Checked In' : status;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <FontAwesomeIcon icon={config.icon} className="mr-1 text-xs" />
        {displayText}
      </span>
    );
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faHome, mobileIcon: faHome },
    { id: 'doctors', label: 'Find Doctors', icon: faUserMd, mobileIcon: faUserMd },
    { id: 'appointments', label: 'Appointments', icon: faCalendarWeek, mobileIcon: faCalendarCheck },
    { id: 'history', label: 'Health History', icon: faHistory, mobileIcon: faHistory },
    { id: 'profile', label: 'Profile', icon: faIdCard, mobileIcon: faUser }
  ];

  // Don't render if no user
  if (!uid) {
    return null;
  }

  // Dashboard render with updated quick actions
  function renderDashboard() {
    const upcomingAppointments = appointments?.filter(apt => 
      apt?.status === 'approved' || apt?.status === 'confirmed' || apt?.status === 'scheduled'
    ) || [];
    const pendingBills = invoices?.filter(i => i?.status === 'unpaid' || i?.status === 'pending') || [];
    const totalPendingAmount = pendingBills.reduce((sum, inv) => sum + (inv?.total || 0), 0);
    const recentVisits = visits?.slice(0, 3) || [];

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Welcome Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Welcome back, {userDetails?.fullName?.split(' ')[0] || 'Patient'}! 👋
              </h2>
              <p className="text-blue-100 text-sm sm:text-base">
                Your health journey matters to us. Here's your health summary.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-200" />
              <span className="text-sm font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Appointments</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {upcomingAppointments.length}
                </p>
                <p className="text-xs text-green-600 mt-1">Upcoming</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medical Visits</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalVisits || visits?.length || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total visits</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <FontAwesomeIcon icon={faFileMedical} className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Bills</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{pendingBills.length}</p>
                <p className="text-xs text-yellow-600 mt-1">{formatCurrency(totalPendingAmount)}</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                <FontAwesomeIcon icon={faFileInvoice} className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Messages</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{unreadCount}</p>
                <p className="text-xs text-purple-600 mt-1">Unread</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <FontAwesomeIcon icon={faMessage} className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Updated with working functionalities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <button
              onClick={() => {
                setActiveTab('doctors');
                setShowBooking(true);
              }}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faCalendarPlus} className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Book Appointment</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faHistory} className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health History</span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Appointments</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faCreditCard} className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pay Bills</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('doctors');
                setChatDoctor(null);
              }}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faMessage} className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat with Doctor</span>
            </button>
          </div>
        </div>

        {/* Recent Appointments */}
        {appointments?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon icon={faCalendarWeek} className="mr-2 text-blue-500" />
                Recent Appointments
              </h3>
              <button
                onClick={() => setActiveTab('appointments')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center"
              >
                View All
                <FontAwesomeIcon icon={faChevronRight} className="ml-1 text-xs" />
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {appointments.slice(0, 3).map((apt) => (
                <div key={apt?.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <FontAwesomeIcon icon={faUserMd} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Dr. {apt?.doctorName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {apt?.date} at {apt?.time}
                          </p>
                          {apt?.department && (
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              {apt.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(apt?.status)}
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowAppointmentDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Medical Visits */}
        {recentVisits.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-green-500" />
                Recent Medical Visits
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(visit.createdAt)}
                        </span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Dr. {visit.doctorName}
                        </span>
                      </div>
                      {visit.diagnosis && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                          <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedVisitForNotes(visit);
                        setShowConsultationNotes(true);
                      }}
                      className="px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm hover:bg-green-200 transition flex items-center"
                    >
                      <FontAwesomeIcon icon={faFileMedical} className="mr-1 h-3 w-3" />
                      View Details
                    </button>
                  </div>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Find a Doctor</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Browse our specialist doctors and book an appointment
            </p>
          </div>
          <div className="w-full sm:w-80">
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

        {/* Department Filters - Responsive */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDoctor(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              !selectedDoctor
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Doctors
          </button>
          {departments.slice(0, 6).map(dept => (
            <button
              key={dept?.id}
              className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              onClick={() => {/* Filter by department - can be implemented */}}
            >
              {dept?.name}
            </button>
          ))}
        </div>

        {/* Doctor Cards - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.filter(doc => !selectedDoctor || doc?.id === selectedDoctor?.id).map((doctor) => (
            <div key={doctor?.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {doctor?.profileImage ? (
                      <img 
                        src={doctor.profileImage} 
                        alt={doctor.fullName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      doctor?.fullName?.charAt(0) || 'D'
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dr. {doctor?.fullName}</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{doctor?.specialization}</p>
                    <div className="flex items-center mt-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FontAwesomeIcon
                            key={star}
                            icon={faStar}
                            className={`h-3 w-3 ${
                              star <= Math.round(doctor?.avgRating || 0)
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-1 text-xs text-gray-500">
                        ({doctor?.ratings || 0})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <FontAwesomeIcon icon={faStethoscope} className="w-4 mr-2 text-gray-400" />
                    {doctor?.experience || 0} years experience
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <FontAwesomeIcon icon={faMoneyBill} className="w-4 mr-2 text-gray-400" />
                    Fee: {doctor?.consultationFee ? formatCurrency(doctor.consultationFee) : formatCurrency(1000)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedDoctor(doctor);
                      handleDoctorSelect(doctor.id);
                      setShowDoctorProfile(true);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
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
            <FontAwesomeIcon icon={faUserMd} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No doctors found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or check back later
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderAppointments() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View and manage all your appointments
            </p>
          </div>
          <button
            onClick={() => setShowBooking(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center shadow-md"
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
          onViewConsultationNotes={handleViewConsultationNotes} 
          onPaySuccess={handlePaySuccess}
          onRateDoctor={handleRateDoctor}
          loading={loading}
          showFilters={true}
        />
      </div>
    );
  }

  function renderHistory() {
    // Calculate summary stats
    const totalVisits = visits?.length || 0;
    const totalAppointments = appointments?.length || 0;
    const completedVisits = visits?.filter(v => v.status === 'discharged' || v.status === 'completed') || [];
    const pendingBills = invoices?.filter(i => i?.status === 'unpaid' || i?.status === 'pending') || [];
    const totalPendingAmount = pendingBills.reduce((sum, inv) => sum + (inv?.total || 0), 0);
    const paidInvoices = invoices?.filter(i => i?.status === 'paid') || [];
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv?.total || 0), 0);
    
    // Get recent prescriptions
    const recentPrescriptions = [];
    visits?.forEach(visit => {
      if (visit.prescriptions && visit.prescriptions.length > 0) {
        recentPrescriptions.push(...visit.prescriptions.map(rx => ({
          ...rx,
          visitDate: visit.createdAt,
          doctorName: visit.doctorName,
          visitId: visit.id
        })));
      }
    });
    recentPrescriptions.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    
    // Get recent lab tests
    const recentLabTests = [];
    visits?.forEach(visit => {
      if (visit.investigations && visit.investigations.length > 0) {
        recentLabTests.push(...visit.investigations.map(inv => ({
          ...inv,
          visitDate: visit.createdAt,
          doctorName: visit.doctorName,
          visitId: visit.id
        })));
      }
    });
    recentLabTests.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Health History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete medical history, prescriptions, and lab reports
            </p>
          </div>
          <button
            onClick={() => setShowFullHistoryModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition flex items-center shadow-md"
          >
            <FontAwesomeIcon icon={faHistory} className="mr-2" />
            View Complete History
          </button>
        </div>

        {/* Health Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Visits</p>
                <p className="text-2xl font-bold">{totalVisits}</p>
              </div>
              <FontAwesomeIcon icon={faFileMedical} className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed Visits</p>
                <p className="text-2xl font-bold">{completedVisits.length}</p>
              </div>
              <FontAwesomeIcon icon={faCheckCircle} className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Prescriptions</p>
                <p className="text-2xl font-bold">{recentPrescriptions.length}</p>
              </div>
              <FontAwesomeIcon icon={faPills} className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Lab Tests</p>
                <p className="text-2xl font-bold">{recentLabTests.length}</p>
              </div>
              <FontAwesomeIcon icon={faMicroscope} className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Recent Visits Section */}
        {visits && visits.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-green-500" />
                Recent Medical Visits
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {visits.slice(0, 5).map((visit) => (
                <div key={visit.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                     onClick={() => {
                       setSelectedVisitForNotes(visit);
                       setShowConsultationNotes(true);
                     }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(visit.createdAt)}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Dr. {visit.doctorName}
                        </span>
                        {visit.department && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            {visit.department}
                          </span>
                        )}
                      </div>
                      {visit.diagnosis && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
                        </p>
                      )}
                      {visit.symptoms && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Symptoms:</span> {visit.symptoms}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        visit.status === 'discharged' || visit.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {visit.status || 'Active'}
                      </span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {visits.length > 5 && (
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 text-center">
                <button
                  onClick={() => setShowFullHistoryModal(true)}
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                >
                  View all {visits.length} visits →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Prescriptions */}
        {recentPrescriptions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon icon={faPills} className="mr-2 text-blue-500" />
                Recent Prescriptions
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentPrescriptions.slice(0, 5).map((rx, idx) => (
                <div key={idx} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{rx.medicineName}</p>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {rx.dose}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Frequency: {rx.frequency} • Duration: {rx.duration}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Prescribed by Dr. {rx.doctorName} on {formatDate(rx.visitDate)}
                      </p>
                      {rx.instructions && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{rx.instructions}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const visit = visits.find(v => v.id === rx.visitId);
                        if (visit) {
                          setSelectedVisitForNotes(visit);
                          setShowConsultationNotes(true);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View Visit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Lab Tests */}
        {recentLabTests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon icon={faMicroscope} className="mr-2 text-purple-500" />
                Recent Lab Tests
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentLabTests.slice(0, 5).map((test, idx) => (
                <div key={idx} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{test.testName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Result: {test.result || 'Pending'}
                      </p>
                      {test.normalRange && (
                        <p className="text-xs text-gray-500 mt-1">Normal Range: {test.normalRange}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Ordered by Dr. {test.doctorName} on {formatDate(test.visitDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const visit = visits.find(v => v.id === test.visitId);
                        if (visit) {
                          setSelectedVisitForNotes(visit);
                          setShowConsultationNotes(true);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Bills Section */}
        {pendingBills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 flex items-center">
                <FontAwesomeIcon icon={faReceipt} className="mr-2" />
                Pending Bills ({pendingBills.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {pendingBills.slice(0, 3).map((bill) => (
                <div key={bill.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Invoice #{bill.id?.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(bill.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-600">{formatCurrency(bill.total || 0)}</p>
                      <button
                        onClick={() => {
                          setSelectedInvoice(bill);
                          setShowPaymentModal(true);
                        }}
                        className="mt-1 px-3 py-1 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition"
                      >
                        Pay Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data State */}
        {visits?.length === 0 && appointments?.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faHistory} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Health Records Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your medical history will appear here after your first visit.
            </p>
            <button
              onClick={() => {
                setActiveTab('doctors');
                setShowBooking(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Book Your First Appointment
            </button>
          </div>
        )}
      </div>
    );
  }

  // Profile render
  function renderProfile() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal information and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          {/* Avatar Section */}
          <div className="relative px-6">
            <div className="absolute -top-12 left-6">
              <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {userDetails?.fullName?.charAt(0) || 'P'}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-14 pb-6 px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{userDetails?.fullName}</h3>
                <p className="text-gray-600 dark:text-gray-400">Patient ID: {uid?.slice(-8)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                    Active
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <FontAwesomeIcon icon={editingProfile ? faTimes : faEdit} className="mr-2" />
                {editingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        {editingProfile ? (
          <form onSubmit={handleProfileUpdate} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
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
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-400" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
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
                  <FontAwesomeIcon icon={faIdCard} className="mr-2 text-gray-400" />
                  CNIC
                </label>
                <input
                  type="text"
                  value={profileForm.cnic}
                  onChange={(e) => setProfileForm({ ...profileForm, cnic: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="12345-1234567-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-400" />
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  value={profileForm.emergencyContact}
                  onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="+92XXXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faCalendar} className="mr-2 text-gray-400" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faVenusMars} className="mr-2 text-gray-400" />
                  Gender
                </label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faTint} className="mr-2 text-gray-400" />
                  Blood Group
                </label>
                <select
                  value={profileForm.bloodGroup}
                  onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-gray-400" />
                  Address
                </label>
                <textarea
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Your complete address"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
              >
                {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> : null}
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faUser} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.fullName}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faEnvelope} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.email}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faPhone} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.phone}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faIdCard} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">CNIC</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.cnic || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faCalendar} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {userDetails?.dateOfBirth ? new Date(userDetails.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faTint} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Blood Group</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.bloodGroup || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faVenusMars} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{userDetails?.gender || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faPhone} className="text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Emergency Contact</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.emergencyContact || 'Not provided'}</p>
                </div>
              </div>

              <div className="md:col-span-2 flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-500 mt-1" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userDetails?.address || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Account Settings</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-yellow-500 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition text-sm"
                >
                  Request Account Deactivation
                </button>
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              fetchDashboardData();
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {selectedDoctor?.fullName?.charAt(0) || 'D'}
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Dr. {selectedDoctor?.fullName}</h3>
                <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">{selectedDoctor?.specialization}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDoctorProfile(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Experience</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDoctor?.experience || 0} years</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Consultation Fee</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDoctor?.consultationFee ? formatCurrency(selectedDoctor.consultationFee) : formatCurrency(1000)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Languages</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedDoctor?.languages?.join(', ') || 'English, Urdu'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Qualifications</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
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
            <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
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
                {doctorRatings.map((ratingItem, index) => (
                  <div key={ratingItem.id || index} className="border-t border-gray-200 dark:border-gray-700 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mr-2">
                          <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {ratingItem.patientName || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FontAwesomeIcon
                            key={star}
                            icon={faStar}
                            className={`h-3 w-3 ${
                              star <= ratingItem.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {ratingItem.review && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{ratingItem.review}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {ratingItem.createdAt ? formatDate(ratingItem.createdAt) : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No reviews yet</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar - REMOVED NOTIFICATIONS */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-20">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 ml-0 sm:ml-64">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
          </button>

          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {tabs.find(t => t.id === activeTab)?.label || 'Patient Portal'}
          </h2>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Toggle theme"
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="h-5 w-5" />
            </button>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="Settings"
              >
                <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
              </button>

              {showSettings && (
                <div className="absolute right-0 top-12 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
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
      </div>

      {/* Sidebar - Desktop */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-20 hidden sm:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h1 className="text-xl font-bold text-white">MediCare Plus</h1>
            <p className="text-sm text-blue-100">Patient Portal</p>
          </div>

          {/* User Info */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {userDetails?.fullName?.charAt(0) || 'P'}
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-900 dark:text-white">{userDetails?.fullName?.split(' ')[0] || 'Patient'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">ID: {uid?.slice(-8)}</p>
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
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-3 w-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Chat Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chat')}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-md"
            >
              <FontAwesomeIcon icon={faMessage} className="mr-2" />
              <span className="text-sm font-medium">Chat with Doctor</span>
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-40" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600">
                <h1 className="text-xl font-bold text-white">MediCare Plus</h1>
                <p className="text-sm text-blue-100">Patient Portal</p>
              </div>

              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {userDetails?.fullName?.charAt(0) || 'P'}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{userDetails?.fullName?.split(' ')[0] || 'Patient'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {uid?.slice(-8)}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                  {tabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
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

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setActiveTab('chat');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-xl"
                >
                  <FontAwesomeIcon icon={faMessage} className="mr-2" />
                  <span>Chat with Doctor</span>
                </button>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-20 sm:hidden border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around p-2">
          {tabs.slice(0, 4).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 rounded-lg transition ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <FontAwesomeIcon icon={tab.mobileIcon || tab.icon} className="h-5 w-5" />
              <span className="text-xs mt-1">{tab.label === 'Find Doctors' ? 'Doctors' : tab.label === 'Health History' ? 'History' : tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex flex-col items-center p-2 rounded-lg text-gray-600 dark:text-gray-400"
          >
            <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20 sm:pb-0 pt-16 sm:ml-64 p-4 sm:p-6 lg:p-8">
        {loading && (activeTab === 'dashboard' || activeTab === 'history') ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'doctors' && renderDoctors()}
            {activeTab === 'appointments' && renderAppointments()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Payments</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {invoices?.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">
                              #{invoice.id?.slice(-8)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {formatDate(invoice.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(invoice.total || 0)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {invoice.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {invoice.status !== 'paid' && (
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                                >
                                  Pay Now
                                </button>
                              )}
                              {invoice.status === 'paid' && (
                                <button
                                  onClick={() => {
                                    // View invoice details
                                    toast.info('Invoice details coming soon');
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <FontAwesomeIcon icon={faReceipt} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!invoices || invoices.length === 0) && (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                              No invoices found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'chat' && (
              <div className="h-[calc(100vh-8rem)]">
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
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <FontAwesomeIcon icon={faMessage} className="h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select a Doctor to Chat</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Choose a doctor from your confirmed or completed appointments to start chatting.
                    </p>
                    
                    <div className="max-w-md mx-auto">
                      <h4 className="text-left font-medium text-gray-700 dark:text-gray-300 mb-3">Your Doctors</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {(() => {
                          const uniqueDoctors = new Map();
                          appointments
                            .filter(apt => {
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
                          
                          return Array.from(uniqueDoctors.values());
                        })().map(doctor => (
                          <button
                            key={doctor.id}
                            onClick={() => {
                              setChatDoctor({ id: doctor.id, fullName: doctor.name });
                            }}
                            className="w-full flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition text-left"
                          >
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                              <FontAwesomeIcon icon={faUserMd} className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">Dr. {doctor.name}</p>
                              {doctor.specialization && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.specialization}</p>
                              )}
                            </div>
                            <FontAwesomeIcon icon={faComment} className="text-green-600 dark:text-green-400" />
                          </button>
                        ))}
                        
                        {appointments.filter(apt => apt.status === 'approved' || apt.status === 'confirmed' || apt.status === 'checked-in' || apt.status === 'completed').length === 0 && (
                          <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                            No doctors available for chat. Once your appointment is confirmed, you can chat here.
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
      
      {showConsultationNotes && selectedVisitForNotes && (
        <ViewConsultationNotes
          visit={selectedVisitForNotes}
          patientName={userDetails?.fullName}
          doctorName={selectedVisitForNotes.doctorName}
          onClose={() => {
            setShowConsultationNotes(false);
            setSelectedVisitForNotes(null);
          }}
        />
      )}

      {/* Patient History Modal */}
      {showFullHistoryModal && (
        <PatientHistoryModal
          userId={uid}
          userName={userDetails?.fullName}
          userRole="patient"
          onClose={() => setShowFullHistoryModal(false)}
        />
      )}
    </div>
  );
};

export default Patient;