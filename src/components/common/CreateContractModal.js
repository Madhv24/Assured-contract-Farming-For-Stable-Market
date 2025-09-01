import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CreateContractModal = ({ isOpen, onClose, farmer, buyer, onContractCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agreementDate: '',
    cropType: '',
    quantity: '',
    price: '',
    deliveryDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('farmerId', farmer._id);
      data.append('buyerId', buyer._id);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('cropType', formData.cropType);
      data.append('quantity', formData.quantity);
      data.append('price', formData.price);
      data.append('deliveryDate', formData.deliveryDate);
      if (formData.agreementDate) data.append('agreementDate', formData.agreementDate);
      if (documentFile) data.append('contractFile', documentFile);

      const response = await axios.post('/api/contracts/createContractWithUpload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Contract created successfully!');
      onContractCreated(response.data.contract);
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Create Contract</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Contract title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe agreement terms"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agreement Date
            </label>
            <input
              type="date"
              value={formData.agreementDate}
              onChange={(e) => handleInputChange('agreementDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Contract Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Farmer:</strong> {farmer?.name || farmer?.companyName}</p>
              <p><strong>Buyer:</strong> {buyer?.name || buyer?.companyName}</p>
              <p><strong>Title:</strong> {formData.title}</p>
              <p><strong>Crop Type:</strong> {formData.cropType || 'Not specified'}</p>
              <p><strong>Quantity:</strong> {formData.quantity ? `${formData.quantity} kg` : 'Not specified'}</p>
              <p><strong>Price:</strong> {formData.price ? `₹${formData.price} per kg` : 'Not specified'}</p>
              <p><strong>Delivery Date:</strong> {formData.deliveryDate || 'Not specified'}</p>
              <p><strong>Agreement Date:</strong> {formData.agreementDate || 'Not specified'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
            <input
              type="text"
              value={formData.cropType}
              onChange={(e) => handleInputChange('cropType', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Wheat, Rice, Corn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Quantity in kg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per kg (₹)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              required
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Price per kg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
            <input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Contract Document (PDF/Image)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              className="file-upload-input"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Contract
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContractModal;

