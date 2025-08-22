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
  Search
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import FileUpload from '../common/FileUpload';
import { io } from 'socket.io-client';
import ProfileDetailView from '../common/ProfileDetailView';

const BuyerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [availableFarmers, setAvailableFarmers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFarmers, setFilteredFarmers] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchAvailableFarmers();
    fetchIncomingRequests();
  }, []);

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
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/buyers/profile');
      setProfile(response.data.buyer);
      setFormData({
        name: response.data.buyer.name || '',
        companyName: response.data.buyer.companyName || '',
        contactInfo: response.data.buyer.contactInfo || {},
        cropRequirements: response.data.buyer.cropRequirements || [],
        quantity: response.data.buyer.quantity || '',
        priceRange: response.data.buyer.priceRange || '',
        preferredArea: response.data.buyer.preferredArea || '',
        preferredRegion: response.data.buyer.preferredRegion || ''
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
      const response = await axios.get('/api/buyers/available-farmers');
      setAvailableFarmers(response.data.farmers);
      setFilteredFarmers(response.data.farmers); // Initialize filtered farmers
    } catch (error) {
      console.error('Error fetching available farmers:', error);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const res = await axios.get('/api/requests/incoming');
      setIncomingRequests(res.data.requests || []);
    } catch (e) {
      // noop
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

  const showInterestInFarmer = (farmerId) => {
    const farmer = availableFarmers.find(f => f._id === farmerId);
    if (farmer) {
      openProfileDetail(farmer, 'farmer');
    }
  };

  const openProfileDetail = (profile, type) => {
    setSelectedProfile({ ...profile, type });
    setShowProfileDetail(true);
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

  const handleCropChange = (index, field, value) => {
    const newCrops = [...formData.cropRequirements];
    newCrops[index] = { ...newCrops[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      cropRequirements: newCrops
    }));
  };

  const addCrop = () => {
    setFormData(prev => ({
      ...prev,
      cropRequirements: [...prev.cropRequirements, {
        cropName: '',
        quantity: '',
        unit: 'kg',
        season: '',
        isActive: true
      }]
    }));
  };

  const removeCrop = (index) => {
    setFormData(prev => ({
      ...prev,
      cropRequirements: prev.cropRequirements.filter((_, i) => i !== index)
    }));
  };

  const saveProfile = async () => {
    try {
      await axios.put('/api/buyers/profile', formData);
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
      await axios.put(`/api/buyers/farmer-interest/${farmerId}`, { status });
      await fetchProfile();
      toast.success(`Interest ${status} successfully!`);
    } catch (error) {
      console.error('Error updating interest:', error);
      toast.error('Failed to update interest status');
    }
  };

  const deleteFile = async (filename) => {
    try {
      await axios.delete(`/api/buyers/files/${filename}`);
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
    { id: 'farmers', label: 'Available Farmers', icon: <Users className="w-5 h-5" /> },
    { id: 'interests', label: 'Farmer Interests', icon: <Eye className="w-5 h-5" /> },
    { id: 'requests', label: 'Requests', icon: <Send className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> }
  ];
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
                              <button onClick={() => axios.post('/api/requests/accept', { requestId: req._id }).then(() => { toast.success('Request accepted'); fetchIncomingRequests(); fetchProfile(); }).catch((e) => toast.error(e.response?.data?.message || 'Failed to accept'))} className="btn-primary text-sm">Accept</button>
                              <button onClick={() => axios.post('/api/requests/reject', { requestId: req._id }).then(() => { toast.success('Request rejected'); fetchIncomingRequests(); }).catch((e) => toast.error(e.response?.data?.message || 'Failed to reject'))} className="btn-secondary text-sm">Reject</button>
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
              <span className="text-xl font-bold text-gray-900">Buyer Dashboard</span>
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
            <div className="grid md:grid-cols-4 gap-6">
              <div className="card">
                <div className="card-body text-center">
                  <Users className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.interestedFarmers?.length || 0}
                  </h3>
                  <p className="text-gray-600">Farmer Interests</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <Crop className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.cropRequirements?.length || 0}
                  </h3>
                  <p className="text-gray-600">Crop Requirements</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <MapPin className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.preferredArea || 'Not set'}
                  </h3>
                  <p className="text-gray-600">Preferred Area</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <Send className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {availableFarmers.length || 0}
                  </h3>
                  <p className="text-gray-600">Available Farmers</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Buyer Information</h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600">Region: {profile?.preferredRegion || 'Not specified'}</p>
                  <p className="text-gray-600">Area: {profile?.preferredArea || 'Not specified'}</p>
                  <p className="text-gray-600">Price Unit: {profile?.priceRange?.unit || 'Not specified'}</p>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Recent Activities</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {profile?.interestedFarmers?.slice(0, 5).map((interest, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        <span className="font-medium">Farmer Interest:</span> {interest.status} - {new Date(interest.interestDate).toLocaleDateString()}
                      </div>
                    ))}
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
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
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
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.phone || ''}
                      onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
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
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Preferences</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Preferred Area</label>
                    <input
                      type="text"
                      value={formData.preferredArea || ''}
                      onChange={(e) => handleInputChange('preferredArea', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Preferred Region</label>
                    <input
                      type="text"
                      value={formData.preferredRegion || ''}
                      onChange={(e) => handleInputChange('preferredRegion', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Price Unit</label>
                    <select
                      value={formData.priceRange?.unit || 'per kg'}
                      onChange={(e) => handleInputChange('priceRange.unit', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    >
                      <option value="per kg">per kg</option>
                      <option value="per ton">per ton</option>
                      <option value="per quintal">per quintal</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Min Price</label>
                    <input
                      type="number"
                      value={formData.priceRange?.min || ''}
                      onChange={(e) => handleInputChange('priceRange.min', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Max Price</label>
                    <input
                      type="number"
                      value={formData.priceRange?.max || ''}
                      onChange={(e) => handleInputChange('priceRange.max', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Crop Requirements */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Crop Requirements</h4>
                <div className="space-y-4">
                  {formData.cropRequirements?.map((crop, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <label className="form-label">Crop Name</label>
                          <input
                            type="text"
                            value={crop.cropName || ''}
                            onChange={(e) => handleCropChange(index, 'cropName', e.target.value)}
                            disabled={!editMode}
                            className="form-input disabled:bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="form-label">Quantity</label>
                          <input
                            type="number"
                            value={crop.quantity || ''}
                            onChange={(e) => handleCropChange(index, 'quantity', e.target.value)}
                            disabled={!editMode}
                            className="form-input disabled:bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="form-label">Unit</label>
                          <select
                            value={crop.unit || 'kg'}
                            onChange={(e) => handleCropChange(index, 'unit', e.target.value)}
                            disabled={!editMode}
                            className="form-input disabled:bg-gray-50"
                          >
                            <option value="kg">kg</option>
                            <option value="tons">tons</option>
                            <option value="quintals">quintals</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Season</label>
                          <input
                            type="text"
                            value={crop.season || ''}
                            onChange={(e) => handleCropChange(index, 'season', e.target.value)}
                            disabled={!editMode}
                            className="form-input disabled:bg-gray-50"
                          />
                        </div>
                      </div>
                      {editMode && (
                        <button
                          onClick={() => removeCrop(index)}
                          className="mt-2 text-red-600 hover:text-red-800 text-sm"
                        >
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          Remove Crop
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
                      Add Crop Requirement
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Farmers Tab */}
        {activeTab === 'farmers' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Available Farmers</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search farmers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input pl-10 w-64"
                  />
                </div>
              </div>
              <div className="card-body">
                {filteredFarmers.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFarmers.map((farmer, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{farmer.name}</h4>
                            <span className="text-sm text-gray-500">{farmer.companyName}</span>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Available</span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p><MapPin className="w-4 h-4 inline mr-1" /> {farmer.farmDetails?.location}</p>
                          <p>Farm Size: {farmer.farmDetails?.size} {farmer.farmDetails?.unit}</p>
                          <p>Climate: {farmer.climateSuitability}</p>
                          <p>Resources: {Object.keys(farmer.resourceAvailability || {}).filter(key => farmer.resourceAvailability[key]).join(', ')}</p>
                          <p>Crops: {farmer.cropDetails?.map(crop => `${crop.name} (${crop.quantity} ${crop.unit})`).join(', ')}</p>
                          <p>Phone: {farmer.contactInfo?.phone || 'Not provided'}</p>
                          <p>Email: {farmer.userId?.email || 'Not provided'}</p>
                        </div>
                        <button
                          onClick={() => showInterestInFarmer(farmer._id)}
                          className="btn-primary w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Show Interest
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {searchQuery ? 'No farmers found matching your search.' : 'No farmers available at the moment.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Farmer Interests Tab */}
        {activeTab === 'interests' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Farmer Interests</h3>
              </div>
              <div className="card-body">
                {profile?.interestedFarmers?.length > 0 ? (
                  <div className="space-y-4">
                    {profile.interestedFarmers.map((interest, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {interest.farmerId?.name || 'Unknown Farmer'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {interest.farmerId?.companyName && `Company: ${interest.farmerId.companyName}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              Phone: {interest.farmerId?.contactInfo?.phone || 'Not provided'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interest.status)}`}>
                              {interest.status}
                            </span>
                            {getStatusIcon(interest.status)}
                          </div>
                        </div>
                        
                        {interest.farmerId?.farmDetails && (
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Farm Size: {interest.farmerId.farmDetails.size} {interest.farmerId.farmDetails.unit}</p>
                            <p>Location: {interest.farmerId.farmDetails.location}</p>
                          </div>
                        )}

                        {interest.farmerId?.cropDetails && (
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Available Crops: {interest.farmerId.cropDetails.map(crop => `${crop.name} (${crop.quantity} ${crop.unit})`).join(', ')}</p>
                          </div>
                        )}

                        {interest.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateFarmerInterest(interest.farmerId._id, 'accepted')}
                              className="btn-primary text-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateFarmerInterest(interest.farmerId._id, 'rejected')}
                              className="btn-secondary text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No farmers have shown interest yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Requirement Documents</h3>
              </div>
              <div className="card-body">
                <FileUpload
                  endpoint="/api/buyers/upload-docs"
                  onUploadSuccess={() => fetchProfile()}
                  acceptedTypes=".pdf,.doc,.docx"
                  fileType="documents"
                  fieldName="documents"
                />
                {profile?.requirementDocs?.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {profile.requirementDocs.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-900">{doc.originalName}</span>
                        </div>
                        <button 
                          onClick={() => deleteFile(doc.filename)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No requirement documents uploaded yet.</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Business Images</h3>
              </div>
              <div className="card-body">
                <FileUpload
                  endpoint="/api/buyers/upload-images"
                  onUploadSuccess={() => fetchProfile()}
                  acceptedTypes=".jpg,.jpeg,.png,.gif,.webp"
                  fileType="images"
                  fieldName="images"
                />
                {profile?.images?.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    {profile.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image.path}
                          alt={image.originalName}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No images uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Profile Detail Modal */}
      {showProfileDetail && selectedProfile && (
        <ProfileDetailView
          profile={selectedProfile}
          onClose={closeProfileDetail}
          type={selectedProfile.type}
        />
      )}
    </div>
  );
};

export default BuyerDashboard;
