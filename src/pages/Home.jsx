import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospital } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { isAuthenticated, toggleTheme } = useAuth();
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-12">
    <button className="button-secondary float-right" onClick={toggleTheme}>Toggle light / dark</button>
    <h1 className="text-4xl font-bold"><FontAwesomeIcon icon={faHospital} className="mr-3 text-blue-600" />MediCare Plus</h1>
    <p className="text-xl">Hospital patient and staff portal</p>
    <section className="card space-y-4"><h2 className="text-2xl font-semibold">Secure access to hospital workflows</h2>
      <p>Patients can register, verify their email and access appointments, visit records, lab results, bills and doctor conversations. Hospital administration creates staff accounts.</p>
      <div className="flex flex-wrap gap-3"><Link className="button" to={isAuthenticated ? '/dashboard' : '/login'}>{isAuthenticated ? 'Open dashboard' : 'Sign in'}</Link><Link className="button-secondary" to="/register">Patient registration</Link></div>
    </section>
    <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">Evaluation/staging only until Firebase rules deployment, owner provisioning and hospital privacy/policy approval are complete. Do not enter real patient records into an unapproved deployment.</p>
  </main>;
}
