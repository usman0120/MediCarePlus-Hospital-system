import 'jspdf';
import 'jspdf-autotable';
import 'jspdf-autotable';
import pako from 'pako';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import logoBase64 from '../../assets/logo.png'; // You'll need to add this

// ==================== COMPRESSION UTILITIES ====================

/**
 * Safely compress data with proper error handling
 * @param {any} data - Data to compress
 * @returns {string|null} Base64 compressed string or null on error
 */
export const compressData = (data) => {
  try {
    if (!data) return null;
    
    // Convert to string
    let stringData;
    try {
      stringData = typeof data === 'string' ? data : JSON.stringify(data);
    } catch (jsonError) {
      console.error('JSON stringify error:', jsonError);
      return null;
    }
    
    // Compress using pako
    let compressed;
    try {
      compressed = pako.gzip(stringData);
    } catch (pakoError) {
      console.error('pako compression error:', pakoError);
      return null;
    }
    
    // Convert Uint8Array to binary string in chunks
    let binaryString = '';
    const chunkSize = 0x8000; // 32KB chunks
    
    try {
      for (let i = 0; i < compressed.length; i += chunkSize) {
        const chunk = compressed.subarray(i, Math.min(i + chunkSize, compressed.length));
        binaryString += String.fromCharCode.apply(null, chunk);
      }
    } catch (chunkError) {
      console.error('Binary conversion error:', chunkError);
      return null;
    }
    
    // Convert to base64
    try {
      const base64 = btoa(binaryString);
      return base64;
    } catch (btoaError) {
      console.error('btoa conversion error:', btoaError);
      return null;
    }
    
  } catch (error) {
    console.error('Compression error occurred:', error);
    return null;
  }
};

/**
 * Safely decompress data with proper error handling
 * @param {string} compressedBase64 - Base64 compressed string
 * @returns {any|null} Decompressed data or null on error
 */
export const decompressData = (compressedBase64) => {
  try {
    if (!compressedBase64) return null;
    
    // Decode base64 to binary string
    let binaryString;
    try {
      binaryString = atob(compressedBase64);
    } catch (atobError) {
      console.error('atob decoding error:', atobError);
      return null;
    }
    
    // Convert binary string to Uint8Array
    let uint8Array;
    try {
      uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
    } catch (arrayError) {
      console.error('Uint8Array conversion error:', arrayError);
      return null;
    }
    
    // Decompress
    let decompressed;
    try {
      decompressed = pako.ungzip(uint8Array);
    } catch (ungzipError) {
      console.error('pako ungzip error:', ungzipError);
      return null;
    }
    
    // Convert back to string
    let resultString;
    try {
      resultString = new TextDecoder().decode(decompressed);
    } catch (decodeError) {
      console.error('TextDecoder error:', decodeError);
      return null;
    }
    
    // Try to parse JSON
    try {
      return JSON.parse(resultString);
    } catch {
      // Return as string if not valid JSON
      return resultString;
    }
    
  } catch (error) {
    console.error('Decompression error occurred:', error);
    return null;
  }
};

/**
 * Alternative compression using Base64 encoding without compression
 * Use this if pako continues to cause issues
 * @param {any} data - Data to encode
 * @returns {string|null} Base64 encoded string
 */
export const simpleEncode = (data) => {
  try {
    if (!data) return null;
    
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(stringData)));
  } catch (error) {
    console.error('Encoding error:', error);
    return null;
  }
};

/**
 * Alternative decompression for simple encoding
 * @param {string} base64 - Base64 encoded string
 * @returns {any|null} Decoded data
 */
export const simpleDecode = (base64) => {
  try {
    if (!base64) return null;
    
    const stringData = decodeURIComponent(escape(atob(base64)));
    
    try {
      return JSON.parse(stringData);
    } catch {
      return stringData;
    }
  } catch (error) {
    console.error('Decoding error:', error);
    return null;
  }
};

// ==================== VALIDATION UTILITIES ====================

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return re.test(phone);
};

export const validateCNIC = (cnic) => {
  const re = /^\d{5}-\d{7}-\d$/;
  return re.test(cnic);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return re.test(password);
};

