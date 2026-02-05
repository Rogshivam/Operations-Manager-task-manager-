import React, { useState, useEffect, useCallback } from "react";
import { tasksAPI } from "../services/api";
import { FiUploadCloud, FiX, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import "./SingleFileUploader.css"; // ✅ FIXED: Correct spelling

const SingleFileUploader = ({
  taskId,
  onUploadSuccess,
  maxSizeMB = 10,
  allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx']
}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ✅ FIX #1: HANDLE temp_create WITHOUT API CALL
  useEffect(() => {
    if (taskId === 'temp_create' && file && !uploading) {
      // Simulate upload for create modal - NO API CALL
      setUploading(true);
      const timer = setTimeout(() => {
        if (file && onUploadSuccess) {
          onUploadSuccess({ file }); // Pass raw file to temp storage
          toast.success(`✅ ${file.name} ready for task creation`);
        }
        setFile(null);
        setUploadProgress(0);
        setUploading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [taskId, file, onUploadSuccess, uploading]);

  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB}MB`);
      return;
    }

    if (!allowedTypes.some(type =>
      selectedFile.type.match(new RegExp(type.replace('*', '.*')))
    )) {
      toast.error('File type not allowed');
      return;
    }

    setFile(selectedFile);
    setUploadProgress(0);
  }, [maxSizeMB, allowedTypes]);


  const handleUpload = useCallback(async () => {
    // console.log('🚀 UPLOAD START - taskId:', taskId, 'file:', file?.name);

    if (!file || !taskId || taskId === 'temp_create') {
      if (taskId === 'temp_create') return; // Handled by useEffect
      toast.error('Save task first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    // 🔥 CRITICAL DEBUG - CHECK FORMDATA
    // console.log('📦 FORMDATA ENTRIES:');
    // for (let [key, value] of formData.entries()) {
    //   console.log(`  ${key}:`, value, typeof value);
    // }
    // console.log('📦 FORMDATA SIZE:', formData.get('file')?.size);

    try {
      const result = await tasksAPI.uploadSingleAttachment(taskId, formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        }
      });

      // console.log('✅ UPLOAD SUCCESS:', result.data);
      toast.success('File uploaded!');
      setFile(null);
      setUploadProgress(0);
      if (onUploadSuccess) onUploadSuccess(result.data.task || result.data);

    } catch (error) {
      console.error('❌ FULL ERROR:', error.response?.status, error.response?.data || error.message);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [file, taskId, onUploadSuccess]);

  const removeFile = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
  }, []);
  // YOUR CODE - WRONG URL LOG  
  // console.log('📤 SENDING to:', `/tasks/${taskId}/attachments`);  // ❌ STATIC STRING

  return (
    <div className="single-file-uploader">
      <div className="upload-area">
        {!file ? (
          <>
            <label htmlFor={`file-upload-${taskId}`} className="upload-label">
              <FiUploadCloud size={48} />
              <p>Click to select file</p>
              <span>Max {maxSizeMB}MB • {allowedTypes[0]}</span>
            </label>
            <input
              id={`file-upload-${taskId}`} // ✅ Unique ID per instance
              type="file"
              onChange={handleFileChange}
              accept={allowedTypes.join(',')}
              className="file-input"
              disabled={uploading}
            />
          </>
        ) : (
          <div className="file-preview">
            <div className="file-info">
              <FiCheck size={24} className="success-icon" />
              <div>
                <h4>{file.name}</h4>
                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            {uploading ? (
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            ) : (
              <div className="file-actions">
                <button
                  type="button"
                  onClick={handleUpload}
                  className="upload-btn primary"
                >
                  <FiUploadCloud /> {taskId === 'temp_create' ? 'Ready' : 'Upload'}
                </button>
                <button onClick={removeFile} type="button" className="remove-btn">
                  <FiX /> Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleFileUploader;
