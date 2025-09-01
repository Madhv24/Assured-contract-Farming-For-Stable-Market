import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Upload, 
  Trash2, 
  Edit, 
  Save, 
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const ProgressUpdates = ({ contract, userRole, onUpdate }) => {
  const [expandedStage, setExpandedStage] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [editData, setEditData] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [socket, setSocket] = useState(null);
  const backendBase = process.env.REACT_APP_API_BASE || (window.location.port === '3000' || window.location.port === '3001' ? 'http://localhost:5000' : '');

  useEffect(() => {
    // Initialize socket connection for real-time updates
    const socketBase = process.env.REACT_APP_SOCKET_URL || (window.location.port === '3001' ? 'http://localhost:5000' : undefined);
    const newSocket = io(socketBase);
    
    newSocket.emit('join', `contract_${contract._id}`);
    
    newSocket.on('progress:update', (data) => {
      if (data.contractId === contract._id) {
        onUpdate(); // Refresh the contract data
        toast.success('Progress updated in real-time!');
      }
    });

    newSocket.on('progress:files:update', (data) => {
      if (data.contractId === contract._id) {
        onUpdate(); // Refresh the contract data
        toast.success('Files updated in real-time!');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [contract._id, onUpdate]);

  const handleEditStage = (stage) => {
    setEditingStage(stage.step);
    setEditData({
      status: stage.status,
      notes: stage.notes || ''
    });
  };

  const handleSaveStage = async (step) => {
    try {
      await axios.put(`/api/progress/contracts/${contract._id}/progress/${step}`, editData);
      setEditingStage(null);
      setEditData({});
      onUpdate();
      toast.success('Progress updated successfully!');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleCancelEdit = () => {
    setEditingStage(null);
    setEditData({});
  };

  const handleFileUpload = async (step, files) => {
    if (!files || files.length === 0) return;

    setUploadingFiles(prev => ({ ...prev, [step]: true }));

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      await axios.post(`/api/progress/contracts/${contract._id}/progress/${step}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      onUpdate();
      toast.success('Files uploaded successfully!');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [step]: false }));
    }
  };

  const handleDeleteFile = async (step, filename) => {
    try {
      await axios.delete(`/api/progress/contracts/${contract._id}/progress/${step}/files/${filename}`);
      onUpdate();
      toast.success('File deleted successfully!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(error.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const urlFull = `${backendBase}${file.path}`;
      const res = await axios.get(urlFull, { responseType: 'blob' });
      const ext = (file.originalName?.split('.').pop() || 'bin');
      const suggested = file.originalName || `progress-file.${ext}`;
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', suggested);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      toast.error('Failed to download file');
    }
  };

  const getStatusIcon = (status) => {
    return status === 'Completed' ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-600" />
    );
  };

  const getStatusColor = (status) => {
    return status === 'Completed' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? (
      <ImageIcon className="w-4 h-4" />
    ) : (
      <FileText className="w-4 h-4" />
    );
  };

  const calculateProgress = () => {
    if (!contract.progressUpdates) return 0;
    const completed = contract.progressUpdates.filter(p => p.status === 'Completed').length;
    return Math.round((completed / contract.progressUpdates.length) * 100);
  };

  const getRemainingTimeLabel = () => {
    const end = contract?.expectedDeliveryDate ? new Date(contract.expectedDeliveryDate) : null;
    if (!end) return null;
    const now = new Date();
    const ms = end.getTime() - now.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days > 0) return { text: `${days} days remaining`, style: 'text-green-700 bg-green-50 border-green-200' };
    if (days === 0) return { text: 'Due today', style: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    return { text: `${Math.abs(days)} days overdue`, style: 'text-red-700 bg-red-50 border-red-200' };
  };

  // Gate progress UI until signed contract is uploaded
  if (!contract.contractFile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Signed contract is required before progress tracking begins. Please upload the signed contract when creating the contract.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Crop Progress Overview</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {contract.progressUpdates?.filter(p => p.status === 'Completed').length || 0} of {contract.progressUpdates?.length || 0} stages completed
            </div>
            {(() => { const r = getRemainingTimeLabel(); return r ? (
              <div className={`inline-block mt-1 px-2 py-0.5 text-xs rounded border ${r.style}`}>
                {r.text}
              </div>
            ) : null; })()}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        
        <div className="text-center text-sm text-gray-600">
          {calculateProgress()}% Complete
        </div>
      </div>

      {/* Progress Stages */}
      <div className="space-y-4">
        {contract.progressUpdates?.map((stage, index) => (
          <div key={stage.step} className="bg-white rounded-lg shadow border">
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedStage(expandedStage === stage.step ? null : stage.step)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getStatusColor(stage.status)}`}>
                    {getStatusIcon(stage.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Step {stage.step}: {stage.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Last updated: {new Date(stage.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                    {stage.status}
                  </span>
                  {expandedStage === stage.step ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedStage === stage.step && (
              <div className="border-t p-4 space-y-4">
                {/* Notes Section */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Notes & Details</h5>
                  {editingStage === stage.step ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editData.notes}
                          onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Add details about this stage..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveStage(stage.step)}
                          className="btn-primary text-sm"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-secondary text-sm"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        {stage.notes || 'No notes added yet.'}
                      </p>
                      {userRole === 'farmer' && (
                        <button
                          onClick={() => handleEditStage(stage)}
                          className="btn-outline text-sm"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Files Section */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Files & Documents</h5>
                  {stage.files && stage.files.length > 0 ? (
                    <div className="space-y-2">
                      {stage.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            {getFileIcon(file.filename)}
                            <span className="text-sm text-gray-700">{file.originalName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={`${backendBase}${file.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              View
                            </a>
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              Download
                            </button>
                            {userRole === 'farmer' && (
                              <button
                                onClick={() => handleDeleteFile(stage.step, file.filename)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No files uploaded yet.</p>
                  )}
                  
                  {userRole === 'farmer' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Files
                      </label>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(stage.step, e.target.files)}
                        disabled={uploadingFiles[stage.step]}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                      {uploadingFiles[stage.step] && (
                        <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressUpdates;

