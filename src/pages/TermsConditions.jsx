import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faGavel,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

const TermsConditions = () => {
  const lastUpdated = 'January 1, 2024';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="bg-blue-600 dark:bg-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faFileContract} className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-xl">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faGavel} className="mr-3 text-blue-600" />
                Agreement to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                By accessing or using MediCare Plus Hospital's website and services, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access our services.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Medical Disclaimer</h2>
              <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 p-4 mb-6">
                <p className="text-yellow-800 dark:text-yellow-200 flex items-start">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 mt-1 flex-shrink-0" />
                  <span>
                    <strong>Important:</strong> The information provided on this website is for general informational purposes only and is not a substitute for professional medical advice. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                  </span>
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Use of Services</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">You agree to:</p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Provide accurate and complete information when using our services</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized account use</li>
                <li>Use our services only for lawful purposes</li>
                <li>Respect the privacy and rights of other users</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Appointment and Cancellation Policy</h2>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Appointments must be cancelled at least 2 hours before the scheduled time</li>
                <li>Late cancellations may be subject to a cancellation fee</li>
                <li>No-shows may be charged the full consultation fee</li>
                <li>We reserve the right to reschedule appointments due to emergencies or unforeseen circumstances</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Payment Terms</h2>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Payment is due at the time of service unless prior arrangements have been made</li>
                <li>We accept cash, credit/debit cards, and insurance payments</li>
                <li>Insurance claims are your responsibility; we will provide necessary documentation</li>
                <li>Refunds are processed according to our refund policy</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Intellectual Property</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                All content on this website, including text, graphics, logos, images, and software, is the property of MediCare Plus Hospital and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Limitation of Liability</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                To the maximum extent permitted by law, MediCare Plus Hospital shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Your use or inability to use our services</li>
                <li>Any conduct or content of any third party</li>
                <li>Unauthorized access to or alteration of your data</li>
                <li>Medical outcomes or treatment results</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Indemnification</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You agree to indemnify and hold harmless MediCare Plus Hospital, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your use of our services, violation of these terms, or violation of any rights of another.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Governing Law</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                These Terms shall be governed by the laws of the State of New York without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of New York County.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Changes to Terms</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our services after those revisions become effective, you agree to be bound by the revised terms.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <strong>Legal Department</strong><br />
                  MediCare Plus Hospital<br />
                  123 Healthcare Avenue, Medical District<br />
                  New York, NY 10001
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Email: legal@medicareplus.com<br />
                  Phone: +1 (234) 567-893
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsConditions;