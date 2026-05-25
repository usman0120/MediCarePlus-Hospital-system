import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faUserInjured,
  faGraduationCap,
  faSpinner,
  faCamera,
  faMessage,
  faChartLine,
  faStar,
  faFileMedical,
  faPrescription,
  faUserMd,
  faSignOutAlt,
  faClock,
  faCheckCircle,
  faHourglassHalf,
  faUserCircle,
  faBell,
  faMoon,
  faSun,
  faEye,
  faDownload,
  faPlus,
  faTimes,
  faStethoscope,
  faBan,
  faChevronRight,
  faChevronLeft,
  faHeartbeat,
  faNotesMedical,
  faHistory,
  faPhone,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import { logoutUser } from '../auth';
import {
  getVisitsByDoctor,
  updateVisitEMR,
  dischargePatient,
  addPrescription,
  getPatientsByDoctor,
  getUnreadMessageCount,
  getPatientMedicalHistory,
  getDoctorPerformance,
  getPendingAlerts,
  getUnreadCounts,
  getDoctorRatings,
  sendNotification,
  completeVisit,
  getAppointmentById,
  getAllDoctorAppointments,
  getDoctorAppointmentsByStatus,
  updateDoctorProfile,
  getDoctorProfile,
  createOrGetChat,
  getDoctorRatingsWithPatients
} from '../database';
import { 
  formatDate,
} from '../utils/helpers';
import { 
  validateEMR, 
  validatePrescription,
} from '../utils/validators';
import toast from 'react-hot-toast';
import Chat from '../components/Chat';
import EMRForm from '../components/EMRForm';
import SearchBar from '../components/SearchBar';

// Import appointment components
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentDetails from '../components/appointments/AppointmentDetails';
import ConsultationNotesModal from '../components/ConsultationNotesModal';

