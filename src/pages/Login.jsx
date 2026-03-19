import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  loginWithEmail, 
  sendMagicLink,
  completeMagicLinkSignIn
} from '../auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faSpinner,
  faMagic,
  faArrowRight,
  faInfoCircle,
  faCheckCircle,
  faHospital
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

// Import logo (make sure to add logo.png to assets folder)
import logo from '../../assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  
  const [loginMethod, setLoginMethod] = useState('password');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showMagicInfo, setShowMagicInfo] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const _from = location.state?.from?.pathname || '/dashboard';

  // Check for magic link on component mount
  useEffect(() => {
    const handleMagicLink = async () => {
      if (window.location.href.includes('mode=signIn')) {
        setLoading(true);
        const result = await completeMagicLinkSignIn();
        setLoading(false);
        
        if (result.success) {
          toast.success("✨ Welcome back! You're logged in successfully.");
          // User will be redirected by auth state change
        } else {
          toast.error(result.error);
          navigate('/login');
        }
      }
    };

    handleMagicLink();
  }, [navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (userDetails) {
      navigate(`/${userDetails.role}`);
    }
  }, [userDetails, navigate]);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    const result = await loginWithEmail(email, password);
    
    if (result.success) {
      toast.success('Login successful! Welcome back.');
      navigate(result.redirect, { replace: true });
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    
    const result = await sendMagicLink(email);
    
    if (result.success) {
      setMagicLinkSent(true);
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const renderPasswordLogin = () => (
    <form onSubmit={handlePasswordLogin} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400 transition-all"
            placeholder="Enter your email"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faLock} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400 transition-all"
            placeholder="Enter your password"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Link
          to="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline transition-all"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center font-semibold text-lg shadow-lg"
      >
        {loading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
        ) : (
          <>
            Sign In
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </>
        )}
      </button>
    </form>
  );

  const renderMagicLink = () => (
    <form onSubmit={handleMagicLink} className="space-y-6">
      {magicLinkSent ? (
        <div className="text-center space-y-6">
          <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto transform rotate-3 shadow-lg">
            <FontAwesomeIcon icon={faCheckCircle} className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              ✨ Magic Link Sent!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              We've sent a magic link to <strong className="text-blue-600 dark:text-blue-400">{email}</strong>
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border-2 border-blue-100 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Next Steps:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-3 text-left">
              <li className="flex items-start">
                <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                Open your email inbox
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                Find the email from <strong>MediCare Plus</strong>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 dark:bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                Click the <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-xs">Sign In</span> button in the email
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>📫 Can't find the email?</strong> Check your spam folder or 
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline ml-1"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl mb-4 border-2 border-purple-100 dark:border-purple-800">
            <div className="flex items-start">
              <div className="bg-purple-200 dark:bg-purple-800 rounded-full p-2 mr-3">
                <FontAwesomeIcon icon={faMagic} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 text-sm">What is Magic Link?</h4>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  No password needed! We'll email you a secure link that logs you in instantly. 
                  It's fast, secure, and you don't need to remember another password.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-800 dark:text-white dark:focus:border-purple-400 transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center font-semibold text-lg shadow-lg"
          >
            {loading ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <>
                <FontAwesomeIcon icon={faMagic} className="mr-2" />
                Send Magic Link
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowMagicInfo(!showMagicInfo)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center justify-center mx-auto"
          >
            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
            How does Magic Link work?
          </button>
        </>
      )}
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group">
            <div className="flex items-center justify-center space-x-3 mb-4">
              {logo ? (
                <img 
                  src={logo} 
                  alt="MediCare Plus" 
                  className="h-16 w-16 object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all transform group-hover:scale-105">
                  <FontAwesomeIcon icon={faHospital} className="h-8 w-8 text-white" />
                </div>
              )}
              <div className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MediCare Plus
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Smart Hospital Management System</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Login Method Toggle */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl mb-8">
            <button
              onClick={() => {
                setLoginMethod('password');
                setMagicLinkSent(false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'password'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <FontAwesomeIcon icon={faLock} className="mr-2" />
              Password
            </button>
            <button
              onClick={() => {
                setLoginMethod('magic');
                setMagicLinkSent(false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'magic'
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <FontAwesomeIcon icon={faMagic} className="mr-2" />
              Magic Link
            </button>
          </div>

          {/* Login Form */}
          {loginMethod === 'password' ? renderPasswordLogin() : renderMagicLink()}

          {/* Register Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-400">
              New to MediCare Plus?{' '}
              <Link 
                to="/register" 
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
          <span>🔒 HIPAA Compliant</span>
          <span>⚡ Secure Login</span>
          <span>🛡️ 2FA Available</span>
        </div>
      </div>
    </div>
  );
};

export default Login;