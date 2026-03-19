// User Roles
export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  LAB: 'lab',
  ADMIN: 'admin'
};

// Appointment Status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked-in',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show'
};

// Visit Status
export const VISIT_STATUS = {
  ACTIVE: 'active',
  DISCHARGED: 'discharged',
  TRANSFERRED: 'transferred'
};

// Invoice Status
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PENDING: 'pending_confirmation',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

// Bed Status
export const BED_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved'
};

// Bed Types
export const BED_TYPES = {
  ICU: 'ICU',
  GENERAL: 'General',
  EMERGENCY: 'Emergency',
  ISOLATION: 'Isolation',
  CCU: 'CCU',
  NICU: 'NICU',
  PICU: 'PICU'
};

// Lab Request Status
export const LAB_REQUEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Lab Priority Levels
export const LAB_PRIORITY = {
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
  STAT: 'stat'
};

// Operation Status
export const OPERATION_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  POSTPONED: 'postponed'
};

// Inventory Categories
export const INVENTORY_CATEGORIES = {
  MEDICINE: 'medicine',
  EQUIPMENT: 'equipment',
  SUPPLY: 'supply',
  SURGICAL: 'surgical',
  LAB: 'lab',
  PPE: 'ppe'
};

// Triage Colors
export const TRIAGE_COLORS = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green'
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  INSURANCE: 'insurance',
  ONLINE: 'online'
};

// Message Status
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  SEEN: 'seen',
  FAILED: 'failed'
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  HALF_DAY: 'half-day',
  LEAVE: 'leave'
};

// Salary Status
export const SALARY_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  PAID: 'paid',
  CANCELLED: 'cancelled'
};

// Audit Actions
export const AUDIT_ACTIONS = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DISABLED: 'USER_DISABLED',
  
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  
  VISIT_CREATED: 'VISIT_CREATED',
  VISIT_UPDATED: 'VISIT_UPDATED',
  VISIT_DISCHARGED: 'VISIT_DISCHARGED',
  
  PRESCRIPTION_ADDED: 'PRESCRIPTION_ADDED',
  LAB_REQUEST_CREATED: 'LAB_REQUEST_CREATED',
  LAB_RESULT_UPLOADED: 'LAB_RESULT_UPLOADED',
  
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_UPDATED: 'INVOICE_UPDATED',
  PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  
  BED_ASSIGNED: 'BED_ASSIGNED',
  BED_RELEASED: 'BED_RELEASED',
  
  INVENTORY_ADDED: 'INVENTORY_ADDED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  
  OPERATION_SCHEDULED: 'OPERATION_SCHEDULED',
  OPERATION_STARTED: 'OPERATION_STARTED',
  OPERATION_COMPLETED: 'OPERATION_COMPLETED',
  
  SALARY_CALCULATED: 'SALARY_CALCULATED',
  SALARY_PAID: 'SALARY_PAID',
  
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  DATA_EXPORTED: 'DATA_EXPORTED',
  RECORD_UNLOCKED: 'RECORD_UNLOCKED'
};

