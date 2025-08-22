import React, { useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FileUpload = ({ 
  endpoint, 
  onUploadSuccess, 
  acceptedTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png', 
  multiple = true,
  label = 'Upload Files',
  fileType = 'documents',
  fieldName = 'files'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (files) => {
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append(fieldName, file);
    });

    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Files uploaded successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple={multiple}
          accept={acceptedTypes}
          onChange={handleFileInput}
          className="hidden"
          id={`file-upload-${fileType}`}
          disabled={uploading}
        />
        <label 
          htmlFor={`file-upload-${fileType}`}
          className="cursor-pointer"
        >
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : `Drag and drop ${fileType} here, or click to select`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: {acceptedTypes}
          </p>
        </label>
      </div>
    </div>
  );
};

export default FileUpload;
