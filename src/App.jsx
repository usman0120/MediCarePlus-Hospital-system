import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeProvider';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patient from './pages/Patient';
import Doctor from './pages/Doctor';
import Admin from './pages/Admin';
import Reception from './pages/Receptionist';
import Accountant from './pages/Accountant';
import ForgotPassword from './pages/ForgotPassword';

// NEW PUBLIC PAGES IMPORTS
import About from './pages/About';
import Doctors from './pages/Doctors';
import DoctorProfile from './pages/DoctorProfile';
import Departments from './pages/Departments';
import Contact from './pages/Contact';
import HelpCenter from './pages/HelpCenter';

// NEW LEGAL PAGES IMPORTS
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import CookiesPolicy from './pages/CookiesPolicy';
import Disclaimer from './pages/Disclaimer';

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <Routes>
          {/* Public Routes - Main Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctor/:id" element={<DoctorProfile />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Support & Help Pages */}
          <Route path="/help" element={<HelpCenter />} />
          
          {/* Legal & Policy Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/cookies" element={<CookiesPolicy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/patient/*" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <Patient />
            </ProtectedRoute>
          } />
          
          <Route path="/doctor/*" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <Doctor />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          } />
          
          <Route path="/receptionist/*" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <Reception />
            </ProtectedRoute>
          } />
          
          {/* Accountant Route */}
          <Route path="/accountant/*" element={
            <ProtectedRoute allowedRoles={['accountant']}>
              <Accountant />
            </ProtectedRoute>
          } />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;