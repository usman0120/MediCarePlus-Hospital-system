import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getIdTokenResult, onIdTokenChanged } from 'firebase/auth';
import { auth } from '../firebase.js';
import { hospital } from '../database.js';

const AuthContext = createContext(null);
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
};
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [adminPasswordAuthenticated, setAdminPasswordAuthenticated] = useState(false);
  const identity = useRef(null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('medicare.theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('medicare.theme', theme); } catch { /* Theme still works when browser storage is unavailable. */ }
  }, [theme]);
  useEffect(() => {
    let profileUnsubscribe;
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async user => {
      const request = ++generation;
      const identityChanged = identity.current !== (user?.uid || null);
      identity.current = user?.uid || null;
      profileUnsubscribe?.(); setCurrentUser(user); setAuthError('');
      if (identityChanged) { setUserDetails(null); setAdminPasswordAuthenticated(false); }
      if (!user) { setLoading(false); return; }
      if (identityChanged) setLoading(true);
      try {
        const token = await getIdTokenResult(user);
        if (request !== generation) return;
        setAdminPasswordAuthenticated(token.claims.firebase?.sign_in_provider === 'password');
        profileUnsubscribe = hospital.subscribeProfile(user.uid, profile => {
          if (request !== generation) return;
          setUserDetails(profile); setLoading(false);
        }, () => {
          if (request !== generation) return;
          setAuthError('Unable to load your hospital profile. Reconnect or contact reception.'); setLoading(false);
        });
      } catch {
        if (request === generation) { setAuthError('Your session could not be verified. Sign in again.'); setLoading(false); }
      }
    });
    return () => { generation++; unsubscribe(); profileUnsubscribe?.(); };
  }, []);
  const isAuthenticated = Boolean(currentUser?.emailVerified && userDetails?.accountStatus === 'active' && userDetails?.schemaVersion === 2);
  return <AuthContext.Provider value={{ currentUser, userDetails, loading, authError, adminPasswordAuthenticated, isAuthenticated,
    isAdmin: isAuthenticated && userDetails.role === 'admin' && adminPasswordAuthenticated,
    theme, toggleTheme: () => setTheme(value => value === 'light' ? 'dark' : 'light') }}>{children}</AuthContext.Provider>;
}
