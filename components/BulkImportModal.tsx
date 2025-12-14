import React, { useState, useEffect } from 'react';
import { Transaction, User, PaymentMethod, Category } from '../types';
import api from '../services/api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: User | null;
  paymentMethods: PaymentMethod[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  existingTransactions: Transaction[];
  userDetails?: { [key: string]: any };
}

interface DuplicateCheck {
  newTransaction: Transaction;
  existingTransaction: Transaction;
  similarity: number; // 0-100
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  paymentMethods,
  expenseCategories,
  incomeCategories,
  existingTransactions,
  userDetails = {}
}) => {
  const [importMethod, setImportMethod] = useState<'text' | 'file' | 'screenshot' | 'audio'>('screenshot');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [duplicates, setDuplicates] = useState<DuplicateCheck[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  
  // Загружаем timestamp последнего импорта из localStorage
  const getLastImportTimestamp = (): number | null => {
    try {
      const stored = localStorage.getItem('lastBulkImportTimestamp');
      if (stored) {
        const timestamp = parseInt(stored);
        if (!isNaN(timestamp) && timestamp > 0) {
          console.log('[getLastImportTimestamp] Найден timestamp:', timestamp, 'Дата:', new Date(timestamp).toLocaleString());
          return timestamp;
        } else {
          console.warn('[getLastImportTimestamp] Некорректный timestamp:', stored);
          return null;
        }
      }
      console.log('[getLastImportTimestamp] Timestamp не найден в localStorage');
      return null;
    } catch (error) {
      console.error('[getLastImportTimestamp] Ошибка при чтении из localStorage:', error);
      return null;
    }
  };

  const [lastImportTimestamp, setLastImportTimestamp] = useState<number | null>(getLastImportTimestamp());

  // Функция для нормализации даты: исправляет старые годы на текущий год
  const normalizeDate = (dateString: string | undefined): string => {
    if (!dateString) {
      return new Date().toISOString();
    }

    // Если дата в формате YYYY-MM-DD
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const currentYear = new Date().getFullYear();
      // Если год старый (меньше текущего), заменяем на текущий
      const correctedYear = year < currentYear ? currentYear : year;
      const date = new Date(correctedYear, month - 1, day, 12, 0, 0);
      return date.toISOString();
    }

    // Для других форматов тоже проверяем год
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const currentYear = new Date().getFullYear();
      if (date.getFullYear() < currentYear) {
        // Если год старый, заменяем на текущий, сохраняя месяц и день
        date.setFullYear(currentYear);
      }
      return date.toISOString();
    }

    // Если не удалось распарсить, возвращаем текущую дату
    return new Date().toISOString();
  };

  // Обновляем timestamp при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      const timestamp = getLastImportTimestamp();
      console.log('[BulkImportModal] Модальное окно открыто, проверка timestamp...');
      console.log('[BulkImportModal] Timestamp из localStorage:', timestamp);
      setLastImportTimestamp(timestamp);
      if (timestamp) {
        const importDate = new Date(timestamp);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - importDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log('[BulkImportModal] Загружен timestamp последнего импорта:', timestamp);
        console.log('[BulkImportModal] Дата импорта:', importDate.toLocaleString());
        console.log('[BulkImportModal] Импорт был', daysDiff === 0 ? 'сегодня' : daysDiff === 1 ? 'вчера' : `${daysDiff} дней назад`);
      } else {
        console.log('[BulkImportModal] Timestamp последнего импорта не найден в localStorage');
        // Проверяем, есть ли что-то в localStorage
        try {
          const allKeys = Object.keys(localStorage);
          const bulkKeys = allKeys.filter(k => k.includes('bulk') || k.includes('import'));
          console.log('[BulkImportModal] Ключи в localStorage, связанные с bulk/import:', bulkKeys);
        } catch (e) {
          console.error('[BulkImportModal] Ошибка при проверке localStorage:', e);
        }
      }
    }
  }, [isOpen]);

  const parseTextInput = (text: string): Transaction[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const allCategories = [...expenseCategories, ...incomeCategories];
    
    return lines.map((line, index) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 4) {
        throw new Error(`Строка ${index + 1}: Неверный формат. Используйте: описание | сумма | категория | дата | тип`);
      }

      const [description, amountStr, categoryName, dateStr, type = 'expense'] = parts;
      const amount = parseFloat(amountStr);
      const category = allCategories.find(c => c.name === categoryName)?.id || categoryName;

      if (!description || isNaN(amount) || !category || !dateStr) {
        throw new Error(`Строка ${index + 1}: Отсутствуют обязательные поля`);
      }

      return {
        id: `bulk-${Date.now()}-${index}`,
        description,
        amount,
        category,
        date: normalizeDate(dateStr), // Используем нормализацию даты
        user: currentUser || 'shared',
        type: type as 'expense' | 'income',
        priority: 'nice-to-have' as const
      };
    });
  };

  const parseJSONFile = async (file: File): Promise<Transaction[]> => {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!Array.isArray(data)) {
      throw new Error('JSON файл должен содержать массив транзакций');
    }

    return data.map((tx, index) => ({
      id: tx.id || `bulk-${Date.now()}-${index}`,
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
      subCategory: tx.subCategory,
      date: normalizeDate(tx.date), // Используем нормализацию даты
      user: tx.user || currentUser || 'shared',
      type: tx.type || 'expense',
      priority: tx.priority || 'nice-to-have',
      paymentMethodId: tx.paymentMethodId
    }));
  };

  // Функция для очистки описания от времени и лишней информации
  const cleanDescription = (description: string): string => {
    if (!description) return '';
    
    // Убираем время в формате HH:MM или HH:MM:SS
    let cleaned = description.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '').trim();
    
    // Убираем адреса отправления/прибытия (паттерны типа "от ... до ...")
    cleaned = cleaned.replace(/\s*(от|from|до|to|→|->)\s*[^,]+/gi, '').trim();
    
    // Убираем лишние пробелы и запятые
    cleaned = cleaned.replace(/[,，]\s*[,，]+/g, ',').replace(/^\s*[,，]\s*|\s*[,，]\s*$/g, '').trim();
    
    // Убираем техническую информацию в скобках (если это не название места)
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    
    return cleaned || description; // Если после очистки ничего не осталось, возвращаем оригинал
  };

  const handleScreenshotUpload = async (file: File, fileIndex?: number, totalFiles?: number) => {
    try {
      // Не устанавливаем isLoading здесь, так как он управляется на уровне цикла обработки файлов
      // setIsLoading(true);
      // setError(''); // Ошибки не очищаем, чтобы видеть все ошибки
      
      // Показываем прогресс обработки
      if (fileIndex !== undefined && totalFiles !== undefined) {
        setProcessingProgress({
          current: fileIndex + 1,
          total: totalFiles,
          fileName: file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name
        });
      }

      // Собираем все подкатегории из категорий
      const allSubCategories: Array<{categoryId: string, name: string}> = [];
      [...expenseCategories, ...incomeCategories].forEach(cat => {
        if (cat.subCategories) {
          cat.subCategories.forEach(sub => {
            allSubCategories.push({ categoryId: cat.id, name: sub.name });
          });
        }
      });

      // Берем последние 50 транзакций для анализа паттернов
      // Конвертируем ID категорий в названия для передачи в AI
      const allCategoriesForPatterns = [...expenseCategories, ...incomeCategories];
      const recentTransactions = existingTransactions
        .filter(tx => tx.user === currentUser || tx.user === 'shared')
        .slice(0, 50)
        .map(tx => {
          // Находим название категории по ID
          const categoryObj = allCategoriesForPatterns.find(c => c.id === tx.category || c.name === tx.category);
          const categoryName = categoryObj?.name || tx.category;
          
          return {
            description: tx.description,
            category: categoryName, // Передаем название, а не ID
            subCategory: tx.subCategory,
            user: tx.user,
            amount: tx.amount
          };
        });

      const formData = new FormData();
      formData.append('image', file);
      formData.append('categories', JSON.stringify([
        ...expenseCategories.map(c => c.name),
        ...incomeCategories.map(c => c.name)
      ]));
      formData.append('subCategories', JSON.stringify(allSubCategories));
      formData.append('recentTransactions', JSON.stringify(recentTransactions));
      formData.append('currentUserId', currentUser?.id || currentUser?.name || 'shared');

      let response;
      try {
        response = await api.post('/ai/parse-bulk-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      } catch (apiError: any) {
        // Если ошибка API, выбрасываем её для обработки в catch блоке
        throw apiError;
      }

      // Проверяем, что ответ от сервера содержит массив транзакций (даже если он пустой)
      if (response && response.data && Array.isArray(response.data.transactions)) {
        console.log(`📊 Получено транзакций от AI: ${response.data.transactions.length}`);
        
        // Если массив пустой, показываем сообщение и выходим
        if (response.data.transactions.length === 0) {
          const errorText = `На изображении "${file.name}" не найдено транзакций. Убедитесь, что на изображении видны финансовые операции.`;
          setError(errorText);
          console.warn(`⚠️ Пустой массив транзакций для "${file.name}"`);
          // Показываем ошибку 5 секунд
          setTimeout(() => {
            setError(prev => {
              if (prev === errorText) return '';
              return prev;
            });
          }, 5000);
          return;
        }
        
        // Если транзакции есть, обрабатываем их
        // Форматируем транзакции: конвертируем категории из названий в ID и добавляем недостающие поля
        const allCategories = [...expenseCategories, ...incomeCategories];
        
        // Фильтруем транзакции: убираем нулевые суммы и бонусы
        const validTransactions = response.data.transactions.filter((tx: any) => {
          const amount = parseFloat(tx.amount) || 0;
          const description = (tx.description || '').toLowerCase();
          
          // Исключаем нулевые суммы
          if (amount <= 0) {
            console.log(`Пропускаем транзакцию с нулевой суммой: ${tx.description}`);
            return false;
          }
          
          // Исключаем бонусы, кешбек, начисления
          const bonusKeywords = ['бонус', 'кешбек', 'начисление', 'cashback', 'bonus', 'балл', 'начислено'];
          if (bonusKeywords.some(keyword => description.includes(keyword))) {
            console.log(`Пропускаем бонусную транзакцию: ${tx.description}`);
            return false;
          }
          
          return true;
        });
        
        const formattedTransactions = validTransactions.map((tx: any, index: number) => {
          // Маппинг английских названий на русские
          const categoryMapping: { [key: string]: string } = {
            'transport': 'Транспорт',
            'food': 'Еда',
            'home': 'Дом',
            'entertainment': 'Досуг и развлечения',
            'health': 'Здоровье и красота',
            'taxi': 'Такси',
            'public_transport': 'Общественный транспорт'
          };
          
          const subCategoryMapping: { [key: string]: string } = {
            'taxi': 'Такси',
            'public_transport': 'Общественный транспорт'
          };
          
          // КРИТИЧЕСКАЯ ПРОВЕРКА: Если описание содержит только банковские термины без понятного назначения,
          // ВСЕГДА помечаем как неопределенную, независимо от того, что вернул AI
          const description = (tx.description || '').toLowerCase();
          const hasBankTerms = description.includes('uzumbank') || 
                               description.includes('uzcard') || 
                               description.includes('visa') ||
                               description.includes('visausum') ||
                               description.includes(' to ') ||
                               description.includes('перевод') ||
                               description.includes('transfer') ||
                               description.includes('card') ||
                               description.includes('bank');
          
          // Проверяем, есть ли в описании понятные слова о назначении платежа
          const hasClearPurpose = description.match(/(продукт|еда|такси|транспорт|кафе|ресторан|доставка|покупка|магазин|аптека|врач|спорт|развлечение|кино|мероприятие|дом|коммунал|интернет|аренда|ремонт|одежда|обувь|подарок|обучение|питомец|кредит|долг|зарплата|доход|бонус)/i);
          
          // Если описание содержит только банковские термины без понятного назначения - это неопределенная транзакция
          const isTechnicalOnly = hasBankTerms && !hasClearPurpose;
          
          // Если это техническая транзакция без понятного назначения - ВСЕГДА переопределяем категорию на UNKNOWN
          // ДО того как будем искать categoryObj, чтобы он не был найден
          if (isTechnicalOnly) {
            console.log(`Техническая транзакция без понятного назначения, переопределяем категорию на UNKNOWN: ${tx.description} (было: ${tx.category})`);
            tx.category = 'UNKNOWN'; // Переопределяем категорию независимо от ответа AI
          }
          
          // Проверяем, не определена ли категория (AI вернул "UNKNOWN" или мы переопределили)
          let isCategoryUnknown = isTechnicalOnly || tx.category === 'UNKNOWN' || !tx.category || tx.category === 'null' || tx.category === 'undefined';
          
          // Находим категорию по названию или ID (с учетом английских названий)
          const categoryName = categoryMapping[tx.category] || tx.category;
          let categoryObj = allCategories.find(c => 
            c.name === categoryName || 
            c.id === tx.category || 
            c.name === tx.category
          );
          
          // Если категория не определена или не найдена, помечаем транзакцию для ручного редактирования
          if (isCategoryUnknown || !categoryObj) {
            if (isCategoryUnknown) {
              console.log(`Категория не определена для транзакции: ${tx.description} - ${tx.amount}`);
            } else {
              console.warn(`Категория "${tx.category}" не найдена для транзакции: ${tx.description}`);
            }
            // Не устанавливаем категорию - оставляем пустой или используем специальный маркер
            categoryObj = undefined;
          }

          // Находим подкатегорию, если указана
          let subCategory: string | undefined = undefined;
          if (tx.subCategory && categoryObj?.subCategories) {
            const subCategoryName = subCategoryMapping[tx.subCategory] || tx.subCategory;
            const subCategoryObj = categoryObj.subCategories.find(sc => 
              sc.name === subCategoryName || 
              sc.id === tx.subCategory || 
              sc.name === tx.subCategory
            );
            if (subCategoryObj) {
              subCategory = subCategoryObj.name;
          } else {
              console.warn(`Подкатегория "${tx.subCategory}" не найдена в категории "${tx.category}"`);
            }
          }
          
          // Используем функцию нормализации даты для исправления старых годов
          let dateISO = normalizeDate(tx.date);
          
          // Если есть время из скриншота, добавляем его к дате
          if (tx.time && typeof tx.time === 'string') {
            try {
              // Парсим время в формате HH:MM
              const timeMatch = tx.time.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const date = new Date(dateISO);
                date.setHours(hours, minutes, 0, 0);
                dateISO = date.toISOString();
              }
            } catch (e) {
              console.warn(`Не удалось распарсить время: ${tx.time}`, e);
            }
          }
          
          // Описание уже правильное из паттернов AI
          const finalDescription = tx.description;
          
          // Находим paymentMethodId из паттернов, если не указан
          let paymentMethodId: string | undefined = undefined;
          if (tx.paymentMethodId) {
            paymentMethodId = tx.paymentMethodId;
          } else {
            // Ищем в паттернах для этой категории из существующих транзакций
            const allCategoriesForPatterns = [...expenseCategories, ...incomeCategories];
            const txCategoryName = categoryObj?.name || tx.category;
            const patternTx = existingTransactions.find(rt => {
              const rtCategoryObj = allCategoriesForPatterns.find(c => c.id === rt.category || c.name === rt.category);
              const rtCategoryName = rtCategoryObj?.name || rt.category;
              return rtCategoryName === txCategoryName && rt.amount > 0 && rt.paymentMethodId;
            });
            if (patternTx && patternTx.paymentMethodId) {
              paymentMethodId = patternTx.paymentMethodId;
            }
          }
          
          // Находим имя пользователя
          const userObj = userDetails?.[currentUser?.id || currentUser?.name || currentUser || ''];
          const userName = typeof userObj === 'object' && userObj?.name ? userObj.name : (currentUser?.name || currentUser?.id || currentUser || 'shared');
          
          // Если категория не определена, помечаем транзакцию для ручного редактирования
          const needsCategoryReview = isCategoryUnknown || !categoryObj;
          
          // Находим категорию "Требуется определить" для транзакций с неопределенной категорией
          const needsReviewCategory = allCategories.find(c => c.id === 'needs-review' || c.name === 'Требуется определить');
          const needsReviewSubCategory = needsReviewCategory?.subCategories?.find(sc => sc.id === 'needs-review' || sc.name === 'Требуется определить');
          
          return {
            id: `bulk-${Date.now()}-${index}`,
            description: finalDescription,
            amount: parseFloat(tx.amount) || 0,
            // КРИТИЧЕСКИ ВАЖНО: Если категория не определена (isCategoryUnknown), ВСЕГДА используем "Требуется определить"
            category: needsCategoryReview && needsReviewCategory ? needsReviewCategory.id : (categoryObj?.id || expenseCategories[0]?.id || 'other'),
            subCategory: needsCategoryReview && needsReviewSubCategory ? needsReviewSubCategory.name : (subCategory || undefined),
            date: dateISO,
            user: userName as User,
            type: (tx.type || 'expense') as 'expense' | 'income',
            priority: 'nice-to-have' as const,
            paymentMethodId: paymentMethodId,
            // Специальный флаг для транзакций, требующих ручного редактирования категории
            _needsCategoryReview: needsCategoryReview
          };
        });
        
        // НЕ фильтруем дубликаты внутри пакета - все транзакции попадут в preview
        // Дубликаты будут проверены при submit и пользователь получит предупреждение
        const uniqueTransactions = formattedTransactions;
        
        console.log(`Обработано транзакций: ${response.data.transactions.length}, валидных: ${formattedTransactions.length}, уникальных: ${uniqueTransactions.length}`);
        console.log('Форматированные транзакции из скриншота:', uniqueTransactions);
        
        // Добавляем новые транзакции к существующим, а не заменяем их
        // НЕ пропускаем дубликаты здесь - они будут проверены при submit и пользователь получит предупреждение
        setPreview(prev => {
          const combined = [...prev, ...uniqueTransactions];
          // Просто объединяем, дубликаты будут проверены при submit
          return combined;
        });
        
        // Обновляем выбранные транзакции, добавляя новые
        setSelectedTransactions(prev => {
          const newSet = new Set(prev);
          uniqueTransactions.forEach(tx => newSet.add(tx.id));
          return newSet;
        });
      } else {
        // Если ответ от сервера не содержит транзакций или структура неверна
        const errorText = `Не удалось обработать изображение "${file.name}". Сервер вернул неожиданный ответ. Попробуйте другое изображение.`;
        setError(errorText);
        console.error(`Ошибка: неверная структура ответа от сервера для "${file.name}"`, response?.data);
        // Показываем ошибку 5 секунд
        setTimeout(() => {
          setError(prev => {
            if (prev === errorText) return '';
            return prev;
          });
        }, 5000);
        return;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Не удалось обработать скриншот';
      console.error('❌ Ошибка обработки скриншота:', errorMessage, err);
      console.error('❌ Детали ошибки:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      // Показываем более подробное сообщение об ошибке
      let errorText = `Ошибка при обработке "${file.name}": ${errorMessage}`;
      
      // Добавляем более понятное сообщение для типичных ошибок
      if (errorMessage.includes('Ошибка при анализе изображения')) {
        errorText = `Не удалось распознать транзакции на изображении "${file.name}". Возможные причины:\n- Изображение нечеткое или повреждено\n- На изображении нет финансовых операций\n- Проблема с AI сервисом. Попробуйте другое изображение.`;
      } else if (errorMessage.includes('429') || errorMessage.includes('Quota')) {
        errorText = `Превышена квота API для "${file.name}". Система попытается использовать другой AI сервис. Попробуйте позже или используйте другое изображение.`;
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorText = `AI модель не найдена для "${file.name}". Система попытается использовать другую модель. Попробуйте позже.`;
      }
      
      setError(errorText);
      
      // Через 7 секунд убираем ошибку, чтобы не мешала
      setTimeout(() => {
        setError(prev => {
          // Убираем только эту конкретную ошибку
          if (prev === errorText) return '';
          return prev;
        });
      }, 7000);
      
      // НЕ выбрасываем ошибку дальше, чтобы цикл обработки файлов продолжался
    } finally {
      // Не сбрасываем isLoading здесь, так как он управляется на уровне цикла обработки файлов
      // setIsLoading(false);
    }
  };

  const handleAudioUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setError('');

      // Собираем все подкатегории из категорий
      const allSubCategories: Array<{categoryId: string, name: string}> = [];
      [...expenseCategories, ...incomeCategories].forEach(cat => {
        if (cat.subCategories) {
          cat.subCategories.forEach(sub => {
            allSubCategories.push({ categoryId: cat.id, name: sub.name });
          });
        }
      });

      // Берем последние 50 транзакций для анализа паттернов
      // Конвертируем ID категорий в названия для передачи в AI
      const allCategoriesForPatterns = [...expenseCategories, ...incomeCategories];
      const recentTransactions = existingTransactions
        .filter(tx => tx.user === currentUser || tx.user === 'shared')
        .slice(0, 50)
        .map(tx => {
          // Находим название категории по ID
          const categoryObj = allCategoriesForPatterns.find(c => c.id === tx.category || c.name === tx.category);
          const categoryName = categoryObj?.name || tx.category;
          
          return {
            description: tx.description,
            category: categoryName, // Передаем название, а не ID
            subCategory: tx.subCategory,
            user: tx.user,
            amount: tx.amount
          };
        });

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('categories', JSON.stringify([
        ...expenseCategories.map(c => c.name),
        ...incomeCategories.map(c => c.name)
      ]));
      formData.append('subCategories', JSON.stringify(allSubCategories));
      formData.append('recentTransactions', JSON.stringify(recentTransactions));
      formData.append('currentUserId', currentUser?.id || currentUser?.name || 'shared');

      let response;
      try {
        response = await api.post('/ai/parse-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      } catch (apiError: any) {
        // Если ошибка API, выбрасываем её для обработки в catch блоке
        throw apiError;
      }

      // Проверяем, что ответ от сервера содержит массив транзакций (даже если он пустой)
      if (response && response.data && Array.isArray(response.data.transactions)) {
        console.log(`📊 Получено транзакций от AI (аудио): ${response.data.transactions.length}`);
        
        // Если массив пустой, показываем сообщение и выходим
        if (response.data.transactions.length === 0) {
          const errorText = `В аудио "${file.name}" не найдено транзакций. Убедитесь, что в записи упоминаются финансовые операции.`;
          setError(errorText);
          console.warn(`⚠️ Пустой массив транзакций для аудио "${file.name}"`);
          // Показываем ошибку 5 секунд
          setTimeout(() => {
            setError(prev => {
              if (prev === errorText) return '';
              return prev;
            });
          }, 5000);
          return;
        }
        
        // Форматируем транзакции: конвертируем категории из названий в ID и добавляем недостающие поля
        const allCategories = [...expenseCategories, ...incomeCategories];
        
        // Фильтруем транзакции: убираем нулевые суммы и бонусы
        const validTransactions = response.data.transactions.filter((tx: any) => {
          const amount = parseFloat(tx.amount) || 0;
          const description = (tx.description || '').toLowerCase();
          
          // Исключаем нулевые суммы
          if (amount <= 0) {
            console.log(`Пропускаем транзакцию с нулевой суммой: ${tx.description}`);
            return false;
          }
          
          // Исключаем бонусы, кешбек, начисления
          const bonusKeywords = ['бонус', 'кешбек', 'начисление', 'cashback', 'bonus', 'балл', 'начислено'];
          if (bonusKeywords.some(keyword => description.includes(keyword))) {
            console.log(`Пропускаем бонусную транзакцию: ${tx.description}`);
            return false;
          }
          
          return true;
        });
        
        const formattedTransactions = validTransactions.map((tx: any, index: number) => {
          // Маппинг английских названий на русские
          const categoryMapping: { [key: string]: string } = {
            'transport': 'Транспорт',
            'food': 'Еда',
            'home': 'Дом',
            'entertainment': 'Досуг и развлечения',
            'health': 'Здоровье и красота',
            'taxi': 'Такси',
            'public_transport': 'Общественный транспорт'
          };
          
          const subCategoryMapping: { [key: string]: string } = {
            'taxi': 'Такси',
            'public_transport': 'Общественный транспорт'
          };
          
          // КРИТИЧЕСКАЯ ПРОВЕРКА: Если описание содержит только банковские термины без понятного назначения,
          // ВСЕГДА помечаем как неопределенную, независимо от того, что вернул AI
          const description = (tx.description || '').toLowerCase();
          const hasBankTerms = description.includes('uzumbank') || 
                               description.includes('uzcard') || 
                               description.includes('visa') ||
                               description.includes('visausum') ||
                               description.includes(' to ') ||
                               description.includes('перевод') ||
                               description.includes('transfer') ||
                               description.includes('card') ||
                               description.includes('bank');
          
          // Проверяем, есть ли в описании понятные слова о назначении платежа
          const hasClearPurpose = description.match(/(продукт|еда|такси|транспорт|кафе|ресторан|доставка|покупка|магазин|аптека|врач|спорт|развлечение|кино|мероприятие|дом|коммунал|интернет|аренда|ремонт|одежда|обувь|подарок|обучение|питомец|кредит|долг|зарплата|доход|бонус)/i);
          
          // Если описание содержит только банковские термины без понятного назначения - это неопределенная транзакция
          const isTechnicalOnly = hasBankTerms && !hasClearPurpose;
          
          // Если это техническая транзакция без понятного назначения - ВСЕГДА переопределяем категорию на UNKNOWN
          // ДО того как будем искать categoryObj, чтобы он не был найден
          if (isTechnicalOnly) {
            console.log(`Техническая транзакция без понятного назначения, переопределяем категорию на UNKNOWN: ${tx.description} (было: ${tx.category})`);
            tx.category = 'UNKNOWN'; // Переопределяем категорию независимо от ответа AI
          }
          
          // Проверяем, не определена ли категория (AI вернул "UNKNOWN" или мы переопределили)
          let isCategoryUnknown = isTechnicalOnly || tx.category === 'UNKNOWN' || !tx.category || tx.category === 'null' || tx.category === 'undefined';
          
          // Находим категорию по названию или ID (с учетом английских названий)
          const categoryName = categoryMapping[tx.category] || tx.category;
          let categoryObj = allCategories.find(c => 
            c.name === categoryName || 
            c.id === tx.category || 
            c.name === tx.category
          );
          
          // Если категория не определена или не найдена, помечаем транзакцию для ручного редактирования
          if (isCategoryUnknown || !categoryObj) {
            if (isCategoryUnknown) {
              console.log(`Категория не определена для транзакции: ${tx.description} - ${tx.amount}`);
            } else {
              console.warn(`Категория "${tx.category}" не найдена для транзакции: ${tx.description}`);
            }
            // Не устанавливаем категорию - оставляем пустой или используем специальный маркер
            categoryObj = undefined;
          }

          // Находим подкатегорию, если указана
          let subCategory: string | undefined = undefined;
          if (tx.subCategory && categoryObj?.subCategories) {
            const subCategoryName = subCategoryMapping[tx.subCategory] || tx.subCategory;
            const subCategoryObj = categoryObj.subCategories.find(sc => 
              sc.name === subCategoryName || 
              sc.id === tx.subCategory || 
              sc.name === tx.subCategory
            );
            if (subCategoryObj) {
              subCategory = subCategoryObj.name;
          } else {
              console.warn(`Подкатегория "${tx.subCategory}" не найдена в категории "${tx.category}"`);
            }
          }
          
          // Используем функцию нормализации даты для исправления старых годов
          let dateISO = normalizeDate(tx.date);
          
          // Если есть время из аудио, добавляем его к дате
          if (tx.time && typeof tx.time === 'string') {
            try {
              // Парсим время в формате HH:MM
              const timeMatch = tx.time.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const date = new Date(dateISO);
                date.setHours(hours, minutes, 0, 0);
                dateISO = date.toISOString();
              }
            } catch (e) {
              console.warn(`Не удалось распарсить время: ${tx.time}`, e);
            }
          }
          
          // Описание уже должно быть правильным из паттернов
          const finalDescription = tx.description;
          
          // Если категория не определена, помечаем транзакцию для ручного редактирования
          const needsCategoryReview = isCategoryUnknown || !categoryObj;
          
          // Находим категорию "Требуется определить" для транзакций с неопределенной категорией
          const needsReviewCategory = allCategories.find(c => c.id === 'needs-review' || c.name === 'Требуется определить');
          const needsReviewSubCategory = needsReviewCategory?.subCategories?.find(sc => sc.id === 'needs-review' || sc.name === 'Требуется определить');
          
          // Находим имя пользователя
          const userObj = userDetails?.[currentUser?.id || currentUser?.name || currentUser || ''];
          const userName = typeof userObj === 'object' && userObj?.name ? userObj.name : (currentUser?.name || currentUser?.id || currentUser || 'shared');
          
          return {
            id: `bulk-${Date.now()}-${index}`,
            description: finalDescription,
            amount: parseFloat(tx.amount) || 0,
            // Если категория не определена, используем категорию "Требуется определить"
            category: categoryObj?.id || (needsCategoryReview && needsReviewCategory ? needsReviewCategory.id : expenseCategories[0]?.id || 'other'),
            subCategory: needsCategoryReview && needsReviewSubCategory ? needsReviewSubCategory.name : (subCategory || undefined),
            date: dateISO,
            user: userName as User,
            type: (tx.type || 'expense') as 'expense' | 'income',
            priority: 'nice-to-have' as const,
            // Специальный флаг для транзакций, требующих ручного редактирования категории
            _needsCategoryReview: needsCategoryReview
          };
        });
        
        // НЕ фильтруем дубликаты внутри пакета - все транзакции попадут в preview
        // Дубликаты будут проверены при submit и пользователь получит предупреждение
        const uniqueTransactions = formattedTransactions;
        
        console.log(`Обработано транзакций: ${response.data.transactions.length}, валидных: ${formattedTransactions.length}, уникальных: ${uniqueTransactions.length}`);
        console.log('Форматированные транзакции из аудио:', uniqueTransactions);
        
        // Добавляем новые транзакции к существующим, а не заменяем их
        // НЕ пропускаем дубликаты здесь - они будут проверены при submit и пользователь получит предупреждение
        setPreview(prev => {
          const combined = [...prev, ...uniqueTransactions];
          // Просто объединяем, дубликаты будут проверены при submit и пользователь получит предупреждение
          return combined;
        });
        
        // Обновляем выбранные транзакции, добавляя новые
        setSelectedTransactions(prev => {
          const newSet = new Set(prev);
          uniqueTransactions.forEach(tx => newSet.add(tx.id));
          return newSet;
        });
      } else {
        // Если транзакций не найдено, просто пропускаем файл без ошибки
        console.warn(`Не найдено транзакций в аудио "${file.name}"`);
        return; // Выходим без ошибки, чтобы продолжить обработку остальных файлов
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Не удалось обработать аудио';
      console.error('Ошибка обработки аудио:', errorMessage, err);
      
      // Не очищаем preview при ошибке, только показываем предупреждение
      const errorText = `Ошибка при обработке "${file.name}": ${errorMessage}. Продолжаем обработку остальных файлов...`;
      setError(errorText);
      
      // Через 3 секунды убираем ошибку, чтобы не мешала
      setTimeout(() => {
        setError(prev => {
          // Убираем только эту конкретную ошибку
          if (prev === errorText) return '';
          return prev;
        });
      }, 3000);
      
      // НЕ выбрасываем ошибку дальше, чтобы цикл обработки файлов продолжался
    } finally {
      // Не сбрасываем isLoading здесь, так как он управляется на уровне цикла обработки файлов
      // setIsLoading(false);
    }
  };

  const handlePreview = () => {
    try {
      setError('');
      let parsed: Transaction[] = [];

      if (importMethod === 'text') {
        parsed = parseTextInput(textInput);
      }

      setPreview(parsed);
      // По умолчанию все транзакции выбраны
      setSelectedTransactions(new Set(parsed.map(tx => tx.id)));
    } catch (err: any) {
      setError(err.message);
      setPreview([]);
    }
  };

  // Функция проверки на дубликаты (с существующими и внутри пакета)
  const checkForDuplicates = (newTransactions: Transaction[]): DuplicateCheck[] => {
    const duplicatesFound: DuplicateCheck[] = [];

    // Вспомогательная функция для получения даты без времени (только день)
    const getDateOnly = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Проверяем дубликаты с существующими транзакциями
    newTransactions.forEach((newTx, newIndex) => {
      existingTransactions.forEach(existingTx => {
        // Проверяем точное совпадение суммы (округляем до целого)
        const newAmount = Math.round(newTx.amount);
        const existingAmount = Math.round(existingTx.amount);
        const sameAmount = newAmount === existingAmount;
        
        // Проверяем совпадение даты (только день, без времени)
        const newDate = new Date(newTx.date);
        const existingDate = new Date(existingTx.date);
        const sameDateOnly = getDateOnly(newDate) === getDateOnly(existingDate);
        
        // Проверяем совпадение категории (опционально, для более точного определения)
        const sameCategory = newTx.category === existingTx.category;
        
        // ПОДОЗРИТЕЛЬНЫЙ ДУБЛИКАТ: если сумма и дата (только день) совпадают - это подозрительно
        // Даже если категория, время или описание отличаются, это может быть дубликат
        if (sameAmount && sameDateOnly) {
          console.log(`🚫 Найден подозрительный дубликат с существующей: "${newTx.description}" (${newAmount}) vs "${existingTx.description}" (${existingAmount}), дата: ${getDateOnly(newDate)}`);
          // Вычисляем степень схожести описания
          const descSimilarity = calculateSimilarity(
            newTx.description.toLowerCase(),
            existingTx.description.toLowerCase()
          );
          
          // Проверяем совпадение категории (опционально, для более точного определения)
          const sameCategory = newTx.category === existingTx.category;
          
          // Вычисляем схожесть: сумма (40%) + дата (40%) + категория (10%) + описание (10%)
          const similarity = (sameAmount ? 40 : 0) + 
                            (sameDateOnly ? 40 : 0) + 
                            (sameCategory ? 10 : 0) + 
                            (descSimilarity * 0.1);
          
          duplicatesFound.push({
            newTransaction: newTx,
            existingTransaction: existingTx,
            similarity: Math.min(100, similarity)
          });
        }
      });

      // Проверяем дубликаты внутри самого пакета (с другими новыми транзакциями)
      // ВНУТРИ ПАКЕТА: используем точное время для более строгой проверки
      newTransactions.slice(newIndex + 1).forEach(otherNewTx => {
        // Проверяем точное совпадение суммы (округляем до целого)
        const newAmount = Math.round(newTx.amount);
        const otherAmount = Math.round(otherNewTx.amount);
        const sameAmount = newAmount === otherAmount;
        
        // Проверяем совпадение даты (только день, без времени)
        const newDate = new Date(newTx.date);
        const otherDate = new Date(otherNewTx.date);
        const sameDateOnly = getDateOnly(newDate) === getDateOnly(otherDate);
        
        // ВНУТРИ ПАКЕТА: проверяем точное совпадение времени (часы и минуты)
        const newTime = newDate.getHours() * 60 + newDate.getMinutes(); // Время в минутах от начала дня
        const otherTime = otherDate.getHours() * 60 + otherDate.getMinutes();
        const sameTime = newTime === otherTime; // Точное совпадение времени
        
        // Проверяем совпадение категории (опционально)
        const sameCategory = newTx.category === otherNewTx.category;
        
        // ДУБЛИКАТ ВНУТРИ ПАКЕТА: если сумма, дата И точное время совпадают - это дубликат
        if (sameAmount && sameDateOnly && sameTime) {
          console.log(`🚫 Найден дубликат внутри пакета (сумма, дата и время совпадают): "${newTx.description}" (${newAmount}) vs "${otherNewTx.description}" (${otherAmount}), дата: ${getDateOnly(newDate)}, время: ${String(Math.floor(newTime / 60)).padStart(2, '0')}:${String(newTime % 60).padStart(2, '0')}`);
          
          const descSimilarity = calculateSimilarity(
            newTx.description.toLowerCase(),
            otherNewTx.description.toLowerCase()
          );
          
          // Вычисляем схожесть: сумма (30%) + дата (30%) + время (30%) + категория (5%) + описание (5%)
          const similarity = (sameAmount ? 30 : 0) + 
                            (sameDateOnly ? 30 : 0) + 
                            (sameTime ? 30 : 0) +
                            (sameCategory ? 5 : 0) + 
                            (descSimilarity * 0.05);
          
          // Для дубликатов внутри пакета используем первую транзакцию как "существующую"
          duplicatesFound.push({
            newTransaction: otherNewTx,
            existingTransaction: newTx,
            similarity: Math.min(100, similarity)
          });
        }
      });
    });

    return duplicatesFound;
  };

  // Простая функция для вычисления схожести строк (Jaccard similarity)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError('');

      let transactionsToAdd: Transaction[] = [];

      if (importMethod === 'text') {
        const parsed = parseTextInput(textInput);
        transactionsToAdd = parsed.filter(tx => selectedTransactions.has(tx.id));
      } else if (importMethod === 'file' && file) {
        if (file.name.endsWith('.json')) {
          const parsed = await parseJSONFile(file);
          transactionsToAdd = parsed.filter(tx => selectedTransactions.has(tx.id));
        } else {
          throw new Error('Неподдерживаемый формат файла. Используйте JSON');
        }
      } else if (importMethod === 'screenshot' && preview.length > 0) {
        transactionsToAdd = preview.filter(tx => selectedTransactions.has(tx.id));
      } else if (importMethod === 'audio' && preview.length > 0) {
        transactionsToAdd = preview.filter(tx => selectedTransactions.has(tx.id));
      }
      
      if (transactionsToAdd.length === 0) {
        setError('Выберите хотя бы одну транзакцию для добавления');
        setIsLoading(false);
        return;
      }

      if (transactionsToAdd.length === 0) {
        throw new Error('Нет транзакций для импорта');
      }

      // Проверяем на дубликаты
      console.log('🔍 Проверка дубликатов для', transactionsToAdd.length, 'транзакций');
      console.log('🔍 Существующих транзакций в базе:', existingTransactions.length);
      const duplicatesFound = checkForDuplicates(transactionsToAdd);
      console.log('🔍 Найдено дубликатов:', duplicatesFound.length);
      
      if (duplicatesFound.length > 0) {
        console.log('⚠️ Обнаружены дубликаты, показываем предупреждение пользователю');
        // Показываем предупреждение о дубликатах
        setDuplicates(duplicatesFound);
        setPendingTransactions(transactionsToAdd);
        setShowDuplicateWarning(true);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Дубликатов не найдено, импортируем транзакции');

      // Если дубликатов нет, импортируем сразу
      await importTransactions(transactionsToAdd);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Не удалось импортировать транзакции');
      setIsLoading(false);
    }
  };

  const importTransactions = async (transactionsToAdd: Transaction[]) => {
    try {
      setIsLoading(true);
      console.log('Отправка транзакций на сервер:', transactionsToAdd.length, 'транзакций');
      console.log('Пример транзакции:', transactionsToAdd[0]);
      
      const response = await api.post('/family/transactions/bulk', {
        transactions: transactionsToAdd
      });

      console.log('Ответ сервера:', response.data);

      if (response.data.success) {
        console.log('Транзакции успешно добавлены, обновляю данные...');
        // Сохраняем timestamp последнего импорта для возможности отката
        if (response.data.importTimestamp) {
          const timestamp = response.data.importTimestamp;
          console.log('[Import] Сохранение timestamp последнего импорта:', timestamp);
          setLastImportTimestamp(timestamp);
          // Сохраняем в localStorage для сохранения после закрытия модального окна
          try {
            localStorage.setItem('lastBulkImportTimestamp', timestamp.toString());
            console.log('[Import] Timestamp сохранен в localStorage');
          } catch (e) {
            console.error('Не удалось сохранить timestamp в localStorage:', e);
          }
        } else {
          console.warn('[Import] Сервер не вернул importTimestamp!');
        }
        // НЕ удаляем timestamp при закрытии - он должен остаться для возможности отката
        // Timestamp удаляется только при успешном откате
        
        // Небольшая задержка перед обновлением данных, чтобы убедиться, что данные сохранены в БД
        console.log('[Import] Ждем 500ms перед обновлением данных...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[Import] Вызываем onSuccess для обновления данных');
        onSuccess();
        onClose();
        setTextInput('');
        setFile(null);
        setPreview([]);
        setDuplicates([]);
        setShowDuplicateWarning(false);
        setPendingTransactions([]);
        // lastImportTimestamp остается в state и localStorage для следующего открытия модального окна
      }
    } catch (err: any) {
      console.error('Ошибка при импорте транзакций:', err);
      console.error('Детали ошибки:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Не удалось импортировать транзакции');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateConfirm = async (skipDuplicates: boolean) => {
    if (skipDuplicates) {
      // Исключаем дубликаты из списка
      const duplicateNewIds = new Set(duplicates.map(d => d.newTransaction.id));
      const transactionsToAdd = pendingTransactions.filter(tx => !duplicateNewIds.has(tx.id));
      
      if (transactionsToAdd.length > 0) {
        await importTransactions(transactionsToAdd);
      } else {
        setError('Все транзакции являются дубликатами');
        setShowDuplicateWarning(false);
        setIsLoading(false);
      }
    } else {
      // Добавляем все, включая дубликаты
      await importTransactions(pendingTransactions);
    }
  };

  const handleRollbackLastImport = async () => {
    if (!lastImportTimestamp) {
      alert('Нет информации о последнем импорте для отката');
      return;
    }

    console.log('[Rollback] Откат импорта с timestamp:', lastImportTimestamp);

    if (!confirm(`Вы уверены, что хотите откатить последний импорт? Все транзакции из этого импорта будут удалены.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      console.log('[Rollback] Отправка запроса на откат:', `/family/transactions/bulk/${lastImportTimestamp}`);
      const response = await api.delete(`/family/transactions/bulk/${lastImportTimestamp}`);

      console.log('[Rollback] Ответ сервера:', response.data);

      if (response.data.success) {
        const removedCount = response.data.removed || 0;
        alert(`Успешно удалено ${removedCount} транзакций из последнего импорта`);
        setLastImportTimestamp(null);
        // Удаляем из localStorage
        try {
          localStorage.removeItem('lastBulkImportTimestamp');
          console.log('[Rollback] Timestamp удален из localStorage');
        } catch (e) {
          console.error('Не удалось удалить timestamp из localStorage:', e);
        }
        onSuccess(); // Обновляем данные
      }
    } catch (err: any) {
      console.error('[Rollback] Ошибка при откате:', err);
      console.error('[Rollback] Детали ошибки:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Не удалось откатить импорт');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Массовый импорт</h2>
          {(() => {
            // Всегда проверяем localStorage напрямую, чтобы кнопка показывалась даже если state не обновился
            const storedTimestamp = getLastImportTimestamp();
            const displayTimestamp = lastImportTimestamp || storedTimestamp;
            
            if (displayTimestamp) {
              const importDate = new Date(displayTimestamp);
              const now = new Date();
              const daysDiff = Math.floor((now.getTime() - importDate.getTime()) / (1000 * 60 * 60 * 24));
              const timeAgo = daysDiff === 0 ? 'сегодня' : daysDiff === 1 ? 'вчера' : `${daysDiff} дн. назад`;
              
              return (
            <button
              onClick={handleRollbackLastImport}
                  disabled={isLoading}
                  className="p-1.5 text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Откатить последний импорт (${timeAgo})`}
            >
                  <i className="fas fa-undo text-sm"></i>
            </button>
              );
            }
            return null;
          })()}
        </div>

        {/* Выбор метода импорта - упрощенный */}
        {preview.length === 0 && (
          <div className="mb-3">
            <div className="flex gap-2 justify-center">
            <button
              onClick={() => setImportMethod('screenshot')}
                className={`px-2.5 py-2.5 rounded flex items-center justify-center ${importMethod === 'screenshot' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Скриншот"
            >
              <i className="fas fa-camera"></i>
            </button>
            <button
              onClick={() => setImportMethod('audio')}
                className={`px-2.5 py-2.5 rounded flex items-center justify-center ${importMethod === 'audio' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Аудио"
            >
              <i className="fas fa-microphone"></i>
            </button>
            <button
              onClick={() => setImportMethod('text')}
                className={`px-2.5 py-2.5 rounded flex items-center justify-center ${importMethod === 'text' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Текст"
            >
              <i className="fas fa-keyboard"></i>
            </button>
            <button
              onClick={() => setImportMethod('file')}
                className={`px-2.5 py-2.5 rounded flex items-center justify-center ${importMethod === 'file' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Файл"
            >
                <i className="fas fa-paperclip"></i>
            </button>
          </div>
        </div>
        )}

        {/* Скриншот */}
        {importMethod === 'screenshot' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Загрузите скриншот(ы)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  setIsLoading(true);
                  setError('');
                  
                  // Обрабатываем все файлы последовательно, накапливая транзакции
                  for (let i = 0; i < files.length; i++) {
                    try {
                      await handleScreenshotUpload(files[i], i, files.length);
                      // Небольшая задержка между обработкой файлов
                      if (i < files.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                    } catch (err) {
                      console.error(`Ошибка при обработке файла ${i + 1}/${files.length}:`, err);
                      // Продолжаем обработку остальных файлов
                    }
                  }
                  
                  // Очищаем прогресс и состояние загрузки после обработки всех файлов
                  setProcessingProgress(null);
                  setIsLoading(false);
                  
                  // Очищаем input, чтобы можно было загрузить те же файлы снова
                  if (e.target) e.target.value = '';
                }
              }}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="mt-2 text-center">
                {processingProgress ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                      <p className="text-sm text-gray-500">
                        Обработка {processingProgress.current} из {processingProgress.total}...
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-full">
                      {processingProgress.fileName}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                    <p className="text-sm text-gray-500">Обработка изображения...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Аудио */}
        {importMethod === 'audio' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Запишите или загрузите аудио
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const recorder = new MediaRecorder(stream);
                    const chunks: Blob[] = [];
                    
                    recorder.ondataavailable = (e) => {
                      if (e.data.size > 0) chunks.push(e.data);
                    };
                    
                    recorder.onstop = async () => {
                      const blob = new Blob(chunks, { type: 'audio/webm' });
                      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
                      try {
                        await handleAudioUpload(file);
                      } catch (err) {
                        console.error('Ошибка обработки записи:', err);
                        setError('Не удалось обработать запись. Попробуйте еще раз.');
                      }
                      stream.getTracks().forEach(track => track.stop());
                    };
                    
                    recorder.start();
                    setMediaRecorder(recorder);
                    setIsRecording(true);
                  } catch (err) {
                    console.error('Ошибка записи:', err);
                    setError('Не удалось начать запись. Проверьте разрешения микрофона.');
                  }
                }}
                disabled={isRecording || isLoading}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <i className={`fas fa-microphone ${isRecording ? 'animate-pulse' : ''}`}></i>
                <span>{isRecording ? 'Идет запись...' : 'Начать запись'}</span>
              </button>
              {isRecording && (
                <button
                  onClick={() => {
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                      mediaRecorder.stop();
                      setIsRecording(false);
                      setMediaRecorder(null);
                    }
                  }}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  <i className="fas fa-stop"></i>
                </button>
              )}
            </div>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  setIsLoading(true);
                  setError('');
                  
                  // Обрабатываем все файлы последовательно, накапливая транзакции
                  for (let i = 0; i < files.length; i++) {
                    try {
                      await handleAudioUpload(files[i], i, files.length);
                      if (i < files.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                    } catch (err) {
                      console.error(`Ошибка при обработке файла ${i + 1}/${files.length}:`, err);
                      // Продолжаем обработку остальных файлов
                    }
                  }
                  
                  // Очищаем прогресс и состояние загрузки после обработки всех файлов
                  setProcessingProgress(null);
                  setIsLoading(false);
                  
                  // Очищаем input, чтобы можно было загрузить те же файлы снова
                  if (e.target) e.target.value = '';
                }
              }}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
              disabled={isLoading || isRecording}
            />
            {isLoading && (
              <div className="mt-2 text-center">
                {processingProgress ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                      <p className="text-sm text-gray-500">
                        Обработка {processingProgress.current} из {processingProgress.total}...
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-full">
                      {processingProgress.fileName}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                    <p className="text-sm text-gray-500">Обработка аудио...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Текст */}
        {preview.length === 0 && importMethod === 'text' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Вставьте транзакции (по одной на строку)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Формат: описание | сумма | категория | дата (ГГГГ-ММ-ДД) | тип
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full h-40 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              placeholder="Кофе | 5.50 | Еда | 2024-11-20 | expense&#10;Зарплата | 2000 | Зарплата | 2024-11-15 | income"
            />
            <button
              onClick={handlePreview}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Предпросмотр
            </button>
          </div>
        )}

        {/* Файл */}
        {preview.length === 0 && importMethod === 'file' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Загрузите JSON файл(ы)</label>
            <input
              type="file"
              accept=".json"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  try {
                    setIsLoading(true);
                    setError('');
                    let allParsed: Transaction[] = [];
                    for (let i = 0; i < files.length; i++) {
                      const parsed = await parseJSONFile(files[i]);
                      allParsed = [...allParsed, ...parsed];
                    }
                    setPreview(allParsed);
                    // По умолчанию все транзакции выбраны
                    setSelectedTransactions(new Set(allParsed.map(tx => tx.id)));
                    setFile(files[0]);
                  } catch (err: any) {
                    setError(err.message || 'Не удалось обработать файл');
                    setPreview([]);
                    setSelectedTransactions(new Set());
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
              disabled={isLoading}
            />
            {isLoading && <p className="text-sm text-gray-500 mt-2 text-center">Обработка файла...</p>}
          </div>
        )}

        {/* Предпросмотр транзакций в виде карточек как в мониторинге */}
        {preview.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-sm">Готово к добавлению ({selectedTransactions.size} из {preview.length})</h3>
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
              {preview.map((tx, i) => {
                const allCategories = [...expenseCategories, ...incomeCategories];
                const categoryInfo = allCategories.find(c => c.id === tx.category || c.name === tx.category);
                const subCategoryInfo = categoryInfo?.subCategories?.find(sc => sc.name === tx.subCategory);
                const icon = subCategoryInfo?.icon || categoryInfo?.icon || 'fas fa-question-circle';
                const isExpense = tx.type === 'expense';
                const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
                const amountPrefix = isExpense ? '-' : '+';
                
                const isSelected = selectedTransactions.has(tx.id);
                
                return (
                  <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelected = new Set(selectedTransactions);
                          if (e.target.checked) {
                            newSelected.add(tx.id);
                          } else {
                            newSelected.delete(tx.id);
                          }
                          setSelectedTransactions(newSelected);
                        }}
                        className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
                      />
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-sm flex-shrink-0">
                        <i className={`${icon} text-gray-500 dark:text-gray-400 text-xs`}></i>
                </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-medium text-xs text-gray-800 dark:text-gray-100 truncate">{tx.description}</p>
                        <div className="mt-1">
                          <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                            {tx.subCategory || categoryInfo?.name || tx.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-mono ${amountColor} text-xs font-semibold whitespace-nowrap`}>
                          {amountPrefix}{Math.round(tx.amount).toLocaleString('ru-RU')}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(tx.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || preview.length === 0}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
          >
            {isLoading ? 'Импорт...' : `Импортировать ${selectedTransactions.size} из ${preview.length} транзакций`}
          </button>
        </div>
        </div>
      </div>

      {/* Модальное окно предупреждения о дубликатах */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-yellow-600 dark:text-yellow-400">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Обнаружены возможные дубликаты
            </h3>
            
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Найдено {duplicates.length} подозрительных дубликатов. 
              Система обнаружила транзакции с <strong>одинаковой суммой в тот же день</strong>. Это могут быть дубликаты, которые уже существуют в системе, или повторяющиеся транзакции внутри импортируемого пакета.
              Проверьте список ниже и решите, что делать. <strong>Рекомендуется пропустить дубликаты</strong>, чтобы не искажать статистику.
            </p>

            <div className="mb-4 max-h-60 overflow-y-auto border rounded p-3 dark:border-gray-600">
              {duplicates.map((dup, index) => {
                // Проверяем, является ли это дубликатом внутри пакета или с существующими
                const isInternalDuplicate = !existingTransactions.some(tx => tx.id === dup.existingTransaction.id);
                
                return (
                  <div key={index} className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {isInternalDuplicate ? 'Дубликат в пакете:' : 'Новая транзакция:'}
                        </p>
                        <p className="text-sm">{dup.newTransaction.description}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {dup.newTransaction.amount} | {new Date(dup.newTransaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-1 ml-4">
                        <p className="font-semibold text-sm">
                          {isInternalDuplicate ? 'Повторяется с:' : 'Существующая транзакция:'}
                        </p>
                        <p className="text-sm">{dup.existingTransaction.description}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {dup.existingTransaction.amount} | {new Date(dup.existingTransaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                      Схожесть: {Math.round(dup.similarity)}% (категория, сумма и дата совпадают)
                      {isInternalDuplicate && <span className="ml-2 text-blue-600 dark:text-blue-400">(внутри пакета)</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setDuplicates([]);
                  setPendingTransactions([]);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDuplicateConfirm(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Пропустить дубликаты ({duplicates.length})
              </button>
              <button
                onClick={() => handleDuplicateConfirm(false)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Добавить все
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkImportModal;

