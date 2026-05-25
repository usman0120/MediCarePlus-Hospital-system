import { validateEmail, validatePhone, validateCNIC, validatePassword, validateVitals, getAgeFromDOB } from './helpers';

// Add the missing validateProfile function
export const validateProfile = (data) => {
  const errors = {};

  // Full name validation
  if (!data.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  } else if (data.fullName.length < 3) {
    errors.fullName = 'Name must be at least 3 characters';
  } else if (data.fullName.length > 100) {
    errors.fullName = 'Name must be less than 100 characters';
  }

  // Phone validation
  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Emergency contact validation (optional but if provided, must be valid)
  if (data.emergencyContact && !validatePhone(data.emergencyContact)) {
    errors.emergencyContact = 'Please enter a valid emergency contact number';
  }

  // Blood group validation (optional but if provided, must be valid)
  if (data.bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(data.bloodGroup)) {
    errors.bloodGroup = 'Please select a valid blood group';
  }

  // Address validation (optional)
  if (data.address && data.address.length > 500) {
    errors.address = 'Address must be less than 500 characters';
  }

  // Email validation (if provided and different from current)
  if (data.email && !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Date of birth validation (if provided)
  if (data.dateOfBirth) {
    const age = getAgeFromDOB(data.dateOfBirth);
    if (age < 0 || age > 150) {
      errors.dateOfBirth = 'Please enter a valid date of birth';
    }
  }

  // Gender validation (if provided)
  if (data.gender && !['male', 'female', 'other'].includes(data.gender)) {
    errors.gender = 'Please select a valid gender';
  }

  // CNIC validation (if provided)
  if (data.cnic && !validateCNIC(data.cnic)) {
    errors.cnic = 'Please enter a valid CNIC (format: 12345-1234567-1)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateRegistration = (data, role = 'patient') => {
  const errors = {};

  // Common validations
  if (!data.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  } else if (data.fullName.length < 3) {
    errors.fullName = 'Name must be at least 3 characters';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (!validatePassword(data.password)) {
    errors.password = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character';
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Role-specific validations
  if (role === 'patient') {
    if (!data.cnic) {
      errors.cnic = 'CNIC is required';
    } else if (!validateCNIC(data.cnic)) {
      errors.cnic = 'Please enter a valid CNIC (format: 12345-1234567-1)';
    }

    if (!data.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = getAgeFromDOB(data.dateOfBirth);
      if (age < 0 || age > 150) {
        errors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    if (!data.gender) {
      errors.gender = 'Gender is required';
    }

    if (!data.emergencyContact) {
      errors.emergencyContact = 'Emergency contact is required';
    } else if (!validatePhone(data.emergencyContact)) {
      errors.emergencyContact = 'Please enter a valid emergency contact number';
    }

    if (data.bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(data.bloodGroup)) {
      errors.bloodGroup = 'Please select a valid blood group';
    }
  }

  if (role === 'doctor') {
    if (!data.licenseNumber?.trim()) {
      errors.licenseNumber = 'License number is required';
    }

    if (!data.specialization?.trim()) {
      errors.specialization = 'Specialization is required';
    }

    if (!data.consultationFee || data.consultationFee < 0) {
      errors.consultationFee = 'Please enter a valid consultation fee';
    }

    if (!data.department) {
      errors.department = 'Department is required';
    }
  }

  if (role === 'receptionist' || role === 'lab') {
    if (!data.department) {
      errors.department = 'Department is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateAppointment = (data) => {
  const errors = {};

  if (!data.department) {
    errors.department = 'Please select a department';
  }

  if (!data.doctorId) {
    errors.doctorId = 'Please select a doctor';
  }

  if (!data.date) {
    errors.date = 'Please select a date';
  } else {
    const selectedDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.date = 'Cannot select past date';
    }
  }

  if (!data.time) {
    errors.time = 'Please select a time';
  } else {
    const [hours, minutes] = data.time.split(':');
    if (hours < 9 || hours > 24 || (hours === 24 && minutes > 0)) {
      errors.time = 'Appointments are only available between 9:00 AM and 12:00 AM';
    }
  }

  if (!data.reason?.trim()) {
    errors.reason = 'Please provide a reason for appointment';
  } else if (data.reason.length < 10) {
    errors.reason = 'Please provide more details';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateEMR = (data) => {
  const errors = {};

  if (!data.chiefComplaint?.trim()) {
    errors.chiefComplaint = 'Chief complaint is required';
  }

  if (!data.symptoms?.trim()) {
    errors.symptoms = 'Symptoms are required';
  }

  if (!data.diagnosis?.trim()) {
    errors.diagnosis = 'Diagnosis is required';
  }

  // Validate vitals
  if (data.vitals) {
    const vitalsValidation = validateVitals(data.vitals);
    if (!vitalsValidation.isValid) {
      errors.vitals = vitalsValidation.errors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validatePrescription = (data) => {
  const errors = {};

  if (!data.medicines || data.medicines.length === 0) {
    errors.medicines = 'At least one medicine is required';
  } else {
    const medicineErrors = [];
    data.medicines.forEach((med, index) => {
      const medErrors = {};
      
      if (!med.name?.trim()) {
        medErrors.name = 'Medicine name is required';
      }
      
      if (!med.dose?.trim()) {
        medErrors.dose = 'Dose is required';
      }
      
      if (!med.frequency?.trim()) {
        medErrors.frequency = 'Frequency is required';
      }
      
      if (!med.duration?.trim()) {
        medErrors.duration = 'Duration is required';
      }
      
      if (Object.keys(medErrors).length > 0) {
        medicineErrors[index] = medErrors;
      }
    });
    
    if (medicineErrors.length > 0) {
      errors.medicines = medicineErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateBedAssignment = (data) => {
  const errors = {};

  if (!data.bedId) {
    errors.bedId = 'Please select a bed';
  }

  if (!data.patientId) {
    errors.patientId = 'Please select a patient';
  }

  if (!data.assignedBy) {
    errors.assignedBy = 'Assigning staff is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateOperation = (data) => {
  const errors = {};

  if (!data.patientId) {
    errors.patientId = 'Patient is required';
  }

  if (!data.doctorId) {
    errors.doctorId = 'Operating doctor is required';
  }

  if (!data.operationType) {
    errors.operationType = 'Operation type is required';
  }

  if (!data.scheduledDate) {
    errors.scheduledDate = 'Scheduled date is required';
  } else {
    const scheduledDate = new Date(data.scheduledDate);
    const now = new Date();
    
    if (scheduledDate < now) {
      errors.scheduledDate = 'Scheduled date must be in the future';
    }
  }

  if (!data.requiredStaff || data.requiredStaff.length === 0) {
    errors.requiredStaff = 'Required staff must be specified';
  }

  if (!data.requiredEquipment || data.requiredEquipment.length === 0) {
    errors.requiredEquipment = 'Required equipment must be specified';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateInventory = (data) => {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = 'Item name is required';
  }

  if (!data.category) {
    errors.category = 'Category is required';
  }

  if (!data.quantity || data.quantity < 0) {
    errors.quantity = 'Valid quantity is required';
  }

  if (!data.threshold || data.threshold < 0) {
    errors.threshold = 'Valid threshold is required';
  }

  if (!data.price || data.price < 0) {
    errors.price = 'Valid price is required';
  }

  if (!data.unit) {
    errors.unit = 'Unit is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateChatMessage = (data) => {
  const errors = {};

  if (!data.text?.trim() && !data.file) {
    errors.message = 'Message cannot be empty';
  }

  if (data.file) {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (data.file.size > maxSize) {
      errors.file = 'File size must be less than 5MB';
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];
    if (!allowedTypes.includes(data.file.type)) {
      errors.file = 'Only JPG, PNG, and PDF files are allowed';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};