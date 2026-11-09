import { Component, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Patient = lazy(() => import('./pages/Patient.jsx'));
const Doctor = lazy(() => import('./pages/Doctor.jsx'));
const Reception = lazy(() => import('./pages/Reception.jsx'));
const Lab = lazy(() => import('./pages/Lab.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

class PortalBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main className="p-6" role="alert">The portal could not display this screen. No successful transaction is implied. Reconnect or contact hospital support.
      <button className="ml-3 underline" onClick={() => window.location.reload()}>Reload portal</button></main> : this.props.children;
  }
}
export default function App() {
  return <PortalBoundary><Suspense fallback={<main className="p-6" role="status">Loading hospital portal…</main>}><Routes>
    <Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<Login key="reset-password" initialMethod="reset" />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/patient/*" element={<ProtectedRoute allowedRoles={['patient']}><Patient /></ProtectedRoute>} />
    <Route path="/doctor/*" element={<ProtectedRoute allowedRoles={['doctor']}><Doctor /></ProtectedRoute>} />
    <Route path="/receptionist/*" element={<ProtectedRoute allowedRoles={['receptionist']}><Reception /></ProtectedRoute>} />
    <Route path="/reception/*" element={<Navigate to="/receptionist" replace />} />
    <Route path="/lab/*" element={<ProtectedRoute allowedRoles={['lab']}><Lab /></ProtectedRoute>} />
    <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></PortalBoundary>;
}
