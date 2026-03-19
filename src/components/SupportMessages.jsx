/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faUser,
  faClock,
  faCheckCircle,
  faSpinner,
  faEye,
  faPaperPlane,
  faTimes,
  faExclamationTriangle,
  faBug,
  faLightbulb,
  faCalendarCheck,
  faQuestionCircle,
  faComment,
  faHandshake,
  faFileAlt,
  faDownload,
  faImage,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFileCode,
  faReply,
  faCheckDouble
} from '@fortawesome/free-solid-svg-icons';
import { getContactMessages, updateContactMessage, addMessageReply } from '../database';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const SupportMessages = () => {
  const { currentUser, userDetails } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    subjectType: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);

  const subjectTypeIcons = {
    'General Inquiry': faEnvelope,
    'Appointment Help': faCalendarCheck,
    'Complaint': faExclamationTriangle,
    'Bug Report': faBug,
    'Suggestion': faLightbulb,
    'Technical Issue': faQuestionCircle,
    'Feedback': faComment,
    'Partnership': faHandshake
  };

  const subjectTypeColors = {
    'General Inquiry': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Appointment Help': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Complaint': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Bug Report': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Suggestion': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Technical Issue': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Feedback': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'Partnership': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
  };

  const statusColors = {
    'new': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return faImage;
    if (fileType === 'application/pdf') return faFilePdf;
    if (fileType.includes('word')) return faFileWord;
    if (fileType.includes('excel') || fileType.includes('sheet')) return faFileExcel;
    if (fileType === 'text/plain') return faFileCode;
    return faFileAlt;
  };

