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
  faFlask,
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
  createVisit,
  getVisitsByDoctor,
  updateVisitEMR,
  dischargePatient,
  addPrescription,
  createLabRequest,
  getLabRequestsByDoctor,
  getPatientsByDoctor,
  getUnreadMessageCount,
  getPatientMedicalHistory,
  scheduleOperation,
  getOperations,
  confirmOperationChecklist,
  startOperation,
  getDoctorPerformance,
  getPendingAlerts,
  getUnreadCounts,
  getDoctorRatings,
  sendNotification,
  completeVisit,
  getTodayDoctorAppointments,
  getAppointmentById,
  getAllDoctorAppointments,
  getDoctorAppointmentsByStatus,
  updateDoctorProfile,
  getDoctorProfile
} from '../database';
import { 
  formatDate,
} from '../utils/helpers';
import { 
  validateEMR, 
  validatePrescription,
  validateOperation 
} from '../utils/validators';
import toast from 'react-hot-toast';
import Chat from '../components/Chat';
import EMRForm from '../components/EMRForm';
import SearchBar from '../components/SearchBar';

// Import appointment components
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentDetails from '../components/appointments/AppointmentDetails';

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
  const [labRequests, setLabRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [operations, setOperations] = useState([]);
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
  const [showLabRequestForm, setShowLabRequestForm] = useState(false);
  const [showOperationForm, setShowOperationForm] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLabResults, setShowLabResults] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedLabResult, setSelectedLabResult] = useState(null);
  
  // Chat state
  const [chatWith, setChatWith] = useState(null);
  const [chatMessages] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  
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

  // Lab request form state
  const [labRequest, setLabRequest] = useState({
    patientId: '',
    patientName: '',
    tests: [{
      name: '',
      instructions: ''
    }],
    priority: 'normal',
    notes: ''
  });

  // Operation form state
  const [operation, setOperation] = useState({
    patientId: '',
    patientName: '',
    operationType: '',
    requiredEquipment: [],
    requiredStaff: [],
    scheduledDate: '',
    estimatedDuration: '',
    notes: '',
    checklist: {
      consentConfirmed: false,
      equipmentConfirmed: false,
      staffConfirmed: false,
      riskAcknowledged: false
    }
  });

  // ==================== FETCH FUNCTIONS ====================

  const fetchAllAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getAllDoctorAppointments(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchTodayAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getTodayDoctorAppointments(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchUpcomingAppointments = useCallback(async () => {
    if (!currentUser?.uid) return [];
    // Get all approved/scheduled appointments
    const result = await getDoctorAppointmentsByStatus(currentUser.uid, 'approved');
    const scheduledResult = await getDoctorAppointmentsByStatus(currentUser.uid, 'scheduled');
    
    const all = [
      ...(result.success ? result.data : []),
      ...(scheduledResult.success ? scheduledResult.data : [])
    ];
    
    // Filter out past appointments and sort by date
    const today = new Date().toISOString().split('T')[0];
    return all
      .filter(apt => apt.date >= today && apt.status !== 'completed')
      .sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });
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

  const fetchLabRequests = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getLabRequestsByDoctor(currentUser.uid);
    return result.success ? result.data : [];
  }, [currentUser?.uid]);

  const fetchOperations = useCallback(async () => {
    if (!currentUser?.uid) return [];
    const result = await getOperations({ doctorId: currentUser.uid });
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

    // Initial fetch
    fetchNotifications();
    fetchUnreadCounts();
    fetchAllUnreadCounts();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCounts();
      fetchAllUnreadCounts();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [currentUser?.uid, fetchNotifications, fetchUnreadCounts, fetchAllUnreadCounts]);

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
        labData,
        opsData,
        perfData,
        ratingsData,
        unreadData
      ] = await Promise.allSettled([
        fetchTodayAppointments(),
        fetchUpcomingAppointments(),
        fetchPastAppointments(),
        fetchVisits(),
        fetchPatients(),
        fetchLabRequests(),
        fetchOperations(),
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
      
      console.log('Appointments loaded:', {
        today: todayApps.status === 'fulfilled' ? todayApps.value.length : 0,
        upcoming: upcomingApps.status === 'fulfilled' ? upcomingApps.value.length : 0,
        past: pastApps.status === 'fulfilled' ? pastApps.value.length : 0
      });

      setVisits(visitsData.status === 'fulfilled' ? visitsData.value : []);
      setPatients(patientsData.status === 'fulfilled' ? patientsData.value : []);
      setLabRequests(labData.status === 'fulfilled' ? labData.value : []);
      setOperations(opsData.status === 'fulfilled' ? opsData.value : []);
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
      fetchPastAppointments, fetchVisits, fetchPatients, fetchLabRequests, 
      fetchOperations, fetchPerformance, fetchRatings]);

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
              
              console.log('Appointments loaded for tab:', {
                all: all.status === 'fulfilled' ? all.value.length : 0,
                today: today.status === 'fulfilled' ? today.value.length : 0,
                upcoming: upcoming.status === 'fulfilled' ? upcoming.value.length : 0,
                past: past.status === 'fulfilled' ? past.value.length : 0
              });
              
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
          case 'lab-requests':
            {
              const labData = await fetchLabRequests();
              setLabRequests(labData);
              break;
            }
          case 'operations':
            {
              const opsData = await fetchOperations();
              setOperations(opsData);
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
      fetchPatients, fetchVisits, fetchLabRequests, fetchOperations]);

  // ==================== HANDLER FUNCTIONS ====================

  const handleChatWithPatient = (patientId, patientName) => {
    setChatWith({ id: patientId, fullName: patientName });
    setShowChat(true);
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      // Validate required fields
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
    setLoading(true);
    
    try {
      // Check if there's already an active visit
      const activeVisit = visits.find(v => 
        v.patientId === appointment.patientId && v.status === 'active'
      );
      
      if (activeVisit) {
        setSelectedVisit(activeVisit);
        setSelectedPatient({ 
          id: appointment.patientId, 
          fullName: appointment.patientName || appointment.patient?.fullName
        });
        setShowEMRForm(true);
        toast.success('Continuing existing consultation');
        setLoading(false);
        return;
      }

      const visitData = {
        patientId: appointment.patientId,
        doctorId: currentUser.uid,
        appointmentId: appointment.id,
        department: appointment.department,
        status: 'active',
        vitals: {},
        chiefComplaint: appointment.reason || '',
        symptoms: '',
        diagnosis: '',
        notes: [],
        icdCodes: [],
        createdAt: new Date()
      };

      const result = await createVisit(visitData);
      
      if (result.success) {
        setSelectedVisit(result.data);
        setSelectedPatient({ 
          id: appointment.patientId, 
          fullName: appointment.patientName || appointment.patient?.fullName
        });
        setShowEMRForm(true);
        toast.success('Consultation started');
        
        // Update appointments list
        const updatedToday = appointments.today.map(apt => 
          apt.id === appointment.id 
            ? { ...apt, status: 'in-progress' } 
            : apt
        );
        setAppointments(prev => ({ ...prev, today: updatedToday }));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Start consultation error:', error);
      toast.error('Failed to start consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultationFromCard = async (appointment) => {
    if (appointment.status !== 'checked-in') {
      toast.error('Patient must be checked in first');
      return;
    }
    await handleStartConsultation(appointment);
  };

  // Handle saving EMR
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
        
        // Refresh visits
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

  // Handle adding prescription
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
        
        // Refresh visits to show new prescription
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

  // Handle creating lab request
  const handleCreateLabRequest = async () => {
    if (!labRequest.patientId || labRequest.tests.length === 0) {
      toast.error('Please select patient and add at least one test');
      return;
    }

    // Filter out empty test names
    const validTests = labRequest.tests.filter(test => test.name.trim() !== '');
    if (validTests.length === 0) {
      toast.error('Please add at least one valid test');
      return;
    }

    setLoading(true);
    
    try {
      const result = await createLabRequest({
        ...labRequest,
        tests: validTests,
        doctorId: currentUser.uid,
        doctorName: userDetails?.fullName,
        status: 'pending',
        requestedAt: new Date()
      });
      
      if (result.success) {
        toast.success('Lab request created successfully');
        setShowLabRequestForm(false);
        setLabRequest({
          patientId: '',
          patientName: '',
          tests: [{ name: '', instructions: '' }],
          priority: 'normal',
          notes: ''
        });
        
        // Refresh lab requests
        const labData = await fetchLabRequests();
        setLabRequests(labData);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Create lab request error:', error);
      toast.error('Failed to create lab request');
    } finally {
      setLoading(false);
    }
  };

  // Handle scheduling operation
  const handleScheduleOperation = async () => {
    const validation = validateOperation(operation);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    
    try {
      const result = await scheduleOperation(operation, currentUser.uid);
      
      if (result.success) {
        toast.success('Operation scheduled successfully');
        setShowOperationForm(false);
        setOperation({
          patientId: '',
          patientName: '',
          operationType: '',
          requiredEquipment: [],
          requiredStaff: [],
          scheduledDate: '',
          estimatedDuration: '',
          notes: '',
          checklist: {
            consentConfirmed: false,
            equipmentConfirmed: false,
            staffConfirmed: false,
            riskAcknowledged: false
          }
        });
        
        // Refresh operations
        const opsData = await fetchOperations();
        setOperations(opsData);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Schedule operation error:', error);
      toast.error('Failed to schedule operation');
    } finally {
      setLoading(false);
    }
  };

  // Handle confirming operation checklist
  const handleConfirmChecklist = async (operationId, item) => {
    setLoading(true);
    
    try {
      const result = await confirmOperationChecklist(operationId, item, currentUser.uid);
      
      if (result.success) {
        toast.success(`${item} confirmed`);
        
        // Refresh operations
        const opsData = await fetchOperations();
        setOperations(opsData);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Confirm checklist error:', error);
      toast.error('Failed to confirm checklist item');
    } finally {
      setLoading(false);
    }
  };

  // Handle starting operation
  const handleStartOperation = async (operationId) => {
    if (!window.confirm('Are you sure you want to start this operation?')) return;

    setLoading(true);
    
    try {
      const result = await startOperation(operationId, currentUser.uid);
      
      if (result.success) {
        toast.success('Operation started');
        
        // Refresh operations
        const opsData = await fetchOperations();
        setOperations(opsData);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Start operation error:', error);
      toast.error('Failed to start operation');
    } finally {
      setLoading(false);
    }
  };

  // Handle completing visit
  const handleCompleteVisit = async (visitId) => {
    if (!window.confirm('Complete this visit and generate invoice?')) return;

    setLoading(true);
    
    try {
      const result = await completeVisit(visitId, currentUser.uid);
      
      if (result.success) {
        toast.success('Visit completed successfully. Invoice generated.');
        
        // Refresh visits
        const visitsData = await fetchVisits();
        setVisits(visitsData);
        
        // Refresh appointments
        const todayApps = await fetchTodayAppointments();
        setAppointments(prev => ({ ...prev, today: todayApps }));
        
        // Notify patient
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

  // Handle discharging patient
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
        
        // Refresh visits
        const visitsData = await fetchVisits();
        setVisits(visitsData);
        
        // Refresh appointments
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

  // Handle viewing lab results
  const handleViewLabResults = async (labRequestId) => {
    setLoading(true);
    
    try {
      // Get the lab request details
      const labRequest = labRequests.find(lr => lr.id === labRequestId);
      if (labRequest?.results) {
        setSelectedLabResult(labRequest);
        setShowLabResults(true);
      }
    } catch (error) {
      console.error('View lab results error:', error);
      toast.error('Failed to load lab results');
    } finally {
      setLoading(false);
    }
  };

  // Handle downloading lab report
  const handleDownloadLabReport = (fileData, fileName) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${fileData}`;
    link.download = fileName;
    link.click();
    toast.success('Download started');
  };

  // Handle viewing appointment details
  const handleViewAppointmentDetails = async (appointment) => {
    setLoading(true);
    try {
      // If we have the full appointment object with patient details, use it
      if (appointment.patient) {
        setSelectedAppointment(appointment);
        setShowAppointmentDetails(true);
      } else {
        // Otherwise fetch the full details
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

  // Handle prescription medicine management
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

  // Handle lab test management
  const handleAddTest = () => {
    setLabRequest(prev => ({
      ...prev,
      tests: [...prev.tests, { name: '', instructions: '' }]
    }));
  };

  const handleRemoveTest = (index) => {
    setLabRequest(prev => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index)
    }));
  };

  const handleTestChange = (index, field, value) => {
    setLabRequest(prev => ({
      ...prev,
      tests: prev.tests.map((test, i) => 
        i === index ? { ...test, [field]: value } : test
      )
    }));
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser(currentUser.uid);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Load patient history
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

  // Get status badge
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

  // Get lab status badge
  const getLabStatusBadge = (status) => {
    const config = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: faClock },
      'in-progress': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: faHourglassHalf },
      'completed': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: faCheckCircle }
    };
    
    const conf = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conf.color}`}>
        <FontAwesomeIcon icon={conf.icon} className="mr-1" />
        {status}
      </span>
    );
  };

  // ==================== TABS ====================

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faChartLine },
    { id: 'appointments', label: 'Appointments', icon: faCalendarCheck },
    { id: 'patients', label: 'Patients', icon: faUserInjured },
    { id: 'visits', label: 'Active Visits', icon: faFileMedical },
    { id: 'lab-requests', label: 'Lab Requests', icon: faFlask },
    { id: 'operations', label: 'Operations', icon: faStethoscope },
    { id: 'chats', label: 'Chats', icon: faMessage }
  ];

  // ==================== RENDER FUNCTIONS ====================

  // Render Dashboard
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
             onClick={() => setActiveTab('lab-requests')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Lab Results</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {labRequests.filter(l => l.status === 'pending').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <FontAwesomeIcon icon={faFlask} className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-yellow-600 mr-2">{labRequests.filter(l => l.status === 'in-progress').length} in progress</span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            onClick={() => setShowLabRequestForm(true)}
            className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-800 transition text-center group"
          >
            <FontAwesomeIcon icon={faFlask} className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mb-2 group-hover:scale-110 transition" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Request Lab Test</p>
          </button>

          <button
            onClick={() => setShowOperationForm(true)}
            className="p-4 bg-red-50 dark:bg-red-900 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition text-center group"
          >
            <FontAwesomeIcon icon={faStethoscope} className="h-6 w-6 text-red-600 dark:text-red-400 mb-2 group-hover:scale-110 transition" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Schedule Operation</p>
          </button>
        </div>
      </div>

      {/* Today's Schedule and Recent Lab Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        disabled={apt.status !== 'checked-in'}
                      >
                        {apt.status === 'checked-in' ? 'Start' : 'Waiting'}
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

        {/* Recent Lab Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Lab Results</h3>
            <button
              onClick={() => setActiveTab('lab-requests')}
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
            >
              View All <FontAwesomeIcon icon={faChevronRight} className="ml-1 h-3 w-3" />
            </button>
          </div>
          <div className="p-6">
            {labRequests.filter(l => l.status === 'completed').length === 0 ? (
              <div className="text-center py-8">
                <FontAwesomeIcon icon={faFlask} className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No recent lab results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {labRequests.filter(l => l.status === 'completed').slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{req.patientName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {req.tests?.map(t => t.name).join(', ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Completed: {formatDate(req.completedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewLabResults(req.id)}
                      className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Operations */}
      {operations.filter(o => o.status === 'scheduled').length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Operations</h3>
            <button
              onClick={() => setActiveTab('operations')}
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
            >
              View All <FontAwesomeIcon icon={faChevronRight} className="ml-1 h-3 w-3" />
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {operations.filter(o => o.status === 'scheduled').slice(0, 3).map((op) => (
                <div key={op.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{op.patientName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {op.operationType} • {formatDate(op.scheduledDate)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Appointments using AppointmentList component
  const renderAppointments = () => {
    // Combine all appointments and ensure they're properly formatted
    const allAppointments = [
      ...(appointments.today || []),
      ...(appointments.upcoming || []),
      ...(appointments.past || [])
    ].filter(apt => apt && apt.id); // Remove any undefined/null appointments

    // Remove duplicates by ID
    const uniqueAppointments = allAppointments.reduce((acc, current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

    console.log('Rendering appointments:', uniqueAppointments.length);

    return (
      <AppointmentList
        appointments={uniqueAppointments}
        role="doctor"
        title="All Appointments"
        onViewDetails={handleViewAppointmentDetails}
        onStartConsultation={handleStartConsultationFromCard}
        onChatWithDoctor={handleChatWithPatient}
        loading={loading}
        showFilters={true}
      />
    );
  };

  // Render Patients
  const renderPatients = () => (
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

      {patients.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faUsers} className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Patients Yet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your patients will appear here after consultations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients
            .filter(patient => 
              !searchQuery || 
              patient.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              patient.phone?.includes(searchQuery) ||
              patient.cnic?.includes(searchQuery)
            )
            .map((patient) => (
              <div key={patient.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {patient.fullName?.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{patient.fullName}</h3>
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

  // Render Visits
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
                    onClick={() => {
                      setSelectedVisit(visit);
                      setLabRequest(prev => ({ 
                        ...prev, 
                        patientId: visit.patientId, 
                        patientName: visit.patientName 
                      }));
                      setShowLabRequestForm(true);
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
                  >
                    Lab
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

  // Render Lab Requests
  const renderLabRequests = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Requests</h2>
        <button
          onClick={() => setShowLabRequestForm(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          New Request
        </button>
      </div>

      {labRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faFlask} className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Lab Requests</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create a lab request to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {labRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {req.patientName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {req.tests?.map(t => t.name).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(req.requestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getLabStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        req.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        req.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {req.status === 'completed' && req.results && (
                        <button
                          onClick={() => handleViewLabResults(req.id)}
                          className="text-teal-600 hover:text-teal-700 mr-3"
                        >
                          View Results
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Render Operations
  const renderOperations = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Operations</h2>
        <button
          onClick={() => setShowOperationForm(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Schedule Operation
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faStethoscope} className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Operations</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Schedule an operation to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {operations.map((op) => (
            <div key={op.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {op.operationType}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Patient: {op.patientName} • Scheduled: {formatDate(op.scheduledDate)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  op.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  op.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  op.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {op.status}
                </span>
              </div>

              {/* Checklist for scheduled operations */}
              {op.status === 'scheduled' && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Pre-Operation Checklist</p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(op.checklist || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        {value ? (
                          <span className="text-green-600">
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConfirmChecklist(op.id, key)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {Object.values(op.checklist || {}).every(v => v) && op.status === 'scheduled' && (
                    <button
                      onClick={() => handleStartOperation(op.id)}
                      className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Start Operation
                    </button>
                  )}
                </div>
              )}

              {/* Required equipment */}
              {op.requiredEquipment && op.requiredEquipment.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Required Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {op.requiredEquipment.map((eq, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {eq.name} ({eq.quantity})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required staff */}
              {op.requiredStaff && op.requiredStaff.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Required Staff</p>
                  <div className="flex flex-wrap gap-2">
                    {op.requiredStaff.map((staff, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {staff.role} ({staff.count})
                      </span>
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

  // Render Chats tab
  const renderChats = () => {
    // Get unique patients with whom the doctor has had appointments
    const chatPatients = patients.filter(p => 
      appointments.all?.some(apt => 
        apt.patientId === p.id && 
        (apt.status === 'approved' || apt.status === 'checked-in' || apt.status === 'completed')
      )
    );

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Chats</h2>

        {chatPatients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faMessage} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Chats</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your chats with patients will appear here once you have approved appointments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatPatients.map((patient) => (
              <div key={patient.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl relative">
                      {patient.fullName?.charAt(0)}
                      {unreadMessages[patient.id] > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                          {unreadMessages[patient.id]}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{patient.fullName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last message: {chatMessages[patient.id] ? formatDate(chatMessages[patient.id].timestamp) : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleChatWithPatient(patient.id, patient.fullName)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      <FontAwesomeIcon icon={faMessage} className="mr-2" />
                      Open Chat
                      {unreadMessages[patient.id] > 0 && (
                        <span className="ml-2 bg-white text-green-600 px-2 py-0.5 rounded-full text-xs">
                          {unreadMessages[patient.id]} new
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const patientAppointments = appointments.all?.filter(apt => apt.patientId === patient.id);
                        if (patientAppointments && patientAppointments.length > 0) {
                          handleViewAppointmentDetails(patientAppointments[0]);
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
        )}
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
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    required
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

  // Render Lab Request Form Modal
  const renderLabRequestForm = () => {
    if (!showLabRequestForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">New Lab Request</h3>
            <button
              onClick={() => {
                setShowLabRequestForm(false);
                setLabRequest({
                  patientId: '',
                  patientName: '',
                  tests: [{ name: '', instructions: '' }],
                  priority: 'normal',
                  notes: ''
                });
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Patient *
              </label>
              <select
                value={labRequest.patientId}
                onChange={(e) => {
                  const patient = patients.find(p => p.id === e.target.value);
                  setLabRequest(prev => ({
                    ...prev,
                    patientId: e.target.value,
                    patientName: patient?.fullName || ''
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            </div>

            {labRequest.tests.map((test, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Test #{index + 1}</h4>
                  {labRequest.tests.length > 1 && (
                    <button
                      onClick={() => handleRemoveTest(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Name *
                    </label>
                    <input
                      type="text"
                      value={test.name}
                      onChange={(e) => handleTestChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Complete Blood Count"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Special Instructions
                    </label>
                    <input
                      type="text"
                      value={test.instructions}
                      onChange={(e) => handleTestChange(index, 'instructions', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Fasting required"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddTest}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Another Test
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={labRequest.priority}
                onChange={(e) => setLabRequest(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={labRequest.notes}
                onChange={(e) => setLabRequest(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Any specific instructions for the lab..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowLabRequestForm(false);
                setLabRequest({
                  patientId: '',
                  patientName: '',
                  tests: [{ name: '', instructions: '' }],
                  priority: 'normal',
                  notes: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateLabRequest}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Operation Form Modal
  const renderOperationForm = () => {
    if (!showOperationForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Schedule Operation</h3>
            <button
              onClick={() => {
                setShowOperationForm(false);
                setOperation({
                  patientId: '',
                  patientName: '',
                  operationType: '',
                  requiredEquipment: [],
                  requiredStaff: [],
                  scheduledDate: '',
                  estimatedDuration: '',
                  notes: '',
                  checklist: {
                    consentConfirmed: false,
                    equipmentConfirmed: false,
                    staffConfirmed: false,
                    riskAcknowledged: false
                  }
                });
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleScheduleOperation(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Patient *
              </label>
              <select
                value={operation.patientId}
                onChange={(e) => {
                  const patient = patients.find(p => p.id === e.target.value);
                  setOperation(prev => ({
                    ...prev,
                    patientId: e.target.value,
                    patientName: patient?.fullName || ''
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Operation Type *
              </label>
              <input
                type="text"
                value={operation.operationType}
                onChange={(e) => setOperation(prev => ({ ...prev, operationType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Appendectomy, Cataract Surgery"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scheduled Date *
                </label>
                <input
                  type="datetime-local"
                  value={operation.scheduledDate}
                  onChange={(e) => setOperation(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Duration (hours) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={operation.estimatedDuration}
                  onChange={(e) => setOperation(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Equipment
              </label>
              <div className="space-y-2">
                {operation.requiredEquipment.map((eq, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={eq.name}
                      onChange={(e) => {
                        const newEq = [...operation.requiredEquipment];
                        newEq[index] = { ...newEq[index], name: e.target.value };
                        setOperation(prev => ({ ...prev, requiredEquipment: newEq }));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Equipment name"
                    />
                    <input
                      type="number"
                      value={eq.quantity}
                      onChange={(e) => {
                        const newEq = [...operation.requiredEquipment];
                        newEq[index] = { ...newEq[index], quantity: parseInt(e.target.value) };
                        setOperation(prev => ({ ...prev, requiredEquipment: newEq }));
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setOperation(prev => ({
                          ...prev,
                          requiredEquipment: prev.requiredEquipment.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOperation(prev => ({
                      ...prev,
                      requiredEquipment: [...prev.requiredEquipment, { name: '', quantity: 1 }]
                    }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Equipment
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Staff
              </label>
              <div className="space-y-2">
                {operation.requiredStaff.map((staff, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={staff.role}
                      onChange={(e) => {
                        const newStaff = [...operation.requiredStaff];
                        newStaff[index] = { ...newStaff[index], role: e.target.value };
                        setOperation(prev => ({ ...prev, requiredStaff: newStaff }));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Role (e.g., Surgeon, Nurse)"
                    />
                    <input
                      type="number"
                      value={staff.count}
                      onChange={(e) => {
                        const newStaff = [...operation.requiredStaff];
                        newStaff[index] = { ...newStaff[index], count: parseInt(e.target.value) };
                        setOperation(prev => ({ ...prev, requiredStaff: newStaff }));
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Count"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setOperation(prev => ({
                          ...prev,
                          requiredStaff: prev.requiredStaff.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOperation(prev => ({
                      ...prev,
                      requiredStaff: [...prev.requiredStaff, { role: '', count: 1 }]
                    }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Staff
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={operation.notes}
                onChange={(e) => setOperation(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Any special instructions or notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowOperationForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                {loading ? 'Scheduling...' : 'Schedule Operation'}
              </button>
            </div>
          </form>
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

  // Render Lab Results Modal
  const renderLabResultsModal = () => {
    if (!showLabResults || !selectedLabResult) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Lab Results - {selectedLabResult.patientName}
            </h3>
            <button
              onClick={() => {
                setShowLabResults(false);
                setSelectedLabResult(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Test Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Patient</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedLabResult.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Requested Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedLabResult.requestedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedLabResult.completedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Requested By</p>
                  <p className="font-medium text-gray-900 dark:text-white">Dr. {selectedLabResult.doctorName}</p>
                </div>
              </div>
            </div>

            {/* Test Results */}
            {selectedLabResult.results && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Results</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm">
                    {selectedLabResult.results.results}
                  </pre>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedLabResult.results?.notes && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Notes</h4>
                <p className="text-gray-700 dark:text-gray-300">{selectedLabResult.results.notes}</p>
              </div>
            )}

            {/* Attachments */}
            {selectedLabResult.results?.files && Object.keys(selectedLabResult.results.files).length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Attachments</h4>
                <div className="space-y-2">
                  {Object.entries(selectedLabResult.results.files).map(([filename, data]) => (
                    <button
                      key={filename}
                      onClick={() => handleDownloadLabReport(data, filename)}
                      className="flex items-center w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <FontAwesomeIcon icon={faDownload} className="text-blue-600 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">{filename}</span>
                    </button>
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
              <button
                onClick={() => setShowLabRequestForm(true)}
                className="w-full flex justify-center p-3 text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Request Lab Test"
              >
                <FontAwesomeIcon icon={faFlask} />
              </button>
              <button
                onClick={() => setShowOperationForm(true)}
                className="w-full flex justify-center p-3 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Schedule Operation"
              >
                <FontAwesomeIcon icon={faStethoscope} />
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
            {activeTab === 'lab-requests' && renderLabRequests()}
            {activeTab === 'operations' && renderOperations()}
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
      {renderLabRequestForm()}
      {renderOperationForm()}
      {renderPatientHistoryModal()}
      {renderLabResultsModal()}
      {renderProfileSettingsModal()}  

      {showChat && chatWith && (
        <Chat
          userId={currentUser.uid}
          userRole="doctor"
          otherUserId={chatWith.id}
          otherUserName={chatWith.fullName}
          onClose={() => {
            setShowChat(false);
            setChatWith(null);
          }}
        />
      )}
    </div>
  );
};

export default Doctor;