// src/services/geminiService.ts

import api from './api.ts'; // Указываем расширение файла .ts

// Интерфейсы, чтобы TypeScript понимал структуру данных
interface ParsedReceipt {
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface FinancialData {
  transactions: any[]; // Замените any на более конкретный тип, если он у вас есть
  budget: any;       // Замените any на более конкретный тип, если он у вас есть
}

/**
 * Отправляет изображение чека на НАШ БЭКЕНД для анализа.
 * @param imageFile - Файл изображения для загрузки.
 * @param categories - Список доступных категорий.
 * @returns Объект с распознанными данными чека.
 */
export const parseReceipt = async (imageFile: File, categories: string[]): Promise<ParsedReceipt> => {
  // Создаем объект FormData для отправки файла
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('categories', JSON.stringify(categories));

  // Отправляем POST-запрос на наш бэкенд
  const response = await api.post('/ai/parse-receipt', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Отправляет финансовые данные на НАШ БЭКЕНД для получения совета.
 * @param financialData - Данные о транзакциях и бюджете.
 * @returns Строка с финансовым советом.
 */
export const getFinancialAdvice = async (financialData: FinancialData): Promise<{ advice: string }> => {
  // Отправляем POST-запрос на наш бэкенд
  const response = await api.post('/ai/financial-advice', financialData);
  
  return response.data;
};