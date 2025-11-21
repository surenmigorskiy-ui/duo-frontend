// Сервис для получения курса валют из ЦБ РУз

interface CurrencyRate {
  code: string;
  rate: number; // Курс к сум
  date: string;
}

const CACHE_KEY = 'currency_rates_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

// Публичный API ЦБ РУз
// Формат: https://cbu.uz/ru/arkhiv-kursov-valyut/json/{CODE}/
const CBU_API_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/';

// Fallback курсы на случай недоступности API
const FALLBACK_RATES: { [key: string]: number } = {
  USD: 12000,
  EUR: 13000,
  RUB: 130,
  KZT: 25,
  GBP: 15000,
  CNY: 1700,
  JPY: 80,
  KRW: 9,
  BRL: 2400,
  AUD: 8000,
  CAD: 9000,
};

export const getCurrencyRate = async (currencyCode: string): Promise<number> => {
  // Проверяем кеш
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { rates, timestamp } = JSON.parse(cached);
      const now = Date.now();
      if (now - timestamp < CACHE_DURATION && rates[currencyCode]) {
        return rates[currencyCode];
      }
    } catch (e) {
      // Игнорируем ошибки парсинга кеша
    }
  }

  // Если валюта SUM, возвращаем 1
  if (currencyCode === 'SUM') {
    return 1;
  }

  try {
    // Пытаемся получить курс из API ЦБ РУз
    // API возвращает массив с одним объектом, содержащим поле Rate (курс к сум)
    const response = await fetch(`${CBU_API_URL}${currencyCode}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0 && data[0].Rate) {
        // Rate в API ЦБ РУз - это курс к сум (например, 1 USD = 12000 SUM)
        const rate = parseFloat(data[0].Rate) || FALLBACK_RATES[currencyCode] || 1;
        
        // Сохраняем в кеш
        const cachedRates = cached ? JSON.parse(cached).rates || {} : {};
        cachedRates[currencyCode] = rate;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: cachedRates, timestamp: Date.now() }));
        
        return rate;
      }
    }
  } catch (error) {
    console.error('Ошибка получения курса валют из ЦБ РУз:', error);
  }

  // Используем fallback курс
  const fallbackRate = FALLBACK_RATES[currencyCode] || 1;
  
  // Сохраняем fallback в кеш
  const cachedRates = cached ? JSON.parse(cached).rates || {} : {};
  cachedRates[currencyCode] = fallbackRate;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: cachedRates, timestamp: Date.now() }));
  
  return fallbackRate;
};

export const getAllCurrencyRates = async (): Promise<{ [key: string]: number }> => {
  const currencies = ['USD', 'EUR', 'RUB', 'KZT', 'GBP', 'CNY', 'JPY', 'KRW', 'BRL', 'AUD', 'CAD'];
  const rates: { [key: string]: number } = { SUM: 1 };
  
  // Получаем курсы параллельно
  await Promise.all(
    currencies.map(async (code) => {
      rates[code] = await getCurrencyRate(code);
    })
  );
  
  return rates;
};

