import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faEye,
  faClock,
  faExclamationTriangle,
  faCheck,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import {
  processDeactivationRequest,
  subscribeToDeactivationRequests
} from '../database';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const DeactivationRequests = ({ onRequestProcessed }) => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = subscribeToDeactivationRequests((updatedRequests) => {
      setRequests(updatedRequests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleProcessRequest = async (requestId, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this request?`)) {
      return;
    }

    setProcessingId(requestId);
    const result = await processDeactivationRequest(
      requestId, 
      status, 
      currentUser.uid,
      adminNotes
    );

    if (result.success) {
      toast.success(result.message);
      setShowModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } else {
      toast.error(result.error);
    }
    setProcessingId(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs flex items-center">
            <FontAwesomeIcon icon={faClock} className="mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs flex items-center">
            <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Account Deactivation Requests
          {requests.length > 0 && (
            <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm">
              {requests.length} pending
            </span>
          )}
        </h2>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faUser} className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Pending Requests</h3>
          <p className="text-gray-600 dark:text-gray-400">
            There are no account deactivation requests at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.userName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {request.userEmail}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Requested On</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.requestedAt ? formatDate(request.requestedAt) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      <div className="mt-1">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    {request.reason && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Reason</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-1">
                          {request.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center text-sm"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Review Deactivation Request
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedRequest(null);
                  setAdminNotes('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Request Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">User</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRequest.userName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedRequest.userEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Requested On</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedRequest.requestedAt ? formatDate(selectedRequest.requestedAt) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  {selectedRequest.reason && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Add any notes about this decision..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProcessRequest(selectedRequest.id, 'rejected')}
                  disabled={processingId === selectedRequest.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center"
                >
                  {processingId === selectedRequest.id ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  )}
                  Reject
                </button>
                <button
                  onClick={() => handleProcessRequest(selectedRequest.id, 'approved')}
                  disabled={processingId === selectedRequest.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
                >
                  {processingId === selectedRequest.id ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeactivationRequests;