import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faAmbulance,
  faPaperPlane,
  faSpinner,
  faCheckCircle,
  faUser,
  faComment,
  faHandshake,
  faTag,
  faBug,
  faLightbulb,
  faExclamationTriangle,
  faQuestionCircle,
  faFileAlt,
  faTrash,
  faCalendarCheck,
  faHeadset,
  faArrowRight,
  faSearch,
  faChevronRight,
  faShieldAlt,
  faClock as faClockRegular
} from '@fortawesome/free-solid-svg-icons';
import { submitContactMessage } from '../database';
import toast from 'react-hot-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subjectType: 'General Inquiry',
    message: '',
    files: []
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);

  const subjectTypes = [
    { value: 'General Inquiry', icon: faEnvelope, color: 'blue', role: 'receptionist', description: 'General questions about our services' },
    { value: 'Appointment Help', icon: faCalendarCheck, color: 'green', role: 'receptionist', description: 'Assistance with booking or managing appointments' },
    { value: 'Complaint', icon: faExclamationTriangle, color: 'red', role: 'admin', description: 'Formal complaints about services or staff' },
    { value: 'Bug Report', icon: faBug, color: 'orange', role: 'admin', description: 'Report technical issues or bugs' },
    { value: 'Suggestion', icon: faLightbulb, color: 'yellow', role: 'admin', description: 'Share ideas to improve our services' },
    { value: 'Technical Issue', icon: faQuestionCircle, color: 'purple', role: 'admin', description: 'Problems with the website or patient portal' },
    { value: 'Feedback', icon: faComment, color: 'indigo', role: 'admin', description: 'General feedback about your experience' },
    { value: 'Partnership', icon: faHandshake, color: 'teal', role: 'admin', description: 'Business or collaboration inquiries' }
  ];

  const getSubjectTypeIcon = (type) => {
    const found = subjectTypes.find(t => t.value === type);
    return found ? found.icon : faEnvelope;
  };

  

  const getSubjectTypeGradient = (type) => {
    const gradients = {
      'General Inquiry': 'from-blue-500 to-blue-600',
      'Appointment Help': 'from-green-500 to-green-600',
      'Complaint': 'from-red-500 to-red-600',
      'Bug Report': 'from-orange-500 to-orange-600',
      'Suggestion': 'from-yellow-500 to-yellow-600',
      'Technical Issue': 'from-purple-500 to-purple-600',
      'Feedback': 'from-indigo-500 to-indigo-600',
      'Partnership': 'from-teal-500 to-teal-600'
    };
    return gradients[type] || 'from-blue-500 to-blue-600';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    const errors = [];
    const validFiles = [];

    // Check total files count
    if (files.length + formData.files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    for (const file of files) {
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 5MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setFileErrors(errors);
    } else {
      setFileErrors([]);
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...validFiles]
      }));
    }

    // Reset input
    e.target.value = '';
  }, [formData.files]);

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await submitContactMessage(formData);
      
      if (result.success) {
        setSubmitted(true);
        toast.success(
          <div>
            <p className="font-medium">Message sent successfully!</p>
            <p className="text-sm">We'll respond within 24 hours.</p>
          </div>,
          { duration: 5000 }
        );
        setFormData({
          name: '',
          email: '',
          phone: '',
          subjectType: 'General Inquiry',
          message: '',
          files: []
        });
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const currentSubject = subjectTypes.find(t => t.value === formData.subjectType) || subjectTypes[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section with Animated Background */}
      <section className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce backdrop-blur-lg">
            <FontAwesomeIcon icon={faHeadset} className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl max-w-3xl mx-auto text-blue-100">
            We're here to help with any questions or concerns you may have
          </p>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      </section>

      {/* Help Center Redirect Banner */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-lg">
                  <FontAwesomeIcon icon={faSearch} className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Looking for answers?</h2>
                  <p className="text-amber-100">
                    Before contacting us, check our Help Center for instant answers to common questions.
                  </p>
                </div>
              </div>
              <Link
                to="/help"
                className="group px-8 py-4 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition font-semibold flex items-center shadow-lg"
              >
                <span>Visit Help Center</span>
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Contact Cards */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="p-6 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-bl-full"></div>
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <FontAwesomeIcon icon={faAmbulance} className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Emergency</h3>
                <a href="tel:+1234567890" className="text-red-600 dark:text-red-400 font-bold text-xl hover:underline block mb-1">
                  +1 (234) 567-890
                </a>
                <p className="text-sm text-gray-500 dark:text-gray-400">24/7 Available</p>
              </div>
            </div>

            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="p-6 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full"></div>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <FontAwesomeIcon icon={faPhone} className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Support Line</h3>
                <a href="tel:+1234567891" className="text-blue-600 dark:text-blue-400 font-bold text-xl hover:underline block mb-1">
                  +1 (234) 567-891
                </a>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mon-Fri, 9am-6pm</p>
              </div>
            </div>

            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="p-6 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-bl-full"></div>
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <FontAwesomeIcon icon={faEnvelope} className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Email</h3>
                <a href="mailto:support@medicareplus.com" className="text-green-600 dark:text-green-400 font-medium hover:underline block mb-1 break-all">
                  support@medicareplus.com
                </a>
                <p className="text-sm text-gray-500 dark:text-gray-400">24hr response</p>
              </div>
            </div>

            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="p-6 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-bl-full"></div>
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <FontAwesomeIcon icon={faClockRegular} className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Working Hours</h3>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">24/7 Emergency</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Regular: 9am - 6pm</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Information */}
            <div className="space-y-6">
              {/* Location Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden group hover:shadow-2xl transition">
                <div className="relative h-48 bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '30px 30px'
                  }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="h-12 w-12 text-white mb-2 animate-bounce" />
                      <h3 className="text-2xl font-bold text-white">Our Location</h3>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">MediCare Plus Hospital</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        123 Healthcare Avenue<br />
                        Medical District<br />
                        New York, NY 10001
                      </p>
                      <a 
                        href="https://maps.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700 font-medium group"
                      >
                        Get Directions
                        <FontAwesomeIcon icon={faChevronRight} className="ml-1 text-sm group-hover:translate-x-1 transition" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Time Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 group hover:shadow-2xl transition">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faClockRegular} className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Response Times</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">General Inquiries</span>
                    </div>
                    <span className="text-green-600 font-semibold">24 hours</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">Appointment Help</span>
                    </div>
                    <span className="text-green-600 font-semibold">12 hours</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">Technical Issues</span>
                    </div>
                    <span className="text-yellow-600 font-semibold">48 hours</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">Complaints</span>
                    </div>
                    <span className="text-orange-600 font-semibold">72 hours</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faAmbulance} className="text-red-600 dark:text-red-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Medical Emergency?
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Please call our emergency number immediately: 
                        <a href="tel:+1234567890" className="font-bold hover:underline block mt-1">
                          +1 (234) 567-890
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-lg">
                    <FontAwesomeIcon icon={faShieldAlt} className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Your Data is Secure</h4>
                    <p className="text-blue-100 text-sm">
                      All messages and files are encrypted and only accessible to authorized staff. 
                      We never share your information with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden sticky top-24">
                {/* Form Header */}
                <div className={`bg-gradient-to-r ${getSubjectTypeGradient(formData.subjectType)} p-6`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-lg">
                      <FontAwesomeIcon 
                        icon={getSubjectTypeIcon(formData.subjectType)} 
                        className="h-8 w-8 text-white" 
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{formData.subjectType}</h2>
                      <p className="text-white/80 text-sm mt-1">
                        {subjectTypes.find(t => t.value === formData.subjectType)?.description}
                      </p>
                      <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs text-white backdrop-blur-lg">
                        Handled by {currentSubject.role === 'admin' ? 'Admin Team' : 'Reception Team'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Body */}
                <div className="p-6">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <FontAwesomeIcon icon={faCheckCircle} className="h-12 w-12 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        Your message has been sent successfully.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                        We'll get back to you within 24 hours.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-500" />
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition"
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-blue-500" />
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition"
                          placeholder="john@example.com"
                          required
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FontAwesomeIcon icon={faPhone} className="mr-2 text-blue-500" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition"
                          placeholder="+1 (234) 567-890"
                        />
                      </div>

                      {/* Subject Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FontAwesomeIcon icon={faTag} className="mr-2 text-blue-500" />
                          Subject Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="subjectType"
                          value={formData.subjectType}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition"
                          required
                        >
                          {subjectTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.value} ({type.role === 'admin' ? 'Admin' : 'Receptionist'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FontAwesomeIcon icon={faComment} className="mr-2 text-blue-500" />
                          Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows="4"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition resize-none"
                          placeholder="Please describe your inquiry in detail..."
                          required
                        ></textarea>
                      </div>

                      {/* File Attachments */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-blue-500" />
                          Attachments
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 hover:border-blue-500 transition group">
                          <input
                            type="file"
                            onChange={handleFileChange}
                            multiple
                            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 transition"
                          />
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Max 5 files, 5MB each. Supported: Images, PDF, DOC, DOCX, TXT, XLS, XLSX
                          </p>
                        </div>

                        {/* File Errors */}
                        {fileErrors.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                            {fileErrors.map((error, index) => (
                              <p key={index} className="text-xs text-red-600 dark:text-red-400 flex items-start">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 mt-0.5 flex-shrink-0" />
                                {error}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* File List */}
                        {formData.files.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Selected Files ({formData.files.length}/5):
                            </p>
                            {formData.files.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl group"
                              >
                                <div className="flex items-center space-x-3 truncate">
                                  <FontAwesomeIcon icon={faFileAlt} className="text-blue-500 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center font-semibold text-lg shadow-lg group"
                      >
                        {loading ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPaperPlane} className="mr-2 group-hover:translate-x-1 transition" />
                            Send Message
                          </>
                        )}
                      </button>

                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                        By submitting, you agree to our{' '}
                        <Link to="/privacy-policy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>{' '}
                        and{' '}
                        <Link to="/terms" className="text-blue-600 hover:underline font-medium">Terms of Service</Link>
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Prefer to call instead?</h2>
          <p className="text-xl text-blue-100 mb-6">Our support team is available during business hours</p>
          <a
            href="tel:+1234567891"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition font-bold text-lg shadow-xl"
          >
            <FontAwesomeIcon icon={faPhone} className="mr-2" />
            +1 (234) 567-891
          </a>
        </div>
      </section>
    </div>
  );
};

export default Contact;