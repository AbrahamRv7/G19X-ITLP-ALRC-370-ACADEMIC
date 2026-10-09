import axios from 'axios';

const api = axios.create({
  baseURL: 'https://plurione-backend-ur9j.onrender.com',
});

export default api;