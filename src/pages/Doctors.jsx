import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faStarHalfAlt,
  faSearch,
  faFilter,
  faPhone,
  faAward,
  faUserMd,
  faClock,
  faChevronRight,
  faStethoscope,
  faBriefcase,
  faLanguage,
  faTimes,
  faSpinner,
  faHeart
} from '@fortawesome/free-solid-svg-icons';
import { getUsersByRole } from '../database';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [specializations, setSpecializations] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState('all');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      // Fetch only doctors with active status
      const result = await getUsersByRole('doctor');
      
      if (result.success) {
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

        setDoctors(activeDoctors);
        
        // Extract unique specializations
        const specs = [...new Set(activeDoctors.map(d => d.specialization).filter(Boolean))];
        setSpecializations(specs.sort());
      } else {
        toast.error('Failed to load doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        doctor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.qualifications?.some(q => q?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        doctor.languages?.some(l => l?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Specialization filter
      const matchesSpecialization = selectedSpecialization === 'all' || 
        doctor.specialization === selectedSpecialization;
      
      // Experience filter
      const matchesExperience = selectedExperience === 'all' ||
        (selectedExperience === '0-5' && doctor.experience <= 5) ||
        (selectedExperience === '5-10' && doctor.experience > 5 && doctor.experience <= 10) ||
        (selectedExperience === '10-15' && doctor.experience > 10 && doctor.experience <= 15) ||
        (selectedExperience === '15+' && doctor.experience > 15);
      
      return matchesSearch && matchesSpecialization && matchesExperience;
    });
  }, [doctors, searchTerm, selectedSpecialization, selectedExperience]);

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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialization('all');
    setSelectedExperience('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section with Animated Background */}
      <section className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce backdrop-blur-lg">
            <FontAwesomeIcon icon={faUserMd} className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Our Expert Doctors</h1>
          <p className="text-xl max-w-3xl mx-auto text-blue-100">
            Meet our team of experienced and compassionate healthcare professionals dedicated to your wellbeing
          </p>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialization, qualification, or language..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            </div>

            {/* Specialization Filter */}
            <div className="w-full lg:w-64">
              <div className="relative">
                <FontAwesomeIcon icon={faFilter} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="all">All Specializations</option>
                  {specializations.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Experience Filter */}
            <div className="w-full lg:w-48">
              <div className="relative">
                <FontAwesomeIcon icon={faBriefcase} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="all">All Experience</option>
                  <option value="0-5">0-5 Years</option>
                  <option value="5-10">5-10 Years</option>
                  <option value="10-15">10-15 Years</option>
                  <option value="15+">15+ Years</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedSpecialization !== 'all' || selectedExperience !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center">
                    Search: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="ml-2 hover:text-blue-600">
                      <FontAwesomeIcon icon={faTimes} size="sm" />
                    </button>
                  </span>
                )}
                {selectedSpecialization !== 'all' && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm flex items-center">
                    {selectedSpecialization}
                    <button onClick={() => setSelectedSpecialization('all')} className="ml-2 hover:text-green-600">
                      <FontAwesomeIcon icon={faTimes} size="sm" />
                    </button>
                  </span>
                )}
                {selectedExperience !== 'all' && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm flex items-center">
                    {selectedExperience} Years
                    <button onClick={() => setSelectedExperience('all')} className="ml-2 hover:text-purple-600">
                      <FontAwesomeIcon icon={faTimes} size="sm" />
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 transition"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results Summary */}
      <section className="py-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredDoctors.length}</span> doctors
            {searchTerm && <span> matching "<span className="font-semibold">{searchTerm}</span>"</span>}
          </p>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading doctors...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <FontAwesomeIcon icon={faUserMd} className="h-20 w-20 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Doctors Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filter criteria</p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDoctors.map((doctor) => (
                <Link
                  key={doctor.id}
                  to={`/doctor/${doctor.id}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group"
                >
                  {/* Header with gradient */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-700">
                    <div className="absolute inset-0 bg-black opacity-20"></div>
                    
                    {/* Profile Image or Icon */}
  <div className="absolute inset-0 flex items-center justify-center">
    {doctor.profileImage ? (
      <img 
        src={doctor.profileImage} 
        alt={doctor.fullName}
        className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
      />
    ) : (
      <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-full border-4 border-white flex items-center justify-center">
        <FontAwesomeIcon icon={faUserMd} className="h-12 w-12 text-white" />
      </div>
    )}
  </div>


                    {/* Consultation Fee Badge */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 rounded-full px-4 py-2 shadow-lg">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(doctor.consultationFee)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors mb-1">
                      Dr. {doctor.fullName}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">{doctor.specialization}</p>

                    {/* Rating */}
                    {doctor.ratings > 0 && (
                      <div className="flex items-center space-x-1 mb-3">
                        <div className="flex">
                          {renderRating(doctor.avgRating)}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ({doctor.ratings} reviews)
                        </span>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {doctor.experience > 0 && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faBriefcase} className="mr-2 text-blue-500" />
                          <span>{doctor.experience}+ years</span>
                        </div>
                      )}

                      {doctor.qualifications && doctor.qualifications.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 truncate">
                          <FontAwesomeIcon icon={faAward} className="mr-2 text-blue-500" />
                          <span className="truncate">{doctor.qualifications[0]}</span>
                        </div>
                      )}

                      {doctor.availableDays && doctor.availableDays.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-500" />
                          <span>{doctor.availableDays.length} days/week</span>
                        </div>
                      )}

                      {doctor.languages && doctor.languages.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 truncate">
                          <FontAwesomeIcon icon={faLanguage} className="mr-2 text-blue-500" />
                          <span className="truncate">{doctor.languages[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* About Preview */}
                    {doctor.about && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {doctor.about}
                      </p>
                    )}

                    {/* Book Button */}
                    <button className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-md hover:shadow-xl transform group-hover:scale-105 flex items-center justify-center">
                      <span>Book Appointment</span>
                      <FontAwesomeIcon icon={faChevronRight} className="ml-2 text-sm group-hover:translate-x-1 transition" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose Our Doctors
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faStethoscope} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Expertise</h3>
              <p className="text-gray-600 dark:text-gray-400">Highly qualified specialists with years of experience</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faHeart} className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Compassionate Care</h3>
              <p className="text-gray-600 dark:text-gray-400">Patient-centered approach with personalized attention</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faClock} className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Convenient Scheduling</h3>
              <p className="text-gray-600 dark:text-gray-400">Flexible appointment times and online booking</p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="py-16 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Need Immediate Assistance?</h2>
          <p className="text-xl text-red-100 mb-8">Our emergency services are available 24/7</p>
          <a
            href="tel:+1234567890"
            className="inline-flex items-center px-8 py-4 bg-white text-red-600 rounded-xl hover:bg-gray-100 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <FontAwesomeIcon icon={faPhone} className="mr-2 animate-pulse" />
            Emergency: +1 (234) 567-890
          </a>
        </div>
      </section>
    </div>
  );
};

export default Doctors;