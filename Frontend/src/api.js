import axios from 'axios';

// En desarrollo (npm run dev) se usa el backend local por defecto, para no escribir en producción
// por accidente si falta Frontend/.env. En el build de producción se mantiene la API desplegada.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "https://plurione-backend-ur9j.onrender.com");

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

// Si el token expiró o es inválido (401), se cierra la sesión y se vuelve al login.
// El propio /login responde 401 con credenciales incorrectas: ahí no se redirige.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const esLogin = error.config?.url?.includes('/login');
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      if (window.location.pathname !== '/') {
        window.location.assign('/');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
