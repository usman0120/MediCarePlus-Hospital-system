import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserById } from '../../database';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch additional user details from Firestore
          const result = await getUserById(user.uid);
          if (result.success) {
            setUserDetails(result.data);
            setIsAdmin(result.data.role === 'admin' || user.email === 'admin@medicareplus.com');
          } else {
            // User exists in Auth but not in Firestore - this shouldn't happen normally
            // But if it does, we'll log them out and show an error
            console.warn('User profile not found in database:', result.error);
            
            // Only sign out if this is not a fresh registration (give time for doc to be created)
            // For now, just show a warning but allow app to load
            if (result.error === 'User not found') {
              toast.error('Profile not found. Please contact support or re-register.');
            }
            
            setUserDetails(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
          toast.error('Error loading user profile');
          setUserDetails(null);
          setIsAdmin(false);
        }
      } else {
        setUserDetails(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userDetails,
    isAdmin,
    loading,
    hasRole: (role) => userDetails?.role === role,
    isAuthenticated: !!currentUser && !!userDetails
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
