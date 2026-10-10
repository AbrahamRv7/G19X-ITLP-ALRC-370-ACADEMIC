import axios from 'axios';

const API_URL = "https://plurione-backend-ur9j.onrender.com";

const api = axios.create({
  baseURL: API_URL,
});

export default api;