const Doctor = () => {
  const { currentUser, userDetails } = useAuth();
  const navigate = useNavigate();
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [, setUnreadCounts] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Data states
  const [appointments, setAppointments] = useState({
    today: [],
    upcoming: [],
    past: [],
    all: []
  });
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [, setRatings] = useState([]);
  
  // Selected items for modals
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  
  // Modal visibility
  const [showEMRForm, setShowEMRForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  
  // Chat state
  const [chatWith, setChatWith] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [showConsultationNotesModal, setShowConsultationNotesModal] = useState(false);
const [selectedAppointmentForConsultation, setSelectedAppointmentForConsultation] = useState(null);
  
  // Ratings state
  const [ratingsData, setRatingsData] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [ratingStats, setRatingStats] = useState({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  
  // Profile settings
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: '',
    qualifications: [],
    experience: '',
    consultationFee: '',
    about: '',
    languages: [],
    education: [],
    awards: [],
    profileImage: null,
    clinicAddress: 'Main Hospital',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });
  
  // Prescription form state
  const [prescription, setPrescription] = useState({
    medicines: [{
      name: '',
      dose: '',
      frequency: '',
      duration: '',
      instructions: ''
    }],
    notes: ''
  });

  // ==================== FETCH FUNCTIONS ====================

  const fetchAllAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getAllDoctorAppointments(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchUpcomingAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const approvedResult = await getDoctorAppointmentsByStatus(currentUser.uid, 'approved');
    const confirmedResult = await getDoctorAppointmentsByStatus(currentUser.uid, 'confirmed');
    const scheduledResult = await getDoctorAppointmentsByStatus(currentUser.uid, 'scheduled');
    
    const all = [
      ...(approvedResult.success ? approvedResult.data : []),
      ...(confirmedResult.success ? confirmedResult.data : []),
      ...(scheduledResult.success ? scheduledResult.data : [])
    ];
    
    const today = new Date().toISOString().split('T')[0];
    return all
      .filter(apt => apt.date >= today && apt.status !== 'completed' && apt.status !== 'cancelled')
      .sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [currentUser?.uid]);

  const fetchTodayAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const today = new Date().toISOString().split('T')[0];
    
    const statuses = ['approved', 'confirmed', 'checked-in', 'in-progress'];
    let allAppointments = [];
    
    for (const status of statuses) {
      const result = await getDoctorAppointmentsByStatus(currentUser.uid, status);
      if (result.success) {
        allAppointments = [...allAppointments, ...result.data];
      }
    }
    
    const unique = allAppointments.filter((apt, index, self) => 
      index === self.findIndex(a => a.id === apt.id) && apt.date === today
    );
    
    return unique;
  }, [currentUser?.uid]);

  const fetchPastAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getAllDoctorAppointments(currentUser.uid);
    if (!result.success) return [];
    
    const today = new Date().toISOString().split('T')[0];
    return result.data
      .filter(apt => 
        (apt.date < today) || 
        ['completed', 'cancelled', 'no-show'].includes(apt.status)
      )
      .sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.time || '').localeCompare(a.time || '');
      });
  }, [currentUser?.uid]);

  const fetchVisits = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getVisitsByDoctor(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchPatients = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getPatientsByDoctor(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchPerformance = useCallback(async () => {
    if (!currentUser?.uid) return null;
    const result = await getDoctorPerformance(currentUser.uid);
    return result.success ? result.data : null;
  }, [currentUser?.uid]);

  const fetchRatings = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getDoctorRatings(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchNotifications = useCallback(async () => {
    const result = await getPendingAlerts();
    if (result.success) {
      setNotifications(result.data);
    }
  }, []);

  const fetchUnreadCounts = useCallback(async () => {
    if (!currentUser?.uid) return;
    const result = await getUnreadCounts(currentUser.uid);
    if (result.success) {
      setUnreadCounts(result.data);
    }
  }, [currentUser?.uid]);

  const fetchAllUnreadCounts = useCallback(async () => {
    if (!currentUser?.uid) return;
    const result = await getUnreadMessageCount(currentUser.uid);
    if (result.success) {
      setUnreadMessages(result.data);
    }
  }, [currentUser?.uid]);

  const fetchDoctorProfile = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const result = await getDoctorProfile(currentUser.uid);
      if (result.success) {
        setProfileForm({
          fullName: result.data.fullName || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          specialization: result.data.specialization || '',
          qualifications: result.data.qualifications || [],
          experience: result.data.experience?.toString() || '',
          consultationFee: result.data.consultationFee?.toString() || '',
          about: result.data.about || '',
          languages: result.data.languages || [],
          education: result.data.education || [],
          awards: result.data.awards || [],
          profileImage: result.data.profileImage || null, 
          clinicAddress: result.data.clinicAddress || 'Main Hospital',
          availableDays: result.data.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        });
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  // ==================== EFFECTS ====================

  // Load notifications and unread counts periodically
  useEffect(() => {
    if (!currentUser?.uid) return;

    fetchNotifications();
    fetchUnreadCounts();
    fetchAllUnreadCounts();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCounts();
      fetchAllUnreadCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser?.uid, fetchNotifications, fetchUnreadCounts, fetchAllUnreadCounts]);

  const loadRatings = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoadingRatings(true);
    try {
      const result = await getDoctorRatingsWithPatients(currentUser.uid);
      if (result.success) {
        setRatingsData(result.data);
        
        const total = result.data.length;
        const sum = result.data.reduce((acc, r) => acc + (r.rating || 0), 0);
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        result.data.forEach(r => {
          if (r.rating >= 1 && r.rating <= 5) distribution[r.rating]++;
        });
        
        setRatingStats({
          average: total > 0 ? sum / total : 0,
          total,
          distribution
        });
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoadingRatings(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (activeTab === 'ratings') {
      loadRatings();
    }
  }, [activeTab, loadRatings]);

  // Load profile when settings modal opens
  useEffect(() => {
    if (showProfileSettings) {
      fetchDoctorProfile();
    }
  }, [showProfileSettings, fetchDoctorProfile]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      const [
        todayApps,
        upcomingApps,
        pastApps,
        visitsData,
        patientsData,
        perfData,
        ratingsData,
        unreadData
      ] = await Promise.allSettled([
        fetchTodayAppointments(),
        fetchUpcomingAppointments(),
        fetchPastAppointments(),
        fetchVisits(),
        fetchPatients(),
        fetchPerformance(),
        fetchRatings(),
        getUnreadMessageCount(currentUser.uid)
      ]);

      setAppointments({
        today: todayApps.status === 'fulfilled' ? todayApps.value : [],
        upcoming: upcomingApps.status === 'fulfilled' ? upcomingApps.value : [],
        past: pastApps.status === 'fulfilled' ? pastApps.value : [],
        all: [
          ...(todayApps.status === 'fulfilled' ? todayApps.value : []),
          ...(upcomingApps.status === 'fulfilled' ? upcomingApps.value : []),
          ...(pastApps.status === 'fulfilled' ? pastApps.value : [])
        ]
      });

      setVisits(visitsData.status === 'fulfilled' ? visitsData.value : []);
      setPatients(patientsData.status === 'fulfilled' ? patientsData.value : []);
      setPerformance(perfData.status === 'fulfilled' ? perfData.value : null);
      setRatings(ratingsData.status === 'fulfilled' ? ratingsData.value : []);
      
      if (unreadData.status === 'fulfilled' && unreadData.value.success) {
        setUnreadMessages(unreadData.value.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, fetchTodayAppointments, fetchUpcomingAppointments, 
      fetchPastAppointments, fetchVisits, fetchPatients, 
      fetchPerformance, fetchRatings]);

  // Load data based on active tab
  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadTabData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'dashboard':
            await loadDashboardData();
            break;
          case 'appointments':
            {
              const [all, today, upcoming, past] = await Promise.allSettled([
                fetchAllAppointments(),
                fetchTodayAppointments(),
                fetchUpcomingAppointments(),
                fetchPastAppointments()
              ]);
              
              setAppointments({
                today: today.status === 'fulfilled' ? today.value : [],
                upcoming: upcoming.status === 'fulfilled' ? upcoming.value : [],
                past: past.status === 'fulfilled' ? past.value : [],
                all: all.status === 'fulfilled' ? all.value : []
              });
              break;
            }
          case 'patients':
            {
              const patientsData = await fetchPatients();
              setPatients(patientsData);
              break;
            }
          case 'visits':
            {
              const visitsData = await fetchVisits();
              setVisits(visitsData);
              break;
            }
          default:
            break;
        }
      } catch (error) {
        console.error('Error loading tab data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadTabData();
  }, [activeTab, currentUser?.uid, loadDashboardData, fetchAllAppointments,
      fetchTodayAppointments, fetchUpcomingAppointments, fetchPastAppointments, 
      fetchPatients, fetchVisits]);

  // ==================== HANDLER FUNCTIONS ====================

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, GIF, WEBP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setProfileForm(prev => ({ ...prev, profileImage: reader.result }));
      toast.success('Profile picture added');
    };
    reader.onerror = (error) => {
      console.error('Error converting image:', error);
      toast.error('Failed to process image');
    };
  };

  const handleRemoveProfileImage = () => {
    setProfileForm(prev => ({ ...prev, profileImage: null }));
    toast.success('Profile picture removed');
  };

  const handleChatWithPatient = useCallback(async (patientId, patientName) => {
    if (!currentUser?.uid || !patientId) {
      toast.error('Cannot start chat: Missing user information');
      return;
    }
    
    setLoading(true);
    try {
      const result = await createOrGetChat(currentUser.uid, patientId);
      
      if (result.success) {
        setChatWith({ id: patientId, fullName: patientName });
        setShowChat(true);
      } else {
        toast.error(result.error || 'Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      if (!profileForm.fullName || !profileForm.email || !profileForm.phone) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const result = await updateDoctorProfile(currentUser.uid, profileForm, currentUser.uid);
      if (result.success) {
        toast.success('Profile updated successfully');
        setShowProfileSettings(false);
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

const handleStartConsultation = async (appointment) => {
  setSelectedAppointmentForConsultation(appointment);
  
  // Get patient details if not already present
  if (appointment.patientId && !appointment.patient) {
    try {
      const { getUserById } = await import('../database');
      const result = await getUserById(appointment.patientId);
      if (result.success) {
        appointment.patient = result.data;
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
    }
  }
  
  setShowConsultationNotesModal(true);
};

// Add handler for consultation success
const handleConsultationSuccess = async () => {
  toast.success('Consultation saved successfully!');
  
  // Refresh visits and appointments
  await Promise.all([
    fetchVisits(),
    fetchTodayAppointments(),
    fetchPatients()
  ]);
  
  // Refresh the appointments in the current tab
  if (activeTab === 'appointments') {
    const [all, today, upcoming, past] = await Promise.allSettled([
      fetchAllAppointments(),
      fetchTodayAppointments(),
      fetchUpcomingAppointments(),
      fetchPastAppointments()
    ]);
    
    setAppointments({
      today: today.status === 'fulfilled' ? today.value : [],
      upcoming: upcoming.status === 'fulfilled' ? upcoming.value : [],
      past: past.status === 'fulfilled' ? past.value : [],
      all: all.status === 'fulfilled' ? all.value : []
    });
  }
  
  if (activeTab === 'dashboard') {
    await loadDashboardData();
  }
};

  const handleSaveEMR = async (emrData) => {
    if (!selectedVisit) return;

    const validation = validateEMR(emrData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    
    try {
      const result = await updateVisitEMR(selectedVisit.id, emrData, currentUser.uid);
      
      if (result.success) {
        toast.success('EMR updated successfully');
        setShowEMRForm(false);
        
        const visitsData = await fetchVisits();
        setVisits(visitsData);
        
        setSelectedVisit(null);
        setSelectedPatient(null);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Save EMR error:', error);
      toast.error('Failed to update EMR');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrescription = async () => {
    if (!selectedVisit) return;

    const validation = validatePrescription(prescription);
    if (!validation.isValid) {
      toast.error('Please fill in all medicine details');
      return;
    }

    setLoading(true);
    
    try {
      const result = await addPrescription(
        selectedVisit.id,
        prescription,
        currentUser.uid
      );
      
      if (result.success) {
        toast.success('Prescription added successfully');
        setShowPrescriptionForm(false);
        setPrescription({
          medicines: [{
            name: '',
            dose: '',
            frequency: '',
            duration: '',
            instructions: ''
          }],
          notes: ''
        });
        
        const visitsData = await fetchVisits();
        setVisits(visitsData);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Add prescription error:', error);
      toast.error('Failed to add prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteVisit = async (visitId) => {
    if (!window.confirm('Complete this visit and generate invoice?')) return;

    setLoading(true);
    
    try {
      const result = await completeVisit(visitId, currentUser.uid);
      
      if (result.success) {
        toast.success('Visit completed successfully. Invoice generated.');
        
        const visitsData = await fetchVisits();
        setVisits(visitsData);
        
        const todayApps = await fetchTodayAppointments();
        setAppointments(prev => ({ ...prev, today: todayApps }));
        
        const visit = visits.find(v => v.id === visitId);
        if (visit) {
          await sendNotification({
            userId: visit.patientId,
            type: 'VISIT_COMPLETED',
            title: 'Visit Completed',
            message: 'Your visit has been completed. Invoice has been generated.',
            visitId,
            read: false
          });
        }
      } else {
        toast.error(result.error || 'Failed to complete visit');
      }
    } catch (error) {
      console.error('Error completing visit:', error);
      toast.error('Failed to complete visit');
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async (visitId) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) {
      return;
    }

    const notes = prompt('Enter discharge notes (optional):');

    setLoading(true);
    
    try {
      const result = await dischargePatient(visitId, notes || '', true, currentUser.uid);
      
      if (result.success) {
        toast.success('Patient discharged successfully');
        
        const visitsData = await fetchVisits();
        setVisits(visitsData);
        
        const todayApps = await fetchTodayAppointments();
        setAppointments(prev => ({ ...prev, today: todayApps }));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Discharge error:', error);
      toast.error('Failed to discharge patient');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAppointmentDetails = async (appointment) => {
    setLoading(true);
    try {
      if (appointment.patient) {
        setSelectedAppointment(appointment);
        setShowAppointmentDetails(true);
      } else {
        const result = await getAppointmentById(appointment.id);
        if (result.success) {
          setSelectedAppointment(result.data);
          setShowAppointmentDetails(true);
        } else {
          toast.error('Failed to load appointment details');
        }
      }
    } catch (error) {
      console.error('Error loading appointment details:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = () => {
    setPrescription(prev => ({
      ...prev,
      medicines: [...prev.medicines, {
        name: '',
        dose: '',
        frequency: '',
        duration: '',
        instructions: ''
      }]
    }));
  };

  const handleRemoveMedicine = (index) => {
    setPrescription(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const handleMedicineChange = (index, field, value) => {
    setPrescription(prev => ({
      ...prev,
      medicines: prev.medicines.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const handleLogout = async () => {
    try {
      await logoutUser(currentUser.uid);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const loadPatientHistory = async (patientId) => {
    setLoading(true);
    const result = await getPatientMedicalHistory(patientId);
    if (result.success) {
      setPatientHistory(result.data);
      setShowPatientHistory(true);
    } else {
      toast.error('Failed to load patient history');
    }
    setLoading(false);
  };

  // ==================== HELPER FUNCTIONS ====================

  const getStatusBadge = (status) => {
    const config = {
      'scheduled': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: faClock, label: 'Scheduled' },
      'confirmed': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: faCheckCircle, label: 'Confirmed' },
      'approved': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: faCheckCircle, label: 'Approved' },
      'checked-in': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: faUserMd, label: 'Checked In' },
      'in-progress': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: faHourglassHalf, label: 'In Progress' },
      'completed': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: faCheckCircle, label: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: faTimes, label: 'Cancelled' },
      'no-show': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: faBan, label: 'No Show' }
    };
    
    const conf = config[status] || config.scheduled;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conf.color}`}>
        <FontAwesomeIcon icon={conf.icon} className="mr-1" />
        {conf.label}
      </span>
    );
  };

  // ==================== TABS ====================
  // REMOVED: lab-requests, operations tabs
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faChartLine },
    { id: 'appointments', label: 'Appointments', icon: faCalendarCheck },
    { id: 'patients', label: 'Patients', icon: faUserInjured },
    { id: 'visits', label: 'Active Visits', icon: faFileMedical },
    { id: 'ratings', label: 'Ratings & Reviews', icon: faStar },
    { id: 'chats', label: 'Chats', icon: faMessage }
  ];

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, Dr. {userDetails?.fullName?.split(' ')[0]}
            </h2>
            <p className="text-teal-100">Here's your practice overview for today.</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Today's Date</p>
            <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
             onClick={() => setActiveTab('appointments')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Patients</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {appointments.today.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FontAwesomeIcon icon={faUserInjured} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-green-600 mr-2">{visits.filter(v => v.status === 'active').length} active</span>
            <span className="text-gray-400">visits</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unread Messages</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {Object.values(unreadMessages).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FontAwesomeIcon icon={faMessage} className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            From {Object.keys(unreadMessages).length} chats
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Visits</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {visits.filter(v => v.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <FontAwesomeIcon icon={faFileMedical} className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            In consultation
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {performance?.averageRating?.toFixed(1) || '0.0'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <FontAwesomeIcon icon={faStar} className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <div className="flex items-center mr-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <FontAwesomeIcon
                  key={star}
                  icon={faStar}
                  className={`h-3 w-3 ${
                    star <= Math.round(performance?.averageRating || 0)
                      ? 'text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-600">({performance?.totalRatings || 0} reviews)</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              if (appointments.today.length > 0) {
                handleStartConsultation(appointments.today[0]);
              } else {
                toast.error('No patients checked in yet');
              }
            }}
            className="p-4 bg-teal-50 dark:bg-teal-900 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800 transition text-center group"
          >
            <FontAwesomeIcon icon={faFileMedical} className="h-6 w-6 text-teal-600 dark:text-teal-400 mb-2 group-hover:scale-110 transition" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">New Consultation</p>
          </button>

          <button
            onClick={() => setShowPrescriptionForm(true)}
            className="p-4 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition text-center group"
          >
            <FontAwesomeIcon icon={faPrescription} className="h-6 w-6 text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Write Prescription</p>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition text-center group"
          >
            <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">View Appointments</p>
          </button>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Schedule</h3>
          <button
            onClick={() => setActiveTab('appointments')}
            className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
          >
            View All <FontAwesomeIcon icon={faChevronRight} className="ml-1 h-3 w-3" />
          </button>
        </div>
        <div className="p-6">
          {appointments.today.length === 0 ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faCalendarCheck} className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.today.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faUserInjured} className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{apt.patient?.fullName || apt.patientName}</p>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faClock} className="mr-1 h-3 w-3" />
                        {apt.time}
                        <span className="mx-2">•</span>
                        {apt.reason?.substring(0, 30)}{apt.reason?.length > 30 ? '...' : ''}
                      </div>
                      <div className="mt-1">
                        {getStatusBadge(apt.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStartConsultation(apt)}
                      className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
                      disabled={apt.status !== 'checked-in' && apt.status !== 'confirmed'}
                    >
                      {apt.status === 'checked-in' || apt.status === 'confirmed' ? 'Start' : 'Waiting'}
                    </button>
                    <button
                      onClick={() => {
                        handleChatWithPatient(apt.patientId, apt.patient?.fullName || apt.patientName);
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      title="Chat with patient"
                      disabled={!apt.patientId}
                    >
                      <FontAwesomeIcon icon={faMessage} className="mr-1" />
                      Chat
                    </button>
                    <button
                      onClick={() => handleViewAppointmentDetails(apt)}
                      className="p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAppointments = () => {
    const allAppointments = [
      ...(appointments.today || []),
      ...(appointments.upcoming || []),
      ...(appointments.past || [])
    ].filter(apt => apt && apt.id);

    const uniqueAppointments = allAppointments.reduce((acc, current) => {
      const exists = acc.find(item => item.id === current.id);
      if (!exists) {
        return [...acc, current];
      }
      return acc;
    }, []);

    const enrichedAppointments = uniqueAppointments.map(apt => ({
      ...apt,
      patientName: apt.patientName || apt.patient?.fullName || 'Unknown',
      doctorName: apt.doctorName || userDetails?.fullName || 'Unknown',
      doctorId: apt.doctorId || currentUser?.uid,
      patientId: apt.patientId,
      status: apt.status || 'pending',
      paymentStatus: apt.paymentStatus || 'pending',
      paymentAmount: apt.paymentAmount || apt.consultationFee || 1000,
      isEmergency: apt.isEmergency || false,
      date: apt.date,
      time: apt.time,
      reason: apt.reason || apt.chiefComplaint || '',
      visitId: apt.visitId
    }));

    return (
      <AppointmentList
        appointments={enrichedAppointments}
        role="doctor"
        title="My Appointments"
        onViewDetails={handleViewAppointmentDetails}
        onStartConsultation={handleStartConsultation}
        onChatWithDoctor={handleChatWithPatient}
        onMarkCompleted={async (appointmentId) => {
          const apt = enrichedAppointments.find(a => a.id === appointmentId);
          
          if (!apt) {
            toast.error('Appointment not found');
            return;
          }

          setLoading(true);
          try {
            const activeVisit = visits.find(v => 
              v.patientId === apt.patientId && v.status === 'active'
            );
            
            if (activeVisit) {
              await completeVisit(activeVisit.id, currentUser.uid);
              toast.success('Visit completed successfully!');
            } else {
              const { updateAppointmentStatus } = await import('../database');
              const result = await updateAppointmentStatus(apt.id, 'completed', currentUser.uid);
              if (result.success) {
                toast.success('Appointment marked as completed');
              } else {
                toast.error(result.error || 'Failed to complete appointment');
              }
            }
            
            await Promise.all([
              fetchTodayAppointments(),
              fetchUpcomingAppointments(),
              fetchVisits(),
              fetchPatients()
            ]);
            
            if (activeTab === 'appointments') {
              const [all, today, upcoming, past] = await Promise.allSettled([
                fetchAllAppointments(),
                fetchTodayAppointments(),
                fetchUpcomingAppointments(),
                fetchPastAppointments()
              ]);
              
              setAppointments({
                today: today.status === 'fulfilled' ? today.value : [],
                upcoming: upcoming.status === 'fulfilled' ? upcoming.value : [],
                past: past.status === 'fulfilled' ? past.value : [],
                all: all.status === 'fulfilled' ? all.value : []
              });
            }
            
          } catch (error) {
            console.error('Error completing appointment:', error);
            toast.error('Failed to complete appointment');
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
        showFilters={true}
      />
    );
  };

  const renderPatients = () => {
    const filteredPatients = searchQuery 
      ? patients.filter(p => 
          p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone?.includes(searchQuery) ||
          p.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : patients;

    if (loading) {
      return <div className="flex justify-center py-12"><FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" /></div>;
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Patients</h2>
          <div className="w-64">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search patients..."
              data={patients}
              searchKeys={['fullName', 'phone', 'cnic', 'email']}
            />
          </div>
        </div>

        {!patients || patients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faUsers} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Patients Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your patients will appear here after they have completed appointments with you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {patient.fullName?.charAt(0) || 'P'}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{patient.fullName || 'Unknown'}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Age: {patient.age || 'N/A'} • {patient.bloodGroup || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FontAwesomeIcon icon={faPhone} className="mr-2 h-3 w-3" />
                      {patient.phone || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FontAwesomeIcon icon={faHistory} className="mr-2 h-3 w-3" />
                      Last Visit: {patient.lastVisit ? formatDate(patient.lastVisit) : 'No visits yet'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FontAwesomeIcon icon={faFileMedical} className="mr-2 h-3 w-3" />
                      Total Visits: {patient.visitCount || 0}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadPatientHistory(patient.id)}
                      className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => handleChatWithPatient(patient.id, patient.fullName)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition relative"
                      title="Chat with patient"
                    >
                      <FontAwesomeIcon icon={faMessage} />
                      {unreadMessages[patient.id] > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {unreadMessages[patient.id]}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderVisits = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Visits</h2>

      {visits.filter(v => v.status === 'active').length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faFileMedical} className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Visits</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start a consultation from the appointments page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visits.filter(v => v.status === 'active').map((visit) => (
            <div key={visit.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {visit.patientName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <FontAwesomeIcon icon={faClock} className="mr-1" />
                    Started: {formatDate(visit.createdAt)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedVisit(visit);
                      setSelectedPatient({ id: visit.patientId, fullName: visit.patientName });
                      setShowEMRForm(true);
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
                  >
                    Update EMR
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVisit(visit);
                      setShowPrescriptionForm(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    Prescribe
                  </button>
                  <button
                    onClick={() => handleCompleteVisit(visit.id)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleDischarge(visit.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                  >
                    Discharge
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <FontAwesomeIcon icon={faNotesMedical} className="mr-1" />
                    Chief Complaint
                  </p>
                  <p className="text-gray-900 dark:text-white">{visit.chiefComplaint}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <FontAwesomeIcon icon={faFileMedical} className="mr-1" />
                    Diagnosis
                  </p>
                  <p className="text-gray-900 dark:text-white">{visit.diagnosis || 'Not yet diagnosed'}</p>
                </div>
              </div>

              {visit.vitals && Object.keys(visit.vitals).length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <FontAwesomeIcon icon={faHeartbeat} className="mr-2 text-red-500" />
                    Latest Vitals
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              {visit.prescriptions && visit.prescriptions.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Recent Prescriptions</p>
                  <div className="space-y-2">
                    {visit.prescriptions.slice(-2).map((pres, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{pres.medicineName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {pres.dose} - {pres.frequency} for {pres.duration}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `data:application/pdf;base64,${pres.pdfBase64}`;
                            link.download = `prescription-${visit.id}.pdf`;
                            link.click();
                          }}
                          className="text-teal-600 hover:text-teal-700"
                          title="Download Prescription"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRatings = () => {
    if (loadingRatings) {
      return (
        <div className="flex justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Reviews & Ratings</h2>

        {/* Rating Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Overall Rating</p>
            <div className="flex items-center justify-center mt-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {ratingStats.average.toFixed(1)}
              </span>
              <span className="text-xl text-gray-500 ml-1">/5</span>
            </div>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <FontAwesomeIcon
                  key={star}
                  icon={faStar}
                  className={`h-5 w-5 ${star <= Math.round(ratingStats.average) ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">{ratingStats.total} reviews</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 col-span-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rating Distribution</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingStats.distribution[star] || 0;
                const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-400">{star} star</div>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-400">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Patient Reviews</h3>
          </div>
          <div className="p-6 space-y-6">
            {ratingsData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No ratings yet</div>
            ) : (
              ratingsData.map(rating => (
                <div key={rating.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                        <FontAwesomeIcon icon={faUserInjured} className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {rating.patientName || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(rating.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <FontAwesomeIcon
                          key={star}
                          icon={faStar}
                          className={`h-4 w-4 ${star <= rating.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {rating.review && (
                    <p className="text-gray-700 dark:text-gray-300 ml-13 pl-13">{rating.review}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderChats = () => {
    const chatEligibleStatuses = ['confirmed', 'checked-in', 'in-progress', 'completed'];
    
    const patientsFromAppointments = appointments.all
      .filter(apt => apt && apt.patientId && chatEligibleStatuses.includes(apt.status))
      .map(apt => ({
        id: apt.patientId,
        fullName: apt.patientName || apt.patient?.fullName || 'Unknown Patient',
        lastAppointment: apt.date,
        status: apt.status
      }));
    
    const patientsFromVisits = visits
      .filter(v => v && v.patientId && (v.status === 'active' || v.status === 'completed'))
      .map(v => ({
        id: v.patientId,
        fullName: v.patientName || 'Unknown Patient',
        lastVisit: v.createdAt
      }));
    
    const chatPatientsMap = new Map();
    
    patientsFromAppointments.forEach(p => {
      if (!chatPatientsMap.has(p.id)) {
        chatPatientsMap.set(p.id, p);
      }
    });
    
    patientsFromVisits.forEach(p => {
      if (!chatPatientsMap.has(p.id)) {
        chatPatientsMap.set(p.id, p);
      }
    });
    
    const allChatPatients = Array.from(chatPatientsMap.values());
    
    if (allChatPatients.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faMessage} className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Chats</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your chats with patients will appear here once appointments are confirmed.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Chats</h2>
          <span className="text-sm text-gray-500">{allChatPatients.length} active conversation{allChatPatients.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allChatPatients.map((patient) => (
            <div key={patient.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl relative">
                    {patient.fullName?.charAt(0) || 'P'}
                    {unreadMessages && unreadMessages[patient.id] > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                        {unreadMessages[patient.id]}
                      </span>
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{patient.fullName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {patient.lastAppointment ? `Last appointment: ${patient.lastAppointment}` : 'Active patient'}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleChatWithPatient(patient.id, patient.fullName)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faMessage} className="mr-2" />
                    Open Chat
                    {unreadMessages && unreadMessages[patient.id] > 0 && (
                      <span className="ml-2 bg-white text-green-600 px-2 py-0.5 rounded-full text-xs">
                        {unreadMessages[patient.id]} new
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const patientAppointment = appointments.all?.find(apt => apt.patientId === patient.id);
                      if (patientAppointment) {
                        handleViewAppointmentDetails(patientAppointment);
                      } else {
                        toast.info('No recent appointment found');
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    title="View Appointment"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Profile Settings Modal
  const renderProfileSettingsModal = () => {
    if (!showProfileSettings) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h3>
            <button
              onClick={() => setShowProfileSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-6">
            {/* Profile Image Section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faUserCircle} className="mr-2 text-teal-500" />
                Profile Picture
              </h4>
              
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-600 border-4 border-teal-500">
                    {profileForm.profileImage ? (
                      <img 
                        src={profileForm.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUserMd} className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <label 
                    htmlFor="doctor-profile-image-input"
                    className="absolute bottom-0 right-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-700 transition shadow-lg"
                  >
                    <FontAwesomeIcon icon={faCamera} className="h-5 w-5" />
                    <input
                      id="doctor-profile-image-input"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </label>

                  {profileForm.profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveProfileImage}
                      className="absolute top-0 right-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition shadow-lg"
                    >
                      <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Upload profile picture (Optional)
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Max size: 2MB. Allowed: JPG, PNG, GIF, WEBP
                </p>
              </div>
            </div>
            
            {/* Personal Information */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faUserMd} className="mr-2 text-teal-500" />
                Personal Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Clinic Address
                  </label>
                  <input
                    type="text"
                    value={profileForm.clinicAddress}
                    onChange={(e) => setProfileForm({ ...profileForm, clinicAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-teal-500" />
                Professional Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    value={profileForm.specialization}
                    onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Experience (years) *
                  </label>
                  <input
                    type="number"
                    value={profileForm.experience}
                    onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consultation Fee (PKR) *
                  </label>
                  <input
                    type="number"
                    value={profileForm.consultationFee}
                    onChange={(e) => setProfileForm({ ...profileForm, consultationFee: e.target.value })}
                    min="0"
                    step="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Languages (comma separated)
                  </label>
                  <input
                    type="text"
                    value={profileForm.languages.join(', ')}
                    onChange={(e) => setProfileForm({ 
                      ...profileForm, 
                      languages: e.target.value.split(',').map(l => l.trim()).filter(l => l)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    placeholder="English, Urdu, Punjabi"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Qualifications (one per line)
                </label>
                <textarea
                  value={profileForm.qualifications.join('\n')}
                  onChange={(e) => setProfileForm({ 
                    ...profileForm, 
                    qualifications: e.target.value.split('\n').filter(q => q.trim())
                  })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  placeholder="MBBS, FCPS, MCPS (one per line)"
                />
              </div>
            </div>

            {/* About & Education */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faGraduationCap} className="mr-2 text-teal-500" />
                About & Education
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    About Me
                  </label>
                  <textarea
                    value={profileForm.about}
                    onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Write a brief introduction about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Education (one per line)
                  </label>
                  <textarea
                    value={profileForm.education.join('\n')}
                    onChange={(e) => setProfileForm({ 
                      ...profileForm, 
                      education: e.target.value.split('\n').filter(e => e.trim())
                    })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    placeholder="MBBS - King Edward Medical University (2010)&#10;FCPS - College of Physicians and Surgeons (2015)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Awards & Recognition (one per line)
                  </label>
                  <textarea
                    value={profileForm.awards.join('\n')}
                    onChange={(e) => setProfileForm({ 
                      ...profileForm, 
                      awards: e.target.value.split('\n').filter(a => a.trim())
                    })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Best Young Surgeon Award 2020&#10;Research Excellence Award 2018"
                  />
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-teal-500" />
                Availability
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={profileForm.availableDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProfileForm({
                            ...profileForm,
                            availableDays: [...profileForm.availableDays, day]
                          });
                        } else {
                          setProfileForm({
                            ...profileForm,
                            availableDays: profileForm.availableDays.filter(d => d !== day)
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowProfileSettings(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render Prescription Form Modal
  const renderPrescriptionForm = () => {
    if (!showPrescriptionForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedVisit ? `Prescription for ${selectedVisit.patientName}` : 'New Prescription'}
            </h3>
            <button
              onClick={() => {
                setShowPrescriptionForm(false);
                setPrescription({
                  medicines: [{
                    name: '',
                    dose: '',
                    frequency: '',
                    duration: '',
                    instructions: ''
                  }],
                  notes: ''
                });
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
          
          {!selectedVisit && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Patient
              </label>
              <select
                onChange={(e) => {
                  const patient = patients.find(p => p.id === e.target.value);
                  if (patient) {
                    setSelectedVisit({ patientId: patient.id, patientName: patient.fullName });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-4">
            {prescription.medicines.map((medicine, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Medicine #{index + 1}</h4>
                  {prescription.medicines.length > 1 && (
                    <button
                      onClick={() => handleRemoveMedicine(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Medicine Name *
                    </label>
                    <input
                      type="text"
                      value={medicine.name}
                      onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Paracetamol"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dose *
                    </label>
                    <input
                      type="text"
                      value={medicine.dose}
                      onChange={(e) => handleMedicineChange(index, 'dose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency *
                    </label>
                    <input
                      type="text"
                      value={medicine.frequency}
                      onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Twice daily"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration *
                    </label>
                    <input
                      type="text"
                      value={medicine.duration}
                      onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 5 days"
                      required
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instructions
                    </label>
                    <input
                      type="text"
                      value={medicine.instructions}
                      onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Take after meals"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddMedicine}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Another Medicine
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={prescription.notes}
                onChange={(e) => setPrescription(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Any additional instructions..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowPrescriptionForm(false);
                setPrescription({
                  medicines: [{
                    name: '',
                    dose: '',
                    frequency: '',
                    duration: '',
                    instructions: ''
                  }],
                  notes: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPrescription}
              disabled={loading || !selectedVisit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Prescription'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Patient History Modal
  const renderPatientHistoryModal = () => {
    if (!showPatientHistory || !patientHistory) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Patient Medical History
            </h3>
            <button
              onClick={() => {
                setShowPatientHistory(false);
                setPatientHistory(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{patientHistory.totalVisits}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Visits</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{patientHistory.uniqueConditions?.length || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Conditions</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{patientHistory.uniqueMedications?.length || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medications</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{patientHistory.allergies?.length || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Allergies</p>
              </div>
            </div>

            {/* Conditions */}
            {patientHistory.uniqueConditions?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Medical Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  {patientHistory.uniqueConditions.map((condition, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {patientHistory.uniqueMedications?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Medication History</h4>
                <div className="flex flex-wrap gap-2">
                  {patientHistory.uniqueMedications.map((med, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">
                      {med}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {patientHistory.allergies?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Allergies</h4>
                <div className="flex flex-wrap gap-2">
                  {patientHistory.allergies.map((allergy, index) => (
                    <span key={index} className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Common Diagnoses */}
            {patientHistory.commonDiagnosis?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Common Diagnoses</h4>
                <div className="space-y-2">
                  {patientHistory.commonDiagnosis.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-gray-700 dark:text-gray-300">{item.diagnosis}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.count} time{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visits by Year */}
            {patientHistory.visitsByYear && Object.keys(patientHistory.visitsByYear).length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Visit Frequency by Year</h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {Object.entries(patientHistory.visitsByYear).map(([year, count]) => (
                    <div key={year} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{year}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Don't render if no user
  if (!currentUser?.uid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className={`fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FontAwesomeIcon icon={sidebarCollapsed ? faChevronRight : faChevronLeft} />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {tabs.find(t => t.id === activeTab)?.label || 'Doctor Portal'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-3 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                <FontAwesomeIcon icon={faUserInjured} className="mr-1" />
                {appointments.today.length} today
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                <FontAwesomeIcon icon={faClock} className="mr-1" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Search */}
            <div className="w-64 hidden lg:block">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search patients..."
                data={patients}
                searchKeys={['fullName', 'phone', 'cnic']}
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
              >
                <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Notifications</h4>
                    <button className="text-xs text-teal-600 hover:text-teal-700">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-gray-500">No notifications</p>
                    ) : (
                      notifications.map((notif, index) => (
                        <div key={index} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(notif.createdAt)}</p>
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
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="h-5 w-5" />
            </button>

            {/* Profile */}
            <div className="relative group">
              <button className="flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userDetails?.fullName?.charAt(0)}
                </div>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-gray-900 dark:text-white">Dr. {userDetails?.fullName}</p>
                  <p className="text-xs text-gray-500">{userDetails?.specialization}</p>
                </div>
                <button 
                  onClick={() => setShowProfileSettings(true)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'text-center' : ''}`}>
            {sidebarCollapsed ? (
              <h1 className="text-xl font-bold text-teal-600 dark:text-teal-400">MP</h1>
            ) : (
              <>
                <h1 className="text-xl font-bold text-teal-600 dark:text-teal-400">MediCare Plus</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Doctor Portal</p>
              </>
            )}
          </div>

          {/* Doctor Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userDetails?.fullName?.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Dr. {userDetails?.fullName?.split(' ')[0]}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{userDetails?.specialization}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                      sidebarCollapsed ? 'justify-center' : ''
                    } ${
                      activeTab === tab.id
                        ? 'bg-teal-50 text-teal-600 dark:bg-teal-900 dark:text-teal-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={sidebarCollapsed ? tab.label : ''}
                  >
                    <FontAwesomeIcon icon={tab.icon} className={sidebarCollapsed ? '' : 'mr-3'} />
                    {!sidebarCollapsed && <span className="text-sm">{tab.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Actions - Collapsed View */}
          {sidebarCollapsed && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <button
                onClick={() => setShowPrescriptionForm(true)}
                className="w-full flex justify-center p-3 text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Write Prescription"
              >
                <FontAwesomeIcon icon={faPrescription} />
              </button>
            </div>
          )}

          {/* Logout */}
          <div className={`p-4 border-t border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'text-center' : ''}`}>
            <button
              onClick={handleLogout}
              className={`flex items-center text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900 rounded-lg transition ${
                sidebarCollapsed ? 'justify-center p-3' : 'w-full px-4 py-3'
              }`}
              title={sidebarCollapsed ? 'Logout' : ''}
            >
              <FontAwesomeIcon icon={faSignOutAlt} className={sidebarCollapsed ? '' : 'mr-3'} />
              {!sidebarCollapsed && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 p-8`}>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'appointments' && renderAppointments()}
            {activeTab === 'patients' && renderPatients()}
            {activeTab === 'visits' && renderVisits()}
            {activeTab === 'ratings' && renderRatings()}
            {activeTab === 'chats' && renderChats()}
          </>
        )}
      </div>

      {/* Modals */}
      {showEMRForm && selectedVisit && (
        <EMRForm
          visit={selectedVisit}
          patient={selectedPatient}
          onSave={handleSaveEMR}
          onClose={() => {
            setShowEMRForm(false);
            setSelectedVisit(null);
            setSelectedPatient(null);
          }}
        />
      )}

      {showAppointmentDetails && selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          role="doctor"
          onClose={() => {
            setShowAppointmentDetails(false);
            setSelectedAppointment(null);
          }}
        />
      )}

      {renderPrescriptionForm()}
      {renderPatientHistoryModal()}
      {renderProfileSettingsModal()}  

      {showChat && chatWith && (
        <Chat
          userId={currentUser.uid}
          userRole="doctor"
          otherUserId={chatWith.id}
          otherUserName={chatWith.fullName}
          otherUserProfileImage={chatWith.profileImage}
          onClose={() => {
            setShowChat(false);
            setChatWith(null);
          }}
        />
      )}
      {showConsultationNotesModal && selectedAppointmentForConsultation && (
  <ConsultationNotesModal
    appointment={selectedAppointmentForConsultation}
    patient={selectedAppointmentForConsultation.patient || { 
      id: selectedAppointmentForConsultation.patientId,
      fullName: selectedAppointmentForConsultation.patientName 
    }}
    doctorId={currentUser.uid}
    onClose={() => {
      setShowConsultationNotesModal(false);
      setSelectedAppointmentForConsultation(null);
    }}
    onSuccess={handleConsultationSuccess}
  />
)}
    </div>
  );
};

export default Doctor;