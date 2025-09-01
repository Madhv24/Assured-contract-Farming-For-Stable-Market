import React, { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CreateLandownerContractModal = ({ isOpen, onClose, landowner, userRole, currentUserProfile, onContractCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    landSize: '',
    landUnit: 'acres',
    location: '',
    soilType: '',
    duration: '',
    startDate: '',
    endDate: '',
    rentAmount: '',
    rentUnit: 'per month'
  });
  const [loading, setLoading] = useState(false);
  const [contractFile, setContractFile] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    if (!formData.title || !formData.description || !formData.landSize || !formData.location || 
        !formData.duration || !formData.startDate || !formData.endDate || !formData.rentAmount) {
      toast.error('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!contractFile) {
      toast.error('Please upload a contract document');
      setLoading(false);
      return;
    }

    try {
      // Determine farmer and landowner IDs based on user role
      let farmerId, landownerId;
      
      if (userRole === 'farmer') {
        // Current user is farmer, so they are the farmer
        farmerId = currentUserProfile?._id;
        landownerId = landowner?._id;
      } else if (userRole === 'landowner') {
        // Current user is landowner, so they are the landowner
        landownerId = currentUserProfile?._id;
        farmerId = landowner?._id;
      } else {
        toast.error('Invalid user role');
        setLoading(false);
        return;
      }

      if (!farmerId || !landownerId) {
        toast.error('Unable to determine contract parties');
        setLoading(false);
        return;
      }

      const data = new FormData();
      data.append('farmerId', farmerId);
      data.append('landownerId', landownerId);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('landDetails', JSON.stringify({
        size: parseFloat(formData.landSize),
        unit: formData.landUnit,
        location: formData.location,
        soilType: formData.soilType
      }));
      data.append('contractTerms', JSON.stringify({
        duration: parseInt(formData.duration),
        startDate: formData.startDate,
        endDate: formData.endDate,
        rentAmount: parseFloat(formData.rentAmount),
        rentUnit: formData.rentUnit
      }));
      data.append('contractFile', contractFile);

      const response = await axios.post('/api/landowner-contracts/createContractWithUpload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Contract created successfully!');
      onContractCreated();
      onClose();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error(error.response?.data?.message || 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Create Contract with Landowner</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Contract Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter contract title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Land Size *
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="0.01"
                  value={formData.landSize}
                  onChange={(e) => handleInputChange('landSize', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Size"
                />
                <select
                  value={formData.landUnit}
                  onChange={(e) => handleInputChange('landUnit', e.target.value)}
                  className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="sqft">Sq Ft</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe the contract terms and conditions"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Land location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soil Type
              </label>
              <input
                type="text"
                value={formData.soilType}
                onChange={(e) => handleInputChange('soilType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Clay, Loam, Sandy"
              />
            </div>
          </div>

          {/* Contract Terms */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Contract Terms</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (months) *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Duration in months"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Amount *
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rentAmount}
                    onChange={(e) => handleInputChange('rentAmount', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Amount"
                  />
                  <select
                    value={formData.rentUnit}
                    onChange={(e) => handleInputChange('rentUnit', e.target.value)}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="per month">Per Month</option>
                    <option value="per acre">Per Acre</option>
                    <option value="per hectare">Per Hectare</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Contract Document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Document *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                onChange={(e) => setContractFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
            </p>
          </div>

          {/* Contract Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Contract Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Parties:</span> {userRole === 'farmer' ? 'You (Farmer)' : 'You (Landowner)'} ↔ {landowner?.name || 'Landowner'}</p>
              <p><span className="font-medium">Land:</span> {formData.landSize} {formData.landUnit} at {formData.location}</p>
              <p><span className="font-medium">Duration:</span> {formData.duration} months ({formData.startDate} to {formData.endDate})</p>
              <p><span className="font-medium">Rent:</span> ₹{formData.rentAmount} {formData.rentUnit}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create Contract</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLandownerContractModal;
