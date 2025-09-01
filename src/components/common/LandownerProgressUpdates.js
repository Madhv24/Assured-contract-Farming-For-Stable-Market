import React, { useState } from 'react';
import { Plus, Upload, CheckCircle, Clock, Image as ImageIcon, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const LandownerProgressUpdates = ({ contract, userRole, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    step: 'Land Preparation',
    description: '',
    status: 'In Progress'
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const backendBase = process.env.REACT_APP_API_BASE || (window.location.port === '3000' || window.location.port === '3001' ? 'http://localhost:5000' : '');

  const progressSteps = [
    'Land Preparation',
    'Seed Sowing',
    'Irrigation',
    'Fertilizer Application',
    'Pest Control',
    'Crop Growth',
    'Harvesting',
    'Land Restoration'
  ];

  const getRemainingTimeLabel = () => {
    const endStr = contract?.contractTerms?.endDate;
    const end = endStr ? new Date(endStr) : null;
    if (!end) return null;
    const now = new Date();
    const ms = end.getTime() - now.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days > 0) return { text: `${days} days remaining`, style: 'text-green-700 bg-green-50 border-green-200' };
    if (days === 0) return { text: 'Due today', style: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    return { text: `${Math.abs(days)} days overdue`, style: 'text-red-700 bg-red-50 border-red-200' };
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('step', formData.step);
      data.append('description', formData.description);
      data.append('status', formData.status);
      
      images.forEach((image, index) => {
        data.append('images', image);
      });

      await axios.post(`/api/landowner-contracts/${contract._id}/progress`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Progress update submitted successfully!');
      setFormData({
        step: 'Land Preparation',
        description: '',
        status: 'In Progress'
      });
      setImages([]);
      setShowForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error submitting progress update:', error);
      toast.error(error.response?.data?.message || 'Failed to submit progress update');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step) => {
    switch (step) {
      case 'Land Preparation':
        return '🌱';
      case 'Seed Sowing':
        return '🌾';
      case 'Irrigation':
        return '💧';
      case 'Fertilizer Application':
        return '🌿';
      case 'Pest Control':
        return '🛡️';
      case 'Crop Growth':
        return '🌱';
      case 'Harvesting':
        return '✂️';
      case 'Land Restoration':
        return '🔄';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (status) => {
    return status === 'Completed' ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <Clock className="w-4 h-4 text-blue-600" />;
  };

  const handleDownloadImage = async (img) => {
    try {
      const res = await axios.get(`${backendBase}${img.path}`, { responseType: 'blob' });
      const name = img.originalName || 'progress-image.jpg';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Progress Updates with Landowner</h3>
        <div className="flex items-center space-x-3">
          {(() => { const r = getRemainingTimeLabel(); return r ? (
            <span className={`px-2 py-1 text-xs rounded border ${r.style}`}>{r.text}</span>
          ) : null; })()}
          {contract.status === 'Active' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary text-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Update</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Update Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Submit Progress Update</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress Step *
                </label>
                <select
                  value={formData.step}
                  onChange={(e) => handleInputChange('step', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {progressSteps.map((step) => (
                    <option key={step} value={step}>{step}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
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
                placeholder="Describe the progress made..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Images (Optional)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum 5 images (JPG, PNG)
              </p>
            </div>

            {/* Preview Images */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Progress Timeline */}
      <div className="space-y-4">
        {contract.progressUpdates && contract.progressUpdates.length > 0 ? (
          contract.progressUpdates.map((update, index) => (
            <div key={index} className="bg-white border rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-lg">
                    {getStepIcon(update.step)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-900">{update.step}</h5>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(update.status)}`}>
                        {update.status}
                      </span>
                      {getStatusIcon(update.status)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(update.date).toLocaleDateString()}</span>
                    {update.images && update.images.length > 0 && (
                      <span>{update.images.length} image(s)</span>
                    )}
                  </div>

                  {/* Display Images */}
                  {update.images && update.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {update.images.map((image, imgIndex) => (
                        <div key={imgIndex} className="relative group">
                          <img
                            src={`${backendBase}${image.path}`}
                            alt={`Progress ${index + 1} - ${imgIndex + 1}`}
                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(`${backendBase}${image.path}`, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                            <button onClick={() => handleDownloadImage(image)}>
                              <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No progress updates yet.</p>
            {contract.status === 'Active' && (
              <p className="text-sm text-gray-400 mt-2">
                Start tracking progress by adding your first update.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandownerProgressUpdates;
