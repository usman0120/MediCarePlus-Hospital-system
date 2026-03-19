/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SupportMessages from '../components/SupportMessages';
import { registerPatient } from '../auth';
import 'jspdf-autotable';
import {
  faCalendarCheck,
  faInfoCircle,
  faUserPlus,
  faBed,
  faClock,
  faAmbulance,
  faHospital,
  faSignOutAlt,
  faCheck,
  faTimes,
  faUserTie,
  faMoneyBillWave,
  faArrowRight,
  faPlus,
  faSpinner,
  faEnvelope,
  faSync,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { logoutUser } from '../auth';
import { getContactMessages } from '../database';

// Import Appointment Components
import AppointmentBooking from '../components/appointments/AppointmentBooking';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentDetails from '../components/appointments/AppointmentDetails';

import {
  getAppointmentsByDate,
  searchPatients,
  getBedsByStatus,
  assignBed,
  getUserById,
  releaseBed,
  getPendingPayments,
  processPayment,
  getInvoiceById,
  checkInPatient,
  getEmergencyCases,
  updateTriageStatus,
  createEmergencyCase,
  markAttendance,
  getTodayAttendance,
  getStaffAttendance,
  getAvailableDoctors,
  getDoctorSchedule,
  getDepartments,
  dischargePatient,
  getLabRequests,
  getDashboardStats,
  createAppointment,
  getPatientVisits,
  getInvoicesByPatient,
  checkPatientExists,
  getUsersByRole,
  approveAppointment,
  rejectAppointment,
  rescheduleAppointment
} from '../database';
import { formatDate, formatCurrency, formatTime, validateEmail, validatePhone, validateCNIC, getAgeFromDOB as calculateAge } from '../utils/helpers';
import toast from 'react-hot-toast';
import SearchBar from '../components/SearchBar';
import BedGrid from '../components/BedGrid';
import Invoice from '../components/Invoice';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'jspdf-autotable';

// Import Attendance Module
import AttendanceModule from '../components/AttendanceModule';

const Reception = () => {
  const { currentUser, userDetails } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Use refs to track state
  const isInitialMount = useRef(true);
  const prevSelectedDate = useRef(null);
  const isFetching = useRef(false);
  const fetchTimeoutRef = useRef(null);
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);
  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [attendanceTab, setAttendanceTab] = useState('overview'); // For attendance sub-tabs
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Appointment view states
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false);

  // ==================== DATA STATES ====================
  const [dashboardStats, setDashboardStats] = useState({
    todayAppointments: 0,
    checkedIn: 0,
    pendingApprovals: 0,
    availableBeds: 0,
    totalBeds: 0,
    emergencyCases: 0,
    pendingPayments: 0,
    pendingPaymentsAmount: 0,
    todaysDischarges: 0,
    upcomingOperations: 0,
    totalPatients: 0,
    activeVisits: 0,
    labRequests: 0,
    revenue: 0,
    totalStaff: 0,
    presentToday: 0
  });

  const [appointments, setAppointments] = useState({
    pending: [],
    approved: [],
    scheduled: [],
    checkedIn: [],
    completed: [],
    cancelled: [],
    rejected: [],
    noShow: [],
    all: []
  });

  const [beds, setBeds] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [emergencyCases, setEmergencyCases] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [staffAttendance, setStaffAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState({
    visits: [],
    invoices: [],
    appointments: []
  });
  const [staffList, setStaffList] = useState([]); // For attendance module
  const [messages, setMessages] = useState([]);

  // ==================== MODAL STATES ====================
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showBedAssignmentModal, setShowBedAssignmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showPatientHistoryModal, setShowPatientHistoryModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBedForAssignment, setSelectedBedForAssignment] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newTime: '',
    reason: ''
  });

  // ==================== FORM STATES ====================
  const [walkInData, setWalkInData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cnic: '',
    emergencyContact: '',
    address: '',
    gender: '',
    dateOfBirth: '',
    bloodGroup: '',
    symptoms: '',
    department: '',
    doctorId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    isEmergency: false,
    triage: 'green',
    sendEmailVerification: true,
    sendSMS: true,
    priority: 'normal',
    referredBy: '',
    insuranceProvider: '',
    insuranceNumber: '',
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    amount: '',
    transactionId: '',
    proof: null,
    notes: '',
    receivedBy: currentUser?.uid,
    receivedAt: new Date().toISOString()
  });

  const [triageData, setTriageData] = useState({
    color: 'green',
    notes: '',
    vitals: {
      bp: '',
      heartRate: '',
      temperature: '',
      oxygenLevel: '',
      respiratoryRate: '',
      painLevel: '',
      consciousness: 'alert',
      pupilReaction: 'normal',
      bloodSugar: ''
    },
    chiefComplaint: '',
    mechanismOfInjury: '',
    arrivalMode: 'walk-in',
    assignedDoctor: ''
  });

  const [dischargeData, setDischargeData] = useState({
    patientId: '',
    visitId: '',
    dischargeNotes: '',
    dischargeInstructions: '',
    followUpDate: '',
    followUpDoctor: '',
    prescribedMedications: [],
    generateInvoice: true,
    notifyFamily: true,
    dischargeType: 'regular' // regular, ama, transfer, expired
  });

  const [formErrors, setFormErrors] = useState({});
  const [formStep, setFormStep] = useState(1);

  // ==================== AVAILABILITY STATES ====================
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  

  // ==================== DATA FETCHING FUNCTIONS ====================

  const fetchMessagesForStats = useCallback(async () => {
    try {
      const result = await getContactMessages({}, 'receptionist', currentUser?.uid);
      if (result.success) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Error fetching messages for stats:', error);
    }
  }, [currentUser]);


  useEffect(() => {
    if (activeTab === 'support') {
      fetchMessagesForStats();
    }
  }, [activeTab, fetchMessagesForStats]);

  const fetchStaffList = useCallback(async () => {
    try {
      const rolesToFetch = ['doctor', 'receptionist', 'lab', 'nurse', 'support'];
      const staffPromises = rolesToFetch.map(role => getUsersByRole(role));
      const staffResults = await Promise.all(staffPromises);
      
      const allStaff = staffResults.reduce((acc, result, index) => {
        if (result.success) {
          return [...acc, ...result.data.map(s => ({
            ...s,
            role: rolesToFetch[index]
          }))];
        }
        return acc;
      }, []);

      setStaffList(allStaff);
      setDashboardStats(prev => ({
        ...prev,
        totalStaff: allStaff.length
      }));
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  }, []);

  const fetchAvailableDoctors = useCallback(async (departmentId, date) => {
    try {
      const result = await getAvailableDoctors(departmentId, date);
      if (result.success) {
        setDoctors(result.data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    }
  }, []);

  // Add this helper function to enrich appointment data with patient and doctor names
const enrichAppointmentsWithNames = useCallback(async (appointments) => {
  const enriched = await Promise.all(
    appointments.map(async (apt) => {
      try {
        // Get patient name if not present
        if (!apt.patientName && apt.patientId) {
          const patientResult = await getUserById(apt.patientId);
          if (patientResult.success) {
            apt.patientName = patientResult.data.fullName;
            apt.patientPhone = patientResult.data.phone;
          }
        }
        
        // Get doctor name if not present
        if (!apt.doctorName && apt.doctorId) {
          const doctorResult = await getUserById(apt.doctorId);
          if (doctorResult.success) {
            apt.doctorName = doctorResult.data.fullName;
            apt.doctorSpecialization = doctorResult.data.specialization;
          }
        }
        
        return apt;
      } catch (error) {
        console.error('Error enriching appointment:', error);
        return apt;
      }
    })
  );
  return enriched;
}, []);

const fetchAppointments = useCallback(async () => {
  // Cancel previous request if any
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Create new abort controller
  abortControllerRef.current = new AbortController();
  
  try {
    const dateStr = selectedDate.toISOString().split('T')[0];
    console.log('Fetching appointments for date:', dateStr);
    
    const result = await getAppointmentsByDate(dateStr);
    
    // Check if component is still mounted
    if (!isMounted.current) return;
    
    if (result.success) {
      console.log('Raw appointments received:', result.data);
      
      // Make sure all appointments have proper fields
      const appointmentsWithDefaults = result.data.map(apt => ({
        ...apt,
        patientName: apt.patientName || 'Unknown Patient',
        doctorName: apt.doctorName || 'Unknown Doctor',
        status: apt.status || 'pending',
        time: apt.time || '00:00',
        date: apt.date || dateStr,
        isEmergency: apt.isEmergency || false
      }));
      
      // Log categorized counts for debugging
      const pending = appointmentsWithDefaults.filter(a => a.status === 'pending');
      const approved = appointmentsWithDefaults.filter(a => a.status === 'approved');
      const scheduled = appointmentsWithDefaults.filter(a => a.status === 'scheduled');
      const checkedIn = appointmentsWithDefaults.filter(a => a.status === 'checked-in');
      
      console.log('Categorized appointments:', {
        pending: pending.length,
        approved: approved.length,
        scheduled: scheduled.length,
        checkedIn: checkedIn.length,
        total: appointmentsWithDefaults.length
      });
      
      const categorized = {
        pending: pending,
        approved: approved,
        scheduled: scheduled,
        checkedIn: checkedIn,
        completed: appointmentsWithDefaults.filter(a => a.status === 'completed'),
        cancelled: appointmentsWithDefaults.filter(a => a.status === 'cancelled'),
        rejected: appointmentsWithDefaults.filter(a => a.status === 'rejected'),
        noShow: appointmentsWithDefaults.filter(a => a.status === 'no-show'),
        all: appointmentsWithDefaults
      };
      
      setAppointments(categorized);
      
      setDashboardStats(prev => ({
        ...prev,
        todayAppointments: appointmentsWithDefaults.length,
        pendingApprovals: pending.length,
        checkedIn: checkedIn.length
      }));
    } else {
      console.error('Failed to fetch appointments:', result.error);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted');
      return;
    }
    console.error('Error fetching appointments:', error);
    toast.error('Failed to load appointments');
  }
}, [selectedDate]);

// Add cleanup in the main useEffect:
useEffect(() => {
  isMounted.current = true;
  
  return () => {
    isMounted.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
  };
}, []);

  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;
    
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    isFetching.current = true;
    setLoading(true);
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const [
        appointmentsResult,
        bedsResult,
        paymentsResult,
        emergencyResult,
        attendanceResult,
        statsResult,
        departmentsResult,
        labResult,
        staffResult
      ] = await Promise.allSettled([
        getAppointmentsByDate(dateStr),
        getBedsByStatus(),
        getPendingPayments(),
        getEmergencyCases(),
        getTodayAttendance(),
        getDashboardStats(dateStr),
        getDepartments(),
        getLabRequests({ status: 'pending', limit: 5 }),
        getStaffAttendance(dateStr)
      ]);

      if (appointmentsResult.status === 'fulfilled' && appointmentsResult.value.success) {
  const allAppointments = appointmentsResult.value.data;
  // Enrich appointments with names
  const enrichedAppointments = await enrichAppointmentsWithNames(allAppointments);
  
  setAppointments({
    pending: enrichedAppointments.filter(a => a.status === 'pending'),
    approved: enrichedAppointments.filter(a => a.status === 'approved'),
    scheduled: enrichedAppointments.filter(a => a.status === 'scheduled'),
    checkedIn: enrichedAppointments.filter(a => a.status === 'checked-in'),
    completed: enrichedAppointments.filter(a => a.status === 'completed'),
    cancelled: enrichedAppointments.filter(a => a.status === 'cancelled'),
    rejected: enrichedAppointments.filter(a => a.status === 'rejected'),
    noShow: enrichedAppointments.filter(a => a.status === 'no-show'),
    all: enrichedAppointments
  });
}

      if (bedsResult.status === 'fulfilled' && bedsResult.value.success) {
        const bedsData = bedsResult.value.data;
        setBeds(bedsData);
        setAvailableBeds(bedsData.filter(b => b.status === 'available'));
      }

      if (paymentsResult.status === 'fulfilled' && paymentsResult.value.success) {
        setPendingPayments(paymentsResult.value.data);
      }

      if (emergencyResult.status === 'fulfilled' && emergencyResult.value.success) {
        setEmergencyCases(emergencyResult.value.data);
      }

      if (attendanceResult.status === 'fulfilled' && attendanceResult.value.success) {
        setAttendance(attendanceResult.value.data);
        
        // Calculate present count
        const presentCount = attendanceResult.value.data.filter(a => 
          a.status === 'present' || a.status === 'late'
        ).length;
        
        setDashboardStats(prev => ({
          ...prev,
          presentToday: presentCount
        }));
      }

      if (staffResult.status === 'fulfilled' && staffResult.value.success) {
        setStaffAttendance(staffResult.value.data);
      }

      if (departmentsResult.status === 'fulfilled' && departmentsResult.value.success) {
        setDepartments(departmentsResult.value.data);
      }

      if (labResult.status === 'fulfilled' && labResult.value.success) {
        setLabRequests(labResult.value.data);
      }

      if (statsResult.status === 'fulfilled' && statsResult.value.success) {
        setDashboardStats(prev => ({
          ...prev,
          ...statsResult.value.data,
          availableBeds: bedsResult.status === 'fulfilled' ? 
            bedsResult.value.data.filter(b => b.status === 'available').length : 0,
          totalBeds: bedsResult.value.data?.length || 0,
          emergencyCases: emergencyResult.value.data?.length || 0,
          pendingPayments: paymentsResult.value.data?.length || 0,
          pendingPaymentsAmount: paymentsResult.value.data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
      
      fetchTimeoutRef.current = setTimeout(() => {
        isFetching.current = false;
      }, 2000);
    }
  }, [enrichAppointmentsWithNames, selectedDate]);

  const fetchEmergencyCases = useCallback(async () => {
    try {
      const result = await getEmergencyCases();
      if (result.success) {
        setEmergencyCases(result.data);
      }
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
    }
  }, []);

  const fetchPatientHistory = useCallback(async (patientId) => {
    try {
      const [visits, invoices] = await Promise.all([
        getPatientVisits(patientId),
        getInvoicesByPatient(patientId)
      ]);

      setPatientHistory({
        visits: visits.success ? visits.data : [],
        invoices: invoices.success ? invoices.data : [],
        appointments: []
      });
    } catch (error) {
      console.error('Error fetching patient history:', error);
      toast.error('Failed to load patient history');
    }
  }, []);

  // ==================== EFFECTS ====================

  // Add this near other useEffects in receptionist.jsx:

// Debug effect to monitor appointments state changes
useEffect(() => {
  console.log('Appointments state updated:', {
    total: appointments.all.length,
    pending: appointments.pending.length,
    approved: appointments.approved.length,
    scheduled: appointments.scheduled.length,
    checkedIn: appointments.checkedIn.length,
    firstFew: appointments.all.slice(0, 3).map(a => ({
      id: a.id,
      status: a.status,
      patient: a.patientName,
      time: a.time
    }))
  });
}, [appointments]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    const shouldFetch = isInitialMount.current || 
                       prevSelectedDate.current !== selectedDate.toISOString().split('T')[0] ||
                       refreshTrigger > 0;
    
    if (shouldFetch) {
      fetchDashboardData();
    }
    
    isInitialMount.current = false;
    prevSelectedDate.current = selectedDate.toISOString().split('T')[0];
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [activeTab, selectedDate, refreshTrigger, fetchDashboardData]);

useEffect(() => {
  if (activeTab === 'appointments') {
    console.log('Appointments tab active, fetching for date:', selectedDate);
    fetchAppointments();
  }
}, [activeTab, selectedDate, fetchAppointments]);

  useEffect(() => {
    if (activeTab === 'emergency') {
      fetchEmergencyCases();
    }
  }, [activeTab, fetchEmergencyCases]);

  useEffect(() => {
    if (!walkInData.department || !walkInData.appointmentDate) return;
    
    let isMounted = true;
    
    const loadDoctors = async () => {
      try {
        const result = await getAvailableDoctors(walkInData.department, walkInData.appointmentDate);
        if (isMounted && result.success) {
          setDoctors(result.data);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    
    loadDoctors();
    
    return () => {
      isMounted = false;
    };
  }, [walkInData.department, walkInData.appointmentDate]);

  useEffect(() => {
    if (!walkInData.doctorId || !walkInData.appointmentDate) return;
    
    let isMounted = true;
    
    const loadSchedule = async () => {
      try {
        const result = await getDoctorSchedule(walkInData.doctorId, walkInData.appointmentDate);
        if (isMounted && result.success) {
          setDoctorSchedule(result.data);
          generateTimeSlots(result.data);
        }
      } catch (error) {
        console.error('Error fetching doctor schedule:', error);
      }
    };
    
    loadSchedule();
    
    return () => {
      isMounted = false;
    };
  }, [walkInData.doctorId, walkInData.appointmentDate]);

  // ==================== APPOINTMENT HANDLER FUNCTIONS ====================

  const handleApproveAppointment = async (appointmentId) => {
    try {
      const result = await approveAppointment(appointmentId, currentUser.uid);
      
      if (result.success) {
        toast.success('Appointment approved successfully');
        
        // Refresh appointments
        fetchAppointments();
        
        // Update dashboard stats
        setDashboardStats(prev => ({
          ...prev,
          pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
        }));
      } else {
        toast.error(result.error || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error('Failed to approve appointment');
    }
  };

  const handleRejectAppointment = async (appointmentId) => {
    const reason = prompt('Please provide reason for rejection:');
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      const result = await rejectAppointment(appointmentId, reason, currentUser.uid);
      
      if (result.success) {
        toast.success('Appointment rejected');
        fetchAppointments();
        
        setDashboardStats(prev => ({
          ...prev,
          pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
        }));
      } else {
        toast.error(result.error || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast.error('Failed to reject appointment');
    }
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      const result = await checkInPatient(appointmentId, currentUser.uid);
      
      if (result.success) {
        toast.success('Patient checked in successfully');
        fetchAppointments();
        
        setDashboardStats(prev => ({
          ...prev,
          checkedIn: prev.checkedIn + 1
        }));
      } else {
        toast.error(result.error || 'Failed to check in patient');
      }
    } catch (error) {
      console.error('Error checking in patient:', error);
      toast.error('Failed to check in patient');
    }
  };

  const handleSuggestReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleData({
      newDate: '',
      newTime: '',
      reason: ''
    });
    setShowRescheduleModal(true);
  };

  const handleSubmitReschedule = async () => {
    if (!rescheduleData.newDate || !rescheduleData.newTime || !rescheduleData.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await rescheduleAppointment(
        selectedAppointment.id,
        currentUser.uid,
        rescheduleData.newDate,
        rescheduleData.newTime,
        rescheduleData.reason
      );

      if (result.success) {
        toast.success('Reschedule suggestion sent to patient');
        setShowRescheduleModal(false);
        fetchAppointments();
      } else {
        toast.error(result.error || 'Failed to suggest reschedule');
      }
    } catch (error) {
      console.error('Error suggesting reschedule:', error);
      toast.error('Failed to suggest reschedule');
    }
  };

  const handleViewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const handleAppointmentSuccess = () => {
    setShowAppointmentBooking(false);
    fetchAppointments();
    toast.success('Appointment booked successfully');
  };

  // ==================== OTHER HANDLER FUNCTIONS ====================

  const handleWalkInRegistration = async (e) => {
    e.preventDefault();
    
    if (!validateWalkInForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    
    try {
      if (walkInData.cnic) {
        const exists = await checkPatientExists({ cnic: walkInData.cnic });
        if (exists) {
          toast.error('Patient with this CNIC already exists');
          setLoading(false);
          return;
        }
      }

      if (walkInData.email) {
        const exists = await checkPatientExists({ email: walkInData.email });
        if (exists) {
          toast.error('Patient with this email already exists');
          setLoading(false);
          return;
        }
      }

      const result = await registerPatient(walkInData, currentUser.uid);
      
      if (result.success) {
        toast.success(
          <div>
            <p className="font-medium">Patient registered successfully!</p>
            {walkInData.email && (
              <p className="text-sm mt-1">Verification email sent to {walkInData.email}</p>
            )}
          </div>,
          { duration: 5000 }
        );
        
        setShowWalkInModal(false);
        resetWalkInForm();
        
        if (!walkInData.isEmergency && walkInData.department && walkInData.doctorId && walkInData.appointmentTime) {
          const appointmentResult = await createAppointment({
            patientId: result.data.id,
            doctorId: walkInData.doctorId,
            department: walkInData.department,
            date: walkInData.appointmentDate,
            time: walkInData.appointmentTime,
            reason: walkInData.symptoms,
            isEmergency: false,
            createdBy: currentUser.uid
          });

          if (appointmentResult.success) {
            toast.success('Appointment created successfully');
          }
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBed = async () => {
    if (!selectedBedForAssignment || !selectedPatient) {
      toast.error('Please select a bed and patient');
      return;
    }

    setLoading(true);
    
    try {
      const result = await assignBed(
        selectedBedForAssignment.id,
        selectedPatient.id,
        currentUser.uid
      );
      
      if (result.success) {
        toast.success('Bed assigned successfully');
        setShowBedAssignmentModal(false);
        setSelectedBedForAssignment(null);
        setSelectedPatient(null);
        
        const bedsResult = await getBedsByStatus();
        if (bedsResult.success) {
          setBeds(bedsResult.data);
          setAvailableBeds(bedsResult.data.filter(b => b.status === 'available'));
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Failed to assign bed');
      }
    } catch (error) {
      console.error('Bed assignment error:', error);
      toast.error('Error assigning bed');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseBed = async (bedId) => {
    if (!window.confirm('Are you sure you want to release this bed?')) return;
    
    setLoading(true);
    
    try {
      const result = await releaseBed(bedId, currentUser.uid);
      
      if (result.success) {
        toast.success('Bed released successfully');
        
        const bedsResult = await getBedsByStatus();
        if (bedsResult.success) {
          setBeds(bedsResult.data);
          setAvailableBeds(bedsResult.data.filter(b => b.status === 'available'));
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Failed to release bed');
      }
    } catch (error) {
      console.error('Bed release error:', error);
      toast.error('Error releasing bed');
    } finally {
      setLoading(false);
    }
  };

  const handleDischargePatient = async () => {
    if (!dischargeData.patientId || !dischargeData.visitId) {
      toast.error('Patient information missing');
      return;
    }

    setLoading(true);
    
    try {
      const result = await dischargePatient(
        dischargeData.visitId,
        {
          ...dischargeData,
          dischargedBy: currentUser.uid,
          dischargedAt: new Date()
        },
        currentUser.uid
      );
      
      if (result.success) {
        toast.success('Patient discharged successfully');
        setShowDischargeModal(false);
        resetDischargeForm();
        
        if (result.data.invoiceId) {
          const invoiceResult = await getInvoiceById(result.data.invoiceId);
          if (invoiceResult.success) {
            setSelectedInvoice(invoiceResult.data);
            setShowInvoiceModal(true);
          }
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Failed to discharge patient');
      }
    } catch (error) {
      console.error('Discharge error:', error);
      toast.error('Error discharging patient');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (invoiceId) => {
    if (!validatePaymentForm()) {
      toast.error('Please fix payment form errors');
      return;
    }

    setLoading(true);
    
    try {
      const result = await processPayment(
        invoiceId,
        {
          ...paymentData,
          amount: Number(paymentData.amount),
          confirmedBy: currentUser.uid,
          confirmedAt: new Date()
        },
        currentUser.uid
      );
      
      if (result.success) {
        toast.success('Payment confirmed successfully');
        setShowPaymentModal(false);
        resetPaymentForm();
        
        const paymentsResult = await getPendingPayments();
        if (paymentsResult.success) {
          setPendingPayments(paymentsResult.data);
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast.error('Error confirming payment');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyRegistration = async (e) => {
    e.preventDefault();
    
    if (!walkInData.symptoms) {
      toast.error('Please describe the emergency symptoms');
      return;
    }

    setLoading(true);
    
    try {
      const emergencyData = {
        fullName: walkInData.fullName,
        phone: walkInData.phone,
        gender: walkInData.gender,
        dateOfBirth: walkInData.dateOfBirth,
        bloodGroup: walkInData.bloodGroup,
        symptoms: walkInData.symptoms,
        chiefComplaint: walkInData.symptoms,
        triage: triageData.color || walkInData.triage || 'green',
        vitals: triageData.vitals,
        notes: triageData.notes || walkInData.notes,
        arrivalTime: new Date(),
        registeredBy: currentUser.uid,
        status: 'active'
      };

      const result = await createEmergencyCase(emergencyData);
      
      if (result.success) {
        toast.success('Emergency case registered successfully');
        setShowEmergencyModal(false);
        resetWalkInForm();
        resetTriageForm();
        
        const updated = await getEmergencyCases();
        if (updated.success) {
          setEmergencyCases(updated.data);
        }
        
        setRefreshTrigger(prev => prev + 1);
        
        if (triageData.color === 'red') {
          const availableEmergencyBed = availableBeds.find(b => b.type === 'Emergency' && b.status === 'available');
          if (availableEmergencyBed) {
            await assignBed(availableEmergencyBed.id, result.data.patientId, currentUser.uid);
            toast.success('Emergency bed assigned automatically');
          }
        }
      } else {
        toast.error(result.error || 'Failed to register emergency');
      }
    } catch (error) {
      console.error('Emergency registration error:', error);
      toast.error('Error registering emergency');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTriage = async (caseId) => {
    if (!validateTriageForm()) {
      toast.error('Please complete triage information');
      return;
    }

    setLoading(true);
    
    try {
      const result = await updateTriageStatus(caseId, triageData, currentUser.uid);
      
      if (result.success) {
        toast.success('Triage updated successfully');
        setShowTriageModal(false);
        resetTriageForm();
        
        await fetchEmergencyCases();
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Failed to update triage');
      }
    } catch (error) {
      console.error('Triage update error:', error);
      toast.error('Error updating triage');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    setLoading(true);
    
    try {
      const result = await markAttendance(currentUser.uid, today, 'present', currentUser.uid);
      
      if (result.success) {
        toast.success('Attendance marked successfully');
        setShowAttendanceModal(false);
        
        const attendanceResult = await getTodayAttendance();
        if (attendanceResult.success) {
          setAttendance(attendanceResult.data);
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error('Error marking attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatient = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await searchPatients(query);
      if (result.success) {
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error('Patient search error:', error);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setWalkInData(prev => ({
      ...prev,
      fullName: patient.fullName,
      email: patient.email || '',
      phone: patient.phone,
      cnic: patient.cnic || '',
      gender: patient.gender || '',
      dateOfBirth: patient.dateOfBirth || '',
      bloodGroup: patient.bloodGroup || '',
      address: patient.address || ''
    }));
    setShowPatientSearchModal(false);
    
    await fetchPatientHistory(patient.id);
    setShowPatientHistoryModal(true);
  };

  const handleDepartmentChange = (deptId) => {
    setWalkInData(prev => ({ ...prev, department: deptId, doctorId: '' }));
    if (deptId) {
      fetchAvailableDoctors(deptId, walkInData.appointmentDate);
    } else {
      setDoctors([]);
    }
  };

  const handleAttendanceMarked = (record) => {
    toast.success(`Attendance marked for ${record.fullName}`);
    // Refresh attendance data
    const today = new Date().toISOString().split('T')[0];
    getStaffAttendance(today).then(result => {
      if (result.success) {
        setStaffAttendance(result.data);
      }
    });
  };

  const handleLogout = async () => {
    try {
      await logoutUser(currentUser.uid);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const generateTimeSlots = (schedule) => {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute > 0) continue;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isBooked = schedule.some(s => s.time === timeString && s.status === 'booked');
        
        slots.push({
          time: timeString,
          available: !isBooked,
          display: formatTime(timeString)
        });
      }
    }
    setAvailableTimeSlots(slots);
    return slots;
  };

  const calculatePatientAge = (dateOfBirth) => {
    return calculateAge(dateOfBirth);
  };

  const getTriageColor = (color) => {
    switch (color?.toLowerCase()) {
      case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-l-4 border-red-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-l-4 border-yellow-600';
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-l-4 border-green-600';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  

  // ==================== VALIDATION FUNCTIONS ====================

  const validateWalkInForm = () => {
    const errors = {};

    if (!walkInData.fullName?.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!walkInData.phone) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhone(walkInData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    if (walkInData.email && !validateEmail(walkInData.email)) {
      errors.email = 'Invalid email format';
    }

    if (walkInData.cnic && !validateCNIC(walkInData.cnic)) {
      errors.cnic = 'Invalid CNIC format (12345-1234567-1)';
    }

    if (!walkInData.gender) {
      errors.gender = 'Gender is required';
    }

    if (!walkInData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }

    if (!walkInData.symptoms?.trim()) {
      errors.symptoms = 'Symptoms/Reason for visit is required';
    }

    if (!walkInData.department) {
      errors.department = 'Department is required';
    }

    if (!walkInData.isEmergency && !walkInData.appointmentTime) {
      errors.appointmentTime = 'Appointment time is required for non-emergency cases';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePaymentForm = () => {
    const errors = {};

    if (!paymentData.method) {
      errors.method = 'Payment method is required';
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.amount = 'Valid amount is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTriageForm = () => {
    const errors = {};

    if (!triageData.color) {
      errors.color = 'Triage color is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== RESET FUNCTIONS ====================

  const resetWalkInForm = () => {
    setWalkInData({
      fullName: '',
      email: '',
      phone: '',
      cnic: '',
      emergencyContact: '',
      address: '',
      gender: '',
      dateOfBirth: '',
      bloodGroup: '',
      symptoms: '',
      department: '',
      doctorId: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '',
      isEmergency: false,
      triage: 'green',
      sendEmailVerification: true,
      sendSMS: true,
      priority: 'normal',
      referredBy: '',
      insuranceProvider: '',
      insuranceNumber: '',
      notes: ''
    });
    setFormErrors({});
    setFormStep(1);
    setSelectedPatient(null);
  };

  const resetPaymentForm = () => {
    setPaymentData({
      method: 'cash',
      amount: '',
      transactionId: '',
      proof: null,
      notes: '',
      receivedBy: currentUser?.uid,
      receivedAt: new Date().toISOString()
    });
    setFormErrors({});
  };

  const resetTriageForm = () => {
    setTriageData({
      color: 'green',
      notes: '',
      vitals: {
        bp: '',
        heartRate: '',
        temperature: '',
        oxygenLevel: '',
        respiratoryRate: '',
        painLevel: '',
        consciousness: 'alert',
        pupilReaction: 'normal',
        bloodSugar: ''
      },
      chiefComplaint: '',
      mechanismOfInjury: '',
      arrivalMode: 'walk-in',
      assignedDoctor: ''
    });
    setFormErrors({});
  };

  const resetDischargeForm = () => {
    setDischargeData({
      patientId: '',
      visitId: '',
      dischargeNotes: '',
      dischargeInstructions: '',
      followUpDate: '',
      followUpDoctor: '',
      prescribedMedications: [],
      generateInvoice: true,
      notifyFamily: true,
      dischargeType: 'regular'
    });
  };

  // ==================== TABS ====================

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faHospital },
    { id: 'appointments', label: 'Appointments', icon: faCalendarCheck },
    { id: 'beds', label: 'Bed Management', icon: faBed },
    { id: 'payments', label: 'Payments', icon: faMoneyBillWave },
    { id: 'emergency', label: 'Emergency', icon: faAmbulance },
    { id: 'attendance', label: 'Attendance', icon: faClock },
    { id: 'support', label: 'Support Messages', icon: faEnvelope },
    { id: 'discharge', label: 'Discharge', icon: faSignOutAlt }
  ];

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {userDetails?.fullName || 'Receptionist'}! 👋</h2>
            <p className="text-purple-100">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Appointments</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats.todayAppointments}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-green-600 font-medium">{dashboardStats.checkedIn} checked in</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-yellow-600 font-medium">{dashboardStats.pendingApprovals} pending</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bed Status</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {dashboardStats.availableBeds}/{dashboardStats.totalBeds}
              </p>
              <p className="text-sm text-gray-500 mt-2">Available / Total</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FontAwesomeIcon icon={faBed} className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
              <p className="text-3xl font-bold text-yellow-600">{dashboardStats.pendingPayments}</p>
              <p className="text-sm text-gray-500 mt-2">{formatCurrency(dashboardStats.pendingPaymentsAmount)}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <FontAwesomeIcon icon={faMoneyBillWave} className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Staff Present</p>
              <p className="text-3xl font-bold text-purple-600">{dashboardStats.presentToday}/{dashboardStats.totalStaff}</p>
              <p className="text-sm text-gray-500 mt-2">Present / Total</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <FontAwesomeIcon icon={faUsers} className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => {
            resetWalkInForm();
            setShowWalkInModal(true);
          }}
          className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition flex flex-col items-center transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faUserPlus} className="h-6 w-6 mb-2" />
          <span className="text-sm">Walk-in Registration</span>
        </button>
        
        <button
          onClick={() => {
            resetTriageForm();
            setShowEmergencyModal(true);
          }}
          className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 transition flex flex-col items-center transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faAmbulance} className="h-6 w-6 mb-2" />
          <span className="text-sm">Emergency</span>
        </button>
        
        <button
          onClick={() => {
            setActiveTab('beds');
            setShowBedAssignmentModal(true);
          }}
          className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition flex flex-col items-center transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faBed} className="h-6 w-6 mb-2" />
          <span className="text-sm">Assign Bed</span>
        </button>
        
        <button
          onClick={() => setActiveTab('attendance')}
          className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition flex flex-col items-center transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faClock} className="h-6 w-6 mb-2" />
          <span className="text-sm">Mark Attendance</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Schedule</h3>
          <div className="flex items-center space-x-2">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              dateFormat="MMM d, yyyy"
            />
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {appointments.all.length === 0 ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faCalendarCheck} className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No appointments scheduled for today</p>
              <button
                onClick={() => {
                  resetWalkInForm();
                  setShowWalkInModal(true);
                }}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Register New Patient
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.pending.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2 flex items-center">
                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                    Pending Approval ({appointments.pending.length})
                  </h4>
                  {appointments.pending.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Dr. {apt.doctorName} • {apt.time}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveAppointment(apt.id)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                          <button
                            onClick={() => handleRejectAppointment(apt.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {appointments.approved.concat(appointments.scheduled).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-600 mb-2">Upcoming</h4>
                  {appointments.approved.concat(appointments.scheduled).slice(0, 3).map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-1 h-10 rounded-full ${apt.isEmergency ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{apt.time} • Dr. {apt.doctorName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckIn(apt.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Check In
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {appointments.checkedIn.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Checked In</h4>
                  {appointments.checkedIn.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Waiting for Dr. {apt.doctorName}</p>
                      </div>
                      <span className="text-xs text-green-600">Checked in</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

const renderAppointments = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appointment Management</h2>
      <div className="flex items-center space-x-3">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          dateFormat="MMMM d, yyyy"
        />
        <button
          onClick={() => setShowAppointmentBooking(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          New Appointment
        </button>
      </div>
    </div>

    {/* Debug info - remove in production */}
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm">
      <p>Total appointments: {appointments.all.length}</p>
      <p>Pending: {appointments.pending.length}</p>
      <p>Approved: {appointments.approved.length}</p>
      <p>Scheduled: {appointments.scheduled.length}</p>
    </div>

    {/* Appointment List Component */}
    <AppointmentList
      appointments={appointments.all}
      role="receptionist"
      title={`Appointments for ${selectedDate.toLocaleDateString()}`}
      onApprove={handleApproveAppointment}
      onReject={handleRejectAppointment}
      onCheckIn={handleCheckIn}
      onCancel={handleSuggestReschedule}
      onViewDetails={handleViewAppointmentDetails}
      loading={loading}
      showFilters={true}
    />
  </div>
);
  const renderBeds = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bed Management</h2>
      
      <BedGrid
        beds={beds}
        onAssign={(bedId) => {
          const bed = beds.find(b => b.id === bedId);
          setSelectedBedForAssignment(bed);
          setShowBedAssignmentModal(true);
        }}
        onRelease={handleReleaseBed}
        onRefresh={() => fetchDashboardData()}
      />
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Management</h2>

      <div className="grid grid-cols-1 gap-4">
        {pendingPayments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faMoneyBillWave} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Pending Payments</h3>
            <p className="text-gray-600 dark:text-gray-400">All payments have been processed</p>
          </div>
        ) : (
          pendingPayments.map((invoice) => (
            <Invoice
              key={invoice.id}
              invoice={invoice}
              onPaymentConfirm={() => {
                setSelectedItem(invoice);
                setPaymentData(prev => ({ ...prev, amount: invoice.total }));
                setShowPaymentModal(true);
              }}
              onViewDetails={() => {
                setSelectedInvoice(invoice);
                setShowInvoiceModal(true);
              }}
            />
          ))
        )}
      </div>
    </div>
  );

  const renderEmergency = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Triage</h2>
        <button
          onClick={() => {
            resetTriageForm();
            setShowEmergencyModal(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          New Emergency Case
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {emergencyCases.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faAmbulance} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Emergency Cases</h3>
            <p className="text-gray-600 dark:text-gray-400">All clear! No emergency patients at the moment.</p>
          </div>
        ) : (
          emergencyCases
            .sort((a, b) => {
              const priority = { red: 0, yellow: 1, green: 2 };
              return priority[a.triage] - priority[b.triage];
            })
            .map((case_) => (
              <div key={case_.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${getTriageColor(case_.triage)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold mr-3 ${
                        case_.triage === 'red' ? 'bg-red-600 text-white' :
                        case_.triage === 'yellow' ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {case_.triage?.toUpperCase()}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{case_.patientName}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Age</p>
                        <p className="font-medium">{calculatePatientAge(case_.dateOfBirth)} years</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Gender</p>
                        <p className="font-medium capitalize">{case_.gender}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Blood Group</p>
                        <p className="font-medium">{case_.bloodGroup || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Arrival Time</p>
                        <p className="font-medium">{formatDate(case_.arrivalTime)}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Chief Complaint</p>
                      <p className="text-gray-900 dark:text-white">{case_.chiefComplaint || case_.symptoms}</p>
                    </div>
                    
                    {case_.vitals && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                        <h4 className="font-medium mb-2">Vitals</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {case_.vitals.bp && (
                            <div>
                              <p className="text-xs text-gray-500">BP</p>
                              <p className="font-medium">{case_.vitals.bp}</p>
                            </div>
                          )}
                          {case_.vitals.heartRate && (
                            <div>
                              <p className="text-xs text-gray-500">Heart Rate</p>
                              <p className="font-medium">{case_.vitals.heartRate} bpm</p>
                            </div>
                          )}
                          {case_.vitals.temperature && (
                            <div>
                              <p className="text-xs text-gray-500">Temperature</p>
                              <p className="font-medium">{case_.vitals.temperature}°C</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedItem(case_);
                        setTriageData({
                          color: case_.triage || 'green',
                          notes: case_.notes || '',
                          vitals: case_.vitals || triageData.vitals
                        });
                        setShowTriageModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Update Triage
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatient({ id: case_.patientId, ...case_ });
                        const availableBed = availableBeds.find(b => b.type === 'Emergency');
                        if (availableBed) {
                          setSelectedBedForAssignment(availableBed);
                          setShowBedAssignmentModal(true);
                        } else {
                          toast.error('No emergency beds available');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Assign Bed
                    </button>
                    <button
                      onClick={() => {
                        fetchPatientHistory(case_.patientId);
                        setShowPatientHistoryModal(true);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      View History
                    </button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Attendance Management</h2>
        <button
          onClick={() => setShowAttendanceModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faClock} className="mr-2" />
          Mark My Attendance
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Present Today</p>
          <p className="text-2xl font-bold text-green-600">
            {staffAttendance.filter(a => a.status === 'present').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
          <p className="text-2xl font-bold text-red-600">
            {staffAttendance.filter(a => a.status === 'absent').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Late</p>
          <p className="text-2xl font-bold text-yellow-600">
            {staffAttendance.filter(a => a.status === 'late').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">On Leave</p>
          <p className="text-2xl font-bold text-blue-600">
            {staffAttendance.filter(a => a.status === 'leave').length}
          </p>
        </div>
      </div>

      {/* Sub-tabs for attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto px-4">
            <button
              onClick={() => setAttendanceTab('overview')}
              className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                attendanceTab === 'overview'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setAttendanceTab('mark')}
              className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                attendanceTab === 'mark'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Mark Attendance
            </button>
            <button
              onClick={() => setAttendanceTab('history')}
              className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                attendanceTab === 'history'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        <div className="p-4">
          {attendanceTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Today's Attendance Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Present Staff</h4>
                  {staffAttendance.filter(a => a.status === 'present' || a.status === 'late').length === 0 ? (
                    <p className="text-gray-500">No staff marked present yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {staffAttendance
                        .filter(a => a.status === 'present' || a.status === 'late')
                        .map(record => (
                          <li key={record.id} className="flex justify-between items-center">
                            <span>{record.fullName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.status}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Absent/Leave</h4>
                  {staffAttendance.filter(a => a.status === 'absent' || a.status === 'leave').length === 0 ? (
                    <p className="text-gray-500">No absent staff</p>
                  ) : (
                    <ul className="space-y-2">
                      {staffAttendance
                        .filter(a => a.status === 'absent' || a.status === 'leave')
                        .map(record => (
                          <li key={record.id} className="flex justify-between items-center">
                            <span>{record.fullName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              record.status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {record.status}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {attendanceTab === 'mark' && (
            <AttendanceModule
              onAttendanceMarked={handleAttendanceMarked}
            />
          )}

          {attendanceTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Attendance History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {staffAttendance.slice(0, 10).map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{record.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {record.checkInTime || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
        <div className="flex">
          <FontAwesomeIcon icon={faInfoCircle} className="text-purple-600 dark:text-purple-400 mr-3 mt-1" />
          <div>
            <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">Attendance Recording</p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              Daily attendance is used for automatic salary calculation at month end. 
              Present: Full day • Late: Half day deduction • Absent: Full day deduction • Leave: Paid leave
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDischarge = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Discharge</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search Patient for Discharge</h3>
          
          <SearchBar
            onSearch={handleSearchPatient}
            placeholder="Search by name, phone, or ID..."
            className="mb-4"
          />
          
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    setDischargeData(prev => ({ ...prev, patientId: patient.id }));
                    fetchPatientHistory(patient.id);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border"
                >
                  <p className="font-medium">{patient.fullName}</p>
                  <p className="text-sm text-gray-600">{patient.phone} • {patient.cnic}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedPatient && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Discharge Patient</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedPatient.fullName}</p>
              <p className="text-sm text-gray-600">Patient ID: {selectedPatient.id}</p>
              
              {patientHistory.visits.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm text-gray-600">Current Visit: {formatDate(patientHistory.visits[0].admissionDate)}</p>
                  <p className="text-sm text-gray-600">Doctor: Dr. {patientHistory.visits[0].doctorName}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discharge Notes</label>
                <textarea
                  value={dischargeData.dischargeNotes}
                  onChange={(e) => setDischargeData({ ...dischargeData, dischargeNotes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter discharge summary..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discharge Instructions</label>
                <textarea
                  value={dischargeData.dischargeInstructions}
                  onChange={(e) => setDischargeData({ ...dischargeData, dischargeInstructions: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter post-discharge instructions..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                  <input
                    type="date"
                    value={dischargeData.followUpDate}
                    onChange={(e) => setDischargeData({ ...dischargeData, followUpDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Doctor</label>
                  <input
                    type="text"
                    value={dischargeData.followUpDoctor}
                    onChange={(e) => setDischargeData({ ...dischargeData, followUpDoctor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discharge Type</label>
                <select
                  value={dischargeData.dischargeType}
                  onChange={(e) => setDischargeData({ ...dischargeData, dischargeType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="regular">Regular Discharge</option>
                  <option value="ama">Against Medical Advice (AMA)</option>
                  <option value="transfer">Transfer to Another Facility</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dischargeData.generateInvoice}
                    onChange={(e) => setDischargeData({ ...dischargeData, generateInvoice: e.target.checked })}
                  />
                  <span className="text-sm">Generate final invoice</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dischargeData.notifyFamily}
                    onChange={(e) => setDischargeData({ ...dischargeData, notifyFamily: e.target.checked })}
                  />
                  <span className="text-sm">Notify family</span>
                </label>
              </div>
              
              <button
                onClick={handleDischargePatient}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Process Discharge'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== MODALS ====================

  const renderRescheduleModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Suggest Reschedule</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">New Date</label>
            <input
              type="date"
              value={rescheduleData.newDate}
              onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">New Time</label>
            <input
              type="time"
              value={rescheduleData.newTime}
              onChange={(e) => setRescheduleData({ ...rescheduleData, newTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <textarea
              value={rescheduleData.reason}
              onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Explain why reschedule is needed..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRescheduleModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReschedule}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Send Suggestion
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWalkInModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Walk-in Patient Registration</h3>
          <button
            onClick={() => {
              setShowWalkInModal(false);
              resetWalkInForm();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        <form onSubmit={handleWalkInRegistration} className="space-y-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  formStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {formStep > step ? <FontAwesomeIcon icon={faCheck} className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    formStep > step ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {formStep === 1 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={walkInData.fullName}
                    onChange={(e) => setWalkInData({ ...walkInData, fullName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.fullName && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput
                    country={'pk'}
                    value={walkInData.phone}
                    onChange={(phone) => setWalkInData({ ...walkInData, phone })}
                    inputClass={`!w-full !py-2 ${formErrors.phone ? '!border-red-500' : ''}`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={walkInData.email}
                    onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CNIC Number
                  </label>
                  <input
                    type="text"
                    value={walkInData.cnic}
                    onChange={(e) => setWalkInData({ ...walkInData, cnic: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.cnic ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="12345-1234567-1"
                  />
                  {formErrors.cnic && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.cnic}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walkInData.gender}
                    onChange={(e) => setWalkInData({ ...walkInData, gender: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {formErrors.gender && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.gender}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={walkInData.dateOfBirth}
                    onChange={(e) => setWalkInData({ ...walkInData, dateOfBirth: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.dateOfBirth && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.dateOfBirth}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Blood Group
                  </label>
                  <select
                    value={walkInData.bloodGroup}
                    onChange={(e) => setWalkInData({ ...walkInData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={walkInData.address}
                    onChange={(e) => setWalkInData({ ...walkInData, address: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Next: Medical Information
                </button>
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Medical Information</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Symptoms / Reason for Visit <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={walkInData.symptoms}
                    onChange={(e) => setWalkInData({ ...walkInData, symptoms: e.target.value })}
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.symptoms ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.symptoms && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.symptoms}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emergency Contact
                  </label>
                  <PhoneInput
                    country={'pk'}
                    value={walkInData.emergencyContact}
                    onChange={(phone) => setWalkInData({ ...walkInData, emergencyContact: phone })}
                    inputClass="!w-full !py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={walkInData.insuranceProvider}
                    onChange={(e) => setWalkInData({ ...walkInData, insuranceProvider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Insurance Number
                  </label>
                  <input
                    type="text"
                    value={walkInData.insuranceNumber}
                    onChange={(e) => setWalkInData({ ...walkInData, insuranceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Referred By
                  </label>
                  <input
                    type="text"
                    value={walkInData.referredBy}
                    onChange={(e) => setWalkInData({ ...walkInData, referredBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(3)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Next: Appointment Details
                </button>
              </div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Appointment Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walkInData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  {formErrors.department && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.department}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Doctor
                  </label>
                  <select
                    value={walkInData.doctorId}
                    onChange={(e) => setWalkInData({ ...walkInData, doctorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!walkInData.department}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>Dr. {doc.fullName}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={walkInData.appointmentDate}
                    onChange={(e) => setWalkInData({ ...walkInData, appointmentDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Appointment Time
                  </label>
                  <select
                    value={walkInData.appointmentTime}
                    onChange={(e) => setWalkInData({ ...walkInData, appointmentTime: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.appointmentTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!walkInData.doctorId || walkInData.isEmergency}
                  >
                    <option value="">Select Time</option>
                    {availableTimeSlots.map(slot => (
                      <option key={slot.time} value={slot.time} disabled={!slot.available}>
                        {slot.display} {!slot.available && '(Booked)'}
                      </option>
                    ))}
                  </select>
                  {formErrors.appointmentTime && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.appointmentTime}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-yellow-50 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={walkInData.isEmergency}
                    onChange={(e) => setWalkInData({ ...walkInData, isEmergency: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Emergency Case</span>
                </label>
                
                {walkInData.isEmergency && (
                  <select
                    value={walkInData.triage}
                    onChange={(e) => setWalkInData({ ...walkInData, triage: e.target.value })}
                    className="px-3 py-1 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="red">🔴 Red - Critical</option>
                    <option value="yellow">🟡 Yellow - Urgent</option>
                    <option value="green">🟢 Green - Non-urgent</option>
                  </select>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      Registering...
                    </>
                  ) : (
                    <>
                      Register Patient
                      <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const renderBedAssignmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Assign Bed</h3>
        
        <div className="space-y-4">
          {selectedBedForAssignment && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="font-medium">Bed #{selectedBedForAssignment.id.slice(-4)}</p>
              <p className="text-sm text-gray-600">Type: {selectedBedForAssignment.type}</p>
              <p className="text-sm text-gray-600">Daily Rate: {formatCurrency(selectedBedForAssignment.dailyRate || 0)}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Search Patient</label>
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              onChange={(e) => handleSearchPatient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {searchResults.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`w-full text-left p-3 hover:bg-gray-50 ${
                    selectedPatient?.id === patient.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <p className="font-medium">{patient.fullName}</p>
                  <p className="text-sm text-gray-600">{patient.phone}</p>
                </button>
              ))}
            </div>
          )}
          
          {selectedPatient && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="font-medium">Selected: {selectedPatient.fullName}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowBedAssignmentModal(false);
                setSelectedBedForAssignment(null);
                setSelectedPatient(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignBed}
              disabled={loading || !selectedPatient}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Bed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Confirm Payment</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select
              value={paymentData.method}
              onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Transaction ID</label>
            <input
              type="text"
              value={paymentData.transactionId}
              onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="If applicable"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowPaymentModal(false);
                resetPaymentForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => handleConfirmPayment(selectedItem?.id)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTriageModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Update Triage</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Triage Color</label>
            <div className="flex space-x-3">
              {['red', 'yellow', 'green'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTriageData({ ...triageData, color })}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    triageData.color === color
                      ? color === 'red' ? 'bg-red-600 text-white' :
                        color === 'yellow' ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      : color === 'red' ? 'bg-red-100 text-red-800' :
                        color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                  }`}
                >
                  {color.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Vitals</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="BP"
                value={triageData.vitals.bp}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, bp: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Heart Rate"
                value={triageData.vitals.heartRate}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, heartRate: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Temperature"
                value={triageData.vitals.temperature}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, temperature: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="O2 Sat"
                value={triageData.vitals.oxygenLevel}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, oxygenLevel: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={triageData.notes}
              onChange={(e) => setTriageData({ ...triageData, notes: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Additional observations..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowTriageModal(false);
                resetTriageForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => handleUpdateTriage(selectedItem?.id)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Triage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendanceModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Mark Your Attendance</h3>
        
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              You are about to mark your attendance for today.
            </p>
            <p className="text-xs text-green-600 mt-1">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
          
          {attendance && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                You have already marked attendance today.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Time: {attendance.markedAt}
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowAttendanceModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkAttendance}
              disabled={loading || attendance}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Marking...' : 'Mark Present'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmergencyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">New Emergency Case</h3>
          <button
            onClick={() => {
              setShowEmergencyModal(false);
              resetWalkInForm();
              resetTriageForm();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        <form onSubmit={handleEmergencyRegistration} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={walkInData.fullName}
                onChange={(e) => setWalkInData({ ...walkInData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <PhoneInput
                country={'pk'}
                value={walkInData.phone}
                onChange={(phone) => setWalkInData({ ...walkInData, phone })}
                inputClass="!w-full !py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                value={walkInData.gender}
                onChange={(e) => setWalkInData({ ...walkInData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Age/DOB</label>
              <input
                type="date"
                value={walkInData.dateOfBirth}
                onChange={(e) => setWalkInData({ ...walkInData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Emergency Symptoms</label>
            <textarea
              value={walkInData.symptoms}
              onChange={(e) => setWalkInData({ ...walkInData, symptoms: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Describe the emergency situation..."
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Triage Color</label>
              <select
                value={triageData.color}
                onChange={(e) => setTriageData({ ...triageData, color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="red">Red - Critical</option>
                <option value="yellow">Yellow - Urgent</option>
                <option value="green">Green - Non-urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Arrival Mode</label>
              <select
                value={triageData.arrivalMode}
                onChange={(e) => setTriageData({ ...triageData, arrivalMode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="walk-in">Walk-in</option>
                <option value="ambulance">Ambulance</option>
                <option value="police">Police</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Blood Pressure</label>
              <input
                type="text"
                placeholder="e.g., 120/80"
                value={triageData.vitals.bp}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, bp: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Heart Rate</label>
              <input
                type="number"
                placeholder="bpm"
                value={triageData.vitals.heartRate}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, heartRate: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Temperature</label>
              <input
                type="number"
                step="0.1"
                placeholder="°C"
                value={triageData.vitals.temperature}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, temperature: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">O2 Saturation</label>
              <input
                type="number"
                placeholder="%"
                value={triageData.vitals.oxygenLevel}
                onChange={(e) => setTriageData({
                  ...triageData,
                  vitals: { ...triageData.vitals, oxygenLevel: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Mechanism of Injury</label>
            <input
              type="text"
              value={triageData.mechanismOfInjury}
              onChange={(e) => setTriageData({ ...triageData, mechanismOfInjury: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., MVA, fall, assault"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Additional Notes</label>
            <textarea
              value={triageData.notes}
              onChange={(e) => setTriageData({ ...triageData, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowEmergencyModal(false);
                resetWalkInForm();
                resetTriageForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Register Emergency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderPatientHistoryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Patient History</h3>
          <button
            onClick={() => setShowPatientHistoryModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        {selectedPatient && (
          <div className="space-y-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-lg mb-2">{selectedPatient.fullName}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Phone:</span> {selectedPatient.phone}
                </div>
                <div>
                  <span className="text-gray-600">Email:</span> {selectedPatient.email || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600">CNIC:</span> {selectedPatient.cnic || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600">Blood Group:</span> {selectedPatient.bloodGroup || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600">Gender:</span> {selectedPatient.gender}
                </div>
                <div>
                  <span className="text-gray-600">DOB:</span> {selectedPatient.dateOfBirth}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Visit History</h4>
              {patientHistory.visits.length === 0 ? (
                <p className="text-gray-500 text-sm">No previous visits</p>
              ) : (
                <div className="space-y-2">
                  {patientHistory.visits.map((visit) => (
                    <div key={visit.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">Date: {formatDate(visit.admissionDate)}</p>
                          <p className="text-sm">Doctor: Dr. {visit.doctorName}</p>
                          <p className="text-sm">Department: {visit.department}</p>
                          <p className="text-sm mt-1">Diagnosis: {visit.diagnosis || 'Pending'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          visit.status === 'discharged' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {visit.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Invoice History</h4>
              {patientHistory.invoices.length === 0 ? (
                <p className="text-gray-500 text-sm">No invoices</p>
              ) : (
                <div className="space-y-2">
                  {patientHistory.invoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">Invoice #{invoice.id.slice(-6)}</p>
                          <p className="text-sm">Date: {formatDate(invoice.createdAt)}</p>
                          <p className="text-sm">Amount: {formatCurrency(invoice.total)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 ${theme}`}>
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-purple-900 text-white hidden lg:block">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-purple-800">
            <h1 className="text-xl font-bold text-white">MediCare Plus</h1>
            <p className="text-sm text-purple-300">Reception Portal</p>
          </div>

          <div className="p-4 border-b border-purple-800">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faUserTie} className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-white">{userDetails?.fullName || 'Receptionist'}</p>
                <p className="text-xs text-purple-300">Receptionist</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-2 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-200 hover:bg-purple-800'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-3" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-purple-800">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-300">Today's Date:</span>
                <span className="text-white">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Appointments:</span>
                <span className="text-white">{dashboardStats.todayAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Available Beds:</span>
                <span className="text-white">{dashboardStats.availableBeds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Emergency:</span>
                <span className="text-white">{dashboardStats.emergencyCases}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-purple-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-purple-200 hover:bg-red-600 hover:text-white rounded-lg transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-purple-900 text-white p-4">
        <h1 className="text-xl font-bold text-white">MediCare Plus Reception</h1>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-4 sm:p-8">
        <div className="lg:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        {loading && activeTab === 'dashboard' ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'appointments' && renderAppointments()}
            {activeTab === 'beds' && renderBeds()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'emergency' && renderEmergency()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'discharge' && renderDischarge()}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support Messages & Complaints</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Role: Receptionist</span>
                  </div>
                </div>
                
                {/* Quick Stats for Support Messages */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">New Messages</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {messages?.filter(m => m.status === 'new').length || 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {messages?.filter(m => m.status === 'in-progress').length || 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                    <p className="text-2xl font-bold text-green-600">
                      {messages?.filter(m => m.status === 'resolved').length || 0}
                    </p>
                  </div>
                </div>

                {/* Info Box for Reception Staff */}
                <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
                  <div className="flex">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-purple-600 dark:text-purple-400 mr-3 mt-1" />
                    <div>
                      <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                        Support Messages Management
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        As a receptionist, you can view and respond to support messages from patients and visitors.
                        Messages are filtered to show only those relevant to reception services.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Support Messages Component */}
                <SupportMessages />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showWalkInModal && renderWalkInModal()}
      {showBedAssignmentModal && renderBedAssignmentModal()}
      {showPaymentModal && renderPaymentModal()}
      {showTriageModal && renderTriageModal()}
      {showAttendanceModal && renderAttendanceModal()}
      {showEmergencyModal && renderEmergencyModal()}
      {showPatientHistoryModal && renderPatientHistoryModal()}
      {showRescheduleModal && renderRescheduleModal()}
      {showAppointmentBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Book New Appointment</h3>
              <button
                onClick={() => setShowAppointmentBooking(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>
            <AppointmentBooking
              patientId={currentUser?.uid}
              onSuccess={handleAppointmentSuccess}
              onCancel={() => setShowAppointmentBooking(false)}
            />
          </div>
        </div>
      )}
      {showAppointmentDetails && selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          onClose={() => {
            setShowAppointmentDetails(false);
            setSelectedAppointment(null);
          }}
          role="receptionist"
        />
      )}
      {showPatientSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold mb-4">Search Patients</h3>
            <input
              type="text"
              placeholder="Search by name, phone, CNIC..."
              onChange={(e) => handleSearchPatient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => {
                    handleSelectPatient(patient);
                    setShowPatientSearchModal(false);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border"
                >
                  <p className="font-medium">{patient.fullName}</p>
                  <p className="text-sm text-gray-600">{patient.phone} • {patient.cnic}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPatientSearchModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reception;