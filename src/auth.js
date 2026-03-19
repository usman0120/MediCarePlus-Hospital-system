import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  browserLocalPersistence,
  setPersistence,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';

// Action code settings for email link authentication
const actionCodeSettings = {
  // URL must be whitelisted in Firebase Console
  url: window.location.origin + '/login',
  handleCodeInApp: true,
  // This must be true for email link sign-in
  iOS: {
    bundleId: 'com.medicareplus.ios'
  },
  android: {
    packageName: 'com.medicareplus.android',
    installApp: true,
    minimumVersion: '12'
  },
  dynamicLinkDomain: 'medicareplus.page.link'
};

// Ensure user profile exists
const ensureUserProfileExists = async (user) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userSnapshot = await getDoc(userDocRef);

  if (userSnapshot.exists()) {
    return userDocRef;
  }

  const emailSnapshot = await getDocs(
    query(
      collection(db, 'users'),
      where('email', '==', user.email)
    )
  );
  const existingDoc = emailSnapshot.docs[0];
  const existingData = existingDoc?.data() || {};

  const baseProfile = {
    uid: user.uid,
    email: user.email,
    role: 'patient',
    fullName: user.displayName || '',
    photoURL: user.photoURL || '',
    phone: user.phoneNumber || '',
    emailVerified: user.emailVerified,
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    createdBy: existingData.createdBy || 'system:auto-generated',
    department: existingData.department || null,
    specialization: existingData.specialization || null,
    permissions: existingData.permissions || ['patient']
  };

  const profileData = {
    ...baseProfile,
    ...existingData,
    uid: user.uid,
    email: user.email,
    role: existingData?.role || baseProfile.role,
    fullName: existingData?.fullName || baseProfile.fullName,
    accountStatus: existingData?.accountStatus || baseProfile.accountStatus,
    emailVerified: user.emailVerified,
    lastLogin: serverTimestamp()
  };

  await setDoc(userDocRef, profileData);
  if (existingDoc && existingDoc.id !== user.uid) {
    console.info('Linked existing profile', existingDoc.id, 'to new uid', user.uid);
  }

  return userDocRef;
};

