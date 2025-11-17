// C:/duo-frontend/services/api.ts
import axios from 'axios';

// Создаем экземпляр axios с базовым URL из переменных окружения
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Для Vite используем import.meta.env
});

// "Перехватчик" запросов: добавляет токен авторизации перед отправкой
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;