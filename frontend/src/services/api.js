// import axios from 'axios/dist/browser/axios.cjs';

import axios from 'axios';
// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  logout: () => api.post('/auth/logout'),
};

// Projects API
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  addTeamMember: (id, memberData) => api.post(`/projects/${id}/team`, memberData),
  removeTeamMember: (id, userId) => api.delete(`/projects/${id}/team/${userId}`),
};

// SINGLE tasksAPI - NO SEPARATE uploadAPI needed
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (taskData) => api.post('/tasks', taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  delete: (id) => api.delete(`/tasks/${id}`),
  //  Single file upload (for SingleFileUploader)
  //  uploadSingleAttachment: (taskId, formData, config = {}) => 
  //   api.post(`/tasks/${taskId}/attachments`, formData, {  // ← Remove /single
  //     headers: { 'Content-Type': 'multipart/form-data' },
  //     ...config
  //   }),


  uploadSingleAttachment: (taskId, formData, config = {}) => 
    api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    }),  // ✅ FIXED


    //  Multiple files (keep both)
  uploadAttachments: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAttachment: (id, attachmentId) => api.delete(`/tasks/${id}/attachments/${attachmentId}`),
  addComment: (id, commentData) => api.post(`/tasks/${id}/comments`, commentData),

  //  MERGED Upload methods (task-focused)
  uploadSingleToTask: (taskId, formData, config = {}) => 
    api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config  // Supports onUploadProgress
    }),

  uploadMultipleToTask: (taskId, formData, config = {}) => 
    api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    }),

  // Generic upload (if needed outside tasks)
  uploadSingle: (formData, config = {}) => api.post('/upload/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
  }),
};


// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  searchTeamMembers: (params) => api.get('/users/search/team-members', { params }),
  getStats: () => api.get('/users/stats/overview'),
};
// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;