// Regular email/password registration
export const registerWithEmail = async (email, password, userData) => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    const userDoc = {
      uid: user.uid,
      email: user.email,
      role: userData.role || 'patient',
      fullName: userData.fullName,
      phone: userData.phone || '',
      cnic: userData.cnic || '',
      dateOfBirth: userData.dateOfBirth || null,
      gender: userData.gender || '',
      address: userData.address || '',
      emergencyContact: userData.emergencyContact || '',
      bloodGroup: userData.bloodGroup || '',
      emailVerified: false,
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      department: userData.department || null,
      specialization: userData.specialization || null,
      licenseNumber: userData.licenseNumber || null,
      consultationFee: userData.consultationFee || null,
      createdBy: userData.createdBy || null
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    // Send email verification
    await sendEmailVerification(user);

    // Log registration
    await addDoc(collection(db, 'auditLogs'), {
      userId: user.uid,
      action: 'USER_REGISTERED',
      role: userData.role,
      timestamp: serverTimestamp(),
      ipAddress: window.clientInformation?.platform || 'unknown',
      userAgent: navigator.userAgent
    });

    return { 
      success: true, 
      message: 'Registration successful! Please verify your email before logging in.',
      user 
    };
  } catch (error) {
    console.error('Registration error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email is already registered';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Admin registration
export const registerAdmin = async (email, password, adminData) => {
  try {
    // Check if admin already exists
    const adminQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin'),
      where('email', '==', email)
    );
    const adminSnapshot = await getDocs(adminQuery);
    
    if (!adminSnapshot.empty) {
      return { success: false, error: 'Admin already exists with this email' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const adminDoc = {
      uid: user.uid,
      email: user.email,
      role: 'admin',
      fullName: adminData.fullName,
      phone: adminData.phone || '',
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      emailVerified: false,
      isSuperAdmin: false,
      permissions: ['all'],
      department: 'Administration',
      createdBy: 'admin-registration'
    };

    await setDoc(doc(db, 'users', user.uid), adminDoc);

    // Send email verification
    await sendEmailVerification(user);

    await addDoc(collection(db, 'auditLogs'), {
      userId: user.uid,
      action: 'ADMIN_REGISTERED',
      timestamp: serverTimestamp(),
      ipAddress: window.clientInformation?.platform || 'unknown',
      userAgent: navigator.userAgent
    });

    return { success: true, message: 'Admin registered successfully! Please verify your email.', user };
  } catch (error) {
    console.error('Admin registration error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email is already registered';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Email/Password Login
export const loginWithEmail = async (email, password) => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // If user document doesn't exist, try to create it from auth data
      const newUserDoc = {
        uid: user.uid,
        email: user.email,
        role: 'patient', // Default role
        fullName: user.displayName || email.split('@')[0],
        emailVerified: user.emailVerified,
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), newUserDoc);
      
      return { 
        success: true, 
        user,
        role: 'patient',
        redirect: '/patient'
      };
    }

    const userData = userDoc.data();

    // Check if account is active
    if (userData.accountStatus !== 'active') {
      await signOut(auth);
      return { success: false, error: 'This account has been disabled' };
    }

    // Check if email is verified (skip for staff created by admin)
    if (!user.emailVerified && userData.role === 'patient') {
      // Resend verification email
      await sendEmailVerification(user);
      await signOut(auth);
      return { success: false, error: 'Please verify your email first. A new verification email has been sent.' };
    }

    // Update last login
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp()
    });

    // Log login
    await addDoc(collection(db, 'auditLogs'), {
      userId: user.uid,
      action: 'USER_LOGIN',
      role: userData.role,
      timestamp: serverTimestamp(),
      ipAddress: window.clientInformation?.platform || 'unknown',
      userAgent: navigator.userAgent
    });

    return { 
      success: true, 
      user,
      role: userData.role,
      redirect: `/${userData.role}`
    };
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Send Magic Link (Passwordless Login) - FIXED
export const sendMagicLink = async (email) => {
  try {
    // Check if user exists in Firestore first (more reliable)
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (emailSnapshot.empty) {
      return { 
        success: false, 
        error: 'No account found with this email. Please register first.' 
      };
    }

    // IMPORTANT: Save email before sending the link
    window.localStorage.setItem('emailForSignIn', email);
    
    // Send sign-in link
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    return { 
      success: true, 
      message: '✨ Magic link sent! Check your email and click the link to sign in instantly.'
    };
  } catch (error) {
    console.error('Magic link error:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later.';
    } else if (error.code === 'auth/unauthorized-continue-uri') {
      errorMessage = 'The magic link feature is not properly configured. Please contact support.';
    } else if (error.code === 'auth/missing-email') {
      errorMessage = 'Please enter a valid email address.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Complete Magic Link Sign-In - FIXED
export const completeMagicLinkSignIn = async () => {
  try {
    // Check if the current URL is a sign-in link
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      return { success: false, error: 'Invalid magic link' };
    }

    // Get the email from localStorage
    let email = window.localStorage.getItem('emailForSignIn');
    
    // If email is not in localStorage, prompt the user
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
      
      // If user cancels prompt
      if (!email) {
        return { success: false, error: 'Email is required to complete sign-in' };
      }
    }

    // Complete sign-in with email link
    const result = await signInWithEmailLink(auth, email, window.location.href);
    const user = result.user;

    // Ensure user profile exists
    await ensureUserProfileExists(user);

    // Clear email from storage
    window.localStorage.removeItem('emailForSignIn');

    // Get user role for redirect
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : { role: 'patient' };

    return { 
      success: true, 
      user,
      role: userData.role,
      redirect: `/${userData.role}`
    };
  } catch (error) {
    console.error('Complete magic link error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/expired-action-code') {
      errorMessage = 'This magic link has expired. Please request a new one.';
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'This magic link is invalid. Please request a new one.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Resend verification email
export const resendVerificationEmail = async (user) => {
  try {
    await sendEmailVerification(user);
    return { success: true, message: 'Verification email sent' };
  } catch (error) {
    console.error('Resend verification error:', error);
    return { success: false, error: error.message };
  }
};

// Check if email is verified
export const checkEmailVerified = async (user) => {
  try {
    await user.reload();
    return { success: true, verified: user.emailVerified };
  } catch (error) {
    console.error('Check verification error:', error);
    return { success: false, error: error.message };
  }
};

// Password Reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent. Please check your inbox.' };
  } catch (error) {
    console.error('Password reset error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Check if email exists
export const checkEmailExists = async (email) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return { success: true, exists: methods.length > 0 };
  } catch (error) {
    console.error('Error checking email:', error);
    return { success: false, error: error.message };
  }
};

// Logout
export const logoutUser = async (userId) => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      userId,
      action: 'USER_LOGOUT',
      timestamp: serverTimestamp()
    });
    
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create staff user and send email verification - FIXED
 * @param {Object} staffData - Staff data
 * @param {string} createdBy - Admin user ID
 * @returns {Promise<Object>} Created staff data
 */
export const createStaffUser = async (staffData, createdBy) => {
  try {
    console.log('Creating staff user with data:', { email: staffData.email, role: staffData.role });
    
    // Check if email already exists in Firestore
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '==', staffData.email)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      return { success: false, error: 'Email already exists' };
    }

    // Check if email exists in Firebase Auth (optional but good practice)
    try {
      const methods = await fetchSignInMethodsForEmail(auth, staffData.email);
      if (methods.length > 0) {
        return { success: false, error: 'Email already registered in authentication system' };
      }
    } catch (signInMethodError) {
      console.log('Error checking sign-in methods:', signInMethodError);
      // Continue anyway, as createUserWithEmailAndPassword will fail if email exists
    }

    // Create user in Firebase Auth
    console.log('Creating user in Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      staffData.email,
      staffData.password // Temporary password
    );
    
    const user = userCredential.user;
    console.log('User created in Auth:', user.uid);

    // Create user document in Firestore
    const userDoc = {
      uid: user.uid,
      email: user.email,
      role: staffData.role,
      fullName: staffData.fullName,
      phone: staffData.phone || '',
      emailVerified: false,
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      lastLogin: null,
      department: staffData.department || null,
      specialization: staffData.specialization || null,
      licenseNumber: staffData.licenseNumber || null,
      consultationFee: staffData.consultationFee || null,
      baseSalary: staffData.baseSalary || null,
      profileImage: staffData.profileImage || null, // Add profile image field
      createdBy,
      updatedAt: serverTimestamp()
    };

    console.log('Creating user document in Firestore...');
    await setDoc(doc(db, 'users', user.uid), userDoc);
    console.log('User document created in Firestore');

    // Send email verification
    console.log('Sending email verification...');
    try {
      await sendEmailVerification(user);
      console.log('Email verification sent successfully');
    } catch (verifyError) {
      console.error('Error sending verification email:', verifyError);
      // Don't fail the whole operation if email verification fails
      // Just log it and continue
    }
    
    // Send password reset email to force them to set their own password
    console.log('Sending password reset email...');
    try {
      await sendPasswordResetEmail(auth, staffData.email);
      console.log('Password reset email sent successfully');
    } catch (resetError) {
      console.error('Error sending password reset email:', resetError);
      // Don't fail the whole operation if password reset fails
      // Just log it and continue
    }

    // Log creation
    try {
      await addDoc(collection(db, 'auditLogs'), {
        userId: createdBy,
        action: 'STAFF_CREATED',
        targetUserId: user.uid,
        role: staffData.role,
        timestamp: serverTimestamp()
      });
      console.log('Audit log created');
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Non-critical error
    }

    return { 
      success: true, 
      data: { id: user.uid, ...userDoc },
      message: 'Staff created successfully. Verification and password reset emails sent.'
    };
  } catch (error) {
    console.error('Error creating staff:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email is already registered';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    return { success: false, error: errorMessage };
  }
};
/**
 * Reset staff password (send password reset email)
 * @param {string} email - Staff email
 * @returns {Promise<Object>} Success status
 */
export const resetStaffPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    
    // Log password reset request
    await addDoc(collection(db, 'auditLogs'), {
      action: 'PASSWORD_RESET_REQUESTED',
      targetEmail: email,
      timestamp: serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Password reset email sent successfully'
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No user found with this email';
    }
    
    return { success: false, error: errorMessage };
  }
};




/**
 * Register a patient (can be called from receptionist dashboard)
 * @param {Object} patientData - Patient data
 * @param {string} createdBy - User ID of creator
 * @returns {Promise<Object>} Created patient
 */
export const registerPatient = async (patientData, createdBy) => {
  try {
    console.log('Registering patient:', { email: patientData.email, createdBy });
    
    let userId;
    let authUser = null;
    
    // If email is provided, create auth user
    if (patientData.email) {
      // Generate a random password if not provided
      const password = patientData.password || Math.random().toString(36).slice(-8) + 'Aa1!';
      
      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, patientData.email, password);
        authUser = userCredential.user;
        userId = authUser.uid;
        
        console.log('Auth user created:', userId);
        
        // Send email verification
        await sendEmailVerification(authUser);
        console.log('Verification email sent');
        
        // Send password reset email to allow them to set their own password
        await sendPasswordResetEmail(auth, patientData.email);
        console.log('Password reset email sent');
      } catch (authError) {
        console.error('Error creating auth user:', authError);
        
        // Check if user already exists
        if (authError.code === 'auth/email-already-in-use') {
          // Try to get existing user by email from Firestore
          const emailQuery = query(
            collection(db, 'users'),
            where('email', '==', patientData.email)
          );
          const emailSnapshot = await getDocs(emailQuery);
          
          if (!emailSnapshot.empty) {
            userId = emailSnapshot.docs[0].id;
            console.log('Using existing user:', userId);
          } else {
            return { 
              success: false, 
              error: 'Email already registered but no user profile found. Please contact support.' 
            };
          }
        } else {
          return { success: false, error: authError.message };
        }
      }
    } else {
      // No email - generate a unique ID
      userId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Create user document in Firestore
    const userDoc = {
      uid: userId,
      fullName: patientData.fullName,
      email: patientData.email || null,
      phone: patientData.phone,
      cnic: patientData.cnic || null,
      dateOfBirth: patientData.dateOfBirth,
      gender: patientData.gender,
      address: patientData.address || null,
      emergencyContact: patientData.emergencyContact || null,
      bloodGroup: patientData.bloodGroup || null,
      role: 'patient',
      accountStatus: 'active',
      emailVerified: authUser ? authUser.emailVerified : false,
      createdAt: serverTimestamp(),
      createdBy: createdBy || 'system',
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', userId), userDoc);
    console.log('User document created in Firestore');
    
    // Log creation
    await addDoc(collection(db, 'auditLogs'), {
      userId: createdBy || 'system',
      action: 'PATIENT_REGISTERED',
      targetUserId: userId,
      hasEmail: !!patientData.email,
      timestamp: serverTimestamp()
    });
    
    return { 
      success: true, 
      data: { id: userId, ...userDoc },
      message: patientData.email 
        ? 'Patient registered successfully. Verification email sent.'
        : 'Patient registered successfully (offline mode).'
    };
  } catch (error) {
    console.error('Error registering patient:', error);
    return { success: false, error: error.message };
  }
};


/**
 * Create appointment from registration
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Created appointment
 */
export const createAppointmentFromRegistration = async (appointmentData) => {
  try {
    const appointmentRef = doc(collection(db, 'appointments'));
    const appointment = {
      id: appointmentRef.id,
      ...appointmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(appointmentRef, appointment);
    
    return { success: true, data: { id: appointmentRef.id, ...appointment } };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: error.message };
  }
};