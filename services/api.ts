// C:/duo-frontend/services/api.ts
import axios from 'axios';

// Создаем экземпляр axios с базовым URL из переменных окружения
// В production используем задеплоенный backend, в development - localhost
const isProduction = import.meta.env.MODE === 'production' || 
                     import.meta.env.PROD || 
                     (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'));

// Для локальной разработки всегда используем localhost, даже если VITE_API_URL установлен
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'));

// В production используем VITE_API_URL из .env.production, иначе localhost для разработки
const baseURL = (isLocalhost 
    ? 'http://localhost:8080/api'
    : (import.meta.env.VITE_API_URL || 'https://expense-app-1c549.et.r.appspot.com/api'));
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
    // Логируем ошибки для отладки
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    } else if (error.request) {
      console.error('API Error Request:', {
        message: 'No response received',
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    } else {
      console.error('API Error:', error.message);
    }
    // Пробрасываем ошибку дальше с полной информацией
    return Promise.reject(error);
  }
);

export default api;