export const validateVitals = (vitals) => {
  const errors = {};
  
  if (vitals.bp) {
    const bpMatch = vitals.bp.match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!bpMatch) {
      errors.bp = 'BP must be in format "120/80"';
    } else {
      const systolic = parseInt(bpMatch[1]);
      const diastolic = parseInt(bpMatch[2]);
      if (systolic < 70 || systolic > 220 || diastolic < 40 || diastolic > 140) {
        errors.bp = 'BP values out of normal range';
      }
    }
  }
  
  if (vitals.sugar && (vitals.sugar < 20 || vitals.sugar > 600)) {
    errors.sugar = 'Blood sugar out of normal range';
  }
  
  if (vitals.heartRate && (vitals.heartRate < 30 || vitals.heartRate > 220)) {
    errors.heartRate = 'Heart rate out of normal range';
  }
  
  if (vitals.temperature && (vitals.temperature < 32 || vitals.temperature > 45)) {
    errors.temperature = 'Temperature out of normal range';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ==================== PDF GENERATION ====================

export const generatePDF = async (type, data) => {
  try {
    // Dynamically import jsPDF to avoid issues
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add logo (try-catch for logo)
    try {
      // If you have a logo base64, use it, otherwise skip
      if (typeof logoBase64 !== 'undefined' && logoBase64) {
        doc.addImage(logoBase64, 'PNG', 10, 10, 30, 15);
      }
    // eslint-disable-next-line no-unused-vars
    } catch (logoError) {
      console.warn('Logo not found, continuing without logo');
    }

    // Add hospital name
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text('MediCare Plus', 45, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Smart Hospital Management System', 45, 27);

    switch (type) {
      case 'prescription':
        // Make sure generatePrescriptionPDF is defined
        if (typeof generatePrescriptionPDF === 'function') {
          generatePrescriptionPDF(doc, data);
        } else {
          doc.text('Prescription data unavailable', 10, 50);
        }
        break;
      case 'salary-slip':
        if (typeof generateSalarySlipPDF === 'function') {
          generateSalarySlipPDF(doc, data);
        } else {
          doc.text('Salary slip data unavailable', 10, 50);
        }
        break;
      case 'medical-summary':
        if (typeof generateMedicalSummaryPDF === 'function') {
          generateMedicalSummaryPDF(doc, data);
        } else {
          doc.text('Medical summary data unavailable', 10, 50);
        }
        break;
      default:
        doc.text(`Unknown PDF type: ${type}`, 10, 50);
    }

    // Add footer with timestamp
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Return as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return pdfBase64;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

const generatePrescriptionPDF = (doc, data) => {
  let yPos = 40;
  
  // Doctor info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Dr. ${data.doctorName || 'Doctor'}`, 10, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`License: ${data.licenseNumber || 'N/A'}`, 10, yPos);
  yPos += 7;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, yPos);
  yPos += 15;

  // Patient info
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Patient Information:', 10, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Name: ${data.patientName || 'Patient'}`, 15, yPos);
  yPos += 6;
  doc.text(`Age: ${data.patientAge || 'N/A'}`, 15, yPos);
  yPos += 6;
  doc.text(`Weight: ${data.patientWeight || 'N/A'} kg`, 15, yPos);
  yPos += 15;

  // Diagnosis
  if (data.diagnosis) {
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Diagnosis:', 10, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, 180);
    doc.text(diagnosisLines, 15, yPos);
    yPos += diagnosisLines.length * 5 + 5;
  }

  // Prescription
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Prescription:', 10, yPos);
  yPos += 7;

  const tableData = data.medicines?.map(med => [
    med.name,
    med.dose,
    med.frequency,
    med.duration,
    med.instructions || ''
  ]) || [];

  doc.autoTable({
    startY: yPos,
    head: [['Medicine', 'Dose', 'Frequency', 'Duration', 'Instructions']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: 255 },
    styles: { fontSize: 9 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Additional notes
  if (data.notes) {
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Additional Notes:', 10, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setTextColor(80);
    const noteLines = doc.splitTextToSize(data.notes, 180);
    doc.text(noteLines, 15, yPos);
    yPos += noteLines.length * 5 + 10;
  }

  // Next visit
  if (data.followUpDate) {
    doc.setFontSize(10);
    doc.setTextColor(0, 102, 204);
    doc.text(`Follow-up Date: ${new Date(data.followUpDate).toLocaleDateString()}`, 10, yPos);
  }

  // Doctor signature
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Doctor\'s Signature:', 130, doc.internal.pageSize.height - 30);
  
  // Add signature line
  doc.line(130, doc.internal.pageSize.height - 25, 190, doc.internal.pageSize.height - 25);
};

const generateSalarySlipPDF = (doc, data) => {
  // Add validation for required data
  if (!data) {
    console.error('No data provided for salary slip');
    doc.text('Error: No data available', 10, 40);
    return;
  }

  let yPos = 40;

  // Employee info
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('SALARY SLIP', 105, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(11);
  doc.text(`Month: ${data.month}/${data.year || ''}`, 10, yPos);
  doc.text(`Employee: ${data.userName || 'N/A'}`, 120, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Role: ${data.userRole || 'N/A'}`, 10, yPos);
  doc.text(`Department: ${data.userDepartment || 'N/A'}`, 120, yPos);
  yPos += 8;
  doc.text(`Employee ID: ${data.userId || 'N/A'}`, 10, yPos);
  yPos += 15;

  // Salary details table - handle missing values
  const baseSalary = data.baseSalary || 0;
  const perDaySalary = data.perDaySalary || (baseSalary / 26);
  const calculatedSalary = data.calculatedSalary || 0;
  const workingDays = data.workingDays || 0;
  const absentDays = data.absentDays || 0;

  const tableData = [
    ['Base Salary', `PKR ${baseSalary.toLocaleString()}`],
    ['Working Days', workingDays],
    ['Absent Days', absentDays],
    ['Per Day Rate', `PKR ${perDaySalary.toLocaleString()}`],
    ['Calculated Salary', `PKR ${calculatedSalary.toLocaleString()}`],
    ['Status', data.status === 'paid' ? 'PAID' : 'PENDING']
  ];

  // Check if autoTable is available
  if (typeof doc.autoTable === 'function') {
    doc.autoTable({
      startY: yPos,
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });
    yPos = doc.lastAutoTable.finalY + 15;
  } else {
    // Fallback if autoTable is not available
    tableData.forEach(row => {
      doc.setFontSize(10);
      doc.text(`${row[0]}: ${row[1]}`, 10, yPos);
      yPos += 8;
    });
    yPos += 15;
  }

  // Payment info with safe date handling
  if (data.status === 'paid') {
    doc.setFontSize(10);
    doc.setTextColor(0, 128, 0);
    
    let paidOnText = 'Paid on: N/A';
    if (data.paymentInfo?.paidAt) {
      try {
        const paidDate = data.paymentInfo.paidAt.toDate ? data.paymentInfo.paidAt.toDate() : new Date(data.paymentInfo.paidAt);
        paidOnText = `Paid on: ${paidDate.toLocaleDateString()}`;
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        paidOnText = 'Paid on: Date unavailable';
      }
    } else if (data.paidAt) {
      try {
        const paidDate = data.paidAt.toDate ? data.paidAt.toDate() : new Date(data.paidAt);
        paidOnText = `Paid on: ${paidDate.toLocaleDateString()}`;
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        paidOnText = 'Paid on: Date unavailable';
      }
    }
    
    doc.text(paidOnText, 10, yPos);
    yPos += 6;
    doc.text(`Paid by: ${data.paymentInfo?.paidBy || data.paidBy || 'System'}`, 10, yPos);
  } else {
    doc.setTextColor(255, 0, 0);
    doc.text('STATUS: PENDING PAYMENT', 10, yPos);
  }

  // Admin signature
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Admin Signature:', 130, pageHeight - 30);
  doc.line(130, pageHeight - 25, 190, pageHeight - 25);
};

const generateMedicalSummaryPDF = (doc, data) => {
  let yPos = 40;

  // Patient info
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('MEDICAL SUMMARY', 105, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(11);
  doc.text(`Patient: ${data.patientName}`, 10, yPos);
  doc.text(`DOB: ${data.patientDOB || 'N/A'}`, 120, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Blood Group: ${data.bloodGroup || 'N/A'}`, 10, yPos);
  doc.text(`MRN: ${data.mrn || data.patientId}`, 120, yPos);
  yPos += 15;

  // Medical history
  if (data.medicalHistory && data.medicalHistory.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Medical History:', 10, yPos);
    yPos += 7;

    const historyData = data.medicalHistory.map(h => [
      new Date(h.date).toLocaleDateString(),
      h.condition,
      h.treatment
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Date', 'Condition', 'Treatment']],
      body: historyData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Recent visits
  if (data.recentVisits && data.recentVisits.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Recent Visits:', 10, yPos);
    yPos += 7;

    const visitsData = data.recentVisits.map(v => [
      new Date(v.date).toLocaleDateString(),
      v.diagnosis,
      v.doctorName
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Date', 'Diagnosis', 'Doctor']],
      body: visitsData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Allergies
  if (data.allergies && data.allergies.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(255, 0, 0);
    doc.text(`Allergies: ${data.allergies.join(', ')}`, 10, yPos);
  }
};

// ==================== DATE UTILITIES ====================

// Replace the existing formatDate function with this enhanced version

export const formatDate = (timestamp, options = {}) => {
  if (!timestamp) return 'N/A';
  
  try {
    let date;
    
    if (timestamp?.toDate) {
      // Firestore timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // Date object
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      // String or number timestamp
      date = new Date(timestamp);
    } else {
      return 'N/A';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('en-PK', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

// Also add a simpler date-only formatter
export const formatDateOnly = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    let date;
    
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date only:', error);
    return 'N/A';
  }
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

export const getAgeFromDOB = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Add these functions to your helpers.js file after the date utilities section

// ==================== TIME UTILITIES ====================

/**
 * Format time string to display format
 * @param {string} time - Time string in HH:mm format
 * @returns {string} Formatted time (e.g., "09:30 AM")
 */
export const formatTime = (time) => {
  if (!time) return 'N/A';
  
  try {
    // If time is in HH:mm format
    if (typeof time === 'string' && time.includes(':')) {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // If time is a timestamp or Date object
    const date = time instanceof Date ? time : new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return time;
  } catch (error) {
    console.error('Error formatting time:', error);
    return String(time);
  }
};

/**
 * Format 24-hour time to 12-hour format
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30")
 * @returns {string} Time in 12-hour format (e.g., "02:30 PM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return 'N/A';
  
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error('Error formatting 12-hour time:', error);
    return time24;
  }
};

/**
 * Get time ago string (e.g., "5 minutes ago")
 * @param {Date|string|number} timestamp - Timestamp to format
 * @returns {string} Time ago string
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 30) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return formatDate(date);
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return String(timestamp);
  }
};

/**
 * Check if a time is within working hours
 * @param {string} time - Time in HH:mm format
 * @param {Object} workingHours - Working hours configuration
 * @returns {boolean} True if within working hours
 */
export const isWithinWorkingHours = (time, workingHours = { start: 9, end: 24 }) => {
  if (!time) return false;
  
  try {
    const [hours] = time.split(':').map(Number);
    return hours >= workingHours.start && hours < workingHours.end;
  } catch (error) {
    console.error('Error checking working hours:', error);
    return false;
  }
};

/**
 * Get duration between two times
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {string} Duration in hours and minutes
 */
export const getDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  
  try {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60; // Add 24 hours if end time is next day
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min`;
    }
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'N/A';
  }
};

/**
 * Check if a time slot is available
 * @param {string} time - Time to check
 * @param {Array} bookedSlots - Array of booked time slots
 * @returns {boolean} True if available
 */
export const isTimeSlotAvailable = (time, bookedSlots = []) => {
  if (!time) return false;
  return !bookedSlots.includes(time);
};

/**
 * Generate time slots for a day
 * @param {number} intervalMinutes - Interval in minutes (default: 30)
 * @param {Object} range - Time range {start: 9, end: 17}
 * @returns {Array} Array of time slots
 */
export const generateTimeSlots = (intervalMinutes = 30, range = { start: 9, end: 24 }) => {
  const slots = [];
  
  for (let hour = range.start; hour < range.end; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({
        value: timeString,
        display: formatTime12Hour(timeString),
        hour,
        minute
      });
    }
  }
  
  return slots;
};

/**
 * Convert minutes to time string
 * @param {number} totalMinutes - Total minutes since midnight
 * @returns {string} Time in HH:mm format
 */
export const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert time string to minutes since midnight
 * @param {string} time - Time in HH:mm format
 * @returns {number} Minutes since midnight
 */
export const timeToMinutes = (time) => {
  if (!time) return 0;
  
  try {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error('Error converting time to minutes:', error);
    return 0;
  }
};

/**
 * Add minutes to a time
 * @param {string} time - Time in HH:mm format
 * @param {number} minutesToAdd - Minutes to add
 * @returns {string} New time in HH:mm format
 */
export const addMinutesToTime = (time, minutesToAdd) => {
  if (!time) return 'N/A';
  
  try {
    const totalMinutes = timeToMinutes(time) + minutesToAdd;
    return minutesToTime(totalMinutes % (24 * 60));
  } catch (error) {
    console.error('Error adding minutes to time:', error);
    return time;
  }
};

/**
 * Get current time in HH:mm format
 * @returns {string} Current time
 */
export const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Compare two times
 * @param {string} time1 - First time in HH:mm format
 * @param {string} time2 - Second time in HH:mm format
 * @returns {number} Negative if time1 < time2, positive if time1 > time2, 0 if equal
 */
export const compareTimes = (time1, time2) => {
  return timeToMinutes(time1) - timeToMinutes(time2);
};

/**
 * Check if time1 is before time2
 * @param {string} time1 - First time in HH:mm format
 * @param {string} time2 - Second time in HH:mm format
 * @returns {boolean} True if time1 is before time2
 */
export const isTimeBefore = (time1, time2) => {
  return compareTimes(time1, time2) < 0;
};

/**
 * Check if time1 is after time2
 * @param {string} time1 - First time in HH:mm format
 * @param {string} time2 - Second time in HH:mm format
 * @returns {boolean} True if time1 is after time2
 */
export const isTimeAfter = (time1, time2) => {
  return compareTimes(time1, time2) > 0;
};

/**
 * Check if time is between start and end
 * @param {string} time - Time to check
 * @param {string} start - Start time
 * @param {string} end - End time
 * @returns {boolean} True if time is between start and end
 */
export const isTimeBetween = (time, start, end) => {
  const timeMin = timeToMinutes(time);
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  
  if (startMin <= endMin) {
    return timeMin >= startMin && timeMin <= endMin;
  } else {
    // Handle overnight ranges
    return timeMin >= startMin || timeMin <= endMin;
  }
};


// ==================== SEARCH UTILITIES ====================

export const highlightText = (text, query) => {
  if (!query || !text) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
};

export const fuzzySearch = (items, query, keys) => {
  if (!query) return items;
  
  const fuse = new Fuse(items, {
    keys,
    threshold: 0.3,
    includeScore: true,
    ignoreLocation: true
  });
  
  const results = fuse.search(query);
  return results.map(r => r.item);
};

// ==================== ERROR HANDLING ====================

export const handleFirebaseError = (error) => {
  const errorMap = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'permission-denied': 'You don\'t have permission to perform this action',
    'not-found': 'The requested resource was not found',
    'already-exists': 'This record already exists'
  };

  const message = errorMap[error.code] || error.message || 'An unexpected error occurred';
  
  toast.error(message);
  return message;
};

// ==================== FILE UTILITIES ====================

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Check if file type is image
 * @param {string} mimeType - File MIME type
 * @returns {boolean} True if image
 */
export const isImageFile = (mimeType) => {
  return mimeType?.startsWith('image/');
};

/**
 * Check if file type is PDF
 * @param {string} mimeType - File MIME type
 * @returns {boolean} True if PDF
 */
export const isPdfFile = (mimeType) => {
  return mimeType === 'application/pdf';
};

/**
 * Generate a unique filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename with timestamp
 */
export const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
  
  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} True if valid
 */
export const isValidFileSize = (size, maxSize = 5 * 1024 * 1024) => {
  return size <= maxSize;
};

/**
 * Validate file type
 * @param {string} mimeType - File MIME type
 * @param {Array<string>} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid
 */
export const isValidFileType = (mimeType, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) => {
  return allowedTypes.includes(mimeType);
};

// ==================== NUMBER UTILITIES ====================

/**
 * Format number with commas and decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  
  try {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(num);
  }
};

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  
  try {
    return `${value.toFixed(decimals)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0%';
  }
};

/**
 * Format number with unit
 * @param {number} value - Number to format
 * @param {string} unit - Unit to append (e.g., 'kg', 'hrs')
 * @returns {string} Formatted number with unit
 */
export const formatWithUnit = (value, unit) => {
  if (value === undefined || value === null || isNaN(value)) return `0 ${unit}`;
  
  try {
    return `${formatNumber(value)} ${unit}`;
  } catch (error) {
    console.error('Error formatting with unit:', error);
    return `${value} ${unit}`;
  }
};

/**
 * Round to nearest value
 * @param {number} value - Value to round
 * @param {number} nearest - Nearest value to round to (default: 1)
 * @returns {number} Rounded value
 */
export const roundToNearest = (value, nearest = 1) => {
  return Math.round(value / nearest) * nearest;
};

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Percentage string
 */
export const calculatePercentage = (part, total, decimals = 1) => {
  if (!total || total === 0) return '0%';
  return formatPercentage((part / total) * 100, decimals);
};