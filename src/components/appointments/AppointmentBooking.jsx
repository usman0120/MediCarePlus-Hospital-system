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
  faGraduationCap
} from '@fortawesome/free-solid-svg-icons';
import { 
  getUsersByRole,
  getPublicDepartments,
  getAvailableTimeSlots,
  createAppointment,
  getDoctorSchedule
} from '../../database';
import { validateAppointment } from '../../utils/validators';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AppointmentBooking = ({ patientId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [specializations, setSpecializations] = useState([]);
  const [formData, setFormData] = useState({
    departmentId: '',
    doctorId: '',
    date: '',
    time: '',
    reason: '',
    isEmergency: false
  });
  const [errors, setErrors] = useState({});
  
  // Use refs to track mounted state and prevent state updates after unmount
  const isMounted = useRef(true);
  
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Safe state setter
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
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    
    fetchDepartments();
  }, []); // Empty dependency array - only runs once

  // Fetch all active doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      safeSetState(setLoading, true);
      try {
        // Fetch only doctors with active status using getUsersByRole
        const result = await getUsersByRole('doctor');
        
        if (result.success && isMounted.current) {
          // Filter only active doctors and map to public-friendly format
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
          
          // Extract unique specializations for potential filter
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
  }, []); // Empty dependency array - only runs once

  // Filter doctors when department changes
  useEffect(() => {
    if (!formData.departmentId) {
      safeSetState(setFilteredDoctors, []);
      return;
    }
    
    // Find department name from ID
    const selectedDept = departments.find(d => d.id === formData.departmentId);
    
    if (selectedDept) {
      // Filter doctors by department name or department ID
      const filtered = doctors.filter(doc => 
        doc.department === selectedDept.name || 
        doc.department === formData.departmentId
      );
      safeSetState(setFilteredDoctors, filtered);
    }
  }, [formData.departmentId, doctors, departments]);

  // Fetch slots and schedule when doctor and date change
  useEffect(() => {
    const fetchSlotsAndSchedule = async () => {
      if (!formData.doctorId || !formData.date) {
        safeSetState(setAvailableSlots, []);
        safeSetState(setDoctorSchedule, []);
        return;
      }
      
      safeSetState(setCheckingSlot, true);
      
      try {
        // Fetch both in parallel
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
  }, [formData.doctorId, formData.date]); // Only depends on doctorId and date

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Reset time and slot when doctor or date changes
      if (name === 'doctorId' || name === 'date') {
        newData.time = '';
        setSelectedSlot(null);
      }
      
      return newData;
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSlotSelect = (slot) => {
    if (!slot.available) {
      toast.error('This slot is not available');
      return;
    }
    setSelectedSlot(slot);
    setFormData(prev => ({ ...prev, time: slot.time }));
    setErrors(prev => ({ ...prev, time: null }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Transform formData to match validation schema
  const validationData = {
    department: formData.departmentId,
    doctorId: formData.doctorId,
    date: formData.date,
    time: formData.time,
    reason: formData.reason
  };

  // Validate form
  const validation = validateAppointment(validationData);
  if (!validation.isValid) {
    setErrors({
      departmentId: validation.errors.department,
      doctorId: validation.errors.doctorId,
      date: validation.errors.date,
      time: validation.errors.time,
      reason: validation.errors.reason
    });
    const firstError = Object.values(validation.errors)[0];
    if (firstError) toast.error(firstError);
    return;
  }

  setLoading(true);

  try {
    // IMPORTANT: Ensure all required fields are included with correct field names
    const appointmentData = {
      patientId,
      doctorId: formData.doctorId,
      department: formData.departmentId, // This will be stored as department
      date: formData.date,
      time: formData.time,
      reason: formData.reason,
      isEmergency: formData.isEmergency || false
    };

    console.log('Sending appointment data:', appointmentData); // Debug log

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
    max.setMonth(max.getMonth() + 3); // Allow booking up to 3 months ahead
    return max.toISOString().split('T')[0];
  };

  const isSlotBooked = (time) => {
    return doctorSchedule.some(apt => apt.time === time && apt.status !== 'cancelled');
  };

  // Render star rating
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Book Appointment
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Emergency Toggle */}
        <div className="flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <input
            type="checkbox"
            id="isEmergency"
            name="isEmergency"
            checked={formData.isEmergency}
            onChange={handleChange}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label htmlFor="isEmergency" className="text-sm font-medium text-red-800 dark:text-red-200">
            This is an emergency case
          </label>
          {formData.isEmergency && (
            <span className="ml-auto text-xs text-red-600 dark:text-red-400 animate-pulse">
              🔴 Priority Booking
            </span>
          )}
        </div>

{/* Department Selection */}
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    <FontAwesomeIcon icon={faBuilding} className="mr-2" />
    Department *
  </label>
  <select
    name="departmentId"
    value={formData.departmentId}
    onChange={handleChange}
    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
      errors.departmentId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`}
  >
    <option value="">Select Department</option>
    {departments.map(dept => (
      <option key={dept.id} value={dept.id}>{dept.name}</option>
    ))}
  </select>
  {errors.departmentId && (
    <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>
  )}
</div>

        {/* Doctor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FontAwesomeIcon icon={faUserMd} className="mr-2" />
            Doctor *
          </label>
          <select
            name="doctorId"
            value={formData.doctorId}
            onChange={handleChange}
            disabled={!formData.departmentId || loading}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.doctorId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } ${!formData.departmentId ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
          >
            <option value="">Select Doctor</option>
            {filteredDoctors.map(doc => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.fullName} - {doc.specialization}
              </option>
            ))}
          </select>
          {errors.doctorId && (
            <p className="mt-1 text-sm text-red-600">{errors.doctorId}</p>
          )}
        </div>

        {/* Doctor Details (when selected) */}
        {formData.doctorId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {doctors.find(d => d.id === formData.doctorId)?.fullName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {doctors.find(d => d.id === formData.doctorId)?.specialization}
                </p>
                <div className="flex items-center mt-1">
                  <div className="flex mr-2">
                    {renderRating(doctors.find(d => d.id === formData.doctorId)?.avgRating || 0)}
                  </div>
                  <span className="text-xs text-gray-500">
                    ({doctors.find(d => d.id === formData.doctorId)?.ratings || 0} reviews)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <FontAwesomeIcon icon={faGraduationCap} className="mr-1" />
                  {doctors.find(d => d.id === formData.doctorId)?.experience || 0}+ years exp.
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(doctors.find(d => d.id === formData.doctorId)?.consultationFee || 0)}
                </p>
                <p className="text-xs text-gray-500">Consultation Fee</p>
              </div>
            </div>
          </div>
        )}

        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
            Date *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={getTodayDate()}
            max={getMaxDate()}
            disabled={!formData.doctorId}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } ${!formData.doctorId ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date}</p>
          )}
        </div>

        {/* Time Slots */}
        {formData.date && formData.doctorId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              Available Time Slots *
            </label>
            {checkingSlot ? (
              <div className="flex justify-center py-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.length === 0 ? (
                  <p className="col-span-3 text-center text-gray-500 dark:text-gray-400 py-4">
                    No available slots for this date
                  </p>
                ) : (
                  availableSlots.map((slot, index) => {
                    const booked = isSlotBooked(slot.time);
                    const isSelected = selectedSlot?.time === slot.time;
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.available || booked}
                        className={`p-2 text-sm rounded-lg border transition ${
                          !slot.available || booked
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 dark:bg-gray-700 dark:text-gray-500'
                            : isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'hover:bg-blue-50 border-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                        }`}
                      >
                        {slot.display}
                        {booked && (
                          <FontAwesomeIcon icon={faExclamationTriangle} className="ml-1 text-xs" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
            {errors.time && (
              <p className="mt-1 text-sm text-red-600">{errors.time}</p>
            )}
          </div>
        )}

        {/* Reason for Visit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
            Reason for Visit *
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows="3"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Describe your symptoms or reason for appointment..."
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Booking...
              </>
            ) : (
              'Book Appointment'
            )}
          </button>
        </div>

        {/* Info Message */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
            Your appointment request will be sent for approval. You'll be notified once confirmed.
          </p>
        </div>
      </form>
    </div>
  );
};

export default AppointmentBooking;