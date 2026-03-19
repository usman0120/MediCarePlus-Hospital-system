import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  // Solid Icons
  faHospital,
  faUserMd,
  faCalendarCheck,
  faFlask,
  faChartLine,
  faArrowRight,
  faHeartbeat,
  faPhoneAlt,
  faAmbulance,
  faTimes,
  faStar,
  faMapMarkerAlt,
  faEnvelope,
  faChevronRight,
  faClock,
  faAward,
  faUsers,
  faMicroscope,
  faHeart,
  faBrain,
  faBaby,
  faBone,
  faEye,
  faTooth,
  faLungs,
  faSyringe,
  faFileInvoice,
  faVideo,
  faQuestionCircle,
  faLock,
  faFileContract,
  faCookieBite,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import {
  // Brand Icons
  faFacebookF,
  faTwitter,
  faLinkedinIn,
  faInstagram,
  faYoutube
} from '@fortawesome/free-brands-svg-icons';

import { getPublicDoctors, getPublicDepartments } from '../database';
import hospitalLogo from '../../assets/logo.png';

const Home = () => {
  const { isAuthenticated, userDetails } = useAuth();
  const navigate = useNavigate();
  const redirectAttempted = useRef(false);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(false);
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    appointments: 0,
    years: 15
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && userDetails?.role && !redirectAttempted.current) {
      redirectAttempted.current = true;
      navigate(`/${userDetails.role}`, { replace: true });
    }
  }, [isAuthenticated, userDetails, navigate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    let isMounted = true;
    
    try {
      setLoading(true);
      setError(null);
      
      const [doctorsResult, departmentsResult] = await Promise.all([
        getPublicDoctors(),
        getPublicDepartments()
      ]);
      
      if (isMounted) {
        if (doctorsResult.success) {
          setDoctors(doctorsResult.data.slice(0, 4));
          setStats(prev => ({ ...prev, doctors: doctorsResult.data.length }));
        }
        if (departmentsResult.success) {
          setDepartments(departmentsResult.data.slice(0, 6));
        }
      }
    } catch (error) {
      if (isMounted) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
    
    // Animate stats counting
    const interval = setInterval(() => {
      setStats(prev => ({
        patients: prev.patients < 500 ? prev.patients + 10 : 500,
        doctors: prev.doctors,
        appointments: prev.appointments < 1000 ? prev.appointments + 20 : 1000,
        years: 15
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [fetchData]);

  const features = [
    {
      icon: faCalendarCheck,
      title: 'Smart Appointments',
      description: 'Book and manage appointments with your preferred doctors online, 24/7',
      color: 'from-blue-500 to-blue-600',
      link: '/appointment'
    },
    {
      icon: faUserMd,
      title: 'Expert Doctors',
      description: 'Access to 200+ qualified specialists across 15+ medical departments',
      color: 'from-green-500 to-green-600',
      link: '/doctors'
    },
    {
      icon: faFlask,
      title: 'Lab Integration',
      description: 'Seamless lab test requests and instant results on your dashboard',
      color: 'from-purple-500 to-purple-600',
      link: '/lab'
    },
    {
      icon: faFileInvoice,
      title: 'Billing & Insurance',
      description: 'Easy bill payments and insurance claim processing',
      color: 'from-orange-500 to-orange-600',
      link: '/billing'
    },
    {
      icon: faChartLine,
      title: 'Medical Records',
      description: 'Access your complete medical history and health analytics',
      color: 'from-red-500 to-red-600',
      link: '/medical-records'
    },
    {
      icon: faVideo,
      title: 'Telemedicine',
      description: 'Consult with doctors from the comfort of your home',
      color: 'from-indigo-500 to-indigo-600',
      link: '/telemedicine'
    }
  ];

  const quickLinks = [
    { to: '/appointment', label: 'Book Appointment', icon: faCalendarCheck, color: 'blue' },
    { to: '/medical-records', label: 'Medical Records', icon: faChartLine, color: 'green' },
    { to: '/billing', label: 'Billing & Insurance', icon: faFileInvoice, color: 'purple' },
    { to: '/visitor-info', label: 'Visitor Information', icon: faUsers, color: 'orange' },
    { to: '/health-resources', label: 'Health Resources', icon: faHeartbeat, color: 'red' },
    { to: '/help', label: 'Help Center', icon: faQuestionCircle, color: 'indigo' }
  ];

  const departmentIcons = {
    'Cardiology': faHeart,
    'Neurology': faBrain,
    'Gynecology': faBaby,
    'Orthopedics': faBone,
    'Ophthalmology': faEye,
    'Dentistry': faTooth,
    'Pulmonology': faLungs,
    'Emergency': faAmbulance,
    'Laboratory': faMicroscope,
    'Pharmacy': faSyringe
  };

  const getLinkHandler = (path) => {
    if (path === '/appointment' || path === '/medical-records' || path === '/billing') {
      return (e) => {
        e.preventDefault();
        if (isAuthenticated) {
          navigate(path);
        } else {
          navigate('/login', { state: { from: path, message: 'Please login to access this feature' } });
        }
      };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-gentle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 3s ease-in-out infinite;
        }
        .animate-slide-in-left {
          animation: slide-in-left 1s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slide-in-right 1s ease-out forwards;
        }
        .animate-slide-in-up {
          animation: slide-in-up 1s ease-out forwards;
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
      `}</style>

      {/* Premium Navigation */}
      <nav className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-lg blur opacity-30"></div>
                <img src={hospitalLogo} alt="MediCare Plus" className="h-12 w-auto relative" />
              </div>
              <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                MediCare Plus
              </span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {[
                { to: '/', label: 'Home' },
                { to: '/about', label: 'About' },
                { to: '/doctors', label: 'Doctors' },
                { to: '/departments', label: 'Departments' },
                { to: '/contact', label: 'Contact' }
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-all duration-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-600"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

            {/* Error State - Modern Redesign */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl border-l-4 border-red-600 overflow-hidden">
            {/* Decorative element */}
            <div className="absolute right-0 top-0 w-32 h-32">
              <FontAwesomeIcon icon={faExclamationTriangle} className="absolute right-4 top-4 text-red-200 dark:text-red-800/30 h-20 w-20" />
            </div>
            
            <div className="relative p-6 pr-32">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-red-600 rounded-xl p-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Oops! Something went wrong</h3>
                  <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors inline-flex items-center group"
                  >
                    Try Again 
                    <FontAwesomeIcon icon={faArrowRight} className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Banner - Modern Redesign */}
      <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="emergency-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#emergency-pattern)" />
          </svg>
        </div>

        {/* Animated pulse effect */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            {/* Left side - Emergency header */}
            <div className="flex items-center space-x-4 mb-3 sm:mb-0">
              <div className="relative flex items-center">
                <div className="absolute inset-0 animate-ping bg-red-500 rounded-full opacity-20"></div>
                <div className="relative bg-white/20 backdrop-blur-sm p-2 rounded-full">
                  <FontAwesomeIcon icon={faAmbulance} className="h-6 w-6 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-red-200">24/7 Emergency</span>
                <h3 className="text-xl font-bold">Critical Care Available Now</h3>
              </div>
            </div>

            {/* Right side - Contact numbers with modern cards */}
            <div className="flex flex-wrap items-center gap-4">
              <a href="tel:+1234567890" className="group flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/40">
                <FontAwesomeIcon icon={faPhoneAlt} className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                <div>
                  <span className="text-xs text-red-200">Primary</span>
                  <p className="font-bold text-lg leading-5">+1 (234) 567-890</p>
                </div>
              </a>
              <div className="hidden md:block w-px h-8 bg-white/30"></div>
              <a href="tel:+1234567891" className="group flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/40">
                <FontAwesomeIcon icon={faPhoneAlt} className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                <div>
                  <span className="text-xs text-red-200">Secondary</span>
                  <p className="font-bold text-lg leading-5">+1 (234) 567-891</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State - Modern Redesign */}
      {loading && (
        <div className="flex justify-center items-center py-32">
          <div className="relative">
            {/* Outer ring with gradient */}
            <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            
            {/* Inner medical cross */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <FontAwesomeIcon icon={faHospital} className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
        </div>
      )}


      {/* Hero Section - Premium Redesign */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 via-transparent to-purple-900/30"></div>

        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float-slow animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content - Modern Typography */}
            <div className="space-y-8">
              {/* Trust badge */}
              <div className="inline-flex items-center space-x-3 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-gray-300">Trusted by 500,000+ patients</span>
              </div>

              {/* Main Heading with modern split */}
              <div className="space-y-2">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">Your Health,</span>
                  <br />
                  <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 bg-clip-text text-transparent">Our Mission</span>
                </h1>
              </div>

              {/* Description with better readability */}
              <p className="text-xl text-gray-300 max-w-lg leading-relaxed border-l-4 border-yellow-400 pl-6">
                Experience world-class healthcare with cutting-edge technology and compassionate doctors. Your journey to better health starts here.
              </p>

              {/* CTA Buttons - Premium Design */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  to="/register"
                  className="group relative px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-gray-900 rounded-xl hover:from-yellow-400 hover:to-yellow-300 transition-all duration-300 font-bold text-lg overflow-hidden shadow-2xl hover:shadow-yellow-500/25 transform hover:-translate-y-1"
                >
                  <span className="relative z-10 flex items-center">
                    Get Started Today
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer"></div>
                </Link>
                
              </div>

              {/* Quick Access Links - Modern Cards */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                {quickLinks.slice(0, 3).map((link, idx) => (
                  <Link
                    key={idx}
                    to={link.to}
                    onClick={getLinkHandler(link.to)}
                    className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20"
                  >
                    <div className={`w-10 h-10 bg-${link.color}-500/20 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <FontAwesomeIcon icon={link.icon} className={`h-5 w-5 text-${link.color}-400`} />
                    </div>
                    <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Content - Premium Hospital Image with Modern Cards */}
            <div className="relative hidden lg:block">
              {/* Main Image with Glassmorphism */}
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-700">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent z-10"></div>
                <img
                  src="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="MediCare Plus Hospital"
                  className="w-full h-auto object-cover"
                />
                
                {/* Modern Overlay Stats */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
                      <p className="text-2xl font-bold text-white">500K+</p>
                      <p className="text-xs text-gray-300">Happy Patients</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
                      <p className="text-2xl font-bold text-white">200+</p>
                      <p className="text-xs text-gray-300">Specialists</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
                      <p className="text-2xl font-bold text-white">15+</p>
                      <p className="text-xs text-gray-300">Departments</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Floating Cards */}
              <div className="absolute -left-12 top-20 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-2xl animate-float animation-delay-1000">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faAmbulance} className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">24/7 Emergency</p>
                    <p className="text-xs text-gray-300">Always Available</p>
                    <p className="text-xs font-bold text-yellow-400 mt-1">+1 (234) 567-890</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 bottom-32 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-2xl animate-float-slow animation-delay-2000">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faUserMd} className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Top Specialists</p>
                    <p className="text-xs text-gray-300">All Major Fields</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-yellow-400 mr-1">★ 4.9</span>
                      <span className="text-xs text-gray-400">(500+ reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats Section - Modern Redesign */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: faHeartbeat, color: 'blue', value: stats.patients, label: 'Patients Served', suffix: 'K+', desc: 'Lives impacted' },
              { icon: faUserMd, color: 'green', value: stats.doctors, label: 'Expert Doctors', suffix: '+', desc: 'Specialists' },
              { icon: faCalendarCheck, color: 'purple', value: stats.appointments, label: 'Daily Appointments', suffix: '+', desc: 'Served daily' },
              { icon: faAward, color: 'orange', value: stats.years, label: 'Years of Excellence', suffix: '+', desc: 'Serving community' }
            ].map((stat, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Background pattern */}
                <div className="absolute right-0 top-0 w-32 h-32 opacity-5">
                  <FontAwesomeIcon icon={stat.icon} className="w-full h-full" />
                </div>
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <FontAwesomeIcon icon={stat.icon} className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-end space-x-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-${stat.color}-600 transition-colors">
                        {stat.value}
                      </span>
                      <span className="text-2xl font-bold text-gray-600 dark:text-gray-400 group-hover:text-${stat.color}-600 transition-colors">
                        {stat.suffix}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {stat.desc}
                    </p>
                  </div>
                </div>
                
                {/* Progress indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                  <div className={`h-full bg-${stat.color}-600 rounded-r-full`} style={{ width: `${Math.min(100, (stat.value / (stat.suffix === 'K+' ? 500 : 1000)) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Access - Modern Redesign */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-semibold mb-4 shadow-lg">
              Quick Access
            </span>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Access our services instantly with just one click
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {quickLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.to}
                onClick={getLinkHandler(link.to)}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br from-${link.color}-500 to-${link.color}-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Icon container */}
                <div className={`relative z-10 w-16 h-16 mx-auto bg-${link.color}-100 dark:bg-${link.color}-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300`}>
                  <FontAwesomeIcon icon={link.icon} className={`h-8 w-8 text-${link.color}-600 dark:text-${link.color}-400 group-hover:text-white transition-colors duration-300`} />
                </div>
                
                {/* Label */}
                <span className={`relative z-10 block text-sm text-center font-semibold text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-300`}>
                  {link.label}
                </span>
                
                {/* Decorative dot */}
                <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full bg-${link.color}-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Modern Redesign */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-semibold mb-4 shadow-lg">
              Why Choose Us
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              World-Class Healthcare
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-2">
                At Your Fingertips
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We combine medical expertise with cutting-edge technology to provide you with the best healthcare experience possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                onClick={getLinkHandler(feature.link)}
                className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-5 rounded-bl-full transform translate-x-16 -translate-y-16 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700`}></div>
                
                <div className="relative z-10">
                  {/* Icon with modern design */}
                  <div className={`relative w-20 h-20 mb-6`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500`}></div>
                    <div className={`relative w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      <FontAwesomeIcon icon={feature.icon} className="h-10 w-10 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-${feature.color}-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Modern CTA link */}
                  <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-${feature.color}-600 font-medium">
                    <span className="relative">
                      Learn More
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300"></span>
                    </span>
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>

                {/* Card number decoration */}
                <div className="absolute bottom-4 right-4 text-6xl font-bold text-gray-200 dark:text-gray-700 opacity-50 group-hover:opacity-30 transition-opacity duration-500">
                  {(index + 1).toString().padStart(2, '0')}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Preview - Enhanced */}
      {doctors.length > 0 && (
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12">
              <div>
                <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold mb-4">
                  OUR EXPERTS
                </span>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Meet Our Specialists
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Leading doctors across all major specialties
                </p>
              </div>
              <Link
                to="/doctors"
                className="group mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                View All Doctors
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.map((doctor, index) => (
                <Link
                  key={doctor.id}
                  to={`/doctor/${doctor.id}`}
                  className="group bg-gradient-to-b from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-slide-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative mb-4">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-1">
                      <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                        {doctor.profileImage ? (
                          <img src={doctor.profileImage} alt={doctor.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <FontAwesomeIcon icon={faUserMd} className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 right-1/2 translate-x-12 bg-green-500 w-4 h-4 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-1">
                    Dr. {doctor.fullName}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 text-center text-sm mb-3">
                    {doctor.specialization}
                  </p>
                  <div className="flex items-center justify-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <FontAwesomeIcon
                        key={i}
                        icon={faStar}
                        className={i < Math.floor(doctor.avgRating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                        size="sm"
                      />
                    ))}
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({doctor.ratings || 0})
                    </span>
                  </div>
                  <div className="w-full px-4 py-2 border-2 border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 font-medium text-center">
                    View Profile
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Departments Preview - Enhanced */}
      {departments.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12">
              <div>
                <span className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-semibold mb-4">
                  DEPARTMENTS
                </span>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Comprehensive Care
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Specialized departments for every medical need
                </p>
              </div>
              <Link
                to="/departments"
                className="group mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Explore All
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {departments.map((dept, index) => {
                const Icon = departmentIcons[dept.name] || faHospital;
                return (
                  <Link
                    key={dept.id}
                    to={`/department/${dept.id}`}
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <FontAwesomeIcon icon={Icon} className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dept.doctorCount || 0} Specialists
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Video Modal - Keep as is */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setActiveVideo(false)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActiveVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-red-500 transition"
            >
              <FontAwesomeIcon icon={faTimes} size="2x" />
            </button>
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-2xl"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Hospital Tour"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section - Keep exactly as is */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80"
            alt="Hospital"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 mix-blend-multiply"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Healthcare Experience?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 500,000+ patients who trust MediCare Plus for their healthcare needs. 
            Create your account today and take control of your health.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-yellow-500 text-blue-900 rounded-xl hover:bg-yellow-400 transition-all duration-300 text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
            >
              Create Free Account
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-xl hover:bg-white/20 transition-all duration-300 text-lg font-bold"
            >
              Contact Us
            </Link>
          </div>

          {/* Quick Links Row */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <Link to="/privacy-policy" className="text-sm text-blue-200 hover:text-white transition">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-blue-200 hover:text-white transition">
              Terms & Conditions
            </Link>
            <Link to="/cookies" className="text-sm text-blue-200 hover:text-white transition">
              Cookies Policy
            </Link>
            <Link to="/disclaimer" className="text-sm text-blue-200 hover:text-white transition">
              Disclaimer
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Keep exactly as is */}
      <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center mb-6">
                <img src={hospitalLogo} alt="MediCare Plus" className="h-10 w-auto" />
                <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                  MediCare Plus
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Providing compassionate, quality healthcare since 2010. We're committed to your well-being and health.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <FontAwesomeIcon icon={faFacebookF} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-400 transition-colors">
                  <FontAwesomeIcon icon={faTwitter} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <FontAwesomeIcon icon={faLinkedinIn} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                  <FontAwesomeIcon icon={faYoutube} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 relative inline-block">
                Quick Links
                <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-blue-500"></span>
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-gray-400 hover:text-white transition flex items-center group">
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/doctors" className="text-gray-400 hover:text-white transition flex items-center group">
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                    Our Doctors
                  </Link>
                </li>
                <li>
                  <Link to="/departments" className="text-gray-400 hover:text-white transition flex items-center group">
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                    Departments
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-400 hover:text-white transition flex items-center group">
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="text-gray-400 hover:text-white transition flex items-center group">
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-400 hover:text-white transition flex items-center group">
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                    Report Issue
                  </Link>
                </li>
              </ul>
            </div>

            {/* Patient Services */}
            <div>
              <h3 className="text-lg font-semibold mb-6 relative inline-block">
                Patient Services
                <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-green-500"></span>
              </h3>
              <ul className="space-y-3">
                {[
                  { to: '/appointment', label: 'Book Appointment' },
                  { to: '/medical-records', label: 'Medical Records' },
                  { to: '/billing', label: 'Billing & Insurance' },
                  { to: '/visitor-info', label: 'Visitor Information' },
                  { to: '/health-resources', label: 'Health Resources' },
                  { to: '/telemedicine', label: 'Telemedicine' }
                ].map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={getLinkHandler(item.to)}
                      className="text-gray-400 hover:text-white transition flex items-center group"
                    >
                      <FontAwesomeIcon icon={faChevronRight} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-6 relative inline-block">
                Legal
                <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-purple-500"></span>
              </h3>
              <ul className="space-y-3 mb-6">
                {[
                  { to: '/privacy-policy', label: 'Privacy Policy', icon: faLock },
                  { to: '/terms', label: 'Terms & Conditions', icon: faFileContract },
                  { to: '/cookies', label: 'Cookies Policy', icon: faCookieBite },
                  { to: '/disclaimer', label: 'Disclaimer', icon: faExclamationTriangle }
                ].map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-gray-400 hover:text-white transition flex items-center group">
                      <FontAwesomeIcon icon={item.icon} className="mr-2 text-xs group-hover:translate-x-1 transition" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <div className="flex items-center text-gray-400">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">123 Healthcare Ave, NY 10001</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <FontAwesomeIcon icon={faPhoneAlt} className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm">Emergency: +1 (234) 567-890</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="text-sm">info@medicareplus.com</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="h-4 w-4 mr-2 text-orange-500" />
                  <span className="text-sm">24/7 - Always Open</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                &copy; {new Date().getFullYear()} MediCare Plus Hospital. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <Link to="/privacy-policy" className="text-sm text-gray-400 hover:text-white transition flex items-center">
                  <FontAwesomeIcon icon={faLock} className="mr-1" size="xs" />
                  Privacy
                </Link>
                <Link to="/terms" className="text-sm text-gray-400 hover:text-white transition flex items-center">
                  <FontAwesomeIcon icon={faFileContract} className="mr-1" size="xs" />
                  Terms
                </Link>
                <Link to="/cookies" className="text-sm text-gray-400 hover:text-white transition flex items-center">
                  <FontAwesomeIcon icon={faCookieBite} className="mr-1" size="xs" />
                  Cookies
                </Link>
                <Link to="/disclaimer" className="text-sm text-gray-400 hover:text-white transition flex items-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" size="xs" />
                  Disclaimer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;