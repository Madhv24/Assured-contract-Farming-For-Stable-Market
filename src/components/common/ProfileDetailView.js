import React, { useState } from 'react';
import { X, Download, Eye, MapPin, Phone, Mail, Building, FileText, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

const ProfileDetailView = ({ profile, onClose, type }) => {
  const [activeTab, setActiveTab] = useState('details');

  const renderContactInfo = () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Phone className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {profile?.contactInfo?.phone || 'Not provided'}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Mail className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {profile?.userId?.email || 'Not provided'}
        </span>
      </div>
      {profile?.contactInfo?.address && (
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{profile.contactInfo.address}</span>
        </div>
      )}
    </div>
  );

  const renderLandownerDetails = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Land Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Size:</span>
            <p className="text-sm text-gray-900">
              {profile?.landDetails?.size || 0} {profile?.landDetails?.unit || 'acres'}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Location:</span>
            <p className="text-sm text-gray-900">{profile?.landDetails?.location || 'Not specified'}</p>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Soil & Climate</h4>
        <p className="text-sm text-gray-600">{profile?.landDetails?.soilType || 'Not specified'}</p>
        <p className="text-sm text-gray-600">{profile?.landDetails?.climaticConditions || 'Not specified'}</p>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Available Crops</h4>
        <div className="flex flex-wrap gap-2">
          {profile?.availableCrops?.map((crop, index) => (
            <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {crop}
            </span>
          )) || <span className="text-sm text-gray-500">No crops specified</span>}
        </div>
      </div>
    </div>
  );

  const renderFarmerDetails = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Farm Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Farm Size:</span>
            <p className="text-sm text-gray-900">
              {profile?.farmDetails?.size || 0} {profile?.farmDetails?.unit || 'acres'}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Experience:</span>
            <p className="text-sm text-gray-900">{profile?.farmDetails?.experience || 'Not specified'} years</p>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Crop Details</h4>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(profile?.cropDetails) && profile.cropDetails.length > 0 ? (
            profile.cropDetails.map((crop, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {crop?.name || crop}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500">No crops specified</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Climate Suitability</h4>
        <p className="text-sm text-gray-600">{profile?.climateSuitability || 'Not specified'}</p>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Resource Availability</h4>
        {profile?.resourceAvailability ? (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(profile.resourceAvailability).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                {value ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm text-gray-700 capitalize">{key}: {value ? 'Yes' : 'No'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Not specified</p>
        )}
      </div>
    </div>
  );

  const renderBuyerDetails = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Crop Requirements</h4>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(profile?.cropRequirements) && profile.cropRequirements.length > 0 ? (
            profile.cropRequirements.map((crop, index) => (
              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                {crop?.cropName || crop}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500">No requirements specified</span>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Quantity & Price</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Quantity:</span>
            <p className="text-sm text-gray-900">{profile?.quantity || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Price Range:</span>
            <p className="text-sm text-gray-900">
              {profile?.priceRange ? 
                `₹${profile.priceRange.min || 0} - ₹${profile.priceRange.max || 0} ${profile.priceRange.unit || 'per kg'}` : 
                'Not specified'
              }
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Preferred Area</h4>
        <p className="text-sm text-gray-600">{profile?.preferredArea || 'Not specified'}</p>
      </div>
    </div>
  );

  const renderDocuments = () => {
    const docs = type === 'buyer' ? (profile?.requirementDocs || []) : (profile?.contractPapers || []);
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <a href={`${doc.path}`} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </a>
                  <a href={`${doc.path}`} download className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No documents uploaded</p>
        )}
      </div>
    );
  };

  const renderImages = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Uploaded Images</h4>
      
      {profile?.landImages?.length || profile?.images?.length || profile?.requirementDocs?.length ? (
        <div className="grid grid-cols-2 gap-4">
          {(profile.landImages || profile.images || []).map((img, index) => {
            const src = img.path || `/uploads/${type}s/${img.filename}`;
            const alt = img.originalName || `Uploaded image ${index + 1}`;
            return (
              <div key={index} className="relative group">
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-white rounded-full shadow-lg"
                  >
                    <Eye className="w-4 h-4 text-gray-700" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No images uploaded</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {profile?.name || profile?.companyName || 'Profile Details'}
            </h2>
            <p className="text-sm text-gray-500 capitalize">{type} Profile</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'images'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Images
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Name</h4>
                    <p className="text-sm text-gray-600">
                      {profile?.name || profile?.companyName || 'Not provided'}
                    </p>
                  </div>
                  {profile?.companyName && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Company</h4>
                      <p className="text-sm text-gray-600">{profile.companyName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                {renderContactInfo()}
              </div>

              {/* Type-specific Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {type === 'landowner' ? 'Land Details' : type === 'farmer' ? 'Farm Details' : 'Business Details'}
                </h3>
                {type === 'landowner' && renderLandownerDetails()}
                {type === 'farmer' && renderFarmerDetails()}
                {type === 'buyer' && renderBuyerDetails()}
              </div>
            </div>
          )}

          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'images' && renderImages()}
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailView;
