import React, { useState} from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faTrophy,
  faUsers,
  faAmbulance,
  faMicroscope,
  faSyringe,
  faHeart,
  faBuilding,
  faCheckCircle,
  faMagnet
} from '@fortawesome/free-solid-svg-icons';

const About = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const leadership = [
    {
      name: 'Dr. Sarah Khan',
      role: 'Medical Superintendent',
      qualification: 'MBBS, FCPS',
      experience: '25+ years',
      image: null,
      bio: 'Leading healthcare administration with focus on patient-centered care and clinical excellence.'
    },
    {
      name: 'Dr. Ahmed Raza',
      role: 'Chief Medical Officer',
      qualification: 'MBBS, MRCP',
      experience: '20+ years',
      image: null,
      bio: 'Overseeing medical services and quality assurance across all departments.'
    },
    {
      name: 'Dr. Fatima Hassan',
      role: 'Director of Nursing',
      qualification: 'RN, MSN',
      experience: '18+ years',
      image: null,
      bio: 'Leading nursing excellence and patient care standards.'
    }
  ];

  const facilities = [
    { icon: faMicroscope, name: 'Advanced Lab', description: 'State-of-the-art diagnostic laboratory' },
    { icon: faMagnet, name: 'Digital X-Ray', description: 'Modern imaging facilities' },
    { icon: faSyringe, name: 'Pharmacy', description: '24/7 in-house pharmacy' },
    { icon: faAmbulance, name: 'Emergency', description: '24/7 ambulance service' },
    { icon: faHeart, name: 'ICU/CCU', description: 'Intensive care units' },
    { icon: faBuilding, name: 'Private Rooms', description: 'Comfortable patient rooms' }
  ];

  const achievements = [
    { year: '2010', achievement: 'Hospital Founded' },
    { year: '2015', achievement: 'Expanded to 200 Beds' },
    { year: '2018', achievement: 'ISO 9001:2015 Certified' },
    { year: '2020', achievement: 'Digital Healthcare Transformation' },
    { year: '2023', achievement: '500,000+ Patients Served' },
    { year: '2024', achievement: 'Best Hospital Award' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-blue-600 dark:bg-blue-800 text-white py-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <img 
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80" 
            alt="Hospital"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About MediCare Plus Hospital</h1>
          <p className="text-xl max-w-3xl mx-auto">Providing compassionate, quality healthcare since 2010</p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">15+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Years of Excellence</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">500K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Patients Treated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">200+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Expert Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Emergency Care</div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="py-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {['overview', 'history', 'leadership', 'facilities', 'achievements'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Mission & Vision</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-3">Our Mission</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    To provide compassionate, high-quality healthcare services that are accessible to all, 
                    while maintaining the highest standards of medical ethics and patient care.
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200 mb-3">Our Vision</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    To be the leading healthcare provider in the region, recognized for excellence in patient care, 
                    medical education, and innovative research.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Why Choose Us</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Expert Team</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">200+ specialized doctors</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Modern Facilities</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Advanced medical equipment</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">24/7 Emergency</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Round-the-clock care</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our History</h2>
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2010 - The Beginning</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    MediCare Plus Hospital was founded with a vision to provide quality healthcare to the community. 
                    Started with 50 beds and 15 doctors.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2015 - Expansion</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Expanded to 200 beds, added new departments including Cardiology, Neurology, and Oncology.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2018 - Quality Certification</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Achieved ISO 9001:2015 certification for quality management systems.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2020 - Digital Transformation</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Launched digital healthcare platform with online appointments, telemedicine, and electronic medical records.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2024 - Today</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Serving over 500,000 patients with 200+ doctors across 15+ departments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leadership */}
          {activeTab === 'leadership' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Leadership</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leadership.map((leader, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <FontAwesomeIcon icon={faUsers} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{leader.name}</h3>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">{leader.role}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{leader.qualification}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{leader.experience}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{leader.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facilities */}
          {activeTab === 'facilities' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Facilities</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map((facility, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                      <FontAwesomeIcon icon={facility.icon} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{facility.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{facility.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {activeTab === 'achievements' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Achievements</h2>
              <div className="space-y-4">
                {achievements.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-16 text-center">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{item.year}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white font-medium">{item.achievement}</p>
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-blue-600 dark:bg-blue-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Experience Quality Healthcare</h2>
          <p className="text-xl text-blue-100 mb-8">Book an appointment with our expert doctors today</p>
          <Link
            to="/register"
            className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold"
          >
            Book Appointment
            <FontAwesomeIcon icon={faHeartbeat} className="ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;