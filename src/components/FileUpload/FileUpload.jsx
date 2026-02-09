import React, { useState } from "react";
import "./FileUpload.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ACCEPT_STRING = "image/*, .pdf, .doc, .docx";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function FileUpload({ onFilesUploaded, uploadedFiles = [] }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds 10 MB limit`;
    }
    const isAllowedType = ALLOWED_TYPES.includes(file.type) ||
                          file.name.endsWith('.pdf') ||
                          file.name.endsWith('.doc') ||
                          file.name.endsWith('.docx');
    if (!isAllowedType) {
      return `${file.name} is not an allowed file type`;
    }
    return null;
  };

  const handleFileChange = (e) => {
    setError(null);
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onFilesUploaded(newFiles);
  };

  const uploadFilesToIPFS = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    const newUploadedFiles = [];
    const failedIndices = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress(prev => ({ ...prev, [i]: 'Uploading...' }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Use backend API instead of direct Pinata call
        const response = await fetch(`${BACKEND_URL}/api/ipfs/upload-file`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          newUploadedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            ipfsHash: data.IpfsHash,
            timestamp: new Date().toISOString(),
          });
          setUploadProgress(prev => ({ ...prev, [i]: 'Done' }));
        } else {
          console.error(`Upload failed for ${file.name}:`, data.error);
          setUploadProgress(prev => ({ ...prev, [i]: 'Failed' }));
          failedIndices.push(i);
          setError(data.error || `Upload failed for ${file.name}`);
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setUploadProgress(prev => ({ ...prev, [i]: 'Failed' }));
        failedIndices.push(i);
        setError(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    // Update uploaded files with successful uploads
    if (newUploadedFiles.length > 0) {
      onFilesUploaded([...uploadedFiles, ...newUploadedFiles]);
    }

    // Keep only failed files in selected list for retry
    if (failedIndices.length > 0) {
      setSelectedFiles(prev => prev.filter((_, i) => failedIndices.includes(i)));
    } else {
      setSelectedFiles([]);
    }

    setUploadProgress({});
    setUploading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <label htmlFor="file-upload-input">
        <div className="form-fileUpload">
          <img src="/upload.svg" alt="" />
          <span>Click here to upload or drop files here</span>
        </div>
      </label>
      <input
        id="file-upload-input"
        type="file"
        multiple
        accept={ACCEPT_STRING}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && (
        <div className="file-upload-error">{error}</div>
      )}

      {selectedFiles.length > 0 && (
        <div className="file-upload-selected">
          <div className="file-upload-selected-header">
            <span>Selected Files ({selectedFiles.length})</span>
            <button
              onClick={uploadFilesToIPFS}
              disabled={uploading}
              className="file-upload-btn"
            >
              {uploading ? 'Uploading...' : 'Upload to IPFS'}
            </button>
          </div>
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-upload-item">
              <div className="file-upload-item-info">
                <div className="file-upload-item-name">{file.name}</div>
                <div className="file-upload-item-meta">
                  {formatFileSize(file.size)}
                </div>
              </div>
              {uploadProgress[index] && (
                <span className="file-upload-progress">{uploadProgress[index]}</span>
              )}
              {!uploading && (
                <button onClick={() => removeFile(index)} className="file-upload-remove">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadedFiles && uploadedFiles.length > 0 && (
        <div className="file-upload-uploaded">
          <span>Uploaded Files ({uploadedFiles.length})</span>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="file-upload-item file-upload-item-success">
              <div className="file-upload-item-info">
                <div className="file-upload-item-name">{file.name}</div>
                <div className="file-upload-item-meta">
                  {formatFileSize(file.size)} • IPFS: {file.ipfsHash.substring(0, 10)}...
                </div>
              </div>
              <button onClick={() => removeUploadedFile(index)} className="file-upload-remove">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
