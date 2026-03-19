import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faUserMd,
  faUserNurse,
  faFlask,
  faPills,
  faStethoscope,
  faEdit,
  faTrash,
  faPlus,
  faSpinner,
  faMoneyBill,
  faCalendarAlt,
  faPhone,
  faClock,
  faUsers,
  faEnvelope,
  faUserTie,
  faBriefcase
} from '@fortawesome/free-solid-svg-icons';
import { getDepartmentDetails, updateDepartmentFull, addDepartmentStaff, deleteDepartmentStaff } from '../database';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const DepartmentDetailsModal = ({ departmentId, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'nurse',
    specialization: '',
    phone: '',
    email: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    shift: 'day',
    qualifications: ''
  });

  // ✅ FIXED: Move the async logic directly inside useEffect
  useEffect(() => {
    let isMounted = true;
    
    const loadDepartmentDetails = async () => {
      if (!departmentId) return;
      
      setLoading(true);
      const result = await getDepartmentDetails(departmentId);
      
      if (isMounted) {
        if (result.success) {
          setDepartment(result.data);
          setEditForm({
            name: result.data.name || '',
            description: result.data.description || '',
            headDoctor: result.data.headDoctor || '',
            budget: result.data.budget || '',
            contactNumber: result.data.contactNumber || '',
            email: result.data.email || '',
            location: result.data.location || ''
          });
        } else {
          toast.error('Failed to load department details');
        }
        setLoading(false);
      }
    };

    loadDepartmentDetails();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [departmentId]); // ✅ Only depend on departmentId

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const result = await updateDepartmentFull(departmentId, editForm, 'admin');
    
    if (result.success) {
      toast.success('Department updated successfully');
      setIsEditing(false);
      // Refresh data
      const updated = await getDepartmentDetails(departmentId);
      if (updated.success) {
        setDepartment(updated.data);
      }
      if (onUpdate) onUpdate();
    } else {
      toast.error(result.error || 'Failed to update department');
    }
    
    setSaving(false);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    if (!staffForm.name || !staffForm.role) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    
    const result = await addDepartmentStaff({
      ...staffForm,
      salary: staffForm.salary ? Number(staffForm.salary) : null
    }, departmentId, 'admin');
    
    if (result.success) {
      toast.success('Staff added successfully');
      setShowAddStaff(false);
      setStaffForm({
        name: '',
        role: 'nurse',
        specialization: '',
        phone: '',
        email: '',
        salary: '',
        joinDate: new Date().toISOString().split('T')[0],
        shift: 'day',
        qualifications: ''
      });
      // Refresh data
      const updated = await getDepartmentDetails(departmentId);
      if (updated.success) {
        setDepartment(updated.data);
      }
    } else {
      toast.error(result.error || 'Failed to add staff');
    }
    
    setSaving(false);
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    
    const result = await deleteDepartmentStaff(staffId, 'admin');
    
    if (result.success) {
      toast.success('Staff removed successfully');
      // Refresh data
      const updated = await getDepartmentDetails(departmentId);
      if (updated.success) {
        setDepartment(updated.data);
      }
    } else {
      toast.error(result.error || 'Failed to remove staff');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor': return faUserMd;
      case 'nurse': return faUserNurse;
      case 'lab': return faFlask;
      case 'pharmacy': return faPills;
      default: return faUserTie;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: faBriefcase },
    { id: 'staff', label: 'Staff', icon: faUsers },
    { id: 'services', label: 'Services', icon: faStethoscope },
    { id: 'budget', label: 'Budget', icon: faMoneyBill }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-3xl" />
        </div>
      </div>
    );
  }

  if (!department) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{department.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Department Details</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <FontAwesomeIcon icon={faEdit} className="mr-2" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition flex items-center whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={editForm.contactNumber}
                        onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Annual Budget (PKR)
                      </label>
                      <input
                        type="number"
                        value={editForm.budget}
                        onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Head Doctor</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {department.headDoctorDetails ? `Dr. ${department.headDoctorDetails.fullName}` : 'Not Assigned'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {department.staff?.length || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Contact</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {department.contactNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {department.location || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400">{department.description || 'No description available'}</p>
                  </div>

                  {department.budget && (
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-300">Annual Budget</p>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(department.budget)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Staff</h3>
                <button
                  onClick={() => setShowAddStaff(!showAddStaff)}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add Staff
                </button>
              </div>

              {showAddStaff && (
                <form onSubmit={handleAddStaff} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={staffForm.name}
                        onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={staffForm.role}
                        onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="nurse">Nurse</option>
                        <option value="technician">Technician</option>
                        <option value="assistant">Assistant</option>
                        <option value="cleaner">Cleaner</option>
                        <option value="security">Security</option>
                        <option value="admin">Admin Staff</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Specialization
                      </label>
                      <input
                        type="text"
                        value={staffForm.specialization}
                        onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={staffForm.phone}
                        onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={staffForm.email}
                        onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Monthly Salary (PKR)
                      </label>
                      <input
                        type="number"
                        value={staffForm.salary}
                        onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Join Date
                      </label>
                      <input
                        type="date"
                        value={staffForm.joinDate}
                        onChange={(e) => setStaffForm({ ...staffForm, joinDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Shift
                      </label>
                      <select
                        value={staffForm.shift}
                        onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="day">Day</option>
                        <option value="night">Night</option>
                        <option value="evening">Evening</option>
                        <option value="rotating">Rotating</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Qualifications
                      </label>
                      <textarea
                        value={staffForm.qualifications}
                        onChange={(e) => setStaffForm({ ...staffForm, qualifications: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., BSN, RN, Certification..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddStaff(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Add Staff'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {department.staff && department.staff.length > 0 ? (
                  department.staff.map((staff) => (
                    <div key={staff.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <FontAwesomeIcon icon={getRoleIcon(staff.role)} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{staff.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{staff.role}</p>
                            {staff.specialization && (
                              <p className="text-xs text-gray-500">{staff.specialization}</p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs">
                              {staff.phone && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  <FontAwesomeIcon icon={faPhone} className="mr-1" /> {staff.phone}
                                </span>
                              )}
                              {staff.email && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  <FontAwesomeIcon icon={faEnvelope} className="mr-1" /> {staff.email}
                                </span>
                              )}
                              {staff.salary && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  <FontAwesomeIcon icon={faMoneyBill} className="mr-1" /> {formatCurrency(staff.salary)}/month
                                </span>
                              )}
                              {staff.joinDate && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" /> Joined: {new Date(staff.joinDate).toLocaleDateString()}
                                </span>
                              )}
                              {staff.shift && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  <FontAwesomeIcon icon={faClock} className="mr-1" /> {staff.shift} shift
                                </span>
                              )}
                            </div>
                            {staff.qualifications && (
                              <p className="text-xs text-gray-500 mt-2">Qualification: {staff.qualifications}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Remove Staff"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No staff assigned to this department</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Services Offered</h3>
              {department.services && department.services.length > 0 ? (
                <div className="grid gap-3">
                  {department.services.map((service, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {typeof service === 'string' ? service : service.name}
                          </p>
                          {service.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{service.description}</p>
                          )}
                        </div>
                        {service.price && (
                          <span className="text-lg font-semibold text-green-600">{formatCurrency(service.price)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No services listed</p>
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget & Expenses</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50 dark:bg-green-900 p-6 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-300">Annual Budget</p>
                  <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                    {formatCurrency(department.budget || 0)}
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-300">Total Staff Salary</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                    {formatCurrency(department.staff?.reduce((sum, s) => sum + (s.salary || 0), 0) || 0)}
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900 p-6 rounded-lg">
                  <p className="text-sm text-purple-600 dark:text-purple-300">Revenue Generated</p>
                  <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                    {formatCurrency(department.revenue || 0)}
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">Expenses</p>
                  <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                    {formatCurrency((department.staff?.reduce((sum, s) => sum + (s.salary || 0), 0) * 12) || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetailsModal;