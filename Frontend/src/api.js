import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "https://plurione-backend-ur9j.onrender.com";

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor automático: inyecta el token JWT en TODAS las peticiones si existe sesión
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;