import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { registerWithEmail, registerAdmin } from '../auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faLock,
  faPhone,
  faIdCard,
  faCalendar,
  faVenusMars,
  faMapMarker,
  faHeart,
  faArrowLeft,
  faSpinner,
  faExclamationTriangle,
  faCheck,
  faTimes,
  faUserCog,
  faShieldAlt,
  faHospital,
  faInfoCircle,
  faEnvelopeOpenText,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { validateRegistration } from '../utils/validators';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

// Import logo
import logo from '../../assets/logo.png';

const ADMIN_GATE_SECRET = 'MedicareAdminRegister@2026';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // Admin registration states
  const [showAdminRegister, setShowAdminRegister] = useState(false);
  const [adminRegisterStep, setAdminRegisterStep] = useState('locked'); // locked, password, form, success
  const [adminGatePassword, setAdminGatePassword] = useState('');
  const [adminRegisterData, setAdminRegisterData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: 'Administration',
    role: 'admin'
  });
  const [adminRegisterLoading, setAdminRegisterLoading] = useState(false);
  
  // Password strength for admin
  const [adminPasswordStrength, setAdminPasswordStrength] = useState({
    score: 0,
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    minLength: false
  });

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    minLength: false
  });

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cnic: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    bloodGroup: '',
    role: 'patient'
  });

  // Check for messages from navigation state
  useEffect(() => {
    if (location.state?.message) {
      toast(location.state.message, {
        icon: '📧',
        duration: 6000
      });
      // Clear the state to prevent showing again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Password strength checker for patient
  const checkPasswordStrength = (pass) => {
    setPasswordStrength({
      score: 
        (pass.length >= 8 ? 1 : 0) +
        (/[a-z]/.test(pass) ? 1 : 0) +
        (/[A-Z]/.test(pass) ? 1 : 0) +
        (/[0-9]/.test(pass) ? 1 : 0) +
        (/[^A-Za-z0-9]/.test(pass) ? 1 : 0),
      hasLower: /[a-z]/.test(pass),
      hasUpper: /[A-Z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[^A-Za-z0-9]/.test(pass),
      minLength: pass.length >= 8
    });
  };

  // Password strength checker for admin
  const checkAdminPasswordStrength = (pass) => {
    setAdminPasswordStrength({
      score: 
        (pass.length >= 8 ? 1 : 0) +
        (/[a-z]/.test(pass) ? 1 : 0) +
        (/[A-Z]/.test(pass) ? 1 : 0) +
        (/[0-9]/.test(pass) ? 1 : 0) +
        (/[^A-Za-z0-9]/.test(pass) ? 1 : 0),
      hasLower: /[a-z]/.test(pass),
      hasUpper: /[A-Z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[^A-Za-z0-9]/.test(pass),
      minLength: pass.length >= 8
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhoneChange = (value, name) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Admin handlers
  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'password') {
      checkAdminPasswordStrength(value);
    }
    
    setAdminRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminGateSubmit = (e) => {
    e.preventDefault();
    
    if (adminGatePassword === ADMIN_GATE_SECRET) {
      setAdminRegisterStep('form');
      setAdminGatePassword('');
      toast.success('Access granted! Please complete the admin registration form.');
    } else {
      toast.error('Incorrect admin gate password');
    }
  };

  const handleAdminRegisterSubmit = async (e) => {
    e.preventDefault();
    
    // Validate admin form
    if (!adminRegisterData.fullName || !adminRegisterData.email || !adminRegisterData.password || !adminRegisterData.confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if passwords match
    if (adminRegisterData.password !== adminRegisterData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Check password strength
    if (adminPasswordStrength.score < 4) {
      toast.error('Please use a stronger password');
      return;
    }

    setAdminRegisterLoading(true);

    const result = await registerAdmin(
      adminRegisterData.email,
      adminRegisterData.password,
      {
        fullName: adminRegisterData.fullName,
        phone: adminRegisterData.phone
      }
    );

    setAdminRegisterLoading(false);

    if (result.success) {
      setAdminRegisterStep('success');
      setRegisteredEmail(adminRegisterData.email);
      toast.success('Admin registered successfully! Please check your email to verify your account.');
      setTimeout(() => {
        setShowAdminRegister(false);
        setAdminRegisterStep('locked');
        setAdminRegisterData({
          fullName: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          department: 'Administration',
          role: 'admin'
        });
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please verify your email before logging in.' 
          }
        });
      }, 4000);
    } else {
      toast.error(result.error);
    }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateRegistration(formData, 'patient');
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Check password strength
    if (passwordStrength.score < 4) {
      toast.error('Please use a stronger password');
      return;
    }

    setLoading(true);
    setRegisteredEmail(formData.email);

    const result = await registerWithEmail(
      formData.email,
      formData.password,
      {
        fullName: formData.fullName,
        phone: formData.phone,
        cnic: formData.cnic,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        bloodGroup: formData.bloodGroup,
        role: 'patient'
      }
    );

    setLoading(false);

    if (result.success) {
      setRegistrationSuccess(true);
      toast.success('Registration successful! Please check your email to verify your account.');
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please verify your email before logging in.' 
          }
        });
      }, 5000);
    } else {
      toast.error(result.error);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Render success message with better UI
  const renderSuccess = () => (
    <div className="text-center space-y-6 animate-fadeIn">
      <div className="relative">
        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto transform rotate-6 shadow-xl">
          <FontAwesomeIcon icon={faCheck} className="h-14 w-14 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl animate-bounce">
          ✉️
        </div>
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎉 Registration Successful!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your account has been created successfully.
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border-2 border-blue-100 dark:border-blue-800 text-left">
        <div className="flex items-center mb-4">
          <div className="bg-blue-200 dark:bg-blue-800 rounded-full p-2 mr-3">
            <FontAwesomeIcon icon={faEnvelopeOpenText} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="font-semibold text-blue-800 dark:text-blue-300">Verify Your Email</h4>
        </div>
        
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          We've sent a verification email to:
        </p>
        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 break-all bg-white dark:bg-gray-800 p-3 rounded-lg">
          {registeredEmail}
        </p>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start text-blue-700 dark:text-blue-300">
            <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">1</span>
            <span>Open your email inbox and look for the verification email</span>
          </li>
          <li className="flex items-start text-blue-700 dark:text-blue-300">
            <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">2</span>
            <span>Click the <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-xs font-mono">Verify Email</span> button in the email</span>
          </li>
          <li className="flex items-start text-blue-700 dark:text-blue-300">
            <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">3</span>
            <span>Once verified, you can log in to your account</span>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong className="block mb-1">📫 Can't find the email?</strong>
          Check your spam folder or wait a few minutes. If you still don't see it, 
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline mx-1"
          >
            try again
          </button>
          .
        </p>
      </div>

      <div className="pt-4">
        <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400">
          Redirecting to login page in a few seconds...
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-1 rounded-full animate-progress"></div>
        </div>
      </div>
    </div>
  );

  // Render patient registration form with improved UI
  const renderPatientForm = () => (
    <form onSubmit={handlePatientSubmit} className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Personal</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Contact</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-sm font-bold">3</div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Medical</span>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="bg-blue-200 dark:bg-blue-800 rounded-full p-2 mr-3">
            <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faUser}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                  errors.fullName 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:border-blue-400'
                }`}
                placeholder="Enter your full name"
              />
            </div>
            {errors.fullName && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faEnvelope}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:border-blue-400'
                }`}
                placeholder="Enter your email"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faLock}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                  errors.password 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:border-blue-400'
                }`}
                placeholder="Create a strong password"
              />
            </div>
            
            {/* Password Strength Meter */}
            {formData.password && (
              <div className="mt-3 space-y-3">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        level <= passwordStrength.score
                          ? level <= 2 ? 'bg-red-500' : level <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className={`flex items-center ${passwordStrength.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.minLength ? (
                      <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                    ) : (
                      <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                    )}
                    8+ characters
                  </span>
                  <span className={`flex items-center ${passwordStrength.hasLower ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.hasLower ? (
                      <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                    ) : (
                      <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                    )}
                    Lowercase
                  </span>
                  <span className={`flex items-center ${passwordStrength.hasUpper ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.hasUpper ? (
                      <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                    ) : (
                      <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                    )}
                    Uppercase
                  </span>
                  <span className={`flex items-center ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.hasNumber ? (
                      <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                    ) : (
                      <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                    )}
                    Number
                  </span>
                  <span className={`flex items-center ${passwordStrength.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.hasSpecial ? (
                      <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                    ) : (
                      <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                    )}
                    Special char
                  </span>
                </div>
              </div>
            )}
            
            {errors.password && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faLock}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                  errors.confirmPassword 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:border-blue-400'
                }`}
                placeholder="Confirm your password"
              />
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <FontAwesomeIcon 
                  icon={faCheck} 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" 
                />
              )}
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="bg-purple-200 dark:bg-purple-800 rounded-full p-2 mr-3">
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              country={'pk'}
              value={formData.phone}
              onChange={(value) => handlePhoneChange(value, 'phone')}
              inputClass={`!w-full !pl-12 !py-3 !border-2 ${
                errors.phone ? '!border-red-300' : '!border-gray-200 dark:!border-gray-700'
              } !rounded-xl focus:!border-purple-500 focus:!ring-2 focus:!ring-purple-200 dark:!bg-gray-800 dark:!text-white`}
              containerClass="!w-full"
              buttonClass="!border-gray-200 dark:!border-gray-700 !rounded-l-xl"
              dropdownClass="dark:!bg-gray-800"
              searchClass="dark:!bg-gray-700"
              enableSearch
              disableSearchIcon
            />
            {errors.phone && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Emergency Contact <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              country={'pk'}
              value={formData.emergencyContact}
              onChange={(value) => handlePhoneChange(value, 'emergencyContact')}
              inputClass={`!w-full !pl-12 !py-3 !border-2 ${
                errors.emergencyContact ? '!border-red-300' : '!border-gray-200 dark:!border-gray-700'
              } !rounded-xl focus:!border-purple-500 focus:!ring-2 focus:!ring-purple-200 dark:!bg-gray-800 dark:!text-white`}
              containerClass="!w-full"
              buttonClass="!border-gray-200 dark:!border-gray-700 !rounded-l-xl"
              dropdownClass="dark:!bg-gray-800"
              searchClass="dark:!bg-gray-700"
              enableSearch
              disableSearchIcon
            />
            {errors.emergencyContact && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.emergencyContact}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="bg-green-200 dark:bg-green-800 rounded-full p-2 mr-3">
            <FontAwesomeIcon icon={faHeart} className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          Medical Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CNIC */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CNIC Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faIdCard}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors"
              />
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                  errors.cnic 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-200 dark:focus:border-green-400'
                }`}
                placeholder="12345-1234567-1"
              />
            </div>
            {errors.cnic && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.cnic}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faCalendar}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors"
              />
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                  errors.dateOfBirth 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-200 dark:focus:border-green-400'
                }`}
              />
            </div>
            {errors.dateOfBirth && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faVenusMars}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white appearance-none ${
                  errors.gender 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-200 dark:focus:border-green-400'
                }`}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            {errors.gender && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                {errors.gender}
              </p>
            )}
          </div>

          {/* Blood Group */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Blood Group
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faHeart}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors"
              />
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-800 dark:text-white appearance-none"
              >
                <option value="">Select Blood Group</option>
                {bloodGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="md:col-span-2 group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faMapMarker}
                className="absolute left-3 top-4 text-gray-400 group-focus-within:text-green-500 transition-colors"
              />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-800 dark:text-white"
                placeholder="Enter your address"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Submit */}
      <div className="space-y-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="terms"
            className="mt-1 mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            required
          />
          <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
            I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>. I understand that my email must be verified before accessing my account.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center font-semibold text-lg shadow-lg"
        >
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Creating Account...
            </>
          ) : (
            <>
              Create Patient Account
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </>
          )}
        </button>
      </div>
    </form>
  );

  // Render admin gate password form
  const renderAdminGate = () => (
    <form onSubmit={handleAdminGateSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg transform rotate-3">
          <FontAwesomeIcon icon={faShieldAlt} className="h-10 w-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Registration</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Enter the gate password to access admin registration
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg mt-3">
          <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-center">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
            Contact Hospital Owner for gate password
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Gate Password
        </label>
        <input
          type="password"
          value={adminGatePassword}
          onChange={(e) => setAdminGatePassword(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-800 dark:text-white"
          placeholder="Enter gate password"
          autoFocus
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-semibold"
      >
        Unlock Admin Registration
      </button>

      <button
        type="button"
        onClick={() => {
          setShowAdminRegister(false);
          setAdminRegisterStep('locked');
          setAdminGatePassword('');
        }}
        className="w-full text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Cancel
      </button>
    </form>
  );

  // Render admin registration form
  const renderAdminForm = () => (
    <form onSubmit={handleAdminRegisterSubmit} className="space-y-6">
      <div className="text-center mb-4">
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <FontAwesomeIcon icon={faUserCog} className="h-10 w-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Admin Account</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Fill in the details to create a new administrator
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={adminRegisterData.fullName}
            onChange={handleAdminChange}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-800 dark:text-white"
            placeholder="Enter full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={adminRegisterData.email}
            onChange={handleAdminChange}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-800 dark:text-white"
            placeholder="admin@medicareplus.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <PhoneInput
            country={'pk'}
            value={adminRegisterData.phone}
            onChange={(phone) => setAdminRegisterData(prev => ({ ...prev, phone }))}
            inputClass="!w-full !pl-12 !py-3 !border-2 !border-gray-200 dark:!border-gray-700 !rounded-xl focus:!border-purple-500 focus:!ring-2 focus:!ring-purple-200 dark:!bg-gray-800 dark:!text-white"
            containerClass="!w-full"
            buttonClass="!border-gray-200 dark:!border-gray-700 !rounded-l-xl"
            dropdownClass="dark:!bg-gray-800"
            enableSearch
            disableSearchIcon
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            value={adminRegisterData.password}
            onChange={handleAdminChange}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-800 dark:text-white"
            placeholder="Create a strong password"
            required
          />
          
          {/* Password Strength Meter for Admin */}
          {adminRegisterData.password && (
            <div className="mt-3 space-y-3">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      level <= adminPasswordStrength.score
                        ? level <= 2 ? 'bg-red-500' : level <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className={`flex items-center ${adminPasswordStrength.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                  {adminPasswordStrength.minLength ? (
                    <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                  ) : (
                    <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                  )}
                  8+ characters
                </span>
                <span className={`flex items-center ${adminPasswordStrength.hasLower ? 'text-green-600' : 'text-gray-500'}`}>
                  {adminPasswordStrength.hasLower ? (
                    <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                  ) : (
                    <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                  )}
                  Lowercase
                </span>
                <span className={`flex items-center ${adminPasswordStrength.hasUpper ? 'text-green-600' : 'text-gray-500'}`}>
                  {adminPasswordStrength.hasUpper ? (
                    <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                  ) : (
                    <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                  )}
                  Uppercase
                </span>
                <span className={`flex items-center ${adminPasswordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                  {adminPasswordStrength.hasNumber ? (
                    <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                  ) : (
                    <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                  )}
                  Number
                </span>
                <span className={`flex items-center ${adminPasswordStrength.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                  {adminPasswordStrength.hasSpecial ? (
                    <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1" size="xs" />
                  ) : (
                    <FontAwesomeIcon icon={faTimes} className="text-red-500 mr-1" size="xs" />
                  )}
                  Special char
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={adminRegisterData.confirmPassword}
            onChange={handleAdminChange}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-800 dark:text-white"
            placeholder="Confirm password"
            required
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={adminRegisterLoading}
          className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 font-semibold"
        >
          {adminRegisterLoading ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            'Register Admin'
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminRegisterStep('locked');
            setAdminRegisterData({
              fullName: '',
              email: '',
              password: '',
              confirmPassword: '',
              phone: '',
              department: 'Administration',
              role: 'admin'
            });
          }}
          className="px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  // Render admin success
  const renderAdminSuccess = () => (
    <div className="text-center space-y-6 animate-fadeIn">
      <div className="relative">
        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto transform rotate-6 shadow-xl">
          <FontAwesomeIcon icon={faCheck} className="h-14 w-14 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl animate-bounce">
          ✉️
        </div>
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎉 Admin Registration Successful!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Administrator account has been created.
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-6 rounded-xl border-2 border-purple-100 dark:border-purple-800">
        <p className="text-sm text-purple-800 dark:text-purple-300 mb-4">
          Verification email sent to:
        </p>
        <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 break-all bg-white dark:bg-gray-800 p-3 rounded-lg">
          {registeredEmail}
        </p>
        <p className="text-sm text-purple-700 dark:text-purple-300">
          Please verify your email before logging in.
        </p>
      </div>

      <div className="pt-4">
        <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400">
          Redirecting to login page...
        </div>
      </div>
    </div>
  );

  // Render admin registration section
  const renderAdminRegistration = () => (
    <div className="mt-8 border-t-2 border-gray-200 dark:border-gray-700 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">Admin Registration</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Create a new administrator account</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdminRegister(!showAdminRegister)}
          className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-all"
        >
          {showAdminRegister ? 'Hide' : 'Show'}
        </button>
      </div>

      {showAdminRegister && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-6 border-2 border-purple-100 dark:border-purple-900">
          {adminRegisterStep === 'locked' && renderAdminGate()}
          {adminRegisterStep === 'form' && renderAdminForm()}
          {adminRegisterStep === 'success' && renderAdminSuccess()}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group">
            <div className="flex items-center justify-center space-x-3 mb-4">
              {logo ? (
                <img 
                  src={logo} 
                  alt="MediCare Plus" 
                  className="h-16 w-16 object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all transform group-hover:scale-105">
                  <FontAwesomeIcon icon={faHospital} className="h-8 w-8 text-white" />
                </div>
              )}
              <div className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MediCare Plus
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {registrationSuccess ? 'Registration Complete' : 'Create your patient account'}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Registration Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
          {registrationSuccess ? renderSuccess() : renderPatientForm()}

          {/* Admin Registration Section */}
          {!registrationSuccess && renderAdminRegistration()}

          {/* Login Link */}
          {!registrationSuccess && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        {!registrationSuccess && !showAdminRegister && (
          <div className="text-center mt-6">
            <Link 
              to="/" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 group"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-6 flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
          <span>🔒 HIPAA Compliant</span>
          <span>⚡ Email Verification Required</span>
          <span>🛡️ Secure Registration</span>
        </div>
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Register;