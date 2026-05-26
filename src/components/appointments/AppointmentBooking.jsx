import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faUserMd,
  faBuilding,
  faStethoscope,
  faSpinner,
  faExclamationTriangle,
  faStar,
  faGraduationCap,
  faHourglassHalf,
  faChevronRight,
  faCheckCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { 
  getUsersByRole,
  getPublicDepartments,
  getAvailableTimeSlots,
  createAppointment,
  getDoctorSchedule
} from '../../database';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AppointmentBooking = ({ 
  patientId, 
  onSuccess, 
  onCancel, 
  initialDoctorId = null, 
  initialDepartmentId = null 
}) => {
  const [loading, setLoading] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [, setSpecializations] = useState([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [isTodaySelected, setIsTodaySelected] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    departmentId: '',
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});
  
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSetState = (setter, value) => {
    if (isMounted.current) {
      setter(value);
    }
  };

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const result = await getPublicDepartments();
        if (result.success && isMounted.current) {
          safeSetState(setDepartments, result.data);
          safeSetState(setDepartmentsLoaded, true);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch all active doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      safeSetState(setLoading, true);
      try {
        const result = await getUsersByRole('doctor');
        
        if (result.success && isMounted.current) {
          const activeDoctors = result.data
            .filter(doc => doc.accountStatus === 'active')
            .map(doc => ({
              id: doc.id,
              fullName: doc.fullName || 'Unknown',
              specialization: doc.specialization || 'General Physician',
              qualifications: doc.qualifications || [],
              experience: doc.experience || 0,
              consultationFee: doc.consultationFee || 0,
              about: doc.about || '',
              languages: doc.languages || [],
              education: doc.education || [],
              awards: doc.awards || [],
              profileImage: doc.profileImage || null,
              avgRating: doc.avgRating || 0,
              ratings: doc.ratings?.length || 0,
              availability: doc.availability || {},
              department: doc.department || null,
              clinicAddress: doc.clinicAddress || 'Main Hospital',
              availableDays: doc.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            }));

          safeSetState(setDoctors, activeDoctors);
          safeSetState(setDoctorsLoaded, true);
          
          const specs = [...new Set(activeDoctors.map(d => d.specialization).filter(Boolean))];
          safeSetState(setSpecializations, specs.sort());
        } else {
          toast.error('Failed to load doctors');
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        toast.error('Failed to load doctors');
      } finally {
        if (isMounted.current) {
          safeSetState(setLoading, false);
        }
      }
    };
    fetchDoctors();
  }, []);

  // Set initial doctor and department when both are loaded
  useEffect(() => {
    if (initialDoctorId && doctorsLoaded && departmentsLoaded && doctors.length > 0 && departments.length > 0) {
      const doctor = doctors.find(d => d.id === initialDoctorId);
      if (doctor) {
        let dept = departments.find(d => d.name === doctor.department || d.id === doctor.department);
        
        if (!dept && doctor.department) {
          dept = departments.find(d => d.name?.toLowerCase() === doctor.department?.toLowerCase());
        }
        
        setFormData(prev => ({
          ...prev,
          doctorId: doctor.id,
          departmentId: dept?.id || initialDepartmentId || ''
        }));
        setCurrentStep(2);
      } else if (initialDepartmentId) {
        setFormData(prev => ({
          ...prev,
          departmentId: initialDepartmentId
        }));
      }
    }
  }, [initialDoctorId, initialDepartmentId, doctorsLoaded, departmentsLoaded, doctors, departments]);

  // Filter doctors when department changes
  useEffect(() => {
    if (!formData.departmentId) {
      safeSetState(setFilteredDoctors, []);
      return;
    }
    
    const selectedDept = departments.find(d => d.id === formData.departmentId);
    
    if (selectedDept) {
      const filtered = doctors.filter(doc => 
        doc.department === selectedDept.name || 
        doc.department === formData.departmentId
      );
      safeSetState(setFilteredDoctors, filtered);
    }
  }, [formData.departmentId, doctors, departments]);

  // Check if selected date is today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIsTodaySelected(formData.date === today);
  }, [formData.date]);

  // Fetch slots when doctor and date change
  useEffect(() => {
    const fetchSlotsAndSchedule = async () => {
      if (!formData.doctorId || !formData.date) {
        safeSetState(setAvailableSlots, []);
        safeSetState(setDoctorSchedule, []);
        return;
      }
      
      safeSetState(setCheckingSlot, true);
      
      try {
        const [slotsResult, scheduleResult] = await Promise.all([
          getAvailableTimeSlots(formData.doctorId, formData.date),
          getDoctorSchedule(formData.doctorId, formData.date)
        ]);
        
        if (isMounted.current) {
          if (slotsResult.success) {
            safeSetState(setAvailableSlots, slotsResult.data);
          }
          if (scheduleResult.success) {
            safeSetState(setDoctorSchedule, scheduleResult.data);
          }
        }
      } catch (error) {
        console.error('Error fetching slots:', error);
      } finally {
        if (isMounted.current) {
          safeSetState(setCheckingSlot, false);
        }
      }
    };
    
    fetchSlotsAndSchedule();
  }, [formData.doctorId, formData.date]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Reset time when doctor or date changes
      if (name === 'doctorId' || name === 'date') {
        newData.time = '';
        setSelectedSlot(null);
      }
      
      return newData;
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSlotSelect = (slot) => {
    if (!slot.available) {
      toast.error('This slot is not available');
      return;
    }
    
    // Double-check for today's date if slot is in the past
    if (isTodaySelected) {
      const now = new Date();
      const [slotHour, slotMinute] = slot.time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (slotHour < currentHour || (slotHour === currentHour && slotMinute < currentMinute)) {
        toast.error('Cannot book a time slot that has already passed');
        return;
      }
    }
    
    setSelectedSlot(slot);
    setFormData(prev => ({ ...prev, time: slot.time }));
    setErrors(prev => ({ ...prev, time: null }));
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !formData.departmentId) {
      toast.error('Please select a department');
      return;
    }
    if (currentStep === 2 && !formData.doctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (currentStep === 3 && !formData.date) {
      toast.error('Please select a date');
      return;
    }
    if (currentStep === 3 && !formData.time) {
      toast.error('Please select a time slot');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the visit');
      return;
    }

    // Final check for past time slot on today's date
    const today = new Date().toISOString().split('T')[0];
    if (formData.date === today) {
      const now = new Date();
      const [slotHour, slotMinute] = formData.time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (slotHour < currentHour || (slotHour === currentHour && slotMinute < currentMinute)) {
        toast.error('Cannot book a time slot that has already passed');
        return;
      }
    }

    setLoading(true);

    try {
      const appointmentData = {
        patientId,
        doctorId: formData.doctorId,
        department: formData.departmentId,
        date: formData.date,
        time: formData.time,
        reason: formData.reason
      };

      const result = await createAppointment(appointmentData);

      if (result.success && isMounted.current) {
        toast.success(
          <div>
            <p className="font-medium">Appointment request submitted!</p>
            <p className="text-sm mt-1">Waiting for approval from reception.</p>
          </div>,
          { duration: 5000 }
        );
        if (onSuccess) onSuccess(result.data);
      } else if (isMounted.current) {
        toast.error(result.error || 'Failed to book appointment');
      }
    } catch (error) {
      if (isMounted.current) {
        toast.error('Failed to book appointment');
      }
      console.error('Error booking appointment:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const max = new Date();
    max.setMonth(max.getMonth() + 3);
    return max.toISOString().split('T')[0];
  };

  const isSlotBooked = (time) => {
    return doctorSchedule.some(apt => apt.time === time && apt.status !== 'cancelled');
  };

  const isSlotPast = (time) => {
    if (!isTodaySelected) return false;
    
    const now = new Date();
    const [slotHour, slotMinute] = time.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    return slotHour < currentHour || (slotHour === currentHour && slotMinute < currentMinute);
  };

  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FontAwesomeIcon key={`full-${i}`} icon={faStar} className="text-yellow-400" />);
    }
    const remaining = 5 - stars.length;
    for (let i = 0; i < remaining; i++) {
      stars.push(<FontAwesomeIcon key={`empty-${i}`} icon={faStar} className="text-gray-300" />);
    }
    return stars;
  };

  // Get current time display for info message
  const getCurrentTimeDisplay = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading until initial data is loaded
  if (!doctorsLoaded || !departmentsLoaded) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading available doctors...</p>
        </div>
      </div>
    );
  }

  const selectedDoctor = doctors.find(d => d.id === formData.doctorId);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header with Progress Steps */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Book an Appointment</h2>
        <p className="text-blue-100 text-sm mt-1">Schedule your consultation with our specialist doctors</p>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-6">
          {[
            { step: 1, label: 'Department', icon: faBuilding },
            { step: 2, label: 'Doctor', icon: faUserMd },
            { step: 3, label: 'Date & Time', icon: faCalendarAlt },
            { step: 4, label: 'Reason', icon: faStethoscope }
          ].map((item) => (
            <div key={item.step} className="flex-1 text-center">
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all ${
                currentStep >= item.step 
                  ? 'bg-white text-blue-600 shadow-lg' 
                  : 'bg-blue-400 text-white'
              }`}>
                {currentStep > item.step ? (
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                ) : (
                  <FontAwesomeIcon icon={item.icon} className="text-sm" />
                )}
              </div>
              <p className={`text-xs mt-2 hidden sm:block ${
                currentStep >= item.step ? 'text-white font-medium' : 'text-blue-200'
              }`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Step 1: Department Selection */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <FontAwesomeIcon icon={faBuilding} className="mr-2 text-blue-500" />
                Select Department
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, departmentId: dept.id }));
                      setCurrentStep(2);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.departmentId === dept.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{dept.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {dept.description || 'Medical department'}
                        </p>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} className="text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Doctor Selection */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FontAwesomeIcon icon={faUserMd} className="mr-2 text-blue-500" />
                  Select Doctor
                </label>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Change Department
                </button>
              </div>
              
              {filteredDoctors.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <FontAwesomeIcon icon={faUserMd} className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No doctors available in this department</p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    ← Select another department
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredDoctors.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, doctorId: doc.id }));
                        setCurrentStep(3);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.doctorId === doc.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 dark:text-white">Dr. {doc.fullName}</p>
                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              {doc.specialization}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center">
                              <FontAwesomeIcon icon={faGraduationCap} className="mr-1 text-xs" />
                              {doc.experience || 0}+ yrs
                            </span>
                            <div className="flex items-center">
                              {renderRating(doc.avgRating || 0)}
                              <span className="ml-1 text-xs">({doc.ratings || 0})</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(doc.consultationFee || 1000)}
                          </p>
                          <p className="text-xs text-gray-500">Consultation Fee</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Date & Time Selection */}
        {currentStep === 3 && selectedDoctor && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-500" />
                  Select Date & Time
                </label>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Change Doctor
                </button>
              </div>

              {/* Doctor Info Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedDoctor.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Dr. {selectedDoctor.fullName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedDoctor.specialization}</p>
                  </div>
                </div>
              </div>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Appointment Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {isTodaySelected && (
                  <p className="mt-2 text-xs text-orange-600 flex items-center">
                    <FontAwesomeIcon icon={faHourglassHalf} className="mr-1" />
                    Current time: {getCurrentTimeDisplay()} - Past slots are not available
                  </p>
                )}
              </div>

              {/* Time Slots */}
              {formData.date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                    Available Time Slots
                  </label>
                  {checkingSlot ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <>
                      {isTodaySelected && availableSlots.filter(slot => !isSlotPast(slot.time)).length === 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                            No available time slots for today. Please select another date.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot, index) => {
                          const booked = isSlotBooked(slot.time);
                          const isPast = isSlotPast(slot.time);
                          const isSelected = selectedSlot?.time === slot.time;
                          const isAvailable = slot.available && !booked && !isPast;
                          
                          let tooltipText = '';
                          if (isPast) tooltipText = 'This time has already passed';
                          else if (booked) tooltipText = 'Already booked';
                          else if (!slot.available) tooltipText = 'Doctor not available at this time';
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => isAvailable && handleSlotSelect(slot)}
                              disabled={!isAvailable}
                              title={tooltipText}
                              className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                                !isAvailable
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 dark:bg-gray-700 dark:text-gray-500'
                                  : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:shadow-md'
                              }`}
                            >
                              {slot.display}
                              {isPast && <FontAwesomeIcon icon={faHourglassHalf} className="ml-1 text-xs" />}
                            </button>
                          );
                        })}
                      </div>
                      {availableSlots.filter(s => s.available && !isSlotBooked(s.time) && !isSlotPast(s.time)).length === 0 && !checkingSlot && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                          No available slots for this date. Please select another date.
                        </p>
                      )}
                    </>
                  )}
                  {errors.time && (
                    <p className="mt-2 text-sm text-red-600">{errors.time}</p>
                  )}
                </div>
              )}

              {formData.time && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Selected: {formData.date} at {formData.time}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Reason for Visit */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-blue-500" />
                  Reason for Visit
                </label>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Change Date/Time
                </button>
              </div>

              {/* Appointment Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Appointment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Doctor:</span>
                    <span className="font-medium">Dr. {selectedDoctor?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Department:</span>
                    <span>{departments.find(d => d.id === formData.departmentId)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date & Time:</span>
                    <span>{formData.date} at {formData.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Consultation Fee:</span>
                    <span className="font-bold text-green-600">{formatCurrency(selectedDoctor?.consultationFee || 1000)}</span>
                  </div>
                </div>
              </div>

              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows="5"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Describe your symptoms or reason for appointment in detail..."
              />
              {errors.reason && (
                <p className="mt-2 text-sm text-red-600">{errors.reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
          {currentStep > 1 && currentStep <= 4 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
            >
              Back
            </button>
          )}
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              Continue
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !formData.reason.trim()}
              className="ml-auto px-8 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  Confirm Appointment
                  <FontAwesomeIcon icon={faCheckCircle} />
                </>
              )}
            </button>
          )}
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Info Message */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Your appointment request will be sent for approval. You'll be notified once confirmed.
              Payment is required after approval to confirm the appointment.
              {isTodaySelected && (
                <span className="block mt-1 text-orange-600 dark:text-orange-400">
                  ⏰ Time slots that have already passed today are not selectable.
                </span>
              )}
            </p>
          </div>
        </div>
      </form>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AppointmentBooking;