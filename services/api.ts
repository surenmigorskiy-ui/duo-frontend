// C:/duo-frontend/services/api.ts
import axios from 'axios';

// Создаем экземпляр axios с базовым URL из переменных окружения
// В production используем задеплоенный backend, в development - localhost
const isProduction = import.meta.env.MODE === 'production' || 
                     import.meta.env.PROD || 
                     window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');

const baseURL = import.meta.env.VITE_API_URL || 
  (isProduction 
    ? 'https://expense-app-1c549.et.r.appspot.com/api' 
    : 'http://localhost:8080/api');
console.log('API Base URL:', baseURL);
console.log('Environment:', import.meta.env.MODE);
console.log('Is Production:', isProduction);
console.log('Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');

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