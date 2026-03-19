import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faArrowLeft,
  faSpinner,
  faCheck,
  faInfoCircle,
  faHeadset,
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';
import { resetPassword } from '../auth';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setEmailError('Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setEmailError('');
    
    const result = await resetPassword(email);
    
    if (result.success) {
      setEmailSent(true);
      toast.success(result.message);
    } else {
      setEmailError(result.error);
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back to Home */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-6 group"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
          {emailSent ? (
            <div className="text-center space-y-6">
              {/* Success Animation */}
              <div className="relative">
                <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto transform rotate-6 shadow-xl">
                  <FontAwesomeIcon icon={faCheck} className="h-14 w-14 text-green-600 dark:text-green-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-xl animate-bounce">
                  ✉️
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  📧 Check Your Email
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We've sent a password reset link to
                </p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  {email}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border-2 border-blue-100 dark:border-blue-800 text-left">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                  Important Notes:
                </h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start text-blue-700 dark:text-blue-300">
                    <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">1</span>
                    <span>The reset link will expire in <strong>1 hour</strong></span>
                  </li>
                  <li className="flex items-start text-blue-700 dark:text-blue-300">
                    <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">2</span>
                    <span>Check your <strong>spam/junk folder</strong> if you don't see the email</span>
                  </li>
                  <li className="flex items-start text-blue-700 dark:text-blue-300">
                    <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">3</span>
                    <span>Add <strong>noreply@medicareplus.com</strong> to your contacts</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] font-semibold"
                >
                  Try another email
                </button>

                <Link
                  to="/login"
                  className="block w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center font-semibold"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg transform -rotate-3">
                  <FontAwesomeIcon icon={faLock} className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Forgot Password? 🔐
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                  No worries! Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon 
                      icon={faEnvelope} 
                      className={`text-gray-400 transition-colors ${
                        emailError ? 'text-red-500' : 'group-focus-within:text-blue-500'
                      }`} 
                    />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all dark:bg-gray-800 dark:text-white ${
                      emailError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700'
                        : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:border-blue-400'
                    }`}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                {emailError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center font-semibold text-lg shadow-lg"
              >
                {loading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>

              {/* Help Section */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-start">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 mr-3">
                    <FontAwesomeIcon icon={faQuestionCircle} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      Forgot your email? Need help?
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      If you're having trouble accessing your account or forgot which email you used, 
                      please contact our support team. We're here to help you regain access to your account.
                    </p>
                    <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-500">
                      <FontAwesomeIcon icon={faHeadset} className="mr-2" />
                      <span>Support hours: 24/7 - We'll get back to you within 24 hours</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
                      Note: For security reasons, we cannot provide account information via email. 
                      Please contact support for assistance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Back to Login Link */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 group"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Security Note */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-6">
          🔒 This is a secure area. All password resets are encrypted and verified.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;