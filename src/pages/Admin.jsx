import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth'; // Fixed import path
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faUserMd,
  faUserInjured,
  faUserTie,
  faFlask,
  faBuilding,
  faChartLine,
  faCalendarAlt,
  faUserPlus,
  faUserClock,
  faExclamationTriangle,
  faBed,
  faEdit,
  faMoneyCheck,
  faSpinner,
  faEnvelope,
  faInfoCircle,
  faPlus,
  faSignOutAlt,
  faHistory,
  faDollarSign,
  faChartBar,
  faCheckCircle,
  faTimesCircle,
  faEye,
  faFileExport,
  faUserCircle,
  faCamera,
  faTrash,
  faSearch,
  faSync,
  faUserCog,
  faTimes,
  faUser,
  faArrowUp,
  faArrowDown,
  faBalanceScale,
  faFileMedical,
  faCalculator,
  faKey,
} from '@fortawesome/free-solid-svg-icons';
import { logoutUser } from '../auth';
import {
  // User Management
  getUsersByRole,
  getUserById,
  createStaff,
  updateUserStatus,
  // Patient Management
  getAllPatients,
  
  // Department Management
  createDepartment,
  getDepartments,
  
  // Bed Management
  getBedsByStatus,
  
  // Analytics & Reports
  getRevenueAnalytics,
  getFinancialSummary,
  
  // Audit Logs
  getAuditLogsWithUserDetails,
  getAuditLogs,
  
  // Alerts & Notifications
  getPendingAlerts,
  
  // Operations
  getOperations,
  
  // Backup & Export
  exportCollection,
  
  // Pricing Controls
  updatePricing,
  getPricingConfig,
  getHospitalHistory,
  exportFinancialReport,
  exportDepartmentReport,
  exportOperationalReport,
  getPendingDeactivationRequests
} from '../database';
import { formatDate, formatCurrency, validateEmail, validatePhone } from '../utils/helpers';
import { resetStaffPassword } from '../auth'; // Import password reset function from auth.js
import toast from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import BedGrid from '../components/BedGrid';
import UserHistoryModal from '../components/UserHistoryModal';
import DepartmentDetailsModal from '../components/DepartmentDetailsModal';
import PricingControlsModal from '../components/PricingControlsModal';
import HospitalHistoryModal from '../components/HospitalHistoryModal';
import SupportMessages from '../components/SupportMessages';
import SalaryPaymentModule from '../components/SalaryPaymentModule';
import SalaryCalculationModule from '../components/SalaryCalculationModule';
import AttendanceModule from '../components/AttendanceModule';
import DeactivationRequests from '../components/DeactivationRequests';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

const Admin = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [patientFilters, setPatientFilters] = useState({
    status: '',
    search: ''
  });

  // Modal states
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState('');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showHospitalHistoryModal, setShowHospitalHistoryModal] = useState(false);
  const [hospitalHistory, setHospitalHistory] = useState(null);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [salaryTab, setSalaryTab] = useState('pending');
  const [profileImage, setProfileImage] = useState(null);
const [imagePreview, setImagePreview] = useState(null);
const [imageError, setImageError] = useState('');
const [pendingDeactivationCount, setPendingDeactivationCount] = useState(0);
  // Filter states for audit logs
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    user: '',
    startDate: null,
    endDate: null
  });

  // Data states
  const [staff, setStaff] = useState({
    doctors: [],
    receptionists: [],
    labStaff: [],
    accountants: [],
    allStaff: []
  });
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [beds, setBeds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [pricingConfig, setPricingConfig] = useState(null);
  
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    totalStaff: 0,
    activeStaff: 0,
    lastYearRevenue: 0,
    lastYearExpenses: 0,
    lastYearProfit: 0,
    revenueGrowth: 0
  });

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'doctor',
    department: '',
    specialization: '',
    licenseNumber: '',
    baseSalary: '',
    consultationFee: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Department form
  const [deptForm, setDeptForm] = useState({
    name: '',
    headDoctor: '',
    services: [''],
    pricing: {},
    description: ''
  });

  // State for password reset
  const [resettingPassword, setResettingPassword] = useState(null);

  // ==================== DATA FETCHING FUNCTIONS ====================

  const fetchPendingDeactivationCount = useCallback(async () => {
  try {
    const result = await getPendingDeactivationRequests();
    if (result.success) {
      setPendingDeactivationCount(result.data.length);
    }
  } catch (error) {
    console.error('Error fetching deactivation count:', error);
  }
}, []);

  const fetchHospitalHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      const historyResult = await getHospitalHistory();
      
      if (historyResult.success) {
        setHospitalHistory(historyResult.data);
        
        if (historyResult.data.yearlyStats) {
          setYearlyStats(historyResult.data.yearlyStats);
        }
      } else {
        console.error('Failed to fetch hospital history:', historyResult.error);
      }
    } catch (error) {
      console.error('Error fetching hospital history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const result = await getRevenueAnalytics(dateRange.start, dateRange.end);
      let currentTotal = 0;
      
      if (result.success) {
        setAnalytics(result.data);
        currentTotal = result.data.total || 0;
        setStats(prev => ({ ...prev, totalRevenue: currentTotal }));
      }

      const lastYearStart = new Date(dateRange.start);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(dateRange.end);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
      
      const lastYearResult = await getRevenueAnalytics(lastYearStart, lastYearEnd);
      if (lastYearResult.success) {
        const lastYearTotal = lastYearResult.data.total || 0;
        const growth = lastYearTotal > 0 ? ((currentTotal - lastYearTotal) / lastYearTotal) * 100 : 0;
        setStats(prev => ({ 
          ...prev, 
          lastYearRevenue: lastYearTotal,
          revenueGrowth: growth 
        }));
      }

      try {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  
  const endDate = new Date();
  
  const financialResult = await getFinancialSummary(startDate, endDate);
  if (financialResult.success) {
    setStats(prev => ({
      ...prev,
      lastYearExpenses: financialResult.data.totalExpenses || 0,
      lastYearProfit: financialResult.data.profit || 0
    }));
  }
} catch (error) {
  console.error('Error in financial summary:', error);
}
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [dateRange]);

  const fetchStaff = useCallback(async () => {
    try {
      const [doctors, receptionists, lab, accountants] = await Promise.all([
        getUsersByRole('doctor'),
        getUsersByRole('receptionist'),
        getUsersByRole('lab'),
        getUsersByRole('accountant')
      ]);

      const allStaff = [
        ...(doctors.success ? doctors.data : []),
        ...(receptionists.success ? receptionists.data : []),
        ...(lab.success ? lab.data : []),
        ...(accountants.success ? accountants.data : [])
      ];

      const activeStaff = allStaff.filter(s => s.accountStatus === 'active').length;

      setStaff({
        doctors: doctors.success ? doctors.data : [],
        receptionists: receptionists.success ? receptionists.data : [],
        labStaff: lab.success ? lab.data : [],
        accountants: accountants.success ? accountants.data : [],
        allStaff
      });

      setStats(prev => ({
        ...prev,
        totalStaff: allStaff.length,
        activeStaff
      }));
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff data');
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const result = await getAllPatients(patientFilters);
      if (result.success) {
        setPatients(result.data);
        setStats(prev => ({ ...prev, totalPatients: result.data.length }));
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, [patientFilters]);

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await getDepartments();
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  const fetchBeds = useCallback(async () => {
    try {
      const result = await getBedsByStatus();
      if (result.success) {
        setBeds(result.data);
      }
    } catch (error) {
      console.error('Error fetching beds:', error);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const result = await getAuditLogsWithUserDetails({}, 100);
      
      if (result.success) {
        const enhancedLogs = result.data.map(log => ({
          ...log,
          userName: log.userName || log.userEmail || log.userId || 'System',
          userEmail: log.userEmail || ''
        }));
        setAuditLogs(enhancedLogs);
      } else {
        const fallbackResult = await getAuditLogs({}, 100);
        if (fallbackResult.success) {
          const enhancedLogs = await Promise.all(
            fallbackResult.data.map(async (log) => {
              if (log.userId) {
                try {
                  const userResult = await getUserById(log.userId);
                  if (userResult.success) {
                    return {
                      ...log,
                      userName: userResult.data.fullName || userResult.data.email || log.userId,
                      userEmail: userResult.data.email || ''
                    };
                  }
                } catch (e) {
                  console.error('Error fetching user for audit log:', e);
                }
              }
              return {
                ...log,
                userName: log.userName || log.userEmail || log.userId || 'System',
                userEmail: log.userEmail || ''
              };
            })
          );
          setAuditLogs(enhancedLogs);
        } else {
          setAuditLogs([]);
        }
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
      setAuditLogs([]);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const result = await getPendingAlerts();
      if (result.success) {
        setAlerts(result.data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  const fetchOperations = useCallback(async () => {
    try {
      const result = await getOperations({ status: 'scheduled' });
      if (result.success) {
        setOperations(result.data);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
    }
  }, []);

  const fetchPricingConfig = useCallback(async () => {
    try {
      const result = await getPricingConfig();
      if (result.success) {
        setPricingConfig(result.data);
      }
    } catch (error) {
      console.error('Error fetching pricing config:', error);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'dashboard') {
        await Promise.all([
          fetchAnalytics(),
          fetchAlerts(),
          fetchBeds(),
          fetchOperations(),
          fetchStaff(),
          fetchPatients(),
          fetchPendingDeactivationCount()
        ]);
      } else if (activeTab === 'staff') {
        await Promise.all([
          fetchStaff(),
          fetchDepartments()
        ]);
      } else if (activeTab === 'departments') {
        await Promise.all([
          fetchDepartments(),
          fetchStaff(),
          fetchPricingConfig()
        ]);
      } else if (activeTab === 'beds') {
        await fetchBeds();
      } else if (activeTab === 'audit') {
        await fetchAuditLogs();
      } else if (activeTab === 'patients') {
        await fetchPatients();
      } else if (activeTab === 'pricing') {
        await Promise.all([
          fetchPricingConfig(),
          fetchDepartments()
        ]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchAnalytics, fetchAlerts, fetchBeds, fetchOperations, fetchStaff, fetchDepartments, fetchAuditLogs, fetchPatients, fetchPricingConfig, fetchPendingDeactivationCount]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchHospitalHistory();
  }, [fetchHospitalHistory]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ==================== VALIDATION FUNCTIONS ====================

  const validateStaffForm = () => {
    const errors = {};

    if (!formData.fullName?.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.length < 3) {
      errors.fullName = 'Name must be at least 3 characters';
    }

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.phone) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (formData.role === 'doctor') {
      if (!formData.specialization?.trim()) {
        errors.specialization = 'Specialization is required for doctors';
      }
      if (!formData.licenseNumber?.trim()) {
        errors.licenseNumber = 'License number is required for doctors';
      }
      if (!formData.consultationFee) {
        errors.consultationFee = 'Consultation fee is required';
      } else if (formData.consultationFee < 0) {
        errors.consultationFee = 'Consultation fee must be positive';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== HANDLER FUNCTIONS ====================

  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    setImageError('Please upload an image file (JPEG, PNG, GIF, WEBP)');
    return;
  }

  // Validate file size (2MB max for profile images)
  if (file.size > 2 * 1024 * 1024) {
    setImageError('Image size should be less than 2MB');
    return;
  }

  setImageError('');

  // Convert to base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    setImagePreview(reader.result);
    setProfileImage(reader.result);
  };
  reader.onerror = (error) => {
    console.error('Error converting image:', error);
    setImageError('Failed to process image');
  };
};

const handleRemoveImage = () => {
  setImagePreview(null);
  setProfileImage(null);
  setImageError('');
  // Reset file input
  const fileInput = document.getElementById('profile-image-input');
  if (fileInput) fileInput.value = '';
};

const handleCreateStaff = async (e) => {
  e.preventDefault();
  
  if (!validateStaffForm()) {
    toast.error('Please fix the errors in the form');
    return;
  }

  setLoading(true);
  
  try {
    // Add profile image to form data
    const staffDataWithImage = {
      ...formData,
      profileImage: profileImage // This will be null if no image uploaded
    };

    // Use the createStaff function from database.js
    const result = await createStaff(staffDataWithImage, currentUser.uid);
    
    if (result.success) {
      toast.success(
        <div>
          <p className="font-medium">{result.message || 'Staff created successfully'}</p>
          <p className="text-sm mt-1">Verification and password reset emails have been sent.</p>
        </div>,
        { duration: 6000 }
      );
      setShowModal(false);
      resetForm();
      setImagePreview(null);
      setProfileImage(null);
      fetchStaff();
    } else {
      toast.error(result.error || 'Failed to create staff');
    }
  } catch (error) {
    console.error('Error creating staff:', error);
    toast.error('Failed to create staff');
  } finally {
    setLoading(false);
  }
};

  const handleResetPassword = async (email, userName) => {
    if (!window.confirm(`Send password reset email to ${userName} (${email})?`)) return;
    
    setResettingPassword(email);
    
    try {
      const result = await resetStaffPassword(email);
      
      if (result.success) {
        toast.success(`Password reset email sent to ${email}`);
      } else {
        toast.error(result.error || 'Failed to send password reset email');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to send password reset email');
    } finally {
      setResettingPassword(null);
    }
  };

  const handleUpdateStaffStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'active' ? 'enable' : 'disable';
    
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      const result = await updateUserStatus(userId, newStatus, currentUser.uid);
      
      if (result.success) {
        toast.success(`User ${action}d successfully`);
        fetchStaff();
        fetchPatients();
      } else {
        toast.error(result.error || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleViewStaffDetails = (userId, userName, userRole) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSelectedUserRole(userRole);
    setShowHistoryModal(true);
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    
    if (!deptForm.name) {
      toast.error('Department name is required');
      return;
    }

    setLoading(true);
    
    try {
      const result = await createDepartment(deptForm, currentUser.uid);
      
      if (result.success) {
        toast.success('Department created successfully');
        setShowModal(false);
        setDeptForm({
          name: '',
          headDoctor: '',
          services: [''],
          pricing: {},
          description: ''
        });
        fetchDepartments();
      } else {
        toast.error(result.error || 'Failed to create department');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = async (pricingData) => {
    setLoading(true);
    try {
      const result = await updatePricing(pricingData, currentUser.uid);
      
      if (result.success) {
        toast.success('Pricing updated successfully');
        fetchPricingConfig();
      } else {
        toast.error(result.error || 'Failed to update pricing');
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast.error('Failed to update pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (type) => {
    try {
      let result;
      let filename;
      
      switch (type) {
        case 'financial':
          result = await exportFinancialReport(dateRange.start, dateRange.end);
          filename = `financial-report-${new Date().toISOString().split('T')[0]}`;
          break;
          
        case 'departmental':
          if (selectedDepartment && selectedDepartment !== 'all') {
            result = await exportDepartmentReport(selectedDepartment, dateRange.start, dateRange.end);
            const deptName = departments.find(d => d.id === selectedDepartment)?.name || selectedDepartment;
            filename = `${deptName}-report-${new Date().toISOString().split('T')[0]}`;
          } else {
            toast.error('Please select a specific department to export');
            return;
          }
          break;
          
        case 'operational':
          result = await exportOperationalReport(dateRange.start, dateRange.end);
          filename = `operational-report-${new Date().toISOString().split('T')[0]}`;
          break;
          
        case 'auditLogs':
          result = await exportCollection('auditLogs');
          filename = `audit-logs-${new Date().toISOString().split('T')[0]}`;
          break;
          
        default:
          result = await exportCollection('all');
          filename = `full-export-${new Date().toISOString().split('T')[0]}`;
      }
      
      if (result.success) {
        let dataToExport;
        if (result.data && typeof result.data === 'string' && result.data.includes('base64')) {
          const jsonString = atob(result.data);
          dataToExport = JSON.parse(jsonString);
        } else {
          dataToExport = result.data;
        }
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(`${type} report exported successfully`);
      } else {
        toast.error(result.error || `Failed to export ${type} report`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

const resetForm = () => {
  setFormData({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'doctor',
    department: '',
    specialization: '',
    licenseNumber: '',
    baseSalary: '',
    consultationFee: ''
  });
  setFormErrors({});
  setImagePreview(null);
  setProfileImage(null);
  setImageError('');
};

  const handleOpenHospitalHistory = () => {
    setShowHospitalHistoryModal(true);
    fetchHospitalHistory();
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

  const getFilteredStaff = () => {
    let filtered = staff.allStaff;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.fullName?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.phone?.includes(term) ||
        (s.department && getDepartmentName(s.department).toLowerCase().includes(term))
      );
    }
    
    if (selectedDepartment && selectedDepartment !== 'all') {
      filtered = filtered.filter(s => s.department === selectedDepartment);
    }
    
    return filtered;
  };

  const getDepartmentName = (deptId) => {
    if (!deptId) return 'N/A';
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : deptId;
  };

  // ==================== FILTERED AUDIT LOGS ====================

  const filteredAuditLogs = useMemo(() => {
    let filtered = auditLogs;

    if (auditFilters.action) {
      filtered = filtered.filter(log => log.action === auditFilters.action);
    }

    if (auditFilters.user) {
      filtered = filtered.filter(log => 
        log.userName?.toLowerCase().includes(auditFilters.user.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(auditFilters.user.toLowerCase())
      );
    }

    if (auditFilters.startDate) {
      filtered = filtered.filter(log => 
        log.timestamp && new Date(log.timestamp) >= auditFilters.startDate
      );
    }

    if (auditFilters.endDate) {
      filtered = filtered.filter(log => 
        log.timestamp && new Date(log.timestamp) <= auditFilters.endDate
      );
    }

    return filtered;
  }, [auditLogs, auditFilters]);

  const actionTypes = [
    'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED', 'USER_CREATED', 'USER_UPDATED', 'USER_DISABLED',
    'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_CANCELLED',
    'VISIT_CREATED', 'VISIT_DISCHARGED', 'PAYMENT_PROCESSED', 'PAYMENT_CONFIRMED',
    'BED_ASSIGNED', 'BED_RELEASED', 'INVENTORY_UPDATED', 'DEPARTMENT_UPDATED',
    'STAFF_CREATED', 'SALARY_PROCESSED', 'RECORD_UNLOCKED',
    'PRICING_UPDATED', 'PASSWORD_RESET_REQUESTED'
  ];

  // ==================== RENDER FUNCTIONS ====================

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: faChartLine },
    { id: 'staff', label: 'Staff Management', icon: faUsers },
    { id: 'patients', label: 'Patients', icon: faUserInjured },
    { id: 'support', label: 'Support Messages', icon: faEnvelope },
    { id: 'departments', label: 'Departments', icon: faBuilding },
    { id: 'pricing', label: 'Pricing Controls', icon: faDollarSign },
    { id: 'salary', label: 'Salary Management', icon: faMoneyCheck },
    { id: 'beds', label: 'Bed Management', icon: faBed },
    { id: 'audit', label: 'Audit Logs', icon: faFileMedical },
    { id: 'analytics', label: 'Analytics', icon: faChartBar },
    { id: 'deactivation', label: 'Deactivation Requests', icon: faUserClock },
  ];

  const renderPatients = () => {
    const filteredPatients = patients.filter(p => {
      if (patientFilters.search) {
        const term = patientFilters.search.toLowerCase();
        return p.fullName?.toLowerCase().includes(term) ||
               p.email?.toLowerCase().includes(term) ||
               p.phone?.includes(term) ||
               p.cnic?.includes(term);
      }
      if (patientFilters.status) {
        return p.accountStatus === patientFilters.status;
      }
      return true;
    });

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Management</h2>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, email, phone or CNIC..."
                  value={patientFilters.search}
                  onChange={(e) => setPatientFilters({ ...patientFilters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={patientFilters.status}
                onChange={(e) => setPatientFilters({ ...patientFilters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Patients</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{patients.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-green-600">{patients.filter(p => p.accountStatus === 'active').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Disabled</p>
            <p className="text-2xl font-bold text-yellow-600">{patients.filter(p => p.accountStatus === 'disabled').length}</p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Blood Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Registered</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No patients found
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{patient.fullName}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{patient.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{patient.phone}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{patient.cnic || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {patient.bloodGroup || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(patient.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${
                            patient.accountStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            <FontAwesomeIcon 
                              icon={patient.accountStatus === 'active' ? faCheckCircle : faTimesCircle} 
                              className="mr-1" size="xs" 
                            />
                            {patient.accountStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewStaffDetails(patient.id, patient.fullName, 'Patient')}
                            className="text-blue-600 hover:text-blue-700 mr-2"
                            title="View History"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            onClick={() => handleUpdateStaffStatus(patient.id, patient.accountStatus)}
                            className={`mr-2 ${
                              patient.accountStatus === 'active' 
                                ? 'text-yellow-600 hover:text-yellow-700' 
                                : 'text-green-600 hover:text-green-700'
                            }`}
                            title={patient.accountStatus === 'active' ? 'Disable' : 'Enable'}
                          >
                            <FontAwesomeIcon icon={patient.accountStatus === 'active' ? faTimesCircle : faCheckCircle} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Alert Banner - Responsive */}
      {alerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-600 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-200 font-medium">
                {alerts.length} Alert{alerts.length > 1 ? 's' : ''} Require Attention
              </p>
              <ul className="text-red-600 dark:text-red-300 text-sm list-disc list-inside">
                {alerts.slice(0, 3).map((alert, index) => (
                  <li key={index}>{alert.message}</li>
                ))}
                {alerts.length > 3 && (
                  <li className="text-red-500">+{alerts.length - 3} more alerts</li>
                )}
              </ul>
            </div>
            <button
              onClick={fetchAlerts}
              className="text-red-600 dark:text-red-400 hover:text-red-800"
            >
              <FontAwesomeIcon icon={faSync} />
            </button>
          </div>
        </div>
      )}

      {/* Date Range Picker - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Date Range:</label>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            <DatePicker
              selectsRange={true}
              startDate={dateRange.start}
              endDate={dateRange.end}
              onChange={(update) => {
                setDateRange({
                  start: update[0],
                  end: update[1]
                });
              }}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={fetchAnalytics}
              className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(analytics?.total || 0)}
              </p>
              <p className={`text-xs mt-1 flex items-center ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <FontAwesomeIcon icon={stats.revenueGrowth >= 0 ? faArrowUp : faArrowDown} className="mr-1" />
                {Math.abs(stats.revenueGrowth).toFixed(1)}% vs last year
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FontAwesomeIcon icon={faDollarSign} className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Patients</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.totalPatients}
              </p>
              <p className="text-xs text-blue-600 mt-1">Registered patients</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FontAwesomeIcon icon={faUserInjured} className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Staff</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.activeStaff}/{stats.totalStaff}
              </p>
              <p className="text-xs text-purple-600 mt-1">Active staff</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <FontAwesomeIcon icon={faUserCog} className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit/Loss</p>
              <p className={`text-xl sm:text-2xl font-semibold ${stats.lastYearProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(stats.lastYearProfit))}
              </p>
              <p className="text-xs text-gray-500 mt-1">Current year</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
              <FontAwesomeIcon icon={faBalanceScale} className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

{/* Add after existing stats cards */}
{pendingDeactivationCount > 0 && (
  <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-600 p-4">
    <div className="flex items-center">
      <FontAwesomeIcon icon={faUserClock} className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
      <div>
        <p className="text-yellow-800 dark:text-yellow-200 font-medium">
          {pendingDeactivationCount} Account Deactivation Request{pendingDeactivationCount > 1 ? 's' : ''} Pending
        </p>
        <button
          onClick={() => setActiveTab('deactivation')}
          className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline mt-1"
        >
          Review Now →
        </button>
      </div>
    </div>
  </div>
)}

      {/* Charts - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Department</h3>
          {analytics?.byDepartment && Object.keys(analytics.byDepartment).length > 0 ? (
            <div className="h-64 sm:h-80">
              <Pie
                data={{
                  labels: Object.keys(analytics.byDepartment).map(id => 
                    departments.find(d => d.id === id)?.name || id
                  ),
                  datasets: [{
                    data: Object.values(analytics.byDepartment),
                    backgroundColor: [
                      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
                        boxWidth: 12,
                        font: { size: 11 }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No revenue data available</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Revenue Trend</h3>
          {analytics?.byDay && Object.keys(analytics.byDay).length > 0 ? (
            <div className="h-64 sm:h-80">
              <Line
                data={{
                  labels: Object.keys(analytics.byDay),
                  datasets: [{
                    label: 'Revenue',
                    data: Object.values(analytics.byDay),
                    borderColor: '#36A2EB',
                    tension: 0.1,
                    fill: false
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (value) => formatCurrency(value) }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No daily revenue data available</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => {
            resetForm();
            setModalType('staff');
            setShowModal(true);
          }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition flex items-center justify-center space-x-2"
        >
          <FontAwesomeIcon icon={faUserPlus} className="text-blue-600" />
          <span>Add Staff</span>
        </button>
        
        <button
          onClick={() => setShowPricingModal(true)}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition flex items-center justify-center space-x-2"
        >
          <FontAwesomeIcon icon={faDollarSign} className="text-green-600" />
          <span>Update Pricing</span>
        </button>
        
        <button
          onClick={handleOpenHospitalHistory}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow p-4 hover:shadow-lg transition flex items-center justify-center space-x-2"
        >
          <FontAwesomeIcon icon={faHistory} className="text-white" />
          <span>View Hospital History</span>
        </button>
        
        <button
          onClick={() => handleExportData('all')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition flex items-center justify-center space-x-2"
        >
          <FontAwesomeIcon icon={faFileExport} className="text-indigo-600" />
          <span>Export Data</span>
        </button>
      </div>

      {/* Recent Operations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Operations</h3>
        </div>
        <div className="p-4 sm:p-6">
          {operations.length > 0 ? (
            <div className="space-y-4">
              {operations.slice(0, 5).map((op) => (
                <div key={op.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{op.patientName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {op.operationType} • {formatDate(op.scheduledDate)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs w-fit ${
                    op.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {op.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">No upcoming operations</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStaffManagement = () => {
    const filteredStaff = getFilteredStaff();

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setModalType('staff');
                setShowModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Staff
            </button>
          </div>
        </div>

        {/* Filters - Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Staff Summary - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{staff.allStaff.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Doctors</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{staff.doctors.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Receptionists</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{staff.receptionists.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Lab Staff</p>
            <p className="text-xl sm:text-2xl font-bold text-teal-600">{staff.labStaff.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Accountants</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{staff.accountants.length}</p>
          </div>
        </div>

        {/* Staff Tables - Responsive */}
        {filteredStaff.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
            <FontAwesomeIcon icon={faUsers} className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Staff Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedDepartment !== 'all' ? 'Try adjusting your filters' : 'Click "Add Staff" to create your first staff member'}
            </p>
          </div>
        ) : (
          <>
            {/* Doctors Section */}
            {staff.doctors.filter(d => filteredStaff.includes(d)).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FontAwesomeIcon icon={faUserMd} className="mr-2 text-blue-600" />
                    Doctors ({staff.doctors.filter(d => filteredStaff.includes(d)).length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Specialization</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fee</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {staff.doctors
                          .filter(d => filteredStaff.includes(d))
                          .map((doctor) => (
                          <tr key={doctor.id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">Dr. {doctor.fullName}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{doctor.email}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{doctor.specialization}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {getDepartmentName(doctor.department)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatCurrency(doctor.consultationFee)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${
                                doctor.accountStatus === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={doctor.accountStatus === 'active' ? faCheckCircle : faTimesCircle} 
                                  className="mr-1" size="xs" 
                                />
                                {doctor.accountStatus}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleViewStaffDetails(doctor.id, `Dr. ${doctor.fullName}`, 'Doctor')}
                                className="text-blue-600 hover:text-blue-700 mr-2"
                                title="View History"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(doctor.email, `Dr. ${doctor.fullName}`)}
                                className="text-purple-600 hover:text-purple-700 mr-2"
                                title="Reset Password"
                                disabled={resettingPassword === doctor.email}
                              >
                                {resettingPassword === doctor.email ? (
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faKey} />
                                )}
                              </button>
                              <button
                                onClick={() => handleUpdateStaffStatus(doctor.id, doctor.accountStatus)}
                                className={`mr-2 ${
                                  doctor.accountStatus === 'active' 
                                    ? 'text-yellow-600 hover:text-yellow-700' 
                                    : 'text-green-600 hover:text-green-700'
                                }`}
                                title={doctor.accountStatus === 'active' ? 'Disable' : 'Enable'}
                              >
                                <FontAwesomeIcon icon={doctor.accountStatus === 'active' ? faTimesCircle : faCheckCircle} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Receptionists Section */}
            {staff.receptionists.filter(r => filteredStaff.includes(r)).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FontAwesomeIcon icon={faUserTie} className="mr-2 text-purple-600" />
                    Receptionists ({staff.receptionists.filter(r => filteredStaff.includes(r)).length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {staff.receptionists
                          .filter(r => filteredStaff.includes(r))
                          .map((rec) => (
                          <tr key={rec.id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{rec.fullName}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{rec.email}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{rec.phone}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {getDepartmentName(rec.department)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${
                                rec.accountStatus === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={rec.accountStatus === 'active' ? faCheckCircle : faTimesCircle} 
                                  className="mr-1" size="xs" 
                                />
                                {rec.accountStatus}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleViewStaffDetails(rec.id, rec.fullName, 'Receptionist')}
                                className="text-blue-600 hover:text-blue-700 mr-2"
                                title="View History"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(rec.email, rec.fullName)}
                                className="text-purple-600 hover:text-purple-700 mr-2"
                                title="Reset Password"
                                disabled={resettingPassword === rec.email}
                              >
                                {resettingPassword === rec.email ? (
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faKey} />
                                )}
                              </button>
                              <button
                                onClick={() => handleUpdateStaffStatus(rec.id, rec.accountStatus)}
                                className={`mr-2 ${
                                  rec.accountStatus === 'active' 
                                    ? 'text-yellow-600 hover:text-yellow-700' 
                                    : 'text-green-600 hover:text-green-700'
                                }`}
                                title={rec.accountStatus === 'active' ? 'Disable' : 'Enable'}
                              >
                                <FontAwesomeIcon icon={rec.accountStatus === 'active' ? faTimesCircle : faCheckCircle} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Lab Staff Section */}
            {staff.labStaff.filter(l => filteredStaff.includes(l)).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FontAwesomeIcon icon={faFlask} className="mr-2 text-teal-600" />
                    Lab Staff ({staff.labStaff.filter(l => filteredStaff.includes(l)).length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {staff.labStaff
                          .filter(l => filteredStaff.includes(l))
                          .map((lab) => (
                          <tr key={lab.id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{lab.fullName}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{lab.email}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{lab.phone}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {getDepartmentName(lab.department)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${
                                lab.accountStatus === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={lab.accountStatus === 'active' ? faCheckCircle : faTimesCircle} 
                                  className="mr-1" size="xs" 
                                />
                                {lab.accountStatus}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleViewStaffDetails(lab.id, lab.fullName, 'Lab Staff')}
                                className="text-blue-600 hover:text-blue-700 mr-2"
                                title="View History"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(lab.email, lab.fullName)}
                                className="text-purple-600 hover:text-purple-700 mr-2"
                                title="Reset Password"
                                disabled={resettingPassword === lab.email}
                              >
                                {resettingPassword === lab.email ? (
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faKey} />
                                )}
                              </button>
                              <button
                                onClick={() => handleUpdateStaffStatus(lab.id, lab.accountStatus)}
                                className={`mr-2 ${
                                  lab.accountStatus === 'active' 
                                    ? 'text-yellow-600 hover:text-yellow-700' 
                                    : 'text-green-600 hover:text-green-700'
                                }`}
                                title={lab.accountStatus === 'active' ? 'Disable' : 'Enable'}
                              >
                                <FontAwesomeIcon icon={lab.accountStatus === 'active' ? faTimesCircle : faCheckCircle} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Accountants Section */}
            {staff.accountants.filter(a => filteredStaff.includes(a)).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FontAwesomeIcon icon={faCalculator} className="mr-2 text-orange-600" />
                    Accountants ({staff.accountants.filter(a => filteredStaff.includes(a)).length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {staff.accountants
                          .filter(a => filteredStaff.includes(a))
                          .map((acc) => (
                          <tr key={acc.id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{acc.fullName}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{acc.email}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{acc.phone}</td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {getDepartmentName(acc.department)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${
                                acc.accountStatus === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={acc.accountStatus === 'active' ? faCheckCircle : faTimesCircle} 
                                  className="mr-1" size="xs" 
                                />
                                {acc.accountStatus}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleViewStaffDetails(acc.id, acc.fullName, 'Accountant')}
                                className="text-blue-600 hover:text-blue-700 mr-2"
                                title="View History"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(acc.email, acc.fullName)}
                                className="text-purple-600 hover:text-purple-700 mr-2"
                                title="Reset Password"
                                disabled={resettingPassword === acc.email}
                              >
                                {resettingPassword === acc.email ? (
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faKey} />
                                )}
                              </button>
                              <button
                                onClick={() => handleUpdateStaffStatus(acc.id, acc.accountStatus)}
                                className={`mr-2 ${
                                  acc.accountStatus === 'active' 
                                    ? 'text-yellow-600 hover:text-yellow-700' 
                                    : 'text-green-600 hover:text-green-700'
                                }`}
                                title={acc.accountStatus === 'active' ? 'Disable' : 'Enable'}
                              >
                                <FontAwesomeIcon icon={acc.accountStatus === 'active' ? faTimesCircle : faCheckCircle} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderDepartments = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h2>
        <button
          onClick={() => {
            setModalType('department');
            setShowModal(true);
          }}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add Department
        </button>
      </div>

      {/* Departments Grid - Responsive */}
      {departments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
          <FontAwesomeIcon icon={faBuilding} className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Departments Found</h3>
          <p className="text-gray-600 dark:text-gray-400">Click "Add Department" to create your first department</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Head: {dept.headDoctorName || 'Not Assigned'}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{dept.description || 'No description'}</p>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Doctors:</span> {dept.doctorCount || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Revenue:</span> {formatCurrency(dept.revenue || 0)}
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Services</h4>
                {dept.services && dept.services.length > 0 ? (
                  <ul className="space-y-1">
                    {dept.services.slice(0, 3).map((service, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                        <span>{typeof service === 'string' ? service : service.name}</span>
                        <span>{service.price ? formatCurrency(service.price) : ''}</span>
                      </li>
                    ))}
                    {dept.services.length > 3 && (
                      <li className="text-sm text-gray-500">+{dept.services.length - 3} more</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No services listed</p>
                )}
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedDepartmentId(dept.id);
                    setShowDepartmentModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700"
                  title="View & Edit Details"
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
                <button
                  onClick={() => {
                    setSelectedDepartmentId(dept.id);
                    setShowDepartmentModal(true);
                  }}
                  className="text-green-600 hover:text-green-700"
                  title="Edit"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );


  const renderSalaryManagement = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Management</h2>
    </div>

    {/* Sub-tabs for salary management */}
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex space-x-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSalaryTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            salaryTab === 'pending'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Pending Payments
        </button>
        <button
          onClick={() => setSalaryTab('calculated')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            salaryTab === 'calculated'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Salary Calculation
        </button>
        <button
          onClick={() => setSalaryTab('attendance')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            salaryTab === 'attendance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Attendance Overview
        </button>
      </nav>
    </div>

    {/* Render appropriate module based on selected tab */}
    <div className="mt-6">
      {salaryTab === 'pending' && (
        <SalaryPaymentModule
          onPaymentProcessed={(record) => {
            toast.success(`Payment processed for ${record.userName}`);
            // Refresh data if needed
          }}
        />
      )}
      {salaryTab === 'calculated' && (
        <SalaryCalculationModule
          onCalculated={(records) => {
            toast.success(`Salaries calculated for ${records.length} staff members`);
          }}
        />
      )}
      {salaryTab === 'attendance' && (
        <AttendanceModule
          onAttendanceMarked={(record) => {
            toast.success(`Attendance marked for ${record.fullName}`);
          }}
        />
      )}
    </div>

    {/* Admin Quick Actions */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Salary Administration</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            // Navigate to accountant portal or show full salary report
            toast.info('View full salary report - Navigate to Accountant portal');
          }}
          className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition group"
        >
          <FontAwesomeIcon icon={faFileExport} className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Salary Report</p>
        </button>
        
        <button
          onClick={() => {
            // Show salary analytics
            toast.info('Salary analytics coming soon');
          }}
          className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 transition group"
        >
          <FontAwesomeIcon icon={faChartLine} className="h-8 w-8 text-gray-400 group-hover:text-green-500 mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Salary Analytics</p>
        </button>
        
        <button
          onClick={() => {
            // Override salary
            toast.info('Salary override - Admin only action');
          }}
          className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 transition group"
        >
          <FontAwesomeIcon icon={faEdit} className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Manual Override</p>
        </button>
      </div>
    </div>
  </div>
);
  const renderPricing = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing Controls</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Global Pricing Configuration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure consultation fees, lab test prices, operation charges, and other service costs.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-300">Consultation Fees</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {departments.reduce((acc, dept) => acc + (dept.consultationFee || 0), 0)} configured
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-300">Lab Tests</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {departments.reduce((acc, dept) => acc + (dept.labTests?.length || 0), 0)} configured
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
            <p className="text-sm text-purple-600 dark:text-purple-300">Operations</p>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              {departments.reduce((acc, dept) => acc + (dept.operations?.length || 0), 0)} configured
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPricingModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <FontAwesomeIcon icon={faEdit} className="mr-2" />
          Edit Pricing Configuration
        </button>
      </div>

      {/* Department-specific pricing preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.slice(0, 4).map((dept) => (
          <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{dept.name}</h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Consultation Fee</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatCurrency(dept.consultationFee || 0)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Common Services</p>
                <ul className="space-y-1">
                  {(dept.services || []).slice(0, 3).map((service, idx) => (
                    <li key={idx} className="text-sm text-gray-900 dark:text-white flex justify-between">
                      <span>{service.name}</span>
                      <span>{formatCurrency(service.price || 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => {
                  setSelectedDepartmentId(dept.id);
                  setShowDepartmentModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                View All Services →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <button
            onClick={() => handleExportData('auditLogs')}
            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faFileExport} className="mr-2" />
            Export
          </button>
          <button
            onClick={fetchAuditLogs}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faSync} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters - Responsive Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action
            </label>
            <select
              value={auditFilters.action}
              onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User
            </label>
            <input
              type="text"
              value={auditFilters.user}
              onChange={(e) => setAuditFilters(prev => ({ ...prev, user: e.target.value }))}
              placeholder="Name or email..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={auditFilters.startDate ? auditFilters.startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setAuditFilters(prev => ({ 
                ...prev, 
                startDate: e.target.value ? new Date(e.target.value) : null 
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={auditFilters.endDate ? auditFilters.endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setAuditFilters(prev => ({ 
                ...prev, 
                endDate: e.target.value ? new Date(e.target.value) : null 
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Logs Table - Responsive */}
      {filteredAuditLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
          <FontAwesomeIcon icon={faHistory} className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Audit Logs Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {auditFilters.action || auditFilters.user || auditFilters.startDate ? 'Try adjusting your filters' : 'Audit logs will appear here as actions are performed'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.userName || log.userEmail || 'System'}
                          </span>
                          {log.userEmail && log.userName !== log.userEmail && (
                            <span className="text-xs text-gray-500">
                              {log.userEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="max-h-20 overflow-y-auto">
                          {log.details ? (
                            <pre className="text-xs whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-gray-400">No details</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== RENDER ANALYTICS FUNCTION ====================

  const renderAnalytics = () => {
    const averageDailyRevenue = analytics?.byDay && Object.keys(analytics.byDay).length > 0
      ? Object.values(analytics.byDay).reduce((a, b) => a + b, 0) / Object.keys(analytics.byDay).length
      : 0;

    const bestDay = analytics?.byDay && Object.keys(analytics.byDay).length > 0
      ? Object.entries(analytics.byDay).reduce((best, current) => 
          current[1] > best[1] ? current : best
        )
      : ['N/A', 0];

    const departmentPerformance = analytics?.byDepartment && Object.keys(analytics.byDepartment).length > 0
      ? Object.entries(analytics.byDepartment)
          .map(([id, revenue]) => ({
            id,
            name: departments.find(d => d.id === id)?.name || id,
            revenue,
            percentage: (revenue / (analytics?.total || 1)) * 100
          }))
          .sort((a, b) => b.revenue - a.revenue)
      : [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlyRevenue = months.map((month, index) => {
      const monthData = analytics?.byMonth?.[`2024-${String(index + 1).padStart(2, '0')}`] || 0;
      return {
        month,
        revenue: monthData || Math.floor(averageDailyRevenue * 30 * (0.8 + Math.random() * 0.4))
      };
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExportData('analytics')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faFileExport} className="mr-2" />
              Export Report
            </button>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
            >
              <FontAwesomeIcon icon={faSync} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
              Analysis Period:
            </label>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <DatePicker
                selectsRange={true}
                startDate={dateRange.start}
                endDate={dateRange.end}
                onChange={(update) => {
                  setDateRange({
                    start: update[0],
                    end: update[1]
                  });
                }}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={fetchAnalytics}
                className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-blue-100 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(analytics?.total || 0)}</p>
            <div className="mt-4 flex items-center text-blue-100">
              <FontAwesomeIcon icon={faArrowUp} className="mr-1" />
              <span className="text-sm">{stats.revenueGrowth.toFixed(1)}% vs last year</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-green-100 text-sm">Average Daily Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(averageDailyRevenue)}</p>
            <p className="text-green-100 text-sm mt-4">
              Best Day: {bestDay[0]} ({formatCurrency(bestDay[1])})
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-purple-100 text-sm">Net Profit</p>
            <p className={`text-3xl font-bold ${stats.lastYearProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
              {formatCurrency(Math.abs(stats.lastYearProfit))}
            </p>
            <p className="text-purple-100 text-sm mt-4">
              Margin: {analytics?.total ? ((stats.lastYearProfit / analytics.total) * 100).toFixed(1) : 0}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-orange-100 text-sm">Active Patients</p>
            <p className="text-3xl font-bold">{stats.totalPatients}</p>
            <p className="text-orange-100 text-sm mt-4">
              Avg per day: {(stats.totalPatients / (Object.keys(analytics?.byDay || {}).length || 1)).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Revenue Trends Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trends</h3>
          <div className="h-80">
            <Line
              data={{
                labels: Object.keys(analytics?.byDay || {}),
                datasets: [
                  {
                    label: 'Daily Revenue',
                    data: Object.values(analytics?.byDay || {}),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => formatCurrency(context.parsed.y)
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value)
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: monthlyRevenue.map(m => m.month),
                  datasets: [
                    {
                      label: 'Revenue',
                      data: monthlyRevenue.map(m => m.revenue),
                      backgroundColor: 'rgba(34, 197, 94, 0.5)',
                      borderColor: 'rgb(34, 197, 94)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => formatCurrency(context.parsed.y)
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Performance</h3>
            <div className="space-y-4">
              {departmentPerformance.slice(0, 5).map((dept) => (
                <div key={dept.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{dept.name}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(dept.revenue)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${dept.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{dept.percentage.toFixed(1)}% of total</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Analytics Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% of Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics?.byDay && Object.entries(analytics.byDay)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .slice(0, 30)
                  .map(([date, revenue], index, array) => {
                    const percentage = (revenue / (analytics?.total || 1)) * 100;
                    const cumulative = array
                      .slice(0, index + 1)
                      .reduce((sum, [rev]) => sum + rev, 0);
                    
                    return (
                      <tr key={date}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                          {formatCurrency(revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                          {formatCurrency(cumulative)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Smart Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Smart Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Revenue Day</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {bestDay[0] !== 'N/A' ? bestDay[0] : 'N/A'}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {bestDay[0] !== 'N/A' ? formatCurrency(bestDay[1]) : 'No data'}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Top Performing Department</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {departmentPerformance[0]?.name || 'N/A'}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {departmentPerformance[0] ? `${departmentPerformance[0].percentage.toFixed(1)}% of total` : 'No data'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Transaction Value</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics?.total && Object.keys(analytics.byDay).length
                  ? formatCurrency(analytics.total / Object.keys(analytics.byDay).length)
                  : formatCurrency(0)}
              </p>
              <p className="text-sm text-purple-600 mt-1">Per day average</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</p>
              <p className={`text-xl font-bold ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueGrowth.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Year over year</p>
            </div>
          </div>
        </div>

        {/* Export and Report Generation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Reports</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleExportData('financial')}
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 transition group"
            >
              <FontAwesomeIcon icon={faDollarSign} className="h-8 w-8 text-gray-400 group-hover:text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Financial Report</p>
            </button>
            
            <button
              onClick={() => handleExportData('departmental')}
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition group"
            >
              <FontAwesomeIcon icon={faBuilding} className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Department Report</p>
            </button>
            
            <button
              onClick={() => handleExportData('operational')}
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 transition group"
            >
              <FontAwesomeIcon icon={faChartLine} className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Operational Report</p>
            </button>
            
            <button
              onClick={handleOpenHospitalHistory}
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition group"
            >
              <FontAwesomeIcon icon={faHistory} className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Full History</p>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Staff Creation Modal
  const renderStaffModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Staff</h3>
          <button
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        <form onSubmit={handleCreateStaff} className="space-y-4">
           {/* Profile Image Upload Section */}
  <div className="flex flex-col items-center mb-6">
    <div className="relative">
      {/* Image Preview */}
      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-gray-200 dark:border-gray-600">
        {imagePreview ? (
          <img 
            src={imagePreview} 
            alt="Profile Preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUserCircle} className="h-16 w-16 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Upload Button */}
      <label 
        htmlFor="profile-image-input"
        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow-lg"
      >
        <FontAwesomeIcon icon={faCamera} className="h-4 w-4" />
        <input
          id="profile-image-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>

      {/* Remove Image Button */}
      {imagePreview && (
        <button
          type="button"
          onClick={handleRemoveImage}
          className="absolute top-0 right-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition shadow-lg"
        >
          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
        </button>
      )}
    </div>

    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
      Upload profile picture (Optional)
    </p>
    <p className="text-xs text-gray-400 dark:text-gray-500">
      Max size: 2MB. Allowed: JPG, PNG, GIF, WEBP
    </p>

    {/* Image Error Message */}
    {imageError && (
      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center text-red-600 dark:text-red-400">
        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
        <span className="text-sm">{imageError}</span>
      </div>
    )}
  </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter full name"
              />
              {formErrors.fullName && (
                <p className="mt-1 text-xs text-red-600">{formErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="staff@medicareplus.com"
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Create temporary password"
              />
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Staff will be prompted to reset on first login</p>
            </div>

            {/* Phone */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="+92XXXXXXXXXX"
              />
              {formErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
              )}
            </div>

            {/* Role */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="lab">Lab Staff</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>

            {/* Department - Only for non-doctors */}
            {formData.role !== 'doctor' && (
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Department (Optional)</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Optional for universal roles</p>
              </div>
            )}

            {/* Doctor-specific fields */}
            {formData.role === 'doctor' && (
              <>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                      formErrors.specialization ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., Cardiologist"
                  />
                  {formErrors.specialization && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.specialization}</p>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                      formErrors.licenseNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="PMC-12345"
                  />
                  {formErrors.licenseNumber && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.licenseNumber}</p>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consultation Fee (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                      formErrors.consultationFee ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="2000"
                    min="0"
                  />
                  {formErrors.consultationFee && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.consultationFee}</p>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Base Salary for all staff */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Salary (PKR)
              </label>
              <input
                type="number"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="50000"
                min="0"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mt-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Staff will receive a verification email and a password reset email. They must verify their email and set a new password on first login.
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Staff'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Department Creation Modal
  const renderDepartmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Department</h3>
          <button
            onClick={() => {
              setShowModal(false);
              setDeptForm({
                name: '',
                headDoctor: '',
                services: [''],
                pricing: {},
                description: ''
              });
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Head Doctor
            </label>
            <select
              value={deptForm.headDoctor}
              onChange={(e) => setDeptForm({ ...deptForm, headDoctor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select Head Doctor</option>
              {staff.doctors.map(doc => (
                <option key={doc.id} value={doc.id}>Dr. {doc.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Brief description of the department"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              You can add services and pricing in the department details after creation.
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setDeptForm({
                  name: '',
                  headDoctor: '',
                  services: [''],
                  pricing: {},
                  description: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - Fixed on desktop, hidden on mobile */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-xl font-bold text-blue-400">MediCare Plus</h1>
            <p className="text-sm text-gray-400">Admin Portal</p>
          </div>

          {/* Admin Info */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faUserTie} className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-white">Admin</p>
                <p className="text-xs text-gray-400">Super Administrator</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-2 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-3" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold text-blue-400">MediCare Plus Admin</h1>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-4 sm:p-8">
        {/* Mobile Tab Navigation */}
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'staff' && renderStaffManagement()}
            {activeTab === 'patients' && renderPatients()}
            {activeTab === 'departments' && renderDepartments()}
            {activeTab === 'pricing' && renderPricing()}
            {activeTab === 'beds' && (
              <BedGrid
                beds={beds}
                onAssign={() => {}}
                onRelease={() => {}}
                readOnly
              />
            )}
            {activeTab === 'audit' && renderAuditLogs()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'support' && <SupportMessages />}
            {activeTab === 'salary' && renderSalaryManagement()}
            {activeTab === 'deactivation' && <DeactivationRequests />}
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && modalType === 'staff' && renderStaffModal()}
      {showModal && modalType === 'department' && renderDepartmentModal()}
      
      {/* User History Modal */}
      {showHistoryModal && (
        <UserHistoryModal
          userId={selectedUserId}
          userName={selectedUserName}
          userRole={selectedUserRole}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Department Details Modal */}
      {showDepartmentModal && (
        <DepartmentDetailsModal
          departmentId={selectedDepartmentId}
          onClose={() => {
            setShowDepartmentModal(false);
            setSelectedDepartmentId(null);
            fetchDepartments();
          }}
          onUpdate={() => {
            fetchDepartments();
          }}
        />
      )}

      {/* Pricing Controls Modal */}
      {showPricingModal && (
        <PricingControlsModal
          departments={departments}
          currentPricing={pricingConfig}
          onSave={handleUpdatePricing}
          onClose={() => setShowPricingModal(false)}
        />
      )}

      {/* Hospital History Modal */}
      {showHospitalHistoryModal && (
        <HospitalHistoryModal
          historyData={hospitalHistory}
          yearlyStats={yearlyStats}
          onClose={() => setShowHospitalHistoryModal(false)}
        />
      )}
    </div>
  );
};

export default Admin;