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

interface ChartData {
  chartType: string;
  chartTitle: string;
  data: any[];
  [key: string]: any;
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
  console.log('Отправляем запрос на финансовый совет...');
  console.log('Количество транзакций:', financialData.transactions?.length || 0);
  console.log('Бюджет:', financialData.budget);
  
  try {
    // Отправляем POST-запрос на наш бэкенд
    const response = await api.post('/ai/financial-advice', financialData);
    console.log('Получен ответ от сервера:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Ошибка при запросе финансового совета:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

/**
 * Отправляет данные конкретного графика на бэкенд для получения быстрого совета.
 * @param chartData - Данные графика для анализа.
 * @returns Строка с советом по графику.
 */
export const getChartAdvice = async (chartData: ChartData): Promise<{ advice: string }> => {
  console.log('Отправляем запрос на совет по графику:', chartData.chartType);
  
  try {
    // Отправляем POST-запрос на наш бэкенд
    const response = await api.post('/ai/chart-advice', chartData);
    console.log('Получен ответ от сервера:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Ошибка при запросе совета по графику:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

/**
 * Получает предложения автозаполнения на основе описания транзакции.
 * @param data - Данные для автозаполнения.
 * @returns Объект с предложениями для полей формы.
 */
export const getAutofillSuggestions = async (data: {
  description: string;
  transactionType: 'expense' | 'income';
  categories: any[];
  subCategories: any[];
  users: string[];
  paymentMethods: any[];
  recentTransactions: any[];
}): Promise<{
  category: string | null;
  subCategory: string | null;
  user: string | null;
  priority: string | null;
  paymentMethodId: string | null;
  amount: number | null;
}> => {
  try {
    const response = await api.post('/ai/autofill', {
      description: data.description,
      transactionType: data.transactionType,
      categories: data.categories,
      subCategories: data.subCategories,
      users: data.users,
      paymentMethods: data.paymentMethods,
      recentTransactions: data.recentTransactions.slice(-20) // Последние 20 транзакций
    });
    return response.data;
  } catch (error: any) {
    console.error('Ошибка автозаполнения:', error);
    return { category: null, subCategory: null, user: null, priority: null, paymentMethodId: null, amount: null };
  }
};