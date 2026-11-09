import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { getIdTokenResult, onIdTokenChanged } from 'firebase/auth';
import { hospital } from '../../database';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [mfaVerified, setMfaVerified] = useState(false);

  useEffect(() => {
    let profileUnsubscribe;
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const currentGeneration = ++generation;
      profileUnsubscribe?.();
      setUserDetails(null);
      setIsAdmin(false);
      setAuthError(null);
      setMfaVerified(false);
      setCurrentUser(user);
      
      if (user) {
        setLoading(true);
        let verified = false;
        try {
          const result = await getIdTokenResult(user);
          if (currentGeneration !== generation) return;
          verified = result.claims.firebase?.sign_in_second_factor === 'totp' &&
            result.claims.firebase?.sign_in_provider === 'password';
          setMfaVerified(verified);
        } catch {
          if (currentGeneration !== generation) return;
          setAuthError('Your authentication token could not be checked. Please sign in again.');
          setLoading(false);
          return;
        }
        profileUnsubscribe = hospital.subscribeProfile(user.uid, profile => {
          if (currentGeneration !== generation) return;
          setUserDetails(profile);
          setIsAdmin(profile?.role === 'admin' && profile.accountStatus === 'active' && user.emailVerified && verified);
          setLoading(false);
        }, () => {
          setAuthError('Unable to load your profile. Check your connection or contact reception.');
          setUserDetails(null);
          setIsAdmin(false);
          setLoading(false);
        });
      } else {
        setUserDetails(null);
        setIsAdmin(false);
      }
      
      if (!user) setLoading(false);
    });

    return () => { generation++; unsubscribe(); profileUnsubscribe?.(); };
  }, []);

  const value = {
    currentUser,
    userDetails,
    isAdmin,
    loading,
    authError,
    mfaVerified,
    hasRole: (role) => userDetails?.role === role,
    isAuthenticated: !!currentUser?.emailVerified && userDetails?.accountStatus === 'active'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
