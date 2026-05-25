// components/PricingApprovals.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faEye,
  faSpinner,
  faDollarSign,
  faUser,
  faCalendar,
  faInfoCircle,
  faSync,
  faStethoscope,
  faFlask,
  faSyringe,
  faTooth,
  faPills,
  faHeartbeat
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc 
} from 'firebase/firestore';

const PricingApprovals = ({ currentUser }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalProposed: 0
  });

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      let proposalsQuery;
      
      if (filter === 'pending') {
        proposalsQuery = query(
          collection(db, 'pricingProposals'),
          where('status', '==', 'pending'),
          orderBy('proposedAt', 'desc')
        );
      } else if (filter === 'approved') {
        proposalsQuery = query(
          collection(db, 'pricingProposals'),
          where('status', '==', 'approved'),
          orderBy('approvedAt', 'desc')
        );
      } else if (filter === 'rejected') {
        proposalsQuery = query(
          collection(db, 'pricingProposals'),
          where('status', '==', 'rejected'),
          orderBy('rejectedAt', 'desc')
        );
      } else {
        proposalsQuery = query(
          collection(db, 'pricingProposals'),
          orderBy('proposedAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(proposalsQuery);
      const proposalsList = [];
      
      for (const docSnap of snapshot.docs) {
        const proposal = { id: docSnap.id, ...docSnap.data() };
        
        // Get proposer name
        if (proposal.proposedBy) {
          try {
            const userDoc = await getDoc(doc(db, 'users', proposal.proposedBy));
            if (userDoc.exists()) {
              proposal.proposerName = userDoc.data().fullName || userDoc.data().email;
              proposal.proposerRole = userDoc.data().role;
            }
          } catch (e) {
            console.error('Error fetching proposer:', e);
          }
        }
        
        proposalsList.push(proposal);
      }
      
      setProposals(proposalsList);
      
      // Calculate stats
      const pendingCount = proposalsList.filter(p => p.status === 'pending').length;
      const approvedCount = proposalsList.filter(p => p.status === 'approved').length;
      const rejectedCount = proposalsList.filter(p => p.status === 'rejected').length;
      
      setStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalProposed: proposalsList.length
      });
      
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load pricing proposals');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleApproveProposal = async (proposal) => {
    if (!window.confirm(`Approve pricing proposal from ${proposal.proposerName || 'Accountant'}? This will update the live pricing configuration.`)) {
      return;
    }
    
    setLoading(true);
    try {
      // Update the main pricing config
      const pricingRef = doc(db, 'pricingConfig', 'global');
      await setDoc(pricingRef, {
        ...proposal,
        lastApprovedBy: currentUser?.uid,
        lastApprovedAt: new Date(),
        status: 'active',
        version: (proposal.version || 0) + 1
      }, { merge: true });
      
      // Mark proposal as approved
      const proposalRef = doc(db, 'pricingProposals', proposal.id);
      await updateDoc(proposalRef, {
        status: 'approved',
        approvedBy: currentUser?.uid,
        approvedAt: new Date()
      });
      
      // Create audit log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'PRICING_PROPOSAL_APPROVED',
        userId: currentUser?.uid,
        timestamp: new Date(),
        details: { 
          proposalId: proposal.id, 
          proposer: proposal.proposedBy,
          serviceCount: Object.keys(proposal.departments || {}).reduce((sum, dept) => sum + (proposal.departments[dept]?.services?.length || 0), 0)
        }
      });
      
      toast.success('Pricing proposal approved successfully!');
      fetchProposals();
      setShowDetailsModal(false);
      
    } catch (error) {
      console.error('Error approving proposal:', error);
      toast.error('Failed to approve proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProposal = async (proposal) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }
    
    setLoading(true);
    try {
      const proposalRef = doc(db, 'pricingProposals', proposal.id);
      await updateDoc(proposalRef, {
        status: 'rejected',
        rejectedBy: currentUser?.uid,
        rejectedAt: new Date(),
        rejectionReason: reason
      });
      
      // Create audit log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'PRICING_PROPOSAL_REJECTED',
        userId: currentUser?.uid,
        timestamp: new Date(),
        details: { 
          proposalId: proposal.id, 
          reason: reason
        }
      });
      
      toast.success('Pricing proposal rejected');
      fetchProposals();
      setShowDetailsModal(false);
      
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast.error('Failed to reject proposal');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentIcon = (deptName) => {
    const icons = {
      'cardiology': faHeartbeat,
      'emergency': faSyringe,
      'surgery': faSyringe,
      'eye': faEye,
      'pediatrics': faHeartbeat,
      'orthopedics': faHeartbeat,
      'neurology': faHeartbeat,
      'dentistry': faTooth,
      'radiology': faStethoscope,
      'laboratory': faFlask,
      'pharmacy': faPills
    };
    return icons[deptName?.toLowerCase()] || faStethoscope;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending Review</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  const renderProposalDetails = (proposal) => {
    const globalPricing = proposal.global || {};
    const departments = proposal.departments || {};
    
    return (
      <div className="space-y-6">
        {/* Proposal Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Proposed By</p>
              <p className="font-medium text-gray-900 dark:text-white">{proposal.proposerName || 'Accountant'}</p>
              <p className="text-xs text-gray-500 capitalize">{proposal.proposerRole || 'Accountant'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Proposed Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(proposal.proposedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Version</p>
              <p className="font-medium text-gray-900 dark:text-white">v{proposal.version || 1}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              {getStatusBadge(proposal.status)}
            </div>
          </div>
        </div>

        {/* Global Pricing Changes */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-green-600" />
            Global Pricing Changes
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-500">Base Consultation Fee</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(globalPricing.consultationBase || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Emergency Fee</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(globalPricing.emergencyFee || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tax Rate</p>
              <p className="text-lg font-bold text-purple-600">{globalPricing.taxRate || 17}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Night Charge</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(globalPricing.nightCharge || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Weekend Charge</p>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(globalPricing.weekendCharge || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Max Discount</p>
              <p className="text-lg font-bold text-yellow-600">{globalPricing.discountLimit || 20}%</p>
            </div>
          </div>
        </div>

        {/* Department Service Changes */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-blue-600" />
            Department Service Updates
          </h4>
          
          <div className="space-y-4">
            {Object.entries(departments).map(([deptId, deptData]) => {
              const services = deptData.services || [];
              const totalServiceValue = services.reduce((sum, s) => sum + (s.price || 0), 0);
              
              return (
                <div key={deptId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={getDepartmentIcon(deptData.name)} className="mr-2 text-blue-600" />
                      <span className="font-medium text-gray-900 dark:text-white">{deptData.name || deptId}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {services.length} service{services.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalServiceValue)}
                    </div>
                  </div>
                  
                  {services.length > 0 ? (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left">Service Name</th>
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-right">Price</th>
                          <th className="px-4 py-2 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((service, idx) => (
                          <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="px-4 py-2 font-medium">{service.name}</td>
                            <td className="px-4 py-2 capitalize">{service.category || 'general'}</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">{formatCurrency(service.price)}</td>
                            <td className="px-4 py-2 text-gray-500 text-xs">{service.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm">No services configured for this department</div>
                  )}
                </div>
              );
            })}
            
            {Object.keys(departments).length === 0 && (
              <div className="text-center py-8 text-gray-500">No department changes in this proposal</div>
            )}
          </div>
        </div>

        {/* Impact Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Proposal Impact Summary</p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>• Total Departments Affected: {Object.keys(departments).length}</li>
                <li>• Total Services Added/Updated: {Object.values(departments).reduce((sum, d) => sum + (d.services?.length || 0), 0)}</li>
                <li>• Consultation Fee Change: {formatCurrency(globalPricing.consultationBase || 0)} (Current: To be compared)</li>
                <li>• Estimated Revenue Impact: Pending calculation after approval</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {proposal.status === 'pending' && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleRejectProposal(proposal)}
              disabled={loading}
              className="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center"
            >
              <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
              Reject Proposal
            </button>
            <button
              onClick={() => handleApproveProposal(proposal)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
            >
              {loading ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              ) : (
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              )}
              Approve & Apply
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing Approval Management</h2>
          <p className="text-sm text-gray-500 mt-1">Review and approve pricing proposals submitted by the accountant</p>
        </div>
        <button
          onClick={fetchProposals}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center"
        >
          <FontAwesomeIcon icon={faSync} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalProposed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'pending' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'approved' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'rejected' 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          All Proposals
        </button>
      </div>

      {/* Proposals List */}
      {loading && proposals.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faDollarSign} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Pricing Proposals Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'pending' 
              ? 'No pending proposals awaiting your review.' 
              : filter === 'approved' 
                ? 'No approved proposals found.' 
                : filter === 'rejected'
                  ? 'No rejected proposals found.'
                  : 'No pricing proposals have been submitted yet.'}
          </p>
          {filter === 'pending' && (
            <p className="text-sm text-gray-500 mt-2">
              Proposals will appear here when the accountant submits pricing changes for approval.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Pricing Proposal #{proposal.id.slice(-6)}
                      </h3>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faUser} className="mr-2 w-4" />
                        {proposal.proposerName || 'Accountant'}
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faCalendar} className="mr-2 w-4" />
                        {formatDate(proposal.proposedAt)}
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faStethoscope} className="mr-2 w-4" />
                        {Object.values(proposal.departments || {}).reduce((sum, d) => sum + (d.services?.length || 0), 0)} services
                      </div>
                    </div>
                    {proposal.status === 'rejected' && proposal.rejectionReason && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        Rejection reason: {proposal.rejectionReason}
                      </div>
                    )}
                    {proposal.status === 'approved' && proposal.approvedAt && (
                      <div className="mt-2 text-sm text-green-600">
                        Approved on {formatDate(proposal.approvedAt)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setShowDetailsModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    Review Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposal Details Modal */}
      {showDetailsModal && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 flex justify-between items-center sticky top-0">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6 text-white" />
                <h2 className="text-xl font-semibold text-white">
                  Pricing Proposal Review
                </h2>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-white hover:text-gray-200 transition"
              >
                <FontAwesomeIcon icon={faTimesCircle} size="lg" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderProposalDetails(selectedProposal)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingApprovals;