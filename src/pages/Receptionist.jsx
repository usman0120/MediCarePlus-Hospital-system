/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SupportMessages from '../components/SupportMessages';
import { registerPatient } from '../auth';

import {
  faCalendarCheck,
  faInfoCircle,
  faUserPlus,
  faEye,
  faUser,
  faCheckCircle,
  faClock,
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
import { db } from '../firebase';
// Import Appointment Components
import AppointmentBooking from '../components/appointments/AppointmentBooking';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentDetails from '../components/appointments/AppointmentDetails';
import PaymentVerificationModal from '../components/PaymentVerificationModal';
import TransactionHistory from '../components/TransactionHistory';
import { 
  query, 
  collection, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import {
  getAppointmentsByDate,
  searchPatients,
  getUserById,
  getPendingPayments,
  processPayment,
  checkInPatient,
  getAvailableDoctors,
  getDoctorSchedule,
  getDepartments,
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
import { formatDate, formatCurrency, formatTime, validateEmail, validatePhone, validateCNIC } from '../utils/helpers';
import toast from 'react-hot-toast';
import SearchBar from '../components/SearchBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  
  // Live time state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard');
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
    pendingPayments: 0,
    pendingPaymentsAmount: 0,
    totalPatients: 0,
    activeVisits: 0,
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

  const [pendingPayments, setPendingPayments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState({
    visits: [],
    invoices: [],
    appointments: []
  });
  const [messages, setMessages] = useState([]);

  // ==================== MODAL STATES ====================
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [showPatientHistoryModal, setShowPatientHistoryModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newTime: '',
    reason: ''
  });
  const [showPaymentVerificationModal, setShowPaymentVerificationModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState(null);
  const [bookingPatientId, setBookingPatientId] = useState(null);
  
  // Payment History State
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [appointmentFilters, setAppointmentFilters] = useState({
    doctorId: 'all',
    status: 'all',
    dateRange: 'today'
  });
  const [availableDoctorsList, setAvailableDoctorsList] = useState([]);
  
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

  const [formErrors, setFormErrors] = useState({});
  const [formStep, setFormStep] = useState(1);

  // ==================== AVAILABILITY STATES ====================
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  
  // Live time effect - fixes the stuck seconds issue
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // ==================== DATA FETCHING FUNCTIONS ====================

  const fetchTransactionHistory = useCallback(async () => {
    try {
      const allAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('paymentStatus', 'in', ['paid', 'pending']),
        orderBy('paidAt', 'desc')
      );
      
      const snapshot = await getDocs(allAppointmentsQuery);
      const transactions = [];
      
      for (const doc of snapshot.docs) {
        const apt = doc.data();
        if (apt.paymentStatus === 'paid') {
          const [doctorData, patientData] = await Promise.all([
            getUserById(apt.doctorId),
            getUserById(apt.patientId)
          ]);
          
          transactions.push({
            id: doc.id,
            ...apt,
            doctorName: doctorData.success ? doctorData.data.fullName : 'Unknown',
            patientName: patientData.success ? patientData.data.fullName : 'Unknown',
            transactionDate: apt.paidAt?.toDate?.() || apt.createdAt?.toDate?.(),
            challanNo: `APT-${doc.id.slice(-8)}`
          });
        }
      }
      
      setTransactionHistory(transactions);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  }, []);

  const fetchAvailableDoctorsList = useCallback(async () => {
    try {
      const result = await getUsersByRole('doctor');
      if (result.success) {
        setAvailableDoctorsList(result.data.filter(d => d.accountStatus === 'active'));
      }
    } catch (error) {
      console.error('Error fetching doctors list:', error);
    }
  }, []);

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
    if (activeTab === 'payments') {
      fetchTransactionHistory();
      fetchAvailableDoctorsList();
    }
  }, [activeTab, fetchTransactionHistory, fetchAvailableDoctorsList]);

  useEffect(() => {
    fetchAvailableDoctorsList();
  }, [fetchAvailableDoctorsList]);

  useEffect(() => {
    if (activeTab === 'support') {
      fetchMessagesForStats();
    }
  }, [activeTab, fetchMessagesForStats]);

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

  const enrichAppointmentsWithNames = useCallback(async (appointments) => {
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        try {
          if (!apt.patientName && apt.patientId) {
            const patientResult = await getUserById(apt.patientId);
            if (patientResult.success) {
              apt.patientName = patientResult.data.fullName;
              apt.patientPhone = patientResult.data.phone;
            }
          }
          
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      let dateStr = '';
      if (appointmentFilters.dateRange === 'today' || appointmentFilters.dateRange === 'tomorrow') {
        const targetDate = appointmentFilters.dateRange === 'today' ? new Date() : new Date(Date.now() + 86400000);
        dateStr = targetDate.toISOString().split('T')[0];
      } else if (appointmentFilters.dateRange === 'all') {
        const q = query(collection(db, 'appointments'));
        const snapshot = await getDocs(q);
        const appointmentsList = [];
        
        for (const doc of snapshot.docs) {
          const apt = { id: doc.id, ...doc.data() };
          if (apt.patientId) {
            const patientResult = await getUserById(apt.patientId);
            if (patientResult.success) {
              apt.patientName = patientResult.data.fullName;
            }
          }
          if (apt.doctorId) {
            const doctorResult = await getUserById(apt.doctorId);
            if (doctorResult.success) {
              apt.doctorName = doctorResult.data.fullName;
            }
          }
          appointmentsList.push(apt);
        }
        
        if (isMounted.current) {
          const categorized = {
            pending: appointmentsList.filter(a => a.status === 'pending'),
            approved: appointmentsList.filter(a => a.status === 'approved'),
            scheduled: appointmentsList.filter(a => a.status === 'scheduled'),
            checkedIn: appointmentsList.filter(a => a.status === 'checked-in'),
            completed: appointmentsList.filter(a => a.status === 'completed'),
            cancelled: appointmentsList.filter(a => a.status === 'cancelled'),
            rejected: appointmentsList.filter(a => a.status === 'rejected'),
            noShow: appointmentsList.filter(a => a.status === 'no-show'),
            all: appointmentsList
          };
          setAppointments(categorized);
        }
        return;
      }
      
      const result = await getAppointmentsByDate(dateStr);
      
      if (!isMounted.current) return;
      
      if (result.success) {
        const appointmentsWithDefaults = result.data.map(apt => ({
          ...apt,
          patientName: apt.patientName || 'Unknown Patient',
          doctorName: apt.doctorName || 'Unknown Doctor',
          status: apt.status || 'pending',
          time: apt.time || '00:00',
          date: apt.date || dateStr,
          paymentStatus: apt.paymentStatus || 'pending',
          paymentAmount: apt.paymentAmount || apt.consultationFee || 1000
        }));
        
        const categorized = {
          pending: appointmentsWithDefaults.filter(a => a.status === 'pending'),
          approved: appointmentsWithDefaults.filter(a => a.status === 'approved'),
          scheduled: appointmentsWithDefaults.filter(a => a.status === 'scheduled'),
          checkedIn: appointmentsWithDefaults.filter(a => a.status === 'checked-in'),
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
          pendingApprovals: categorized.pending.length,
          checkedIn: categorized.checkedIn.length
        }));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching appointments:', error);
      }
    }
  }, [appointmentFilters.dateRange]);

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
        paymentsResult,
        statsResult,
        departmentsResult
      ] = await Promise.allSettled([
        getAppointmentsByDate(dateStr),
        getPendingPayments(),
        getDashboardStats(dateStr),
        getDepartments()
      ]);

      if (appointmentsResult.status === 'fulfilled' && appointmentsResult.value.success) {
        const allAppointments = appointmentsResult.value.data;
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
      
      if (paymentsResult.status === 'fulfilled' && paymentsResult.value.success) {
        setPendingPayments(paymentsResult.value.data);
      }

      if (departmentsResult.status === 'fulfilled' && departmentsResult.value.success) {
        setDepartments(departmentsResult.value.data);
      }

      if (statsResult.status === 'fulfilled' && statsResult.value.success) {
        setDashboardStats(prev => ({
          ...prev,
          ...statsResult.value.data,
          pendingPayments: paymentsResult.value?.data?.length || 0,
          pendingPaymentsAmount: paymentsResult.value?.data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
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
      fetchAppointments();
    }
  }, [activeTab, selectedDate, fetchAppointments]);

  useEffect(() => {
    if (!walkInData.department || !walkInData.appointmentDate) return;
    
    let isMountedLocal = true;
    
    const loadDoctors = async () => {
      try {
        const result = await getAvailableDoctors(walkInData.department, walkInData.appointmentDate);
        if (isMountedLocal && result.success) {
          setDoctors(result.data);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    
    loadDoctors();
    
    return () => {
      isMountedLocal = false;
    };
  }, [walkInData.department, walkInData.appointmentDate]);

  useEffect(() => {
    if (!walkInData.doctorId || !walkInData.appointmentDate) return;
    
    let isMountedLocal = true;
    
    const loadSchedule = async () => {
      try {
        const result = await getDoctorSchedule(walkInData.doctorId, walkInData.appointmentDate);
        if (isMountedLocal && result.success) {
          setDoctorSchedule(result.data);
          generateTimeSlots(result.data);
        }
      } catch (error) {
        console.error('Error fetching doctor schedule:', error);
      }
    };
    
    loadSchedule();
    
    return () => {
      isMountedLocal = false;
    };
  }, [walkInData.doctorId, walkInData.appointmentDate]);

  // ==================== APPOINTMENT HANDLER FUNCTIONS ====================

  const handleVerifyPaymentAndConfirm = async (appointmentId) => {
    try {
      const { verifyAndAssignAppointment } = await import('../database');
      const result = await verifyAndAssignAppointment(appointmentId, currentUser.uid);
      
      if (result.success) {
        toast.success('Payment verified! Appointment confirmed.');
        await fetchAppointments();
        await fetchTransactionHistory();
      } else {
        toast.error(result.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    }
  };

  const handleViewPaymentProof = async (appointment) => {
    if (!appointment || !appointment.id) {
      toast.error('Invalid appointment data');
      return;
    }
    
    const enrichedAppointment = {
      ...appointment,
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      paymentStatus: appointment.paymentStatus,
      paymentAmount: appointment.paymentAmount || appointment.consultationFee || 1000,
      paymentMethod: appointment.paymentMethod,
      paymentReference: appointment.paymentReference,
      paymentProof: appointment.paymentProof,
      paidAt: appointment.paidAt,
      date: appointment.date,
      time: appointment.time,
      doctorName: appointment.doctorName || 'Unknown Doctor',
      patientName: appointment.patientName || 'Unknown Patient'
    };
    
    setSelectedAppointmentForPayment(enrichedAppointment);
    setShowPaymentVerificationModal(true);
  };

  const handleApproveAppointment = async (appointmentId) => {
    if (!appointmentId) {
      toast.error('Invalid appointment ID');
      return;
    }

    setLoading(true);
    try {
      const result = await approveAppointment(appointmentId, currentUser?.uid);
      
      if (result && result.success) {
        toast.success('Appointment approved successfully');
        await fetchAppointments();
        
        setDashboardStats(prev => ({
          ...prev,
          pendingApprovals: Math.max(0, (prev.pendingApprovals || 0) - 1)
        }));
      } else {
        toast.error(result?.error || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error(error.message || 'Failed to approve appointment');
    } finally {
      setLoading(false);
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

  const handleCheckInPatient = async (appointmentId) => {
    if (!appointmentId) {
      toast.error('Invalid appointment ID');
      return;
    }

    setLoading(true);
    try {
      const result = await checkInPatient(appointmentId, currentUser.uid);
      
      if (result.success) {
        toast.success('Patient checked in successfully.');
        await fetchAppointments();
        setDashboardStats(prev => ({
          ...prev,
          checkedIn: (prev.checkedIn || 0) + 1
        }));
      } else {
        toast.error(result.error || 'Failed to check in patient');
      }
    } catch (error) {
      console.error('Error checking in patient:', error);
      toast.error(error.message || 'Failed to check in patient');
    } finally {
      setLoading(false);
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
        
        if (walkInData.department && walkInData.doctorId && walkInData.appointmentTime) {
          const appointmentResult = await createAppointment({
            patientId: result.data.id,
            doctorId: walkInData.doctorId,
            department: walkInData.department,
            date: walkInData.appointmentDate,
            time: walkInData.appointmentTime,
            reason: walkInData.symptoms,
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

    if (!walkInData.appointmentTime) {
      errors.appointmentTime = 'Appointment time is required';
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
  
  // ==================== TABS ====================
  // REMOVED: beds, discharge, emergency tabs
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faHospital },
    { id: 'appointments', label: 'Appointments', icon: faCalendarCheck },
    { id: 'registration', label: 'Walk-in Registration', icon: faUser },
    { id: 'payments', label: 'Payments', icon: faMoneyBillWave },
    { id: 'attendance', label: 'Attendance', icon: faClock },
    { id: 'support', label: 'Support Messages', icon: faEnvelope },
  ];

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner with Live Time */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {userDetails?.fullName || 'Receptionist'}! 👋</h2>
            <p className="text-purple-100">Today is {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right bg-purple-700/50 px-4 py-2 rounded-lg">
            <p className="text-2xl font-bold font-mono">{currentTime.toLocaleTimeString()}</p>
            <p className="text-xs text-purple-200">System Time</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Patients</p>
              <p className="text-3xl font-bold text-blue-600">{dashboardStats.totalPatients}</p>
              <p className="text-sm text-gray-500 mt-2">Registered patients</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FontAwesomeIcon icon={faUser} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          onClick={() => setActiveTab('appointments')}
          className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition flex flex-col items-center transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6 mb-2" />
          <span className="text-sm">Manage Appointments</span>
        </button>
        
        <button
          onClick={() => setActiveTab('attendance')}
          className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition flex flex-col items-center transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faClock} className="h-6 w-6 mb-2" />
          <span className="text-sm">Attendance</span>
        </button>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                    <div key={apt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2 gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-1 h-10 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{apt.time} • Dr. {apt.doctorName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckInPatient(apt.id)}
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
                    <div key={apt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2 gap-3">
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

  const renderAppointments = () => {
    const filteredAppointments = appointments.all.filter(apt => {
      if (appointmentFilters.doctorId !== 'all' && apt.doctorId !== appointmentFilters.doctorId) return false;
      if (appointmentFilters.status !== 'all' && apt.status !== appointmentFilters.status) return false;
      
      const aptDate = new Date(apt.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      switch (appointmentFilters.dateRange) {
        case 'today':
          return aptDate.toDateString() === today.toDateString();
        case 'tomorrow':
          return aptDate.toDateString() === tomorrow.toDateString();
        case 'week':
          return aptDate >= startOfWeek;
        case 'month':
          return aptDate >= startOfMonth;
        case 'all':
        default:
          return true;
      }
    });
    
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    const enrichedAppointments = sortedAppointments.map(apt => ({
      ...apt,
      patientName: apt.patientName || 'Unknown Patient',
      doctorName: apt.doctorName || 'Unknown Doctor',
      status: apt.status || 'pending',
      paymentStatus: apt.paymentStatus || 'pending',
      paymentAmount: apt.paymentAmount || apt.consultationFee || 1000
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appointment Management</h2>
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              dateFormat="MMMM d, yyyy"
            />
            <button
              onClick={() => {
                setBookingPatientId(null);
                setSelectedPatient(null);
                setSearchResults([]);
                setShowAppointmentBooking(true);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              New Appointment
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <select
                value={appointmentFilters.dateRange}
                onChange={(e) => setAppointmentFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Appointments</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Doctor
              </label>
              <select
                value={appointmentFilters.doctorId}
                onChange={(e) => setAppointmentFilters(prev => ({ ...prev, doctorId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Doctors</option>
                {availableDoctorsList.map(doc => (
                  <option key={doc.id} value={doc.id}>Dr. {doc.fullName}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Status
              </label>
              <select
                value={appointmentFilters.status}
                onChange={(e) => setAppointmentFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked-in">Checked In</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setAppointmentFilters({ doctorId: 'all', status: 'all', dateRange: 'today' })}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Pending</p>
            <p className="text-xl font-bold text-yellow-700">{enrichedAppointments.filter(a => a.status === 'pending').length}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400">Approved</p>
            <p className="text-xl font-bold text-blue-700">{enrichedAppointments.filter(a => a.status === 'approved').length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 dark:text-green-400">Confirmed</p>
            <p className="text-xl font-bold text-green-700">{enrichedAppointments.filter(a => a.status === 'confirmed').length}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 dark:text-purple-400">Checked In</p>
            <p className="text-xl font-bold text-purple-700">{enrichedAppointments.filter(a => a.status === 'checked-in').length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-xl font-bold text-gray-700">{enrichedAppointments.filter(a => a.status === 'completed').length}</p>
          </div>
        </div>

        <AppointmentList
          appointments={enrichedAppointments}
          role="receptionist"
          title={`Appointments (${enrichedAppointments.length} found)`}
          onApprove={handleApproveAppointment}
          onReject={handleRejectAppointment}
          onCancel={handleSuggestReschedule}
          onCheckIn={(appointmentId) => {
            const appointment = enrichedAppointments.find(a => a.id === appointmentId);
            if (appointment?.paymentStatus === 'paid' && appointment?.status === 'approved') {
              handleVerifyPaymentAndConfirm(appointmentId);
            } else if (appointment?.status === 'confirmed') {
              handleCheckInPatient(appointmentId);
            } else {
              toast.error('Cannot check in: Appointment not ready');
            }
          }}
          onViewDetails={handleViewAppointmentDetails}
          loading={loading}
          showFilters={true}
        />
      </div>
    );
  };

  const renderRegistration = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Walk-in Registration</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Register a new walk-in patient and book an appointment.
        </p>
        <button
          onClick={() => {
            resetWalkInForm();
            setShowWalkInModal(true);
          }}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
          Register New Patient
        </button>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Total Revenue: {formatCurrency(transactionHistory.reduce((sum, t) => sum + (t.paymentAmount || t.consultationFee || 0), 0))}
          </p>
        </div>
        <button
          onClick={() => setShowTransactionHistory(!showTransactionHistory)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faEye} className="mr-2" />
          {showTransactionHistory ? 'Hide History' : 'View Transaction History'}
        </button>
      </div>

      {showTransactionHistory ? (
        <TransactionHistory 
          transactions={transactionHistory}
          onRefresh={() => {
            fetchTransactionHistory();
            toast.success('Transaction history refreshed');
          }}
        />
      ) : (
        <>
          {/* Pending Verifications Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2 text-yellow-500" />
                Pending Payment Verifications
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  {appointments.all.filter(a => a.paymentStatus === 'paid' && a.status === 'approved').length}
                </span>
              </h3>
            </div>
            <div className="p-6">
              {appointments.all.filter(a => a.paymentStatus === 'paid' && a.status === 'approved').length === 0 ? (
                <div className="text-center py-8">
                  <FontAwesomeIcon icon={faCheckCircle} className="h-12 w-12 text-green-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No pending payment verifications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.all
                    .filter(a => a.paymentStatus === 'paid' && a.status === 'approved')
                    .map((apt) => (
                      <div key={apt.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900 dark:text-white">Dr. {apt.doctorName}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{apt.date} at {apt.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Patient: {apt.patientName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Challan: APT-{apt.id.slice(-8)}</p>
                            <p className="text-sm font-semibold text-green-600 mt-1">
                              Amount: {formatCurrency(apt.paymentAmount || apt.consultationFee || 1000)}
                            </p>
                            {apt.paymentMethod && (
                              <p className="text-xs text-gray-500 mt-1">Method: {apt.paymentMethod.toUpperCase()}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewPaymentProof(apt)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center"
                            >
                              <FontAwesomeIcon icon={faEye} className="mr-1" />
                              View Proof
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Payments</h3>
            </div>
            <div className="p-6">
              {transactionHistory.slice(0, 10).length === 0 ? (
                <div className="text-center py-8">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No payment records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Challan No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {transactionHistory.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {tx.transactionDate ? formatDate(tx.transactionDate) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                            {tx.challanNo}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {tx.patientName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            Dr. {tx.doctorName}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                            {formatCurrency(tx.paymentAmount || tx.consultationFee || 1000)}
                          </td>
                          <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">
                            {tx.paymentMethod || 'cash'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              tx.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                              tx.paymentStatus === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {tx.status || tx.paymentStatus || 'pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleViewPaymentProof(tx)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View Details"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactionHistory.length > 10 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setShowTransactionHistory(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View all {transactionHistory.length} transactions →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Attendance Management</h2>
      </div>

      <AttendanceModule />
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
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    {/* Modal Container - Fixed height and proper overflow */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      {/* Sticky Header */}
      <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-lg z-10">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Walk-in Patient Registration</h3>
        <button
          onClick={() => {
            setShowWalkInModal(false);
            resetWalkInForm();
          }}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleWalkInRegistration} className="space-y-8">
          {/* Progress Steps - Sticky within scrollable area */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 pt-0 pb-4 z-5">
            <div className="flex items-center justify-center space-x-4">
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
          </div>

          {/* Step 1: Personal Information */}
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
              
              <div className="flex justify-end pt-4">
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

          {/* Step 2: Medical Information */}
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
                    placeholder="Describe symptoms or reason for visit..."
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
                    placeholder="Insurance company name"
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
                    placeholder="Insurance policy number"
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
                    placeholder="Referring doctor or source"
                  />
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
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

          {/* Step 3: Appointment Details */}
          {formStep === 3 && (
            <div className="space-y-6 pb-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Appointment Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Doctor <span className="text-red-500">*</span>
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
                    Appointment Date <span className="text-red-500">*</span>
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
                    Appointment Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walkInData.appointmentTime}
                    onChange={(e) => setWalkInData({ ...walkInData, appointmentTime: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formErrors.appointmentTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!walkInData.doctorId}
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
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Appointment Information</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Regular appointments will be scheduled with the selected doctor at the chosen time.
                      The patient will receive confirmation via email if provided.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
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

  const renderPaymentVerificationModal = () => {
    if (!showPaymentVerificationModal || !selectedAppointmentForPayment) return null;

    return (
      <PaymentVerificationModal
        appointment={selectedAppointmentForPayment}
        receptionistId={currentUser?.uid}
        onClose={() => {
          setShowPaymentVerificationModal(false);
          setSelectedAppointmentForPayment(null);
        }}
        onVerified={() => {
          fetchAppointments();
          fetchTransactionHistory();
          toast.success('Payment verified and appointment confirmed');
        }}
        onRejected={() => {
          fetchAppointments();
          fetchTransactionHistory();
          toast.info('Payment rejected. Patient notified.');
        }}
      />
    );
  };

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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
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
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <div>
                          <p className="font-medium">Date: {formatDate(visit.admissionDate)}</p>
                          <p className="text-sm">Doctor: Dr. {visit.doctorName}</p>
                          <p className="text-sm">Department: {visit.department}</p>
                          <p className="text-sm mt-1">Diagnosis: {visit.diagnosis || 'Pending'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs w-fit ${
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
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <div>
                          <p className="font-medium">Invoice #{invoice.id.slice(-6)}</p>
                          <p className="text-sm">Date: {formatDate(invoice.createdAt)}</p>
                          <p className="text-sm">Amount: {formatCurrency(invoice.total)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs w-fit ${
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
                <span className="text-white">{currentTime.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">System Time:</span>
                <span className="text-white font-mono">{currentTime.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Appointments:</span>
                <span className="text-white">{dashboardStats.todayAppointments}</span>
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">MediCare Plus</h1>
            <p className="text-xs text-purple-300">Reception Portal</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono">{currentTime.toLocaleTimeString()}</p>
          </div>
        </div>
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
            {activeTab === 'registration' && renderRegistration()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support Messages & Complaints</h2>
                </div>
                
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

                <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
                  <div className="flex">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-purple-600 dark:text-purple-400 mr-3 mt-1" />
                    <div>
                      <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                        Support Messages Management
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        As a receptionist, you can view and respond to support messages from patients and visitors.
                      </p>
                    </div>
                  </div>
                </div>

                <SupportMessages />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showWalkInModal && renderWalkInModal()}
      {showPaymentModal && renderPaymentModal()}
      {showPatientHistoryModal && renderPatientHistoryModal()}
      {showRescheduleModal && renderRescheduleModal()}
      {showAppointmentBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {bookingPatientId ? 'Book Appointment' : 'Select Patient First'}
              </h3>
              <button
                onClick={() => {
                  setShowAppointmentBooking(false);
                  setBookingPatientId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>

            {!bookingPatientId ? (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Please select a patient to book an appointment for:
                </p>
                
                <div className="mb-4">
                  <SearchBar
                    onSearch={handleSearchPatient}
                    placeholder="Search patient by name, phone, or CNIC..."
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => {
                          setBookingPatientId(patient.id);
                          setSelectedPatient(patient);
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{patient.fullName}</p>
                            <p className="text-sm text-gray-500">{patient.phone}</p>
                            {patient.cnic && <p className="text-xs text-gray-400">CNIC: {patient.cnic}</p>}
                          </div>
                          <button className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm">
                            Select
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Search for a patient to book appointment</p>
                    <button
                      onClick={() => {
                        setShowAppointmentBooking(false);
                        resetWalkInForm();
                        setShowWalkInModal(true);
                      }}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Register New Patient
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <AppointmentBooking
                patientId={bookingPatientId}
                onSuccess={() => {
                  setShowAppointmentBooking(false);
                  setBookingPatientId(null);
                  setSelectedPatient(null);
                  fetchAppointments();
                  toast.success('Appointment booked successfully');
                }}
                onCancel={() => {
                  setShowAppointmentBooking(false);
                  setBookingPatientId(null);
                  setSelectedPatient(null);
                }}
              />
            )}
          </div>
        </div>
      )}
      {showPaymentVerificationModal && renderPaymentVerificationModal()}
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