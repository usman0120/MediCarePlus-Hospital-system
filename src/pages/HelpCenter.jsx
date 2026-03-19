import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faSearch,
  faCalendarCheck,
  faFlask,
  faFileInvoice,
  faUserMd,
  faCreditCard,
  faShieldAlt,
  faPhoneAlt,
  faEnvelope,
  faComment,
  faChevronDown,
  faChevronUp,
  faPrescription,
  faHeartbeat,
  faCommentMedical,
  faLaptopMedical,
  faHeadset,
  faBookOpen,
  faStar,
  faThumbsUp,
  faTimes,
  faCheckCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const categories = [
    {
      id: 'appointments',
      icon: faCalendarCheck,
      title: 'Appointments',
      description: 'Booking, rescheduling, cancelling appointments',
      color: 'blue',
      count: 10
    },
    {
      id: 'doctors',
      icon: faUserMd,
      title: 'Doctors',
      description: 'Finding doctors, specialties, availability',
      color: 'green',
      count: 7
    },
    {
      id: 'lab',
      icon: faFlask,
      title: 'Lab Tests',
      description: 'Test requests, results, reports',
      color: 'purple',
      count: 5
    },
    {
      id: 'billing',
      icon: faFileInvoice,
      title: 'Billing',
      description: 'Payments, insurance, invoices',
      color: 'orange',
      count: 5
    },
    {
      id: 'payments',
      icon: faCreditCard,
      title: 'Payments',
      description: 'Payment methods, refunds, receipts',
      color: 'red',
      count: 4
    },
    {
      id: 'privacy',
      icon: faShieldAlt,
      title: 'Privacy & Security',
      description: 'Data protection, account security',
      color: 'indigo',
      count: 6
    },
    {
      id: 'portal',
      icon: faLaptopMedical,
      title: 'Patient Portal',
      description: 'Dashboard, medical history, downloads',
      color: 'teal',
      count: 5
    },
    {
      id: 'support',
      icon: faHeadset,
      title: 'Support & Technical',
      description: 'Bug reports, suggestions, technical help',
      color: 'pink',
      count: 4
    },
    {
      id: 'emergency',
      icon: faHeartbeat,
      title: 'Emergency',
      description: 'Emergency procedures, triage, urgent care',
      color: 'rose',
      count: 2
    },
    {
      id: 'chat',
      icon: faCommentMedical,
      title: 'Chat System',
      description: 'Messaging doctors, file sharing, status',
      color: 'cyan',
      count: 3
    },
    {
      id: 'prescriptions',
      icon: faPrescription,
      title: 'Prescriptions',
      description: 'View, download, request refills',
      color: 'amber',
      count: 3
    }
  ];

  const faqs = [
    // APPOINTMENTS FAQ
    {
      id: 1,
      question: 'How do I book an appointment?',
      answer: 'Log in to your patient portal, go to the Appointments section, choose a department, select a doctor, pick an available time slot, and confirm your appointment. The request will be reviewed and approved by our reception team.',
      category: 'Appointments',
      keywords: ['book', 'schedule', 'appointment', 'booking']
    },
    {
      id: 2,
      question: 'Why is my appointment marked as pending?',
      answer: 'All online appointments must be reviewed by the reception desk to prevent scheduling conflicts. Once confirmed, you will receive a notification and the status will change to Approved.',
      category: 'Appointments',
      keywords: ['pending', 'status', 'waiting', 'approval']
    },
    {
      id: 3,
      question: 'Can I reschedule my appointment?',
      answer: 'Yes. You can reschedule your appointment through the patient portal up to 2 hours before the scheduled time. If it is less than 2 hours before the appointment, please contact reception.',
      category: 'Appointments',
      keywords: ['reschedule', 'change', 'move', 'time']
    },
    {
      id: 4,
      question: 'Can I cancel an appointment?',
      answer: 'Yes. You can cancel an appointment from your Appointments page. The system will automatically notify the reception team and the doctor.',
      category: 'Appointments',
      keywords: ['cancel', 'remove', 'delete']
    },
    {
      id: 5,
      question: 'What happens if I miss my appointment?',
      answer: 'Missed appointments will be marked as "No-Show." Repeated no-shows may temporarily limit your ability to book new appointments online.',
      category: 'Appointments',
      keywords: ['miss', 'no-show', 'absent', 'forgot']
    },
    {
      id: 6,
      question: 'Can I book an appointment for someone else (family member)?',
      answer: 'Yes. When booking an appointment, you can select or add a family member profile and schedule a visit on their behalf.',
      category: 'Appointments',
      keywords: ['family', 'someone else', 'dependent', 'child']
    },
    {
      id: 7,
      question: 'How do I know if my appointment is confirmed?',
      answer: 'Once reception approves the request, the status will change to Approved and you will receive a notification in your dashboard.',
      category: 'Appointments',
      keywords: ['confirm', 'notification', 'approved']
    },
    {
      id: 8,
      question: 'Can I book an emergency appointment online?',
      answer: 'Emergency cases should immediately contact the hospital emergency number or visit the hospital. Online booking is designed for regular consultations.',
      category: 'Appointments',
      keywords: ['emergency', 'urgent', 'immediate']
    },
    {
      id: 9,
      question: 'Can I book multiple appointments at once?',
      answer: 'Yes. However, each appointment must be booked separately to ensure accurate scheduling.',
      category: 'Appointments',
      keywords: ['multiple', 'several', 'many']
    },
    {
      id: 10,
      question: 'What should I bring to my appointment?',
      answer: 'Please bring a valid ID, previous medical reports if available, and arrive at least 10 minutes before your scheduled appointment.',
      category: 'Appointments',
      keywords: ['bring', 'carry', 'documents', 'id']
    },

    // DOCTORS FAQ
    {
      id: 11,
      question: 'How can I find a doctor?',
      answer: 'You can browse doctors from the Doctors page where they are listed by department, specialization, and availability.',
      category: 'Doctors',
      keywords: ['find', 'search', 'locate', 'browse']
    },
    {
      id: 12,
      question: 'Can I see a doctor\'s experience and specialization?',
      answer: 'Yes. Each doctor profile contains their qualifications, specialties, experience, and patient ratings.',
      category: 'Doctors',
      keywords: ['experience', 'qualification', 'specialization', 'profile']
    },
    {
      id: 13,
      question: 'Can I request a specific doctor?',
      answer: 'Yes. During appointment booking you can choose the doctor you want to consult.',
      category: 'Doctors',
      keywords: ['specific', 'particular', 'choose']
    },
    {
      id: 14,
      question: 'How do doctor ratings work?',
      answer: 'After your consultation, you can rate the doctor and leave feedback. These ratings help other patients choose doctors.',
      category: 'Doctors',
      keywords: ['rate', 'rating', 'review', 'feedback']
    },
    {
      id: 15,
      question: 'Can I chat with my doctor through the system?',
      answer: 'Yes. Patients can securely message their doctor using the in-app chat system. Messages include delivery and read status.',
      category: 'Doctors',
      keywords: ['chat', 'message', 'communicate', 'text']
    },
    {
      id: 16,
      question: 'Why can\'t I message a doctor anytime?',
      answer: 'Doctors may set availability hours for messaging. If you send a message outside those hours, an automatic reply may inform you when the doctor is available.',
      category: 'Doctors',
      keywords: ['message time', 'availability', 'hours']
    },
    {
      id: 17,
      question: 'Can I change my doctor after booking?',
      answer: 'Yes. You can cancel the existing appointment and book a new one with a different doctor.',
      category: 'Doctors',
      keywords: ['change doctor', 'switch', 'different']
    },
    {
      id: 18,
      question: 'Can doctors see my previous medical history?',
      answer: 'Yes. Doctors can view your previous visits, diagnoses, prescriptions, and lab results to provide better treatment.',
      category: 'Doctors',
      keywords: ['medical history', 'previous records', 'access']
    },

    // LAB TESTS FAQ
    {
      id: 19,
      question: 'How are lab tests requested?',
      answer: 'Lab tests are requested by your doctor during consultation. Patients cannot request tests directly.',
      category: 'Lab Tests',
      keywords: ['request test', 'lab order']
    },
    {
      id: 20,
      question: 'How will I know if a test has been requested?',
      answer: 'You will receive a notification in your patient portal when a doctor requests a lab test.',
      category: 'Lab Tests',
      keywords: ['test requested', 'notification']
    },
    {
      id: 21,
      question: 'Where can I see my lab results?',
      answer: 'Lab results are available in your patient dashboard under the Lab Reports section.',
      category: 'Lab Tests',
      keywords: ['view results', 'lab reports']
    },
    {
      id: 22,
      question: 'How long do lab results take?',
      answer: 'Routine tests usually take 24–48 hours. More complex tests may take several days.',
      category: 'Lab Tests',
      keywords: ['results time', 'how long', 'waiting']
    },
    {
      id: 23,
      question: 'Can I download my lab reports?',
      answer: 'Yes. You can download or print your lab reports as PDF files from your portal.',
      category: 'Lab Tests',
      keywords: ['download', 'print', 'pdf']
    },
    {
      id: 24,
      question: 'Can I send my lab report to another doctor?',
      answer: 'Yes. Download the report and share it with any healthcare provider you choose.',
      category: 'Lab Tests',
      keywords: ['share', 'send', 'another doctor']
    },
    {
      id: 25,
      question: 'What if I believe my lab report is incorrect?',
      answer: 'Please contact the hospital reception or submit a support request so the lab team can review the report.',
      category: 'Lab Tests',
      keywords: ['incorrect', 'wrong', 'error', 'mistake']
    },

    // BILLING FAQ
    {
      id: 26,
      question: 'When is my bill generated?',
      answer: 'Your bill is automatically generated after your consultation, lab test, admission, or procedure.',
      category: 'Billing',
      keywords: ['bill generated', 'invoice created']
    },
    {
      id: 27,
      question: 'Where can I see my bills?',
      answer: 'All invoices are available in your patient portal under the Billing section.',
      category: 'Billing',
      keywords: ['view bills', 'see invoices']
    },
    {
      id: 28,
      question: 'What charges are included in the bill?',
      answer: 'Bills may include consultation fees, lab test costs, operation charges, bed charges, and other hospital services.',
      category: 'Billing',
      keywords: ['charges', 'included', 'items']
    },
    {
      id: 29,
      question: 'Can I download my invoice?',
      answer: 'Yes. Every invoice can be downloaded as a PDF from the billing page.',
      category: 'Billing',
      keywords: ['download invoice', 'pdf bill']
    },
    {
      id: 30,
      question: 'Why can\'t I edit my invoice?',
      answer: 'Invoices are locked once generated to prevent errors or tampering. Only authorized hospital administrators can unlock them if necessary.',
      category: 'Billing',
      keywords: ['edit invoice', 'modify', 'change']
    },
    {
      id: 31,
      question: 'Who should I contact for billing issues?',
      answer: 'Please contact the reception desk or submit a support ticket for billing-related questions.',
      category: 'Billing',
      keywords: ['billing issues', 'contact', 'help']

    },
    // PAYMENTS FAQ
    {
      id: 32,
      question: 'How can I pay my hospital bill?',
      answer: 'Bills can be paid through the patient portal or directly at the hospital reception desk.',
      category: 'Payments',
      keywords: ['pay', 'payment', 'settle']
    },
    {
      id: 33,
      question: 'What payment methods are accepted?',
      answer: 'We accept cash and digital payments. Additional payment options may be available depending on your region.',
      category: 'Payments',
      keywords: ['payment methods', 'accepted', 'cash', 'card']
    },
    {
      id: 34,
      question: 'Will I receive a payment receipt?',
      answer: 'Yes. Once payment is confirmed, a digital receipt will appear in your billing section.',
      category: 'Payments',
      keywords: ['receipt', 'confirmation', 'proof']
    },
    {
      id: 35,
      question: 'What if my payment fails?',
      answer: 'If a payment fails, you can retry the transaction or contact reception for assistance.',
      category: 'Payments',
      keywords: ['payment failed', 'error', 'unsuccessful']
    },
    {
      id: 36,
      question: 'Can I get a refund?',
      answer: 'Refunds depend on hospital policy. Please contact the billing department for refund requests.',
      category: 'Payments',
      keywords: ['refund', 'money back', 'return']

    },
    // PRIVACY & SECURITY FAQ
    {
      id: 37,
      question: 'How is my medical data protected?',
      answer: 'Your medical records are protected with strong encryption, secure databases, and strict access controls.',
      category: 'Privacy & Security',
      keywords: ['data protection', 'security', 'encryption']
    },
    {
      id: 38,
      question: 'Who can access my medical records?',
      answer: 'Only authorized doctors and medical staff involved in your treatment can access your medical information.',
      category: 'Privacy & Security',
      keywords: ['access', 'who can see', 'authorized']
    },
    {
      id: 39,
      question: 'Can other patients see my information?',
      answer: 'No. Your data is completely private and cannot be accessed by other patients.',
      category: 'Privacy & Security',
      keywords: ['other patients', 'privacy', 'private']
    },
    {
      id: 40,
      question: 'What should I do if I suspect unauthorized access to my account?',
      answer: 'Immediately change your password and contact hospital support.',
      category: 'Privacy & Security',
      keywords: ['unauthorized', 'hacked', 'breach']
    },
    {
      id: 41,
      question: 'Can I update my personal information?',
      answer: 'Yes. You can update your contact information and personal details from your profile settings.',
      category: 'Privacy & Security',
      keywords: ['update', 'change', 'modify', 'profile']
    },
    {
      id: 42,
      question: 'Why was my account temporarily disabled?',
      answer: 'Accounts may be disabled due to security concerns or administrative actions. Please contact support for assistance.',
      category: 'Privacy & Security',
      keywords: ['disabled', 'locked', 'suspended']

    },
    // PATIENT PORTAL FAQ
    {
      id: 43,
      question: 'What is the patient portal?',
      answer: 'The patient portal is your personal dashboard where you can manage appointments, view medical history, access lab reports, pay bills, and communicate with doctors.',
      category: 'Patient Portal',
      keywords: ['portal', 'dashboard', 'what is']
    },
    {
      id: 44,
      question: 'Can I see my medical history online?',
      answer: 'Yes. Your consultation records, diagnoses, prescriptions, and lab results are stored in your medical history.',
      category: 'Patient Portal',
      keywords: ['medical history', 'records', 'past visits']
    },
    {
      id: 45,
      question: 'Can I download my complete medical summary?',
      answer: 'Yes. You can download a medical summary PDF that includes your visit history and reports.',
      category: 'Patient Portal',
      keywords: ['download summary', 'medical summary', 'pdf']
    },
    {
      id: 46,
      question: 'What happens to my records after discharge?',
      answer: 'Once a patient is discharged, the medical record becomes locked and cannot be modified to ensure legal accuracy.',
      category: 'Patient Portal',
      keywords: ['discharge', 'after discharge', 'records locked']
    },

    // SUPPORT / TECHNICAL FAQ
    {
      id: 47,
      question: 'How do I report a technical issue?',
      answer: 'You can report bugs or technical problems by submitting a support ticket from the Support page.',
      category: 'Support & Technical',
      keywords: ['report bug', 'technical issue', 'problem']
    },
    {
      id: 48,
      question: 'How do I suggest improvements for the system?',
      answer: 'You can submit suggestions through the Support page by selecting the Suggestion category.',
      category: 'Support & Technical',
      keywords: ['suggest', 'improvement', 'feedback']
    },
    {
      id: 49,
      question: 'How can I contact hospital support?',
      answer: 'You can contact support through phone, email, live chat, or by submitting a support request.',
      category: 'Support & Technical',
      keywords: ['contact support', 'help', 'assistance']
    },
    {
      id: 50,
      question: 'How long does support take to respond?',
      answer: 'Most support requests are answered within 24 hours.',
      category: 'Support & Technical',
      keywords: ['response time', 'how long', 'wait']
    },
    {
      id: 51,
      question: 'What information should I include when reporting a bug?',
      answer: 'Please describe the issue, the page where it occurred, and any error messages you saw.',
      category: 'Support & Technical',
      keywords: ['bug report', 'information', 'details']

    },
    // EMERGENCY FAQ
    {
      id: 52,
      question: 'What should I do in a medical emergency?',
      answer: 'Please call the hospital emergency number immediately or visit the emergency department. Do not rely on the online system during emergencies.',
      category: 'Emergency',
      keywords: ['emergency', 'urgent', 'immediate']
    },
    {
      id: 53,
      question: 'Can emergency cases skip appointment scheduling?',
      answer: 'Yes. Emergency patients are handled immediately and prioritized using our triage system.',
      category: 'Emergency',
      keywords: ['skip appointment', 'priority', 'triage']

    },
    // CHAT SYSTEM FAQ
    {
      id: 54,
      question: 'How do I message my doctor?',
      answer: 'Go to the Messages section in your dashboard and select the doctor you want to contact.',
      category: 'Chat System',
      keywords: ['message', 'chat', 'contact doctor']
    },
    {
      id: 55,
      question: 'How will I know if my message was seen?',
      answer: 'Messages show status indicators such as Sent, Delivered, and Seen.',
      category: 'Chat System',
      keywords: ['message status', 'seen', 'read', 'delivered']
    },
    {
      id: 56,
      question: 'Can I send medical files in chat?',
      answer: 'Yes. You can share reports or images with your doctor through the chat system.',
      category: 'Chat System',
      keywords: ['send files', 'share', 'attachments']

    },
    // PRESCRIPTION FAQ
    {
      id: 57,
      question: 'Where can I see my prescriptions?',
      answer: 'Prescriptions are available in the Prescriptions section of your patient portal.',
      category: 'Prescriptions',
      keywords: ['view prescriptions', 'medications', 'medicine']
    },
    {
      id: 58,
      question: 'Can I download my prescription?',
      answer: 'Yes. Prescriptions can be downloaded as a professional PDF with the hospital logo.',
      category: 'Prescriptions',
      keywords: ['download prescription', 'pdf prescription']
    },
    {
      id: 59,
      question: 'Can I request a prescription refill online?',
      answer: 'Yes. You can request a refill from the prescriptions page if your doctor allows it.',
      category: 'Prescriptions',
      keywords: ['refill', 'renew', 'request medication']
    }
  ];

  // Enhanced search function
  const filteredFaqs = useMemo(() => {
    if (!searchTerm.trim()) {
      return selectedCategory === 'all' 
        ? faqs 
        : faqs.filter(faq => faq.category === selectedCategory);
    }

    const term = searchTerm.toLowerCase();
    return faqs.filter(faq => {
      // Search in question
      const questionMatch = faq.question.toLowerCase().includes(term);
      
      // Search in answer
      const answerMatch = faq.answer.toLowerCase().includes(term);
      
      // Search in category
      const categoryMatch = faq.category.toLowerCase().includes(term);
      
      // Search in keywords
      const keywordMatch = faq.keywords?.some(keyword => 
        keyword.toLowerCase().includes(term)
      );

      return questionMatch || answerMatch || categoryMatch || keywordMatch;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory]);

  // Get search suggestions based on partial input
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    const suggestions = new Set();
    
    faqs.forEach(faq => {
      if (faq.question.toLowerCase().includes(term)) {
        suggestions.add(faq.question);
      }
      faq.keywords?.forEach(keyword => {
        if (keyword.toLowerCase().includes(term)) {
          suggestions.add(keyword);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    saveRecentSearch(term);
    setShowSearchSuggestions(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(c => c.title === categoryName);
    return category?.color || 'blue';
  };

  const getCategoryIcon = (categoryName) => {
    const category = categories.find(c => c.title === categoryName);
    return category?.icon || faQuestionCircle;
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
      green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
      purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
      orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
      red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
      indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400',
      teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
      pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400',
      rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400',
      cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-400',
      amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section with Animated Background */}
      <section className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <FontAwesomeIcon icon={faQuestionCircle} className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">How Can We Help?</h1>
          <p className="text-xl mb-8 text-blue-100">Search our knowledge base or browse categories below</p>
          
          {/* Enhanced Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative">
              <FontAwesomeIcon 
                icon={faSearch} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" 
              />
              <input
                type="text"
                placeholder="Search for answers (e.g., 'book appointment', 'pay bill', 'lab results')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                className="w-full pl-12 pr-12 py-4 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-300 text-lg"
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

            {/* Search Suggestions */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center"
                  >
                    <FontAwesomeIcon icon={faSearch} className="text-gray-400 mr-3" />
                    <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {!searchTerm && recentSearches.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-blue-200">Recent searches:</span>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition"
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      <section className="py-6 bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faBookOpen} className="mr-2" />
              All Topics ({faqs.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.title)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex items-center ${
                  selectedCategory === category.title
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FontAwesomeIcon icon={category.icon} className="mr-2" />
                {category.title} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Summary */}
      {searchTerm && (
        <section className="py-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-blue-800 dark:text-blue-200">
                  Found {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} for "{searchTerm}"
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* FAQs Section with Category Grouping */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <FontAwesomeIcon icon={faQuestionCircle} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We couldn't find any answers matching "{searchTerm}"
              </p>
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {selectedCategory === 'all' ? (
                // Group by category when showing all
                categories.map(category => {
                  const categoryFaqs = filteredFaqs.filter(f => f.category === category.title);
                  if (categoryFaqs.length === 0) return null;
                  
                  return (
                    <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                      <div className={`p-4 ${getColorClasses(category.color)} bg-opacity-20`}>
                        <div className="flex items-center">
                          <div className={`w-10 h-10 ${getColorClasses(category.color)} rounded-lg flex items-center justify-center mr-3`}>
                            <FontAwesomeIcon icon={category.icon} className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                              {category.title}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {categoryFaqs.length} {categoryFaqs.length === 1 ? 'question' : 'questions'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categoryFaqs.map((faq) => (
                          <div key={faq.id} className="p-4">
                            <button
                              onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                              className="w-full text-left flex items-start justify-between group"
                            >
                              <div className="flex-1 pr-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">
                                  {faq.question}
                                </h3>
                              </div>
                              <FontAwesomeIcon
                                icon={expandedFaq === faq.id ? faChevronUp : faChevronDown}
                                className="text-gray-500 mt-1 flex-shrink-0"
                              />
                            </button>
                            {expandedFaq === faq.id && (
                              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                                <div className="mt-3 flex items-center text-sm text-gray-500">
                                  <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
                                  <span>Was this helpful?</span>
                                  <button className="ml-3 text-green-600 hover:text-green-700">
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show single category without grouping
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredFaqs.map((faq) => (
                      <div key={faq.id} className="p-4">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                          className="w-full text-left flex items-start justify-between group"
                        >
                          <div className="flex-1 pr-4">
                            <span className="text-sm text-blue-600 dark:text-blue-400 block mb-1">
                              {faq.category}
                            </span>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">
                              {faq.question}
                            </h3>
                          </div>
                          <FontAwesomeIcon
                            icon={expandedFaq === faq.id ? faChevronUp : faChevronDown}
                            className="text-gray-500 mt-1 flex-shrink-0"
                          />
                        </button>
                        {expandedFaq === faq.id && (
                          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                            <div className="mt-3 flex items-center text-sm text-gray-500">
                              <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
                              <span>Was this helpful?</span>
                              <button className="ml-3 text-green-600 hover:text-green-700">
                                <FontAwesomeIcon icon={faCheckCircle} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            <FontAwesomeIcon icon={faStar} className="text-yellow-500 mr-2" />
            Popular Topics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {faqs.slice(0, 8).map((faq) => (
              <button
                key={faq.id}
                onClick={() => {
                  setSearchTerm(faq.question);
                  setExpandedFaq(faq.id);
                }}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition group"
              >
                <div className={`w-12 h-12 ${getColorClasses(getCategoryColor(faq.category))} rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition`}>
                  <FontAwesomeIcon icon={getCategoryIcon(faq.category)} className="h-6 w-6" />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {faq.question}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support - Enhanced */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
            <h2 className="text-3xl font-bold text-center mb-4">Still Need Help?</h2>
            <p className="text-center text-blue-100 mb-8">
              Can't find what you're looking for? Our support team is ready to assist you.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faPhoneAlt} className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">Call Us</h3>
                <a href="tel:+1234567891" className="text-white hover:underline text-lg font-bold">
                  +1 (234) 567-891
                </a>
                <p className="text-sm text-blue-200 mt-1">Mon-Fri, 9am-6pm</p>
              </div>

              <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">Email Us</h3>
                <a href="mailto:support@medicareplus.com" className="text-white hover:underline">
                  support@medicareplus.com
                </a>
                <p className="text-sm text-blue-200 mt-1">24hr response time</p>
              </div>

              <div className="text-center bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faComment} className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <Link
                  to="/contact"
                  className="inline-block px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-medium"
                >
                  Start Chat
                </Link>
                <p className="text-sm text-blue-200 mt-1">Available 24/7</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/contact"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-medium shadow-lg"
              >
                <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                Submit a Support Ticket
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/appointment" className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center hover:shadow-lg transition group">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition">
                <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Book Appointment</span>
            </Link>
            
            <Link to="/lab-results" className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center hover:shadow-lg transition group">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition">
                <FontAwesomeIcon icon={faFlask} className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lab Results</span>
            </Link>
            
            <Link to="/billing" className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center hover:shadow-lg transition group">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition">
                <FontAwesomeIcon icon={faFileInvoice} className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pay Bill</span>
            </Link>
            
            <Link to="/prescriptions" className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center hover:shadow-lg transition group">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition">
                <FontAwesomeIcon icon={faPrescription} className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Request Refill</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HelpCenter;