const fetchMessages = useCallback(async () => {
  try {
    setLoading(true);
    const result = await getContactMessages(
      filters, 
      userDetails?.role, 
      currentUser?.uid
    );
    
    if (result.success) {
      setMessages(result.data);
    } else {
      if (result.requiresIndex && result.indexUrl) {
        // Show a more helpful error with link to create index
        toast.error(
          <div>
            <p>Database index required</p>
            <a 
              href={result.indexUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline mt-1 block"
              onClick={(e) => e.stopPropagation()}
            >
              Click here to create the required index
            </a>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(result.error || 'Failed to load messages');
      }
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    toast.error('Failed to load messages');
  } finally {
    setLoading(false);
  }
}, [filters, userDetails, currentUser]);

  useEffect(() => {
    if (currentUser && userDetails) {
      fetchMessages();
    }
  }, [currentUser, userDetails, filters.status, filters.subjectType]);

  const handleAssignToMe = async (messageId) => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }
    
    try {
      const result = await updateContactMessage(messageId, 'in-progress', currentUser.uid, currentUser.uid);
      if (result.success) {
        toast.success('Message assigned to you');
        fetchMessages();
      } else {
        toast.error(result.error || 'Failed to assign message');
      }
    } catch (error) {
      console.error('Error assigning message:', error);
      toast.error('Failed to assign message');
    }
  };

  const handleMarkResolved = async (messageId) => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }
    
    try {
      const result = await updateContactMessage(messageId, 'resolved', null, currentUser.uid);
      if (result.success) {
        toast.success('Message marked as resolved');
        fetchMessages();
        setSelectedMessage(null);
      } else {
        toast.error(result.error || 'Failed to resolve message');
      }
    } catch (error) {
      console.error('Error resolving message:', error);
      toast.error('Failed to resolve message');
    }
  };

  const handleSendReply = async () => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }
    
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setSendingReply(true);
    try {
      const result = await addMessageReply(
        selectedMessage.id, 
        replyText, 
        currentUser.uid, 
        userDetails?.fullName || 'Staff'
      );
      if (result.success) {
        toast.success('Reply sent');
        setReplyText('');
        fetchMessages();
        // Refresh selected message
        const updatedMessage = messages.find(m => m.id === selectedMessage.id);
        setSelectedMessage(updatedMessage);
      } else {
        toast.error(result.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleViewFile = (file) => {
    setSelectedFile(file);
    setShowFilePreview(true);
  };

  const handleDownloadFile = (file) => {
    try {
      // Extract base64 data from data URL
      const base64Data = file.data.split(',')[1] || file.data;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.type });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloading ${file.name}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const getStats = () => {
    return {
      total: messages.length,
      new: messages.filter(m => m.status === 'new').length,
      inProgress: messages.filter(m => m.status === 'in-progress').length,
      resolved: messages.filter(m => m.status === 'resolved').length
    };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support Messages</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userDetails?.role === 'admin' ? 'View and manage all support requests' : 'View and manage reception inquiries'}
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faSpinner} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">New</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.new}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Type
            </label>
            <select
              value={filters.subjectType}
              onChange={(e) => setFilters({ ...filters, subjectType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Appointment Help">Appointment Help</option>
              <option value="Complaint">Complaint</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Suggestion">Suggestion</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Feedback">Feedback</option>
              <option value="Partnership">Partnership</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchMessages}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Messages Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faEnvelope} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Messages Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filters.status || filters.subjectType ? 'Try adjusting your filters' : 'No support messages yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigned Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {messages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{message.name}</div>
                          <div className="text-xs text-gray-500">{message.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {message.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${subjectTypeColors[message.subjectType] || 'bg-gray-100 text-gray-800'}`}>
                        <FontAwesomeIcon icon={subjectTypeIcons[message.subjectType] || faEnvelope} className="mr-1" />
                        {message.subjectType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${statusColors[message.status] || 'bg-gray-100 text-gray-800'}`}>
                        {message.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        message.assignedRole === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {message.assignedRole === 'admin' ? 'Admin' : 'Receptionist'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      <FontAwesomeIcon icon={faClock} className="mr-1" />
                      {formatDate(message.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedMessage(message)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                        title="View Details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      {message.status === 'new' && (
                        <button
                          onClick={() => handleAssignToMe(message.id)}
                          className="text-green-600 hover:text-green-700 mr-3"
                          title="Assign to me"
                        >
                          <FontAwesomeIcon icon={faCheckDouble} />
                        </button>
                      )}
                      {message.status !== 'resolved' && (
                        <button
                          onClick={() => handleMarkResolved(message.id)}
                          className="text-gray-600 hover:text-gray-700"
                          title="Mark Resolved"
                        >
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Message Details</h3>
                <button
                  onClick={() => {
                    setSelectedMessage(null);
                    setSelectedFile(null);
                    setShowFilePreview(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
              </div>

              {/* Message Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="text-xs text-gray-500 dark:text-gray-400">From</label>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedMessage.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedMessage.email}</p>
                    {selectedMessage.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {selectedMessage.phone}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Subject Type</label>
                    <p>
                      <span className={`px-2 py-1 rounded-full text-xs inline-block mt-1 ${subjectTypeColors[selectedMessage.subjectType]}`}>
                        {selectedMessage.subjectType}
                      </span>
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                    <p>
                      <span className={`px-2 py-1 rounded-full text-xs inline-block mt-1 ${statusColors[selectedMessage.status]}`}>
                        {selectedMessage.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                  <div className="mt-1 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedMessage.attachments?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Attachments ({selectedMessage.attachments.length})
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedMessage.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-md transition"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <FontAwesomeIcon 
                                icon={getFileIcon(file.type)} 
                                className="h-5 w-5 text-blue-600 dark:text-blue-400" 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-end space-x-2">
                            {file.type.startsWith('image/') && (
                              <button
                                onClick={() => handleViewFile(file)}
                                className="text-blue-600 hover:text-blue-700 text-xs"
                                title="Preview"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="text-green-600 hover:text-green-700 text-xs"
                              title="Download"
                            >
                              <FontAwesomeIcon icon={faDownload} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Replies */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Replies
                    </label>
                    <div className="space-y-3">
                      {selectedMessage.replies.map((reply, index) => (
                        <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                {reply.repliedByName || 'Staff'}
                              </p>
                              <p className="text-sm text-gray-800 dark:text-blue-200 mt-1">{reply.text}</p>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-blue-300">
                              {formatDate(reply.repliedAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                {selectedMessage.status !== 'resolved' && (
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FontAwesomeIcon icon={faReply} className="mr-2" />
                      Reply to this message
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Type your reply here..."
                    ></textarea>
                    <div className="flex justify-end mt-3 space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMessage(null);
                          setReplyText('');
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
                      >
                        {sendingReply ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showFilePreview && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faImage} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedFile.name}</h3>
              </div>
              <button
                onClick={() => {
                  setShowFilePreview(false);
                  setSelectedFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-8rem)]">
              {selectedFile.type.startsWith('image/') ? (
                <img
                  src={selectedFile.data}
                  alt={selectedFile.name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : selectedFile.type === 'application/pdf' ? (
                <iframe
                  src={selectedFile.data}
                  title={selectedFile.name}
                  className="w-full h-[70vh]"
                />
              ) : (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={getFileIcon(selectedFile.type)} className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Preview not available for this file type
                  </p>
                  <button
                    onClick={() => handleDownloadFile(selectedFile)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportMessages;

