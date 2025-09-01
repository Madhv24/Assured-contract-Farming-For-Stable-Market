import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Leaf, 
  LogOut, 
  User, 
  MapPin, 
  Crop, 
  FileText, 
  Image as ImageIcon,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Upload,
  Trash2,
  Send,
  Eye,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import FileUpload from '../common/FileUpload';
import { io } from 'socket.io-client';
import ProfileDetailView from '../common/ProfileDetailView';
import CreateLandownerContractModal from '../common/CreateLandownerContractModal';
import LandownerProgressUpdates from '../common/LandownerProgressUpdates';

const LandownerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [availableFarmers, setAvailableFarmers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [landownerContracts, setLandownerContracts] = useState([]);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isCreateLandownerContractOpen, setIsCreateLandownerContractOpen] = useState(false);
  const [selectedFarmerForContract, setSelectedFarmerForContract] = useState(null);

  const backendBase = process.env.REACT_APP_API_BASE || (window.location.port === '3000' || window.location.port === '3001' ? 'http://localhost:5000' : '');

  useEffect(() => {
    fetchProfile();
    fetchAvailableFarmers();
    fetchIncomingRequests();
    fetchLandownerContracts();
  }, []);

  useEffect(() => {
    if (profile?._id) {
      fetchLandownerContracts();
    }
  }, [profile]);

  useEffect(() => {
    // Real-time availability updates
    const socketBase = process.env.REACT_APP_SOCKET_URL || (window.location.port === '3000' ? 'http://localhost:5000' : undefined);
    const socket = io(socketBase);
    socket.on('availability:update', (payload) => {
      if (payload.entity === 'farmer' && payload.isAvailable === false) {
        // Remove accepted farmer from available and interested lists
        setAvailableFarmers(prev => prev.filter(f => f._id !== payload.id));
        setProfile(prev => ({
          ...prev,
          interestedFarmers: (prev?.interestedFarmers || []).filter(i => i.farmerId?._id !== payload.id)
        }));
      }
    });
    socket.on('profileStatusChanged', (payload) => {
      if (payload.entity === 'farmer' && payload.isAvailable === false) {
        setAvailableFarmers(prev => prev.filter(f => f._id !== payload.id));
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/landowners/profile');
      setProfile(response.data.landowner);
      setFormData({
        name: response.data.landowner.name || '',
        contactInfo: response.data.landowner.contactInfo || {},
        landDetails: response.data.landowner.landDetails || {},
        availableCrops: response.data.landowner.availableCrops || []
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableFarmers = async () => {
    try {
      const response = await axios.get('/api/landowners/available-farmers');
      setAvailableFarmers(response.data.farmers);
    } catch (error) {
      console.error('Error fetching available farmers:', error);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const res = await axios.get('/api/requests/incoming');
      setIncomingRequests(res.data.requests);
    } catch (e) {
      console.error('Error fetching incoming requests:', e);
    }
  };

  const fetchLandownerContracts = async () => {
    try {
      if (profile?._id) {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await axios.get(`/api/landowner-contracts/landowner/${profile._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setLandownerContracts(response.data.contracts);
      }
    } catch (error) {
      console.error('Error fetching landowner contracts:', error);
    }
  };

  const sendInterestToFarmer = async (farmerId) => {
    try {
      await axios.post(`/api/requests/send`, { receiverRole: 'farmer', receiverProfileId: farmerId });
      toast.success('Request sent to farmer successfully!');
      // Remove farmer from available list
      setAvailableFarmers(prev => prev.filter(f => f._id !== farmerId));
      fetchIncomingRequests();
    } catch (error) {
      console.error('Error sending interest:', error);
      toast.error(error.response?.data?.message || 'Failed to send interest');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post('/api/requests/accept', { requestId });
      toast.success('Request accepted');
      await fetchProfile();
      await fetchIncomingRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to accept');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post('/api/requests/reject', { requestId });
      toast.success('Request rejected');
      await fetchIncomingRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const openProfileDetail = (profile, type) => {
    setSelectedProfile({ ...profile, type });
    setShowProfileDetail(true);
  };

  const viewFarmerProfile = async (farmerId) => {
    try {
      const res = await axios.get(`/api/farmers/public/${farmerId}`);
      openProfileDetail(res.data.farmer, 'farmer');
    } catch (e) {
      toast.error('Failed to load farmer profile');
    }
  };

  const closeProfileDetail = () => {
    setShowProfileDetail(false);
    setSelectedProfile(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleCropChange = (index, value) => {
    const current = Array.isArray(formData.availableCrops) ? formData.availableCrops : [];
    const newCrops = [...current];
    newCrops[index] = value;
    setFormData(prev => ({
      ...prev,
      availableCrops: newCrops
    }));
  };

  const addCrop = () => {
    setFormData(prev => ({
      ...prev,
      availableCrops: [
        ...((Array.isArray(prev.availableCrops) ? prev.availableCrops : [])),
        ''
      ]
    }));
  };

  const removeCrop = (index) => {
    setFormData(prev => ({
      ...prev,
      availableCrops: (Array.isArray(prev.availableCrops) ? prev.availableCrops : []).filter((_, i) => i !== index)
    }));
  };

  const saveProfile = async () => {
    try {
      await axios.put('/api/landowners/profile', formData);
      await fetchProfile();
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const updateFarmerInterest = async (farmerId, status) => {
    try {
      await axios.put(`/api/landowners/farmer-interest/${farmerId}`, { status });
      await fetchProfile();
      toast.success(`Interest ${status} successfully!`);
    } catch (error) {
      console.error('Error updating interest:', error);
      toast.error('Failed to update interest status');
    }
  };

  const openCreateLandownerContract = (farmer) => {
    setSelectedFarmerForContract(farmer);
    setIsCreateLandownerContractOpen(true);
  };

  const closeCreateLandownerContract = () => {
    setIsCreateLandownerContractOpen(false);
    setSelectedFarmerForContract(null);
  };

  const handleCreateLandownerContract = async (contractData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.post('/api/landowner-contracts/createContractWithUpload', {
        ...contractData,
        farmerId: selectedFarmerForContract._id,
        landownerId: profile._id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Landowner Contract created successfully!');
      setIsCreateLandownerContractOpen(false);
      setSelectedFarmerForContract(null);
      fetchLandownerContracts();
      await fetchProfile();
    } catch (error) {
      console.error('Error creating landowner contract:', error);
      toast.error(error.response?.data?.message || 'Failed to create landowner contract');
    }
  };

  const handleApproveLandownerContract = async (contractId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      await axios.post(`/api/landowner-contracts/${contractId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Landowner contract approved successfully!');
      fetchLandownerContracts();
      await fetchProfile();
    } catch (error) {
      console.error('Error approving landowner contract:', error);
      toast.error(error.response?.data?.message || 'Failed to approve landowner contract');
    }
  };

  const handleDownloadLandownerContract = async (contractId) => {
    try {
      const res = await axios.get(`/api/landowner-contracts/${contractId}/download`, { responseType: 'blob' });
      const contentDisposition = res.headers['content-disposition'] || '';
      const suggested = (contentDisposition.match(/filename="?(.*)"?/i) || [])[1] || 'contract.pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', suggested);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to download');
    }
  };

  const deleteFile = async (fileType, filename) => {
    try {
      await axios.delete(`/api/landowners/files/${fileType}/${filename}`);
      await fetchProfile();
      toast.success('File deleted successfully!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Leaf className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'farmers', label: 'Interested Farmers', icon: <Users className="w-5 h-5" /> },
    { id: 'landowner-contracts', label: 'My Contracts', icon: <FileText className="w-5 h-5" /> },
    { id: 'landowner-progress', label: 'Progress Updates', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    { id: 'availableFarmers', label: 'Available Farmers', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'Requests', icon: <Send className="w-5 h-5" /> }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Leaf className="w-8 h-8 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">Landowner Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={handleLogout}
                className="btn-outline"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <div className="card-body text-center">
                  <Users className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.interestedFarmers?.length || 0}
                  </h3>
                  <p className="text-gray-600">Interested Farmers</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <Crop className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.availableCrops?.length || 0}
                  </h3>
                  <p className="text-gray-600">Available Crops</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <MapPin className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.landDetails?.size || 0} {profile?.landDetails?.unit || 'acres'}
                  </h3>
                  <p className="text-gray-600">Total Land Size</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Land Information</h3>
              </div>
              <div className="card-body">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Location Details</h4>
                    <p className="text-gray-600">Area: {profile?.landDetails?.area || 'Not specified'}</p>
                    <p className="text-gray-600">Location: {profile?.landDetails?.location || 'Not specified'}</p>
                    <p className="text-gray-600">Soil Type: {profile?.landDetails?.soilType || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Climate & Crops</h4>
                    <p className="text-gray-600">Climate: {profile?.landDetails?.climaticConditions || 'Not specified'}</p>
                    <p className="text-gray-600">Available Crops: {profile?.availableCrops?.join(', ') || 'None specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card">
            <div className="card-header flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              {editMode ? (
                <div className="space-x-2">
                  <button onClick={saveProfile} className="btn-primary">
                    Save Changes
                  </button>
                  <button onClick={() => setEditMode(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditMode(true)} className="btn-outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
            <div className="card-body space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.phone || ''}
                      onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.address || ''}
                      onChange={(e) => handleInputChange('contactInfo.address', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.city || ''}
                      onChange={(e) => handleInputChange('contactInfo.city', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.state || ''}
                      onChange={(e) => handleInputChange('contactInfo.state', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.pincode || ''}
                      onChange={(e) => handleInputChange('contactInfo.pincode', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Land Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Land Details</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Land Size</label>
                    <input
                      type="number"
                      value={formData.landDetails?.size || ''}
                      onChange={(e) => handleInputChange('landDetails.size', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Unit</label>
                    <select
                      value={formData.landDetails?.unit || 'acres'}
                      onChange={(e) => handleInputChange('landDetails.unit', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    >
                      <option value="acres">Acres</option>
                      <option value="hectares">Hectares</option>
                      <option value="sqft">Square Feet</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      value={formData.landDetails?.location || ''}
                      onChange={(e) => handleInputChange('landDetails.location', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Area</label>
                    <input
                      type="text"
                      value={formData.landDetails?.area || ''}
                      onChange={(e) => handleInputChange('landDetails.area', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Soil Type</label>
                    <input
                      type="text"
                      value={formData.landDetails?.soilType || ''}
                      onChange={(e) => handleInputChange('landDetails.soilType', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Climate</label>
                    <input
                      type="text"
                      value={formData.landDetails?.climaticConditions || ''}
                      onChange={(e) => handleInputChange('landDetails.climaticConditions', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Available Crops */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Available Crops</h4>
                <div className="space-y-2">
                  {formData.availableCrops?.map((crop, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={crop}
                        onChange={(e) => handleCropChange(index, e.target.value)}
                        disabled={!editMode}
                        className="form-input flex-1 disabled:bg-gray-50"
                        placeholder="Enter crop name"
                      />
                      {editMode && (
                        <button
                          onClick={() => removeCrop(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editMode && (
                    <button
                      onClick={addCrop}
                      className="btn-outline"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      Add Land
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interested Farmers Tab */}
        {activeTab === 'farmers' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Interested Farmers</h3>
              </div>
              <div className="card-body">
                {profile?.interestedFarmers && profile.interestedFarmers.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profile.interestedFarmers.map((interest, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{interest.farmerId?.name || interest.farmerId?.companyName}</h4>
                            <span className="text-sm text-gray-500">{interest.farmerId?.farmDetails?.cropType || 'No crop specified'}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            interest.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                            interest.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {interest.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p>Farm Size: {interest.farmerId?.farmDetails?.size || 'N/A'} {interest.farmerId?.farmDetails?.unit || 'acres'}</p>
                          <p>Experience: {interest.farmerId?.farmDetails?.experience || 'N/A'} years</p>
                          <p>Interest Date: {new Date(interest.interestDate).toLocaleDateString()}</p>
                        </div>
                        {interest.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateFarmerInterest(interest.farmerId._id, 'accepted')}
                              className="btn-primary text-sm flex-1"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateFarmerInterest(interest.farmerId._id, 'rejected')}
                              className="btn-outline text-sm flex-1"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {interest.status === 'accepted' && (
                          <div className="mt-3">
                            <button
                              onClick={() => openCreateLandownerContract(interest.farmerId)}
                              className="btn-primary text-sm"
                            >
                              Create Contract with Farmer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No interested farmers yet.</p>
                    <p className="text-sm text-gray-400 mt-2">Farmers will appear here once they show interest in your land.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Landowner Contracts Tab */}
        {activeTab === 'landowner-contracts' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">My Contracts with Farmers</h3>
              </div>
              <div className="card-body">
                {landownerContracts.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {landownerContracts.map((contract, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{contract.title}</h4>
                            <span className="text-sm text-gray-500">{contract.landDetails?.size} {contract.landDetails?.unit}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contract.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            contract.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {contract.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p>Farmer: {contract.farmerId?.name || contract.farmerId?.companyName}</p>
                          <p>Location: {contract.landDetails?.location}</p>
                          <p>Duration: {contract.contractTerms?.duration} months</p>
                          <p>Rent: ₹{contract.contractTerms?.rentAmount} {contract.contractTerms?.rentUnit}</p>
                        </div>
                        <div className="flex space-x-2">
                          {contract.status === 'Pending' && !contract.landownerApproved && (
                            <button
                              onClick={() => handleApproveLandownerContract(contract._id)}
                              className="btn-primary text-sm flex-1"
                            >
                              Approve Contract
                            </button>
                          )}
                          {contract?.contractFile?.path && (
                            <a
                              href={`${backendBase}${contract.contractFile.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary text-sm flex-1 text-center"
                            >
                              View Contract
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn-outline text-sm flex-1"
                            onClick={() => handleDownloadLandownerContract(contract._id)}
                          >
                            Download
                          </button>
                          {contract.status === 'Active' && (
                            <button
                              onClick={() => setActiveTab('landowner-progress')}
                              className="btn-outline text-sm flex-1"
                            >
                              View Progress
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No contracts found.</p>
                    <p className="text-sm text-gray-400 mt-2">Contracts will appear here once you have accepted farmers and created agreements.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Landowner Progress Updates Tab */}
        {activeTab === 'landowner-progress' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Progress Updates from Farmers</h3>
              </div>
              <div className="card-body">
                {landownerContracts.length > 0 ? (
                  <div className="space-y-6">
                    {landownerContracts.map((contract, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-medium text-gray-900">
                            Contract: {contract.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contract.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            contract.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {contract.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          <p>Farmer: {contract.farmerId?.name || contract.farmerId?.companyName}</p>
                          <p>Land: {contract.landDetails?.size} {contract.landDetails?.unit} at {contract.landDetails?.location}</p>
                          <p>Duration: {contract.contractTerms?.duration} months</p>
                          <p>Rent: ₹{contract.contractTerms?.rentAmount} {contract.contractTerms?.rentUnit}</p>
                        </div>
                        {contract.status === 'Active' && (
                          <LandownerProgressUpdates
                            contract={contract}
                            userRole="landowner"
                            onUpdate={() => fetchLandownerContracts()}
                          />
                        )}
                        {contract.status === 'Pending' && (
                          <div className="p-4 bg-yellow-50 text-yellow-700 rounded">
                            Contract is pending approval. Progress updates will be available once the contract is active.
                          </div>
                        )}
                        {contract.status === 'Completed' && (
                          <div className="p-4 bg-blue-50 text-blue-700 rounded">
                            Contract is completed. All progress updates are final.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No landowner contracts found.</p>
                    <p className="text-sm text-gray-400 mt-2">Go to the My Contracts tab to view your contracts.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Contract Papers */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Contract Papers</h3>
              </div>
              <div className="card-body">
                <FileUpload
                  endpoint="/api/landowners/upload-contracts"
                  onUploadSuccess={() => fetchProfile()}
                  acceptedTypes=".pdf,.doc,.docx"
                  fileType="contracts"
                  fieldName="contracts"
                />
                {profile?.contractPapers?.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {profile.contractPapers.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-900">{doc.originalName}</span>
                        </div>
                        <button 
                          onClick={() => deleteFile('contractPapers', doc.filename)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No contract papers uploaded yet.</p>
                )}
              </div>
            </div>

            {/* Land Images */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Land Images</h3>
              </div>
              <div className="card-body">
                <FileUpload
                  endpoint="/api/landowners/upload-images"
                  onUploadSuccess={() => fetchProfile()}
                  acceptedTypes=".jpg,.jpeg,.png,.gif,.webp"
                  fileType="images"
                  fieldName="images"
                />
                {profile?.landImages?.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    {profile.landImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image.path}
                          alt={image.originalName}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button 
                          onClick={() => deleteFile('landImages', image.filename)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No land images uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Farmers Tab */}
        {activeTab === 'availableFarmers' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Available Farmers</h3>
              </div>
              <div className="card-body">
                {availableFarmers.length > 0 ? (
                  <div className="space-y-4">
                    {availableFarmers.map((farmer) => (
                      <div key={farmer._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {farmer.name || 'Unknown Farmer'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {farmer.companyName && `Company: ${farmer.companyName}`}
                            </p>
                            <p className="text-sm text-gray-600">Phone: {farmer.contactInfo?.phone || 'Not provided'}</p>
                            <p className="text-sm text-gray-600">Email: {farmer.userId?.email || 'Not provided'}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => sendInterestToFarmer(farmer._id)}
                              className="btn-primary text-sm"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Send Request
                            </button>
                            <button
                              onClick={() => viewFarmerProfile(farmer._id)}
                              className="btn-secondary text-sm"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Profile
                            </button>
                          </div>
                        </div>
                        
                        {farmer.farmDetails && (
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Farm Size: {farmer.farmDetails.size} {farmer.farmDetails.unit}</p>
                            <p>Location: {farmer.farmDetails.location}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No farmers available for your land yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Incoming Requests</h3>
              </div>
              <div className="card-body">
                {incomingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div key={req._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900 capitalize">From {req.senderRole}</h4>
                            <p className="text-sm text-gray-600">Status: {req.status}</p>
                          </div>
                          {req.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button onClick={() => acceptRequest(req._id)} className="btn-primary text-sm">Accept</button>
                              <button onClick={() => rejectRequest(req._id)} className="btn-secondary text-sm">Reject</button>
                            </div>
                          )}
                        </div>
                        {req.senderProfile && (
                          <div className="text-sm text-gray-600">
                            <p>Name: {req.senderProfile.name || req.senderProfile.companyName || 'N/A'}</p>
                            <p>Phone: {req.senderProfile.contactInfo?.phone || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No incoming requests.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showProfileDetail && selectedProfile && (
        <ProfileDetailView
          profile={selectedProfile}
          onClose={closeProfileDetail}
          type={selectedProfile.type}
        />
      )}

      {/* Create Landowner Contract Modal */}
      {isCreateLandownerContractOpen && selectedFarmerForContract && (
        <CreateLandownerContractModal
          isOpen={isCreateLandownerContractOpen}
          onClose={closeCreateLandownerContract}
          landowner={selectedFarmerForContract}
          userRole="landowner"
          currentUserProfile={profile}
          onContractCreated={() => { fetchLandownerContracts(); fetchProfile(); }}
        />
      )}
    </div>
  );
};

export default LandownerDashboard;
