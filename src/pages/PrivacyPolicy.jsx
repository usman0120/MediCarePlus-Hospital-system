import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt,
  faLock,
  faUserSecret,
  faFileContract
} from '@fortawesome/free-solid-svg-icons';

const PrivacyPolicy = () => {
  const lastUpdated = 'January 1, 2024';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="bg-blue-600 dark:bg-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faShieldAlt} className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faUserSecret} className="mr-3 text-blue-600" />
                Our Commitment to Privacy
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                At MediCare Plus Hospital, we are committed to protecting your privacy and ensuring the security of your personal health information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faFileContract} className="mr-3 text-blue-600" />
                Information We Collect
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">We may collect the following types of information:</p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li><strong className="text-gray-900 dark:text-white">Personal Information:</strong> Name, date of birth, gender, contact information, and identification numbers</li>
                <li><strong className="text-gray-900 dark:text-white">Medical Information:</strong> Health records, medical history, test results, treatment plans, and insurance information</li>
                <li><strong className="text-gray-900 dark:text-white">Payment Information:</strong> Billing details, insurance claims, and payment history</li>
                <li><strong className="text-gray-900 dark:text-white">Usage Data:</strong> Website interactions, appointment bookings, and communication preferences</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faLock} className="mr-3 text-blue-600" />
                How We Protect Your Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We implement comprehensive security measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>256-bit SSL encryption for all data transmission</li>
                <li>Secure data centers with 24/7 monitoring</li>
                <li>Strict access controls and authentication requirements</li>
                <li>Regular security audits and penetration testing</li>
                <li>Employee training on data protection and privacy</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Use of Information</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Provide and manage healthcare services</li>
                <li>Schedule and manage appointments</li>
                <li>Process payments and insurance claims</li>
                <li>Communicate with you about your care</li>
                <li>Improve our services and patient experience</li>
                <li>Comply with legal and regulatory requirements</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Information Sharing</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We do not sell your personal information. We may share information:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>With healthcare providers involved in your care</li>
                <li>With insurance companies for payment processing</li>
                <li>When required by law or legal process</li>
                <li>With your explicit consent</li>
                <li>With service providers who assist in our operations (under confidentiality agreements)</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Rights</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Access your personal and medical records</li>
                <li>Request corrections to your information</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Opt-out of non-essential communications</li>
                <li>Receive a copy of your data in portable format</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Cookies and Tracking</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and personalize content. You can control cookie preferences through your browser settings.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Children's Privacy</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Our services are not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Changes to This Policy</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We may update this Privacy Policy periodically. The updated version will be posted with a revised "Last Updated" date. We encourage you to review this policy regularly.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                If you have questions about this Privacy Policy or your data, please contact our Privacy Officer:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <strong>Privacy Officer</strong><br />
                  MediCare Plus Hospital<br />
                  123 Healthcare Avenue, Medical District<br />
                  New York, NY 10001
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Email: privacy@medicareplus.com<br />
                  Phone: +1 (234) 567-892
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By using our services, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;