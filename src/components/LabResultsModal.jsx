import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faUpload,
  faSpinner,
  faFilePdf,
  faImage,
  faFile,
  faTrash,
  faDownload,
  faPrint,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, compressData, decompressData } from '../utils/helpers';
import toast from 'react-hot-toast';

const LabResultsModal = ({ 
  request, 
  isOpen, 
  onClose, 
  onSubmit, 
  loading,
  mode = 'upload' // 'upload' or 'view'
}) => {
  const [resultData, setResultData] = useState({
    results: '',
    notes: '',
    files: []
  });
  const [fileErrors, setFileErrors] = useState([]);

  if (!isOpen) return null;

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const errors = [];
    const validFiles = [];
    let totalSize = resultData.files.reduce((sum, f) => sum + f.size, 0);

    // Check total files count
    if (files.length + resultData.files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    for (const file of files) {
      // Check total size
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`${file.name}: Would exceed total 15MB limit`);
        continue;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed. Please upload PDF or images.`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 5MB`);
        continue;
      }

      validFiles.push({
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      });
      
      totalSize += file.size;
    }

    if (errors.length > 0) {
      setFileErrors(errors);
    } else {
      setFileErrors([]);
      setResultData(prev => ({
        ...prev,
        files: [...prev.files, ...validFiles]
      }));
    }
  };

  const handleRemoveFile = (index) => {
    setResultData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!resultData.results && resultData.files.length === 0) {
      toast.error('Please enter results or upload files');
      return;
    }

    // Compress files before submitting
    const compressedFiles = await Promise.all(
      resultData.files.map(async (fileObj) => {
        if (fileObj.compressed) return fileObj;
        
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            const compressed = compressData(base64Data);
            resolve({
              name: fileObj.name,
              type: fileObj.type,
              size: fileObj.size,
              data: compressed,
              originalName: fileObj.name
            });
          };
          reader.readAsDataURL(fileObj.file);
        });
      })
    );

    await onSubmit({
      results: resultData.results,
      notes: resultData.notes,
      files: compressedFiles
    });
  };

  const handleDownloadFile = (fileData, fileName) => {
    try {
      const dataToDownload = decompressData(fileData) || fileData;
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${dataToDownload}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (filename) => {
    if (filename?.toLowerCase().endsWith('.pdf')) return faFilePdf;
    if (filename?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return faImage;
    return faFile;
  };

  const getFileIconColor = (filename) => {
    if (filename?.toLowerCase().endsWith('.pdf')) return 'text-red-500';
    if (filename?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'text-blue-500';
    return 'text-gray-500';
  };

  // View Mode
  if (mode === 'view') {
    const results = request.results || {};
    const isLocked = results.isLocked;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Lab Results
              </h3>
              {isLocked && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-full text-sm flex items-center">
                  <FontAwesomeIcon icon={faLock} className="mr-1.5" />
                  Locked
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Patient Info */}
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Patient</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{request.patientName}</p>
                  <p className="text-xs text-gray-500">ID: {request.patientId?.slice(-6)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Doctor</p>
                  <p className="font-semibold text-gray-900 dark:text-white">Dr. {request.doctorName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatDate(request.completedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-xs">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                    Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Results */}
            {results.results && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Test Results</h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm">
                    {results.results}
                  </pre>
                </div>
              </div>
            )}

            {/* Notes */}
            {results.notes && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Lab Notes</h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-700 dark:text-gray-300">{results.notes}</p>
                </div>
              </div>
            )}

            {/* Attachments */}
            {results.files && Object.keys(results.files).length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Attachments</h4>
                <div className="space-y-3">
                  {Object.entries(results.files).map(([filename, data]) => (
                    <div key={filename} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition group">
                      <div className="flex items-center space-x-3">
                        <FontAwesomeIcon 
                          icon={getFileIcon(filename)} 
                          className={`h-6 w-6 ${getFileIconColor(filename)}`} 
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{filename}</p>
                          <p className="text-xs text-gray-500">
                            {data.length ? `${Math.round(data.length * 0.75 / 1024)} KB` : 'Size unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleDownloadFile(data, filename)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg"
                          title="Download"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="p-2 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                          title="Print"
                        >
                          <FontAwesomeIcon icon={faPrint} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                Uploaded by Lab Staff on {formatDate(results.uploadedAt)}
                {results.editedAt && ` • Edited on ${formatDate(results.editedAt)}`}
                {request.processingTime && ` • Processing time: ${request.processingTime} minutes`}
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Upload/Edit Mode
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {request.status === 'in-progress' ? 'Update Test Results' : 'Upload Test Results'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Summary */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Patient</p>
                <p className="font-semibold text-gray-900 dark:text-white">{request.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Doctor</p>
                <p className="font-semibold text-gray-900 dark:text-white">Dr. {request.doctorName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Requested</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Priority</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                  request.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                  request.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300' :
                  'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                }`}>
                  {request.priority?.toUpperCase() || 'NORMAL'}
                </span>
              </div>
            </div>

            {/* Tests */}
            {request.tests && request.tests.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Required Tests:</p>
                <div className="flex flex-wrap gap-2">
                  {request.tests.map((test, index) => (
                    <span key={index} className="px-3 py-1 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                      {test.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Results <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resultData.results}
                onChange={(e) => setResultData({ ...resultData, results: e.target.value })}
                rows="8"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white font-mono"
                placeholder="Enter detailed test results, values, observations..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={resultData.notes}
                onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Any additional observations or comments..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Files (PDF, Images)
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-teal-500 dark:hover:border-teal-400 transition group">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <FontAwesomeIcon icon={faUpload} className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    PDF, PNG, JPG up to 5MB each (max 5 files)
                  </span>
                </label>
              </div>
            </div>

            {/* File Errors */}
            {fileErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                {fileErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 mt-0.5 flex-shrink-0" />
                    {error}
                  </p>
                ))}
              </div>
            )}

            {/* File List */}
            {resultData.files.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Files ({resultData.files.length}/5):
                </p>
                {resultData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl group hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <div className="flex items-center space-x-3">
                      <FontAwesomeIcon 
                        icon={getFileIcon(file.name)} 
                        className={`h-5 w-5 ${getFileIconColor(file.name)}`} 
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      {file.preview && (
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="h-10 w-10 object-cover rounded-lg ml-2"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!resultData.results && resultData.files.length === 0)}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium shadow-lg"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                {request.status === 'in-progress' ? 'Update Results' : 'Submit Results'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabResultsModal;