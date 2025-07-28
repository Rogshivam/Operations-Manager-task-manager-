import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiFile, FiImage, FiFileText } from 'react-icons/fi';
import { uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

const FileUpload = ({ onFilesUploaded, maxFiles = 5, maxSize = 10 * 1024 * 1024 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await uploadAPI.uploadMultiple(formData);
      const newFiles = response.data.files;
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      onFilesUploaded(newFiles);
      
      toast.success(`${newFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      const message = error.response?.data?.message || 'File upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  });

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <FiImage className="text-blue-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FiFileText className="text-red-500" />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FiFileText className="text-blue-600" />;
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <FiFileText className="text-green-600" />;
    } else {
      return <FiFile className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Max {maxFiles} files, up to {formatFileSize(maxSize)} each
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported: Images, PDF, Word, Excel, Text, ZIP, RAR
            </p>
          </div>
        )}
        {uploading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Uploading...</p>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.mimeType)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Remove file"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 