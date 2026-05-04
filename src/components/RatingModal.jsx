import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faStar,
  faSpinner,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { submitRating, hasPatientRatedDoctor } from '../database';
import toast from 'react-hot-toast';

const RatingModal = ({ doctor, patientId, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if patient has already rated this doctor
  useEffect(() => {
    const checkExistingRating = async () => {
      if (!patientId || !doctor?.id) {
        setChecking(false);
        return;
      }
      
      try {
        const result = await hasPatientRatedDoctor(patientId, doctor.id);
        if (result.success && result.hasRated) {
          setHasRated(true);
          toast.error('You have already rated this doctor. You can only rate once per doctor.', {
            duration: 5000
          });
        }
      } catch (error) {
        console.error('Error checking existing rating:', error);
      } finally {
        setChecking(false);
      }
    };
    
    checkExistingRating();
  }, [patientId, doctor?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (hasRated) {
      toast.error('You have already rated this doctor. You can only rate once.');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await submitRating({
        patientId,
        doctorId: doctor.id,
        rating,
        review,
        createdAt: new Date()
      });
      
      // Check result properly - handle both success and data properties
      if (result && (result.success === true || result.data)) {
        toast.success('Thank you for your feedback!');
        // Call onSuccess with the rating data if provided, or just the result
        if (onSuccess) {
          onSuccess(result.data || result);
        }
        onClose();
      } else {
        const errorMsg = result?.error || 'Failed to submit rating';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(error.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-3xl mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Checking...</p>
        </div>
      </div>
    );
  }

  if (hasRated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faInfoCircle} className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Already Rated
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have already submitted a rating for Dr. {doctor?.fullName}. 
            You can only rate a doctor once.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Rate Dr. {doctor?.fullName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2">How was your experience?</p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transform hover:scale-110 transition"
                >
                  <FontAwesomeIcon
                    icon={faStar}
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Write a Review (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Share your experience with the doctor..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {review.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Rating'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;