// Alert Types
export const ALERT_TYPES = {
  LOW_STock: 'LOW_STOCK',
  HIGH_BED_OCCUPANCY: 'HIGH_BED_OCCUPANCY',
  EMERGENCY_SPIKE: 'EMERGENCY_SPIKE',
  LAB_OVERLOAD: 'LAB_OVERLOAD',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

// Alert Severity
export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

// Blood Groups
export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

// Genders
export const GENDERS = [
  'male', 'female', 'other'
];

// Departments
export const DEPARTMENTS = [
  { id: 'cardiology', name: 'Cardiology', icon: 'heart' },
  { id: 'emergency', name: 'Emergency', icon: 'ambulance' },
  { id: 'surgery', name: 'Surgery', icon: 'scalpel' },
  { id: 'eye', name: 'Ophthalmology', icon: 'eye' },
  { id: 'delivery', name: 'Obstetrics', icon: 'baby' },
  { id: 'pediatrics', name: 'Pediatrics', icon: 'child' },
  { id: 'orthopedics', name: 'Orthopedics', icon: 'bone' },
  { id: 'neurology', name: 'Neurology', icon: 'brain' },
  { id: 'psychiatry', name: 'Psychiatry', icon: 'brain' },
  { id: 'radiology', name: 'Radiology', icon: 'x-ray' }
];

// Consultation Fees (in PKR)
export const CONSULTATION_FEES = {
  GENERAL: 1000,
  SPECIALIST: 2000,
  CONSULTANT: 3000,
  EMERGENCY: 1500
};

// Working Hours
export const WORKING_HOURS = {
  START: 9, // 9 AM
  END: 17, // 5 PM
  LUNCH_START: 13, // 1 PM
  LUNCH_END: 14 // 2 PM
};

// Days of Week
export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  PDF: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 5 * 1024 * 1024 // 5MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
  PDF: ['application/pdf'],
  DOCUMENT: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALL: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'PPP', // e.g., Jan 1, 2024
  DISPLAY_WITH_TIME: 'PPP p', // e.g., Jan 1, 2024 12:00 PM
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  TIME: 'h:mm a',
  TIME_24H: 'HH:mm'
};

// Currency
export const CURRENCY = {
  CODE: 'PKR',
  SYMBOL: '₨',
  LOCALE: 'en-PK'
};

// Theme colors
export const THEME_COLORS = {
  PATIENT: {
    primary: '#3B82F6',
    secondary: '#93C5FD',
    accent: '#1D4ED8'
  },
  DOCTOR: {
    primary: '#0F766E',
    secondary: '#5EEAD4',
    accent: '#115E59'
  },
  RECEPTION: {
    primary: '#7C3AED',
    secondary: '#C4B5FD',
    accent: '#5B21B6'
  },
  LAB: {
    primary: '#0D9488',
    secondary: '#99F6E4',
    accent: '#115E59'
  },
  ADMIN: {
    primary: '#1F2937',
    secondary: '#6B7280',
    accent: '#111827'
  }
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  RECENT_SEARCHES: 'recent_searches',
  CHAT_DRAFT: 'chat_draft'
};

// API endpoints (for future use)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify'
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    DOCTORS: '/users/doctors',
    PATIENTS: '/users/patients',
    STAFF: '/users/staff'
  },
  APPOINTMENTS: {
    BASE: '/appointments',
    AVAILABLE: '/appointments/available',
    SCHEDULE: '/appointments/schedule'
  },
  VISITS: {
    BASE: '/visits',
    EMR: '/visits/emr',
    DISCHARGE: '/visits/discharge'
  },
  INVOICES: {
    BASE: '/invoices',
    PAYMENT: '/invoices/payment'
  },
  LAB: {
    REQUESTS: '/lab/requests',
    RESULTS: '/lab/results'
  },
  INVENTORY: {
    BASE: '/inventory',
    STOCK: '/inventory/stock'
  }
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check the form for errors.',
  SERVER: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  DUPLICATE: 'This record already exists.',
  INSUFFICIENT_STOCK: 'Insufficient stock available.',
  BED_UNAVAILABLE: 'The selected bed is not available.',
  DOCTOR_UNAVAILABLE: 'The doctor is not available at this time.',
  PATIENT_ACTIVE: 'Patient already has an active visit.',
  INVOICE_LOCKED: 'This invoice is locked and cannot be modified.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Data saved successfully.',
  UPDATED: 'Data updated successfully.',
  DELETED: 'Data deleted successfully.',
  SENT: 'Message sent successfully.',
  UPLOADED: 'File uploaded successfully.',
  DOWNLOADED: 'File downloaded successfully.',
  PAID: 'Payment processed successfully.',
  ASSIGNED: 'Bed assigned successfully.',
  DISCHARGED: 'Patient discharged successfully.',
  COMPLETED: 'Operation completed successfully.'
};