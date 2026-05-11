import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (email, password, name) => api.post('/auth/signup', { email, password, name }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password })
};

export const projectsAPI = {
  create: (name, description) => api.post('/projects', { name, description }),
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  addMember: (projectId, email, role) => api.post(`/projects/${projectId}/members`, { email, role }),
  getStats: (id) => api.get(`/projects/${id}/stats`)
};

export const tasksAPI = {
  create: (data) => api.post('/tasks', data),
  getProjectTasks: (projectId, filters = {}) => api.get(`/tasks/project/${projectId}`, { params: filters }),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getMyTasks: () => api.get('/tasks/dashboard/my-tasks')
};

export const usersAPI = {
  getMe: () => api.get('/users/me'),
  getAll: () => api.get('/users')
};

export default api;
