// C:/duo-frontend/services/api.ts
import axios from 'axios';

// Создаем экземпляр axios с базовым URL из переменных окружения
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
console.log('API Base URL:', baseURL);

const api = axios.create({
  baseURL, // Для Vite используем import.meta.env
});

// "Перехватчик" запросов: добавляет токен авторизации перед отправкой
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Игнорируем ошибки localStorage
    }
  }
  return config;
});

// "Перехватчик" ответов: обрабатывает ошибки
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Пробрасываем ошибку дальше с полной информацией
    return Promise.reject(error);
  }
);

export default api;