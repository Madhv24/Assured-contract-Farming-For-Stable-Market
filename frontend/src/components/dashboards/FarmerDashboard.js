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
  Building2,
  Search
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import FileUpload from '../common/FileUpload';
import { io } from 'socket.io-client';
import ProfileDetailView from '../common/ProfileDetailView';

const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [availableBuyers, setAvailableBuyers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableLands, setAvailableLands] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchAvailableBuyers();
    fetchAvailableLands();
    fetchIncomingRequests();
  }, []);

  useEffect(() => {
    // Real-time availability updates
    const socketBase = process.env.REACT_APP_SOCKET_URL || (window.location.port === '3000' ? 'http://localhost:5000' : undefined);
    const socket = io(socketBase);
    socket.on('availability:update', (payload) => {
      if (payload.entity === 'buyer' && payload.isAvailable === false) {
        // Remove accepted buyer from available and interested lists
        setAvailableBuyers(prev => prev.filter(b => b._id !== payload.id));
        setProfile(prev => ({
          ...prev,
          interestedBuyers: (prev?.interestedBuyers || []).filter(i => i.buyerId?._id !== payload.id)
        }));
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/farmers/profile');
      setProfile(response.data.farmer);
      setFormData({
        name: response.data.farmer.name || '',
        companyName: response.data.farmer.companyName || '',
        contactInfo: response.data.farmer.contactInfo || {},
        farmDetails: response.data.farmer.farmDetails || {},
        cropDetails: response.data.farmer.cropDetails || [],
        climateSuitability: response.data.farmer.climateSuitability || '',
        resourceAvailability: response.data.farmer.resourceAvailability || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBuyers = async () => {
    try {
      const response = await axios.get('/api/farmers/all-buyers');
      setAvailableBuyers(response.data.buyers);
    } catch (error) {
      console.error('Error fetching available buyers:', error);
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

  const fetchAvailableLands = async () => {
    try {
      const response = await axios.get('/api/landowners/available-lands');
      setAvailableLands(response.data.lands);
    } catch (error) {
      console.error('Error fetching available lands:', error);
    }
  };

  const sendInterestToBuyer = async (buyerId) => {
    try {
      await axios.post(`/api/requests/send`, { receiverRole: 'buyer', receiverProfileId: buyerId });
      toast.success('Request sent to buyer successfully!');
      // Remove buyer from available list
      setAvailableBuyers(prev => prev.filter(b => b._id !== buyerId));
      fetchIncomingRequests();
    } catch (error) {
      console.error('Error sending interest:', error);
      toast.error(error.response?.data?.message || 'Failed to send interest');
    }
  };

  const showInterestInLand = async (landId) => {
    try {
      await axios.post(`/api/requests/send`, { receiverRole: 'landowner', receiverProfileId: landId });
      toast.success('Request sent to landowner successfully!');
      await fetchIncomingRequests();
    } catch (error) {
      console.error('Error sending land interest:', error);
      toast.error(error.response?.data?.message || 'Failed to send land interest');
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
    const currentCrops = Array.isArray(formData.cropDetails) ? formData.cropDetails : [];
    const newCrops = [...currentCrops];
    newCrops[index] = { ...(newCrops[index] || {}), [field]: value };
    setFormData(prev => ({
      ...prev,
      cropDetails: newCrops
    }));
  };

  const addCrop = () => {
    setFormData(prev => ({
      ...prev,
      cropDetails: [
        ...((Array.isArray(prev.cropDetails) ? prev.cropDetails : [])),
        {
          name: '',
          quantity: '',
          unit: 'kg',
          season: '',
          isAvailable: true
        }
      ]
    }));
  };

  const removeCrop = (index) => {
    setFormData(prev => ({
      ...prev,
      cropDetails: (Array.isArray(prev.cropDetails) ? prev.cropDetails : []).filter((_, i) => i !== index)
    }));
  };

  const saveProfile = async () => {
    try {
      await axios.put('/api/farmers/profile', formData);
      await fetchProfile();
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const updateBuyerInterest = async (buyerId, status) => {
    try {
      await axios.put(`/api/farmers/buyer-interest/${buyerId}`, { status });
      await fetchProfile();
      toast.success(`Interest ${status} successfully!`);
    } catch (error) {
      console.error('Error updating interest:', error);
      toast.error('Failed to update interest status');
    }
  };

  const updateLandownerInterest = async (landownerId, status) => {
    try {
      await axios.put(`/api/farmers/land-interest/${landownerId}`, { status });
      await fetchProfile();
      toast.success(`Interest ${status} successfully!`);
    } catch (error) {
      console.error('Error updating interest:', error);
      toast.error('Failed to update interest status');
    }
  };

  const deleteFile = async (filename) => {
    try {
      await axios.delete(`/api/farmers/files/${filename}`);
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

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: <Leaf className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'buyers', label: 'Interested Buyers', icon: <Users className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    { id: 'availableBuyers', label: 'Available Buyers', icon: <Users className="w-5 h-5" /> },
    { id: 'lands', label: 'Available Lands', icon: <MapPin className="w-5 h-5" /> },
    { id: 'land-interests', label: 'Land Interests', icon: <Eye className="w-5 h-5" /> },
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

  const filteredLands = availableLands.filter(land =>
    land.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    land.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    land.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    land.availableCrops?.some(crop => crop.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">Farmer Dashboard</span>
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
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === item.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
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
                  <Leaf className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.interestedLandowners?.length || 0}
                  </h3>
                  <p className="text-gray-600">Land Interests</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <Building2 className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.interestedBuyers?.length || 0}
                  </h3>
                  <p className="text-gray-600">Buyer Interests</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <Crop className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.cropDetails?.length || 0}
                  </h3>
                  <p className="text-gray-600">Crops Available</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-body text-center">
                  <MapPin className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {profile?.farmDetails?.size || 0} {profile?.farmDetails?.unit || 'acres'}
                  </h3>
                  <p className="text-gray-600">Farm Size</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Farm Information</h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600">Location: {profile?.farmDetails?.location || 'Not specified'}</p>
                  <p className="text-gray-600">Climate: {profile?.climateSuitability || 'Not specified'}</p>
                  <p className="text-gray-600">Resources: {Object.keys(profile?.resourceAvailability || {}).filter(key => profile.resourceAvailability[key]).join(', ') || 'None specified'}</p>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Recent Activities</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {profile?.interestedLandowners?.slice(0, 3).map((interest, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        <span className="font-medium">Land Interest:</span> {interest.status} - {new Date(interest.interestDate).toLocaleDateString()}
                      </div>
                    ))}
                    {profile?.interestedBuyers?.slice(0, 3).map((interest, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        <span className="font-medium">Buyer Interest:</span> {interest.status} - {new Date(interest.interestDate).toLocaleDateString()}
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

              {/* Farm Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Farm Details</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Farm Size</label>
                    <input
                      type="number"
                      value={formData.farmDetails?.size || ''}
                      onChange={(e) => handleInputChange('farmDetails.size', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Unit</label>
                    <select
                      value={formData.farmDetails?.unit || 'acres'}
                      onChange={(e) => handleInputChange('farmDetails.unit', e.target.value)}
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
                      value={formData.farmDetails?.location || ''}
                      onChange={(e) => handleInputChange('farmDetails.location', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Climate & Resources */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Climate & Resources</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Climate Suitability</label>
                    <input
                      type="text"
                      value={formData.climateSuitability || ''}
                      onChange={(e) => handleInputChange('climateSuitability', e.target.value)}
                      disabled={!editMode}
                      className="form-input disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="form-label">Available Resources</label>
                    <div className="space-y-2">
                      {['irrigation', 'machinery', 'storage', 'labor'].map((resource) => (
                        <label key={resource} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.resourceAvailability?.[resource] || false}
                            onChange={(e) => handleInputChange(`resourceAvailability.${resource}`, e.target.checked)}
                            disabled={!editMode}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 capitalize">{resource}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Crop Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Crop Details</h4>
                <div className="space-y-4">
                  {formData.cropDetails?.map((crop, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <label className="form-label">Crop Name</label>
                          <input
                            type="text"
                            value={crop.name || ''}
                            onChange={(e) => handleCropChange(index, 'name', e.target.value)}
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
                      Add Crop
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Lands Tab */}
        {activeTab === 'lands' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Available Lands</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search lands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input pl-10 w-64"
                  />
                </div>
              </div>
              <div className="card-body">
                {filteredLands.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLands.map((land, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{land.name}</h4>
                            <span className="text-sm text-gray-500">{land.landDetails?.size} {land.landDetails?.unit}</span>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Available</span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p><MapPin className="w-4 h-4 inline mr-1" /> {land.landDetails?.location}</p>
                          <p><Leaf className="w-4 h-4 inline mr-1" /> {land.landDetails?.area}</p>
                          <p>Soil: {land.landDetails?.soilType}</p>
                          <p>Climate: {land.landDetails?.climaticConditions}</p>
                          <p>Crops: {land.availableCrops?.join(', ')}</p>
                          <p>Phone: {land.contactInfo?.phone || 'Not provided'}</p>
                          <p>Email: {land.userId?.email || 'Not provided'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              axios.get(`/api/landowners/public/${land._id}`).then((res) => openProfileDetail(res.data.landowner, 'landowner')).catch(() => toast.error('Failed to load landowner profile'));
                            }}
                            className="btn-secondary w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </button>
                          <button
                            onClick={() => showInterestInLand(land._id)}
                            className="btn-primary w-full"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {searchQuery ? 'No lands found matching your search.' : 'No lands available at the moment.'}
                  </p>
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

        {/* Interested Buyers Tab */}
        {activeTab === 'buyers' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Interested Buyers</h3>
              </div>
              <div className="card-body">
                {profile?.interestedBuyers?.length > 0 ? (
                  <div className="space-y-4">
                    {profile.interestedBuyers.map((interest, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {interest.buyerId?.name || 'Unknown Buyer'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {interest.buyerId?.companyName && `Company: ${interest.buyerId.companyName}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              Phone: {interest.buyerId?.contactInfo?.phone || 'Not provided'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interest.status)}`}>
                              {interest.status}
                            </span>
                            {getStatusIcon(interest.status)}
                          </div>
                        </div>
                        
                        {interest.buyerId?.cropRequirements && (
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Required Crops: {interest.buyerId.cropRequirements.map(crop => `${crop.cropName} (${crop.quantity} ${crop.unit})`).join(', ')}</p>
                            <p>Price Range: ₹{interest.buyerId.priceRange?.min} - ₹{interest.buyerId.priceRange?.max} {interest.buyerId.priceRange?.unit}</p>
                          </div>
                        )}

                        {interest.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateBuyerInterest(interest.buyerId._id, 'accepted')}
                              className="btn-primary text-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateBuyerInterest(interest.buyerId._id, 'rejected')}
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
                  <p className="text-gray-500 text-center py-8">No buyers have shown interest yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Buyers Tab */}
        {activeTab === 'availableBuyers' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Available Buyers</h3>
              </div>
              <div className="card-body">
                {availableBuyers.length > 0 ? (
                  <div className="space-y-4">
                    {availableBuyers.map((buyer, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {buyer.name || 'Unknown Buyer'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {buyer.companyName && `Company: ${buyer.companyName}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              Phone: {buyer.contactInfo?.phone || 'Not provided'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Available
                            </span>
                          </div>
                        </div>
                        
                        {buyer.cropRequirements && (
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Required Crops: {buyer.cropRequirements.map(crop => `${crop.cropName} (${crop.quantity} ${crop.unit})`).join(', ')}</p>
                            <p>Price Range: ₹{buyer.priceRange?.min} - ₹{buyer.priceRange?.max} {buyer.priceRange?.unit}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              axios.get(`/api/buyers/public/${buyer._id}`).then((res) => openProfileDetail(res.data.buyer, 'buyer')).catch(() => toast.error('Failed to load buyer profile'));
                            }}
                            className="btn-secondary w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </button>
                          <button
                            onClick={() => sendInterestToBuyer(buyer._id)}
                            className="btn-primary w-full"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No buyers are currently available.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Land Interests Tab */}
        {activeTab === 'land-interests' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Land Interests</h3>
              </div>
              <div className="card-body">
                {profile?.interestedLandowners?.length > 0 ? (
                  <div className="space-y-4">
                    {profile.interestedLandowners.map((interest, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {interest.landownerId?.name || 'Unknown Landowner'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Phone: {interest.landownerId?.contactInfo?.phone || 'Not provided'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Email: {interest.landownerId?.userId?.email || 'Not provided'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interest.status)}`}>
                              {interest.status}
                            </span>
                            {getStatusIcon(interest.status)}
                          </div>
                        </div>

                        {interest.landownerId?.landDetails && (
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Land Size: {interest.landownerId.landDetails.size} {interest.landownerId.landDetails.unit}</p>
                            <p>Location: {interest.landownerId.landDetails.location}</p>
                            <p>Area: {interest.landownerId.landDetails.area}</p>
                          </div>
                        )}

                        {interest.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateLandownerInterest(interest.landownerId._id, 'accepted')}
                              className="btn-primary text-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateLandownerInterest(interest.landownerId._id, 'rejected')}
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
                  <p className="text-gray-500 text-center py-8">No land interests yet.</p>
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
                <h3 className="text-lg font-medium text-gray-900">Contract Papers</h3>
              </div>
              <div className="card-body">
                <FileUpload
                  endpoint="/api/farmers/upload-contracts"
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
                          onClick={() => deleteFile(doc.filename)}
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

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Farm Images</h3>
              </div>
              <div className="card-body">
                <FileUpload
                  endpoint="/api/farmers/upload-images"
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
                  <p className="text-gray-500 text-center py-8">No farm images uploaded yet.</p>
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

export default FarmerDashboard;
