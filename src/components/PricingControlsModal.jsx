// components/PricingControlsModal.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faPlus,
  faTrash,
  faDollarSign,
  faStethoscope,
  faFlask,
  faSyringe,
  faHeartbeat,
  faEye,
  faTooth,
  faBrain,
  faBone,
  faBaby,
  faWheelchair,
  faAmbulance,
  faPills,
  faMicroscope,
  faXRay,
  faInfoCircle,
  faSpinner,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const PricingControlsModal = ({ 
  departments, 
  currentPricing, 
  onSave, 
  onClose,
  role = 'accountant' // 'admin' or 'accountant'
}) => {
  const [loading, setLoading] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(departments[0]?.id || '');
  const [editedServices, setEditedServices] = useState({});
  const [showAddService, setShowAddService] = useState(false);
  const [activeTab, setActiveTab] = useState('services'); // 'services', 'analysis'
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    category: 'consultation',
    description: ''
  });
  const [globalPricing, setGlobalPricing] = useState({
    consultationBase: 1000,
    emergencyFee: 1500,
    nightCharge: 500,
    weekendCharge: 300,
    taxRate: 17,
    discountLimit: 20,
    currency: 'PKR'
  });

  // Analysis data
  // eslint-disable-next-line no-unused-vars
  const [serviceRevenue, setServiceRevenue] = useState({});
  const [popularServices, setPopularServices] = useState([]);

  useEffect(() => {
    // Initialize pricing data from props
    if (currentPricing) {
      if (currentPricing.global) {
        setGlobalPricing(currentPricing.global);
      }
    }

    // Initialize edited services for each department
    const initialEdited = {};
    departments.forEach(dept => {
      initialEdited[dept.id] = dept.services || [];
    });
    setEditedServices(initialEdited);

    // Load service analysis data
    loadServiceAnalysis();
  }, [currentPricing, departments]);

  const loadServiceAnalysis = async () => {
    try {
      const { getServiceRevenueStats } = await import('../database');
      const result = await getServiceRevenueStats();
      if (result.success) {
        setServiceRevenue(result.data.byService || {});
        setPopularServices(result.data.popular || []);
      }
    } catch (error) {
      console.error('Error loading service analysis:', error);
    }
  };

  const handleGlobalPricingChange = (field, value) => {
    setGlobalPricing(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleDepartmentServiceChange = (deptId, serviceIndex, field, value) => {
    setEditedServices(prev => {
      const deptServices = [...(prev[deptId] || [])];
      if (serviceIndex >= 0 && serviceIndex < deptServices.length) {
        deptServices[serviceIndex] = {
          ...deptServices[serviceIndex],
          [field]: field === 'price' ? parseFloat(value) || 0 : value
        };
      }
      return {
        ...prev,
        [deptId]: deptServices
      };
    });
  };

  const handleAddService = (deptId) => {
    if (!newService.name || !newService.price) {
      toast.error('Please fill in service name and price');
      return;
    }

    setEditedServices(prev => ({
      ...prev,
      [deptId]: [
        ...(prev[deptId] || []),
        {
          ...newService,
          id: `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          price: parseFloat(newService.price) || 0,
          createdAt: new Date().toISOString()
        }
      ]
    }));

    setNewService({
      name: '',
      price: '',
      category: 'consultation',
      description: ''
    });
    setShowAddService(false);
    toast.success('Service added successfully');
  };

  const handleRemoveService = (deptId, serviceIndex) => {
    if (!window.confirm('Are you sure you want to remove this service?')) return;

    setEditedServices(prev => ({
      ...prev,
      [deptId]: prev[deptId].filter((_, idx) => idx !== serviceIndex)
    }));
    toast.success('Service removed');
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      // Prepare final pricing data
      const finalPricing = {
        global: globalPricing,
        departments: {},
        lastUpdated: new Date().toISOString(),
        updatedBy: role === 'admin' ? 'Admin' : 'Accountant',
        version: (currentPricing?.version || 0) + 1
      };

      // Add department-specific services
      departments.forEach(dept => {
        finalPricing.departments[dept.id] = {
          services: editedServices[dept.id] || [],
          consultationFee: dept.consultationFee || globalPricing.consultationBase,
          name: dept.name
        };
      });

      await onSave(finalPricing);
      toast.success(`Pricing configuration ${role === 'admin' ? 'updated' : 'suggested for review'}`);
      
      if (role === 'accountant') {
        toast.info('Pricing changes will be effective after admin approval');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentIcon = (deptName) => {
    const icons = {
      'cardiology': faHeartbeat,
      'emergency': faAmbulance,
      'surgery': faSyringe,
      'eye': faEye,
      'delivery': faBaby,
      'pediatrics': faBaby,
      'orthopedics': faBone,
      'neurology': faBrain,
      'dentistry': faTooth,
      'radiology': faXRay,
      'laboratory': faMicroscope,
      'pharmacy': faPills,
      'physiotherapy': faWheelchair
    };
    return icons[deptName?.toLowerCase()] || faStethoscope;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'consultation': return faStethoscope;
      case 'lab': return faFlask;
      case 'procedure': return faSyringe;
      case 'surgery': return faSyringe;
      case 'medicine': return faPills;
      default: return faDollarSign;
    }
  };

  const calculateDepartmentStats = (deptId) => {
    const services = editedServices[deptId] || [];
    const totalServices = services.length;
    const avgPrice = totalServices > 0 
      ? services.reduce((sum, s) => sum + (s.price || 0), 0) / totalServices 
      : 0;
    const totalValue = services.reduce((sum, s) => sum + (s.price || 0), 0);
    
    return { totalServices, avgPrice, totalValue };
  };

  // Analysis Tab Content
  const renderAnalysisTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Services</p>
              <p className="text-2xl font-bold">
                {departments.reduce((sum, dept) => sum + (editedServices[dept.id]?.length || 0), 0)}
              </p>
            </div>
            <FontAwesomeIcon icon={faStethoscope} className="h-8 w-8 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Avg Consultation Fee</p>
              <p className="text-2xl font-bold">{formatCurrency(globalPricing.consultationBase)}</p>
            </div>
            <FontAwesomeIcon icon={faDollarSign} className="h-8 w-8 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Tax Rate</p>
              <p className="text-2xl font-bold">{globalPricing.taxRate}%</p>
            </div>
            <FontAwesomeIcon icon={faChartLine} className="h-8 w-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Popular Services */}
      {popularServices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <FontAwesomeIcon icon={faHeartbeat} className="mr-2 text-red-500" />
            Most Popular Services
          </h4>
          <div className="space-y-2">
            {popularServices.slice(0, 5).map((service, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">{service.name}</span>
                <div className="flex gap-4">
                  <span className="text-sm text-green-600">{service.count} bookings</span>
                  <span className="text-sm font-medium text-blue-600">{formatCurrency(service.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Revenue Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Department Revenue Potential</h4>
        <div className="space-y-3">
          {departments.map(dept => {
            const stats = calculateDepartmentStats(dept.id);
            return (
              <div key={dept.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{dept.name}</p>
                  <p className="text-xs text-gray-500">{stats.totalServices} services</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">{formatCurrency(stats.totalValue)}</p>
                  <p className="text-xs text-gray-500">Total value</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Impact Analysis */}
      <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">Pricing Impact Analysis</p>
            <p className="mt-1">
              Current pricing suggests potential monthly revenue of approximately{' '}
              <strong>{formatCurrency(estimateMonthlyRevenue())}</strong>{' '}
              based on average service utilization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const estimateMonthlyRevenue = () => {
    let total = globalPricing.consultationBase * 100; // Estimated 100 consultations
    departments.forEach(dept => {
      const services = editedServices[dept.id] || [];
      total += services.reduce((sum, s) => sum + (s.price || 0), 0) * 20; // Estimated 20 each
    });
    return total;
  };

  const activeDepartmentDataForServices = departments.find(d => d.id === activeDepartment);
  const deptStatsForServices = activeDepartmentDataForServices ? calculateDepartmentStats(activeDepartment) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${
          role === 'admin' 
            ? 'bg-gradient-to-r from-green-600 to-green-800' 
            : 'bg-gradient-to-r from-blue-600 to-blue-800'
        }`}>
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {role === 'admin' ? 'Pricing Controls' : 'Pricing Configuration'}
            </h2>
            {role === 'accountant' && (
              <span className="px-2 py-1 bg-yellow-500 text-yellow-900 text-xs rounded-full">
                Requires Admin Approval
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Tabs for Accountant role */}
        {role === 'accountant' && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === 'services'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
              Services & Pricing
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === 'analysis'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FontAwesomeIcon icon={faChartLine} className="mr-2" />
              Revenue Analysis
            </button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Department Sidebar - only for services tab */}
          {(activeTab === 'services' || role === 'admin') && (
            <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">Departments</h3>
                <ul className="space-y-1">
                  {departments.map((dept) => (
                    <li key={dept.id}>
                      <button
                        onClick={() => setActiveDepartment(dept.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-3 transition ${
                          activeDepartment === dept.id
                            ? role === 'admin' 
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <FontAwesomeIcon icon={getDepartmentIcon(dept.name)} className="w-4" />
                        <span className="text-sm font-medium">{dept.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'analysis' && role === 'accountant' ? (
              renderAnalysisTab()
            ) : (
              <>
                {/* Global Pricing Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Global Pricing Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Base Consultation Fee (PKR)
                      </label>
                      <input
                        type="number"
                        value={globalPricing.consultationBase}
                        onChange={(e) => handleGlobalPricingChange('consultationBase', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Emergency Fee (PKR)
                      </label>
                      <input
                        type="number"
                        value={globalPricing.emergencyFee}
                        onChange={(e) => handleGlobalPricingChange('emergencyFee', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Night Charge (After 8 PM)
                      </label>
                      <input
                        type="number"
                        value={globalPricing.nightCharge}
                        onChange={(e) => handleGlobalPricingChange('nightCharge', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Weekend Charge
                      </label>
                      <input
                        type="number"
                        value={globalPricing.weekendCharge}
                        onChange={(e) => handleGlobalPricingChange('weekendCharge', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        value={globalPricing.taxRate}
                        onChange={(e) => handleGlobalPricingChange('taxRate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Maximum Discount (%)
                      </label>
                      <input
                        type="number"
                        value={globalPricing.discountLimit}
                        onChange={(e) => handleGlobalPricingChange('discountLimit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Department-specific Pricing */}
                {activeDepartmentDataForServices && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {activeDepartmentDataForServices.name} - Services & Pricing
                      </h3>
                      <button
                        onClick={() => setShowAddService(!showAddService)}
                        className={`px-3 py-1 ${
                          role === 'admin' ? 'bg-green-600' : 'bg-blue-600'
                        } text-white rounded-lg hover:bg-opacity-80 transition text-sm flex items-center`}
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-1" />
                        Add Service
                      </button>
                    </div>

                    {/* Department Info */}
                    <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-300">Head of Department</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activeDepartmentDataForServices.headDoctorName || 'Not Assigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-300">Current Consultation Fee</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(activeDepartmentDataForServices.consultationFee || globalPricing.consultationBase)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Add Service Form */}
                    {showAddService && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 border-2 border-blue-200 dark:border-blue-800">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Add New Service</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Service Name *
                            </label>
                            <input
                              type="text"
                              value={newService.name}
                              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                              placeholder="e.g., ECG, Blood Test, X-Ray"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Price (PKR) *
                            </label>
                            <input
                              type="number"
                              value={newService.price}
                              onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                              placeholder="0"
                              min="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Category
                            </label>
                            <select
                              value={newService.category}
                              onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="consultation">Consultation</option>
                              <option value="lab">Lab Test</option>
                              <option value="procedure">Procedure</option>
                              <option value="surgery">Surgery</option>
                              <option value="medicine">Medicine</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={newService.description}
                              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                              placeholder="Brief description of the service"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 mt-4">
                          <button
                            onClick={() => setShowAddService(false)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddService(activeDepartment)}
                            className={`px-3 py-1 ${
                              role === 'admin' ? 'bg-green-600' : 'bg-blue-600'
                            } text-white rounded-lg hover:bg-opacity-80 transition text-sm`}
                          >
                            Add Service
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Services Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price (PKR)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {(editedServices[activeDepartment] || []).length > 0 ? (
                            editedServices[activeDepartment].map((service, index) => (
                              <tr key={service.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <FontAwesomeIcon icon={getCategoryIcon(service.category)} className="text-gray-400" />
                                    <input
                                      type="text"
                                      value={service.name}
                                      onChange={(e) => handleDepartmentServiceChange(activeDepartment, index, 'name', e.target.value)}
                                      className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 outline-none px-1 py-0.5 w-32"
                                      placeholder="Service name"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={service.category || 'other'}
                                    onChange={(e) => handleDepartmentServiceChange(activeDepartment, index, 'category', e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 outline-none px-1 py-0.5"
                                  >
                                    <option value="consultation">Consultation</option>
                                    <option value="lab">Lab Test</option>
                                    <option value="procedure">Procedure</option>
                                    <option value="surgery">Surgery</option>
                                    <option value="medicine">Medicine</option>
                                    <option value="other">Other</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={service.price}
                                    onChange={(e) => handleDepartmentServiceChange(activeDepartment, index, 'price', e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 outline-none px-1 py-0.5 w-24 text-right"
                                    min="0"
                                    step="100"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={service.description || ''}
                                    onChange={(e) => handleDepartmentServiceChange(activeDepartment, index, 'description', e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 outline-none px-1 py-0.5 w-40"
                                    placeholder="Description"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleRemoveService(activeDepartment, index)}
                                    className="text-red-600 hover:text-red-700"
                                    title="Remove Service"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                No services configured. Click "Add Service" to create one.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Department Summary */}
                    <div className="mt-4 bg-green-50 dark:bg-green-900 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-green-600 dark:text-green-400 mt-1" />
                        <div>
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">Department Summary</p>
                          <ul className="text-sm text-green-700 dark:text-green-300 mt-1 space-y-1">
                            <li>• Total Services: {deptStatsForServices?.totalServices || 0}</li>
                            <li>• Consultation Fee: {formatCurrency(activeDepartmentDataForServices.consultationFee || globalPricing.consultationBase)}</li>
                            <li>• Average Service Price: {formatCurrency(deptStatsForServices?.avgPrice || 0)}</li>
                            <li>• Total Service Value: {formatCurrency(deptStatsForServices?.totalValue || 0)}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`px-4 py-2 ${
              role === 'admin' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white rounded-lg transition disabled:opacity-50 flex items-center`}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                {role === 'admin' ? 'Save Changes' : 'Submit for Approval'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingControlsModal;