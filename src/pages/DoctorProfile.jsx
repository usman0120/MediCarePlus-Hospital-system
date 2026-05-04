/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faStarHalfAlt,
  faGraduationCap,
  faAward,
  faUserMd,
  faArrowLeft,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faClock,
  faCalendarCheck,
  faComment,
  faShare,
  faGlobe,
  faHeart,
  faBriefcase,
  faLanguage,
  faChevronRight,
  faExclamationCircle,
  faUserCircle,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { getPublicDoctorById, getAvailableTimeSlots} from '../database';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, userDetails } = useAuth();
  
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [similarDoctors, setSimilarDoctors] = useState([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  useEffect(() => {
    if (doctor && selectedDate) {
      fetchTimeSlots();
    }
  }, [doctor, selectedDate]);

  useEffect(() => {
    if (doctor) {
      fetchReviews();
      fetchSimilarDoctors();
    }
  }, [doctor]);

  const fetchDoctor = async () => {
  try {
    setLoading(true);
    const result = await getPublicDoctorById(id);
    if (result.success) {
      setDoctor(result.data);
      
      // Fetch real reviews from database
      await fetchRealReviews(id);
      
      // Fetch similar doctors based on specialization
      await fetchRealSimilarDoctors(result.data.specialization);
      
      // Check if doctor is saved by current user (if authenticated)
      if (isAuthenticated && userDetails) {
        // You would check saved doctors list here
        // setIsSaved(userDetails.savedDoctors?.includes(id));
      }
    } else {
      toast.error('Doctor not found');
    }
  } catch (error) {
    console.error('Error fetching doctor:', error);
    toast.error('Failed to load doctor details');
  } finally {
    setLoading(false);
  }
};

const fetchRealReviews = async (doctorId) => {
  try {
    setLoadingReviews(true);
    // Import getDoctorRatingsWithPatients from database for patient names
    const { getDoctorRatingsWithPatients } = await import('../database');
    const result = await getDoctorRatingsWithPatients(doctorId);
    
    if (result.success && result.data.length > 0) {
      // Transform ratings to review format with patient names
      const formattedReviews = result.data.map(rating => ({
        id: rating.id,
        patientName: rating.patientName || rating.patient?.fullName || 'Anonymous Patient',
        rating: rating.rating || 5,
        comment: rating.comment || rating.feedback || 'No comment provided',
        date: rating.createdAt || new Date(),
        avatar: rating.patientPhoto || rating.patient?.profileImage || null
      }));
      setReviews(formattedReviews);
    } else {
      // Set empty array if no reviews
      setReviews([]);
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
    // Set empty reviews on error
    setReviews([]);
  } finally {
    setLoadingReviews(false);
  }
};

const fetchRealSimilarDoctors = async (specialization) => {
  try {
    // Import getUsersByRole from database
    const { getUsersByRole } = await import('../database');
    const result = await getUsersByRole('doctor');
    
    if (result.success) {
      const similar = result.data
        .filter(doc => 
          doc.id !== id && 
          doc.specialization === specialization &&
          doc.accountStatus === 'active'
        )
        .slice(0, 3)
        .map(doc => ({
          id: doc.id,
          name: doc.fullName || 'Unknown',
          specialization: doc.specialization || specialization,
          experience: doc.experience || 0,
          rating: doc.avgRating || 0,
          image: doc.profileImage || null
        }));
      setSimilarDoctors(similar);
    }
  } catch (error) {
    console.error('Error fetching similar doctors:', error);
  }
};

  const fetchTimeSlots = async () => {
    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await getAvailableTimeSlots(id, dateStr);
      if (result.success) {
        setTimeSlots(result.data);
        setSelectedTime(null);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      // In a real app, you would fetch reviews from your database
      // For now, using mock data
      setReviews([
        {
          id: 1,
          patientName: 'Sarah Ahmed',
          rating: 5,
          comment: 'Dr. Ahmed is an excellent cardiologist. Very thorough and caring. He explained everything in detail and made me feel comfortable throughout the consultation.',
          date: new Date('2024-02-15'),
          avatar: null
        },
        {
          id: 2,
          patientName: 'Muhammad Ali',
          rating: 4,
          comment: 'Very professional and knowledgeable. The waiting time was a bit long but the consultation was worth it.',
          date: new Date('2024-02-10'),
          avatar: null
        },
        {
          id: 3,
          patientName: 'Fatima Khan',
          rating: 5,
          comment: 'Best doctor I have ever visited. His diagnosis was spot on and the treatment worked perfectly.',
          date: new Date('2024-02-05'),
          avatar: null
        }
      ]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchSimilarDoctors = async () => {
    try {
      // In a real app, you would fetch similar doctors from your database
      // based on specialization or department
      setSimilarDoctors([
        {
          id: '2',
          name: 'Sarah Khan',
          specialization: 'Cardiologist',
          experience: 12,
          rating: 4.8,
          image: null
        },
        {
          id: '3',
          name: 'Ahmed Raza',
          specialization: 'Cardiologist',
          experience: 15,
          rating: 4.9,
          image: null
        },
        {
          id: '4',
          name: 'Fatima Hassan',
          specialization: 'Cardiologist',
          experience: 8,
          rating: 4.7,
          image: null
        }
      ]);
    } catch (error) {
      console.error('Error fetching similar doctors:', error);
    }
  };

  const handleBookAppointment = () => {
    if (!isAuthenticated) {
      toast.error('Please login to book an appointment');
      navigate('/login', { state: { from: `/doctor/${id}` } });
      return;
    }

    if (userDetails?.role !== 'patient') {
      toast.error('Only patients can book appointments');
      return;
    }

    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }
    
    // Redirect to appointment booking with pre-filled data
    const dateStr = selectedDate.toISOString().split('T')[0];
    navigate(`/appointment?doctor=${id}&date=${dateStr}&time=${selectedTime}`);
  };

  const handleContactDoctor = () => {
    if (!isAuthenticated) {
      toast.error('Please login to contact the doctor');
      navigate('/login', { state: { from: `/doctor/${id}` } });
      return;
    }

    if (userDetails?.role !== 'patient') {
      toast.error('Only patients can contact doctors');
      return;
    }

    navigate(`/chat?doctor=${id}`);
  };

  const handleSaveDoctor = () => {
    if (!isAuthenticated) {
      toast.error('Please login to save doctors');
      navigate('/login', { state: { from: `/doctor/${id}` } });
      return;
    }

    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Doctor removed from saved list' : 'Doctor saved to your list');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard');
  };

  const renderRating = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<FontAwesomeIcon key={`full-${i}`} icon={faStar} className="text-yellow-400" />);
  }
  if (hasHalfStar) {
    stars.push(<FontAwesomeIcon key="half" icon={faStarHalfAlt} className="text-yellow-400" />);
  }
  const remaining = 5 - stars.length;
  for (let i = 0; i < remaining; i++) {
    stars.push(<FontAwesomeIcon key={`empty-${i}`} icon={faStar} className="text-gray-300 dark:text-gray-600" />);
  }
  return stars;
};

const calculateAverageRating = () => {
  if (!reviews.length) return doctor?.avgRating || 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / reviews.length;
};

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading doctor profile...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <FontAwesomeIcon icon={faExclamationCircle} className="h-20 w-20 text-gray-400 mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Doctor Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">The doctor you're looking for doesn't exist or may have been removed</p>
        <Link
          to="/doctors"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center shadow-lg"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Browse All Doctors
        </Link>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/doctors"
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 transition group"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2 group-hover:-translate-x-1 transition" />
              <span>Back to Doctors</span>
            </Link>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveDoctor}
                className={`p-2 rounded-full transition ${
                  isSaved 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save doctor'}
              >
                <FontAwesomeIcon icon={faHeart} className={isSaved ? 'fas' : 'far'} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition"
                title="Share profile"
              >
                <FontAwesomeIcon icon={faShare} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-2xl">
                {doctor.profileImage ? (
                  <img
                    src={doctor.profileImage}
                    alt={doctor.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                    <FontAwesomeIcon icon={faUserMd} className="h-20 w-20 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Dr. {doctor.fullName}</h1>
              <p className="text-xl text-blue-100 mb-3">{doctor.specialization}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                {/* Rating */}
                <div className="flex items-center">
                  <div className="flex mr-2">
                    {renderRating(averageRating)}
                  </div>
                  <span className="text-sm text-blue-100">
                    ({reviews.length} reviews)
                  </span>
                </div>

                {/* Experience */}
                {doctor.experience > 0 && (
                  <div className="flex items-center text-sm text-blue-100">
                    <FontAwesomeIcon icon={faBriefcase} className="mr-1" />
                    <span>{doctor.experience}+ years experience</span>
                  </div>
                )}

                {/* Patients Treated (if available) */}
                {doctor.patientsTreated && (
                  <div className="flex items-center text-sm text-blue-100">
                    <FontAwesomeIcon icon={faUserMd} className="mr-1" />
                    <span>{doctor.patientsTreated}+ patients</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={handleBookAppointment}
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition font-semibold shadow-lg flex items-center"
                >
                  <FontAwesomeIcon icon={faCalendarCheck} className="mr-2" />
                  Book Appointment
                </button>
                <button
                  onClick={handleContactDoctor}
                  className="px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition font-semibold flex items-center"
                >
                  <FontAwesomeIcon icon={faComment} className="mr-2" />
                  Contact Doctor
                </button>
                {doctor.videoConsultation && (
                  <button
                    onClick={handleBookAppointment}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold flex items-center"
                  >
                    <FontAwesomeIcon icon={faVideo} className="mr-2" />
                    Video Consultation
                  </button>
                )}
              </div>
            </div>

            {/* Consultation Fee Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
              <p className="text-sm text-blue-100 mb-1">Consultation Fee</p>
              <p className="text-3xl font-bold mb-2">{formatCurrency(doctor.consultationFee)}</p>
              <p className="text-xs text-blue-100">+ tax if applicable</p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white dark:bg-gray-800 shadow-sm sticky top-[57px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide space-x-1">
            {['about', 'qualifications', 'experience', 'reviews', 'location'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium text-sm capitalize whitespace-nowrap border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">About Dr. {doctor.fullName}</h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {doctor.about || `Dr. ${doctor.fullName} is a highly qualified and experienced ${doctor.specialization} with over ${doctor.experience} years of clinical practice. They are dedicated to providing compassionate, patient-centered care and staying up-to-date with the latest medical advancements.`}
                  </p>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{doctor.experience}+</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Years Experience</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reviews.length}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total Reviews</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{doctor.patientsTreated || '500'}+</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Patients</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{doctor.languages?.length || 1}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Languages</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Qualifications Tab */}
              {activeTab === 'qualifications' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Qualifications & Education</h2>
                  
                  {/* Medical Degrees */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <FontAwesomeIcon icon={faGraduationCap} className="mr-2 text-blue-600" />
                      Medical Education
                    </h3>
                    <div className="space-y-3">
                      {doctor.education && doctor.education.length > 0 ? (
                        doctor.education.map((edu, index) => (
                          <div key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{edu}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Medical Degree</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400">No education information available</p>
                      )}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <FontAwesomeIcon icon={faAward} className="mr-2 text-yellow-600" />
                      Certifications & Licenses
                    </h3>
                    <div className="space-y-3">
                      {doctor.qualifications && doctor.qualifications.length > 0 ? (
                        doctor.qualifications.map((qual, index) => (
                          <div key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{qual}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Professional Certification</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400">No certification information available</p>
                      )}
                    </div>
                  </div>

                  {/* License Number */}
                  {doctor.licenseNumber && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">License Number</p>
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{doctor.licenseNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Experience Tab */}
              {activeTab === 'experience' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Professional Experience</h2>
                  
                  {doctor.experience && (
                    <div className="space-y-6">
                      {/* Current Position */}
                      <div className="relative pl-8 pb-6 border-l-2 border-blue-600">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 bg-blue-600 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Senior {doctor.specialization}</h3>
                        <p className="text-blue-600 dark:text-blue-400 mb-2">MediCare Plus Hospital · Present</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Leading cardiology department, performing complex procedures, and mentoring junior doctors.
                        </p>
                      </div>

                      {/* Previous Experience */}
                      <div className="relative pl-8 pb-6 border-l-2 border-gray-300 dark:border-gray-600">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 bg-gray-400 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Consultant Cardiologist</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">City General Hospital · 2015 - 2020</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Managed cardiac patients, performed echocardiograms, and participated in research studies.
                        </p>
                      </div>

                      <div className="relative pl-8 border-l-2 border-gray-300 dark:border-gray-600">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 bg-gray-400 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resident Doctor</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">University Medical Center · 2010 - 2015</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Completed residency in internal medicine with specialization in cardiology.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Reviews</h2>
                    <div className="flex items-center">
                      <div className="flex mr-2">
                        {renderRating(averageRating)}
                      </div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {loadingReviews ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <FontAwesomeIcon icon={faStar} className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No reviews yet</p>
                      <p className="text-sm text-gray-500 mt-2">Be the first to review this doctor</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {review.avatar ? (
                                <img
                                  src={review.avatar}
                                  alt={review.patientName}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <FontAwesomeIcon icon={faUserCircle} className="h-6 w-6 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{review.patientName}</h4>
                                <span className="text-sm text-gray-500">{formatDate(review.date)}</span>
                              </div>
                              <div className="flex items-center space-x-1 my-2">
                                {[...Array(5)].map((_, i) => (
                                  <FontAwesomeIcon
                                    key={i}
                                    icon={faStar}
                                    className={i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                    size="sm"
                                  />
                                ))}
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 mt-2">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAuthenticated && userDetails?.role === 'patient' && (
                    <button className="mt-6 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition font-medium">
                      Write a Review
                    </button>
                  )}
                </div>
              )}

              {/* Location Tab */}
              {activeTab === 'location' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Clinic Location</h2>
                  
                  <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4 overflow-hidden">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.2219901290355!2d-74.00369368400567!3d40.713129379331!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a316bb7b8c3%3A0xb4d8a0cf5a2e7b3!2sCity%20Hall%20Park!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      title="Clinic Location"
                    ></iframe>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-600 mt-1 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Clinic Address</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {doctor.clinicAddress || '123 Healthcare Avenue, Medical District, New York, NY 10001'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <FontAwesomeIcon icon={faClock} className="text-blue-600 mt-1 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Working Hours</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Monday - Friday: 9:00 AM - 5:00 PM<br />
                          Saturday: 10:00 AM - 2:00 PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <FontAwesomeIcon icon={faPhone} className="text-blue-600 mt-1 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Clinic Phone</p>
                        <p className="text-gray-600 dark:text-gray-400">+1 (234) 567-895</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Appointment Booking Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-[140px]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FontAwesomeIcon icon={faCalendarCheck} className="mr-2 text-blue-600" />
                  Book Appointment
                </h3>

                {/* Date Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Date
                  </label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={setSelectedDate}
                    minDate={new Date()}
                    maxDate={new Date(new Date().setMonth(new Date().getMonth() + 1))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Time Slots */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Time Slots
                  </label>
                  {loadingSlots ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`px-2 py-2 text-sm rounded-lg transition ${
                            !slot.available
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                              : selectedTime === slot.time
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800'
                          }`}
                        >
                          {slot.display}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Book Button */}
                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedTime}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  <FontAwesomeIcon icon={faCalendarCheck} className="mr-2" />
                  {isAuthenticated ? 'Proceed to Booking' : 'Login to Book'}
                </button>

                {!isAuthenticated && (
                  <p className="text-xs text-center text-gray-500 mt-3">
                    Please <Link to="/login" className="text-blue-600 hover:underline">login</Link> to book an appointment
                  </p>
                )}
              </div>

              {/* Languages Card */}
              {doctor.languages && doctor.languages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                    <FontAwesomeIcon icon={faLanguage} className="mr-2 text-blue-600" />
                    Languages Spoken
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {doctor.languages.map((lang, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <FontAwesomeIcon icon={faPhone} className="mr-2 text-blue-600" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faPhone} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <a href="tel:+1234567895" className="text-sm text-gray-900 dark:text-white hover:text-blue-600">
                        +1 (234) 567-895
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <a href={`mailto:${doctor.email || 'doctor@medicareplus.com'}`} className="text-sm text-gray-900 dark:text-white hover:text-blue-600">
                        {doctor.email || 'doctor@medicareplus.com'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faGlobe} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Website</p>
                      <a href={doctor.website || '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-900 dark:text-white hover:text-blue-600">
                        {doctor.website ? 'Visit Website' : 'Not available'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Doctors Section */}
      {similarDoctors.length > 0 && (
        <section className="py-12 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Similar Doctors</h2>
              <Link
                to="/doctors"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                View All
                <FontAwesomeIcon icon={faChevronRight} className="ml-1 text-sm" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarDoctors.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/doctor/${doc.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition p-6 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      {doc.image ? (
                        <img src={doc.image} alt={doc.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <FontAwesomeIcon icon={faUserMd} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition">
                        Dr. {doc.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{doc.specialization}</p>
                      <div className="flex items-center mt-1">
                        <div className="flex mr-1">
                          {renderRating(doc.rating)}
                        </div>
                        <span className="text-xs text-gray-500">{doc.experience}+ yrs</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Book an Appointment?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Take the first step towards better health with Dr. {doctor.fullName}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleBookAppointment}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition font-bold shadow-lg"
            >
              Book Appointment
            </button>
            <Link
              to="/contact"
              className="px-8 py-4 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition font-bold"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DoctorProfile;