import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faBrain,
  faBaby,
  faBone,
  faEye,
  faTooth,
  faLungs,
  faMicroscope,
  faAmbulance,
  faStethoscope,
  faUserMd,
  faArrowRight,
  faSearch,
  faMapMarkerAlt,
  faPhone,
  faClock,
  faTimes,
  faSpinner,
  faBuilding,
  faCalendarCheck,
  faFlask,
  faHospital,
  faHeart,
  faPills,
  faVial,
  faBandAid
} from '@fortawesome/free-solid-svg-icons';

// Import database functions
import { getDepartments, getUsersByRole } from '../database';
import toast from 'react-hot-toast';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Define icons mapping with fallback
  const departmentIcons = {
    'Cardiology': faHeartbeat,
    'Neurology': faBrain,
    'Gynecology': faBaby,
    'Orthopedics': faBone,
    'Ophthalmology': faEye,
    'Dentistry': faTooth,
    'Pulmonology': faLungs,
    'Laboratory': faMicroscope,
    'Emergency': faAmbulance,
    'Pharmacy': faPills,
    'Radiology': faHospital,
    'General Medicine': faStethoscope,
    'Pediatrics': faBaby,
    'Dermatology': faBandAid,
    'Psychiatry': faBrain,
    'Oncology': faHeart,
    'Pathology': faVial,
    'Microbiology': faMicroscope,
    'Biochemistry': faFlask
  };

  // Define gradient colors mapping
  const departmentColors = {
    'Cardiology': 'from-red-500 to-red-600',
    'Neurology': 'from-purple-500 to-purple-600',
    'Gynecology': 'from-pink-500 to-pink-600',
    'Orthopedics': 'from-orange-500 to-orange-600',
    'Ophthalmology': 'from-blue-500 to-blue-600',
    'Dentistry': 'from-teal-500 to-teal-600',
    'Pulmonology': 'from-indigo-500 to-indigo-600',
    'Laboratory': 'from-yellow-500 to-yellow-600',
    'Emergency': 'from-red-600 to-red-700',
    'Pharmacy': 'from-green-500 to-green-600',
    'Radiology': 'from-cyan-500 to-cyan-600',
    'General Medicine': 'from-blue-600 to-blue-700',
    'Pediatrics': 'from-pink-500 to-pink-600',
    'Dermatology': 'from-amber-500 to-amber-600',
    'Psychiatry': 'from-violet-500 to-violet-600',
    'Oncology': 'from-rose-500 to-rose-600',
    'Pathology': 'from-stone-500 to-stone-600',
    'Microbiology': 'from-lime-500 to-lime-600',
    'Biochemistry': 'from-emerald-500 to-emerald-600'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch departments first
      const deptResult = await getDepartments();
      
      if (!deptResult.success) {
        throw new Error(deptResult.error || 'Failed to load departments');
      }

      // Fetch doctors to count per department
      const doctorsResult = await getUsersByRole('doctor');
      const doctorCountMap = {};
      
      if (doctorsResult.success) {
        doctorsResult.data.forEach(doc => {
          if (doc.department) {
            doctorCountMap[doc.department] = (doctorCountMap[doc.department] || 0) + 1;
          }
        });
      }

      // Enhance departments with additional data
      const enhancedDepts = deptResult.data.map(dept => {
        // Safely process services
        let services = [];
        if (dept.services) {
          if (Array.isArray(dept.services)) {
            services = dept.services.map(s => {
              if (typeof s === 'string') return s;
              if (s && typeof s === 'object' && s.name) return s.name;
              return 'Service';
            });
          }
        }

        return {
          id: dept.id,
          name: dept.name || 'Unnamed Department',
          description: dept.description || '',
          headDoctorName: dept.headDoctorName || null,
          doctorCount: doctorCountMap[dept.id] || 0,
          services: services,
          location: dept.location || 'Main Hospital Building',
          phone: dept.phone || '+1 (234) 567-892',
          hours: dept.hours || 'Mon-Fri: 9am-5pm',
          image: dept.image || null
        };
      });

      setDepartments(enhancedDepts);
      
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return departments;
    
    const term = searchTerm.toLowerCase().trim();
    return departments.filter(dept => {
      const nameMatch = dept.name?.toLowerCase().includes(term) || false;
      const descMatch = dept.description?.toLowerCase().includes(term) || false;
      const serviceMatch = dept.services?.some(s => s?.toLowerCase().includes(term)) || false;
      const headMatch = dept.headDoctorName?.toLowerCase().includes(term) || false;
      
      return nameMatch || descMatch || serviceMatch || headMatch;
    });
  }, [departments, searchTerm]);

  const getDepartmentIcon = (deptName) => {
    // Return the icon component directly
    return departmentIcons[deptName] || faHospital;
  };

  const getDepartmentGradient = (deptName) => {
    return departmentColors[deptName] || 'from-blue-500 to-blue-600';
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Calculate total doctors
  const totalDoctors = useMemo(() => {
    return departments.reduce((total, dept) => total + (dept.doctorCount || 0), 0);
  }, [departments]);

  // Calculate total services
  const totalServices = useMemo(() => {
    return departments.reduce((total, dept) => total + (dept.services?.length || 0), 0);
  }, [departments]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faHospital} className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Departments</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce backdrop-blur-lg">
            <FontAwesomeIcon icon={faBuilding} className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Our Departments</h1>
          <p className="text-xl max-w-3xl mx-auto text-blue-100">
            Comprehensive medical care across multiple specialized departments with state-of-the-art facilities
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-white dark:bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{departments.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Departments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalDoctors}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Specialists</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">24/7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Emergency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{totalServices}+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments by name, description, services, or head doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white shadow-lg"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
          
          {searchTerm && (
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400">
              Found <span className="font-semibold text-blue-600">{filteredDepartments.length}</span> departments matching "{searchTerm}"
            </p>
          )}
        </div>
      </section>

      {/* Departments Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredDepartments.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <FontAwesomeIcon icon={faBuilding} className="h-20 w-20 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Departments Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search term</p>
              <button
                onClick={clearSearch}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDepartments.map((dept) => {
                const IconComponent = getDepartmentIcon(dept.name);
                const gradient = getDepartmentGradient(dept.name);
                
                return (
                  <Link
                    key={dept.id}
                    to={`/department/${dept.id}`}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group"
                  >
                    {/* Header with gradient */}
                    <div className={`relative h-40 bg-gradient-to-r ${gradient}`}>
                      <div className="absolute inset-0 bg-black opacity-10"></div>
                      
                      {/* Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center border-2 border-white/30">
                          <FontAwesomeIcon icon={IconComponent} className="h-10 w-10 text-white" />
                        </div>
                      </div>

                      {/* Doctor Count Badge */}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 rounded-full px-3 py-1 shadow-lg">
                        <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                          <FontAwesomeIcon icon={faUserMd} className="mr-1 text-blue-500" />
                          {dept.doctorCount} Doctors
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors mb-2">
                        {dept.name}
                      </h3>
                      
                      {dept.headDoctorName && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                          Head: {dept.headDoctorName}
                        </p>
                      )}

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {dept.description || 'Comprehensive medical care provided by expert specialists.'}
                      </p>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-blue-500" />
                          <span className="truncate">{dept.location}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-500" />
                          <span className="truncate">{dept.hours}</span>
                        </div>
                      </div>

                      {/* Services Preview */}
                      {dept.services && dept.services.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                            Key Services
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {dept.services.slice(0, 3).map((service, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs"
                              >
                                {service}
                              </span>
                            ))}
                            {dept.services.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs">
                                +{dept.services.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* View Details Link */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <span className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform">
                          View Department Details
                          <FontAwesomeIcon icon={faArrowRight} className="ml-2 text-sm" />
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {dept.services?.length || 0} Services
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Department Features */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose Our Departments
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faUserMd} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Expert Specialists</h3>
              <p className="text-gray-600 dark:text-gray-400">Board-certified specialists with years of experience</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faFlask} className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Modern Technology</h3>
              <p className="text-gray-600 dark:text-gray-400">State-of-the-art equipment and advanced diagnostics</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faCalendarCheck} className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Easy Access</h3>
              <p className="text-gray-600 dark:text-gray-400">Quick appointments and minimal waiting times</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-2xl font-bold mb-2">Need Help Choosing a Department?</h3>
                <p className="text-blue-100">Our team is here to assist you in finding the right specialist</p>
              </div>
              <div className="flex space-x-4">
                <a
                  href="tel:+1234567891"
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition font-semibold flex items-center"
                >
                  <FontAwesomeIcon icon={faPhone} className="mr-2" />
                  Call Us
                </a>
                <Link
                  to="/contact"
                  className="px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition font-semibold"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="py-16 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">24/7 Emergency Services</h2>
          <p className="text-xl text-red-100 mb-8">Our emergency department is always ready to serve you</p>
          <a
            href="tel:+1234567890"
            className="inline-flex items-center px-8 py-4 bg-white text-red-600 rounded-xl hover:bg-gray-100 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <FontAwesomeIcon icon={faAmbulance} className="mr-2 animate-pulse" />
            Emergency: +1 (234) 567-890
          </a>
        </div>
      </section>
    </div>
  );
};

export default Departments;