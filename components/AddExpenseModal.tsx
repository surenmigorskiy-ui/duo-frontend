import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Transaction, User, Priority, Category, ParsedReceipt, SubCategory, PaymentMethod, UserDetails, Language } from '../types';
import { parseReceipt, getAutofillSuggestions } from '../services/geminiService';
import { getCurrencyRate } from '../services/currencyService';
import { CURRENCIES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import Spinner from './common/Spinner';
import FormattedNumberInput from './common/FormattedNumberInput';

// Helper to format ISO string for datetime-local input
const formatISOForInput = (isoString: string) => {
  const date = new Date(isoString);
  // Adjust for timezone offset
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
};

// Курс валют будет загружаться динамически

const CurrencySwitcher: React.FC<{ currency: string; onChange: (c: string) => void; activeCurrencies: { [key: string]: boolean } }> = ({ currency, onChange, activeCurrencies }) => {
    // Основные валюты всегда доступны
    const basicCurrencies = ['SUM', 'USD'];
    // Дополнительные валюты из настроек
    const additionalCurrencies = Object.keys(activeCurrencies).filter(code => activeCurrencies[code] && !basicCurrencies.includes(code));
    const availableCurrencies = [...basicCurrencies, ...additionalCurrencies];
    const currenciesToShow = CURRENCIES.filter(c => availableCurrencies.includes(c.code));
    const selectedCurrency = currenciesToShow.find(c => c.code === currency) || currenciesToShow[0];
    
    // Если только 2 валюты (SUM и USD), показываем переключатель
    if (currenciesToShow.length === 2) {
        return (
            <div className="relative flex w-24 h-9 bg-gray-200 dark:bg-gray-700 rounded-full p-1 overflow-hidden">
                <div className={`absolute top-1 left-1 w-[calc(50%-2px)] h-7 bg-white dark:bg-gray-900 rounded-full shadow transition-transform duration-300 ease-in-out ${currency === currenciesToShow[1].code ? 'translate-x-[calc(100%+2px)]' : ''}`}></div>
                <button type="button" onClick={() => onChange(currenciesToShow[0].code)} className="relative z-10 w-1/2 text-xs font-semibold focus:outline-none flex items-center justify-center">{currency === currenciesToShow[0].code ? currenciesToShow[0].code : <span className="text-gray-400 dark:text-gray-500">{currenciesToShow[0].code}</span>}</button>
                <button type="button" onClick={() => onChange(currenciesToShow[1].code)} className="relative z-10 w-1/2 text-xs font-semibold focus:outline-none flex items-center justify-center">{currency === currenciesToShow[1].code ? currenciesToShow[1].code : <span className="text-gray-400 dark:text-gray-500">{currenciesToShow[1].code}</span>}</button>
            </div>
        );
    }
    
    // Если больше валют, показываем выпадающий список
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-between w-24 h-9 bg-gray-200 dark:bg-gray-700 rounded-full px-3 text-xs font-semibold focus:outline-none hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                <span>{selectedCurrency.code}</span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs ml-1`}></i>
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-10 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto w-48">
                        {currenciesToShow.map((curr) => (
                            <button
                                key={curr.code}
                                type="button"
                                onClick={() => {
                                    onChange(curr.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                                    currency === curr.code ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-200'
                                }`}
                            >
                                <span className="font-medium">{curr.code}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{curr.name}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>, sourceId?: string) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  currentUser: User;
  transactionToEdit: Transaction | null;
  paymentMethods: PaymentMethod[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  userDetails: UserDetails;
  activeCurrencies?: { [key: string]: boolean };
  language: Language;
  recentTransactions?: Transaction[];
  onOpenBulkImport?: () => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onAddTransaction, onUpdateTransaction, currentUser, transactionToEdit, paymentMethods, expenseCategories, incomeCategories, userDetails, activeCurrencies = { SUM: true, USD: true }, language, recentTransactions = [], onOpenBulkImport }) => {
  const t = useTranslation(language);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState<string | undefined>(undefined);
  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategory[]>([]);
  const [date, setDate] = useState(formatISOForInput(new Date().toISOString()));
  const [user, setUser] = useState<User>(currentUser);
  const [priority, setPriority] = useState<Priority>('must-have');
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ amount?: boolean, category?: boolean }>({});
  const [currency, setCurrency] = useState<string>('SUM');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currencyRate, setCurrencyRate] = useState<number>(1);
  const [loadingRate, setLoadingRate] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState({
    category: false,
    subCategory: false,
    user: false,
    priority: false,
    paymentMethodId: false,
    amount: false
  });
  
  // Обновляем ref при изменении hasUserEdited
  useEffect(() => {
    hasUserEditedRef.current = hasUserEdited;
  }, [hasUserEdited]);
  const autofillTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSubCategoryRef = useRef<string | null>(null);
  const hasUserEditedRef = useRef(hasUserEdited);
  
  const isCreatingFromTemplate = transactionToEdit?.id.startsWith('temp-') ?? false;
  const isEditMode = transactionToEdit !== null && !isCreatingFromTemplate;
  const categories = transactionType === 'expense' ? expenseCategories : incomeCategories;

  const maxDate = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  const filteredPaymentMethods = useMemo(() => paymentMethods, [paymentMethods]);

  const resetForm = useCallback(() => {
    // Use expense categories by default since we set transactionType to 'expense' below
    const otherCategory = expenseCategories.find(c => c.id === 'other' || c.name === 'Другое');
    const defaultCategory = otherCategory ? otherCategory.name : '';
    
    setTransactionType('expense');
    setDescription('');
    setAmount('');
    setCategory(defaultCategory);
    setSubCategory(undefined);
    setDate(formatISOForInput(new Date().toISOString()));
    setUser(currentUser);
    setPriority('must-have');
    setPaymentMethodId(paymentMethods.find(pm => pm.type === 'Cash')?.id);
    setReceiptFile(null);
    setIsParsing(false);
    setParseError(null);
    setFormErrors({});
    setCurrency('SUM');
    setShowAdvanced(false);
    setIsAutofilling(false);
    setHasUserEdited({
      category: false,
      subCategory: false,
      user: false,
      priority: false,
      paymentMethodId: false,
      amount: false
    });
    if (autofillTimeoutRef.current) {
      clearTimeout(autofillTimeoutRef.current);
      autofillTimeoutRef.current = null;
    }
  }, [currentUser, paymentMethods, expenseCategories]);

  useEffect(() => {
    if (transactionToEdit) {
        setTransactionType(transactionToEdit.type);
        setDescription(transactionToEdit.description);
        setAmount(transactionToEdit.amount);
        setCategory(transactionToEdit.category);
        setDate(formatISOForInput(transactionToEdit.date));
        setUser(transactionToEdit.user);
        setPriority(transactionToEdit.priority);
        setPaymentMethodId(transactionToEdit.paymentMethodId);
        setShowAdvanced(true);
        setTimeout(() => setSubCategory(transactionToEdit.subCategory), 0);
    } else {
        resetForm();
    }
  }, [transactionToEdit, resetForm]);

  useEffect(() => {
    const selectedCategory = categories.find(c => c.name === category);
    const subs = selectedCategory?.subCategories || [];
    setAvailableSubCategories(subs);
    if(subs.length === 0) setSubCategory(undefined);
    
    // Only auto-select subcategory if the main category has changed
    if (transactionToEdit?.category !== category && subs.length > 0) {
      // Не сбрасываем подкатегорию, если она ожидает установки из автозаполнения
      if (!pendingSubCategoryRef.current) {
        setSubCategory(undefined);
      }
    } else if (isEditMode && transactionToEdit?.category === category){
      setSubCategory(transactionToEdit.subCategory)
    }

    // Если есть ожидающая подкатегория из автозаполнения, устанавливаем её
    if (pendingSubCategoryRef.current && !hasUserEdited.subCategory) {
      const foundSubCategory = subs.find(sc => sc.name === pendingSubCategoryRef.current);
      if (foundSubCategory) {
        console.log('Устанавливаем ожидающую подкатегорию:', pendingSubCategoryRef.current);
        setSubCategory(pendingSubCategoryRef.current);
        pendingSubCategoryRef.current = null;
      }
    }

    // Автоматически выбираем способ оплаты из паттернов, если категория выбрана и способ оплаты не установлен
    if (category && !paymentMethodId && !hasUserEdited.paymentMethodId && recentTransactions.length > 0) {
      const allCategoriesForPatterns = transactionType === 'expense' ? expenseCategories : incomeCategories;
      const categoryObj = allCategoriesForPatterns.find(c => c.id === category || c.name === category);
      const categoryName = categoryObj?.name || category;
      
      // Ищем паттерн из последних транзакций с такой же категорией
      const patternTx = recentTransactions.find(rt => {
        const rtCategoryObj = allCategoriesForPatterns.find(c => c.id === rt.category || c.name === rt.category);
        const rtCategoryName = rtCategoryObj?.name || rt.category;
        return rtCategoryName === categoryName && rt.amount > 0 && rt.paymentMethodId;
      });
      
      if (patternTx && patternTx.paymentMethodId) {
        const foundPaymentMethod = filteredPaymentMethods.find(pm => pm.id === patternTx.paymentMethodId);
        if (foundPaymentMethod) {
          console.log('Автовыбор способа оплаты из паттернов:', patternTx.paymentMethodId);
          setPaymentMethodId(patternTx.paymentMethodId);
        }
      }
    }
  }, [category, categories, transactionToEdit, isEditMode, paymentMethodId, hasUserEdited.paymentMethodId, recentTransactions, transactionType, expenseCategories, incomeCategories, filteredPaymentMethods]);
  
  useEffect(() => {
    if (!isEditMode) {
      setUser(currentUser);
      // При смене типа транзакции устанавливаем категорию "Другое" по умолчанию
      const categories = transactionType === 'expense' ? expenseCategories : incomeCategories;
      const otherCategory = categories.find(c => c.id === 'other' || c.name === 'Другое');
      if (otherCategory && !category) {
        setCategory(otherCategory.name);
      }
    }
  }, [currentUser, isEditMode, transactionType, expenseCategories, incomeCategories, category]);

  useEffect(() => {
    // Загружаем курс валют при изменении валюты
    if (currency !== 'SUM') {
      setLoadingRate(true);
      getCurrencyRate(currency).then(rate => {
        setCurrencyRate(rate);
        setLoadingRate(false);
      }).catch(() => {
        setCurrencyRate(12000); // Fallback
        setLoadingRate(false);
      });
    } else {
      setCurrencyRate(1);
    }
  }, [currency]);

  // Обработка текста "сегодня" в описании и установка текущей даты/времени
  useEffect(() => {
    if (!description || isEditMode) return;
    
    const descLower = description.toLowerCase().trim();
    const todayKeywords = ['сегодня', 'today', 'сейчас', 'now'];
    const hasTodayKeyword = todayKeywords.some(keyword => descLower.includes(keyword));
    
    if (hasTodayKeyword) {
      // Устанавливаем текущую дату и время
      const now = new Date();
      setDate(formatISOForInput(now.toISOString()));
      console.log('Обнаружен текст "сегодня", установлена текущая дата/время:', now.toISOString());
    }
  }, [description, isEditMode]);

  // Автозаполнение при изменении описания
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (autofillTimeoutRef.current) {
      clearTimeout(autofillTimeoutRef.current);
    }

    // Если описание слишком короткое или это режим редактирования - не автозаполняем
    if (!description || description.trim().length < 2 || isEditMode) {
      return;
    }

    // Устанавливаем таймер для debounce (800ms)
    autofillTimeoutRef.current = setTimeout(async () => {
      setIsAutofilling(true);
      try {
        const categories = transactionType === 'expense' ? expenseCategories : incomeCategories;
        // Собираем все подкатегории из всех категорий
        const allSubCategories = categories.flatMap(c => c.subCategories || []);
        const suggestions = await getAutofillSuggestions({
          description: description.trim(),
          transactionType,
          categories: categories,
          subCategories: allSubCategories,
          users: Object.keys(userDetails) as User[],
          paymentMethods: filteredPaymentMethods,
          recentTransactions: recentTransactions
        });

        console.log('Получены предложения автозаполнения:', suggestions);
        console.log('Флаги редактирования:', hasUserEditedRef.current);

        // Используем ref для проверки, чтобы избежать проблем с замыканиями
        const userEdited = hasUserEditedRef.current;

        // Заполняем только те поля, которые пользователь еще не редактировал
        if (!userEdited.amount && suggestions.amount !== null && suggestions.amount !== undefined && suggestions.amount > 0) {
          console.log('Автозаполнение суммы:', suggestions.amount);
          setAmount(Number(suggestions.amount));
        }
        
        // Сначала устанавливаем категорию, если она предложена
        if (!userEdited.category && suggestions.category) {
          const foundCategory = categories.find(c => c.name === suggestions.category);
          if (foundCategory) {
            console.log('Автозаполнение категории:', suggestions.category);
            setCategory(suggestions.category);
            
            // Если есть подкатегория, сохраняем её для установки после обновления категории
            if (!userEdited.subCategory && suggestions.subCategory) {
              console.log('Сохраняем подкатегорию для установки:', suggestions.subCategory);
              pendingSubCategoryRef.current = suggestions.subCategory;
            }
          }
        } else if (!userEdited.subCategory && suggestions.subCategory && category) {
          // Если категория уже выбрана, проверяем подкатегорию сразу
          const currentCategory = categories.find(c => c.name === category);
          const currentSubs = currentCategory?.subCategories || [];
          const foundSubCategory = currentSubs.find(sc => sc.name === suggestions.subCategory);
          if (foundSubCategory) {
            console.log('Автозаполнение подкатегории (категория уже выбрана):', suggestions.subCategory);
            setSubCategory(suggestions.subCategory);
          } else {
            // Сохраняем для установки после обновления категории
            pendingSubCategoryRef.current = suggestions.subCategory;
          }
        }
        
        if (!userEdited.user && suggestions.user && (suggestions.user === 'Suren' || suggestions.user === 'Alena' || suggestions.user === 'shared')) {
          console.log('Автозаполнение пользователя:', suggestions.user);
          setUser(suggestions.user as User);
        }
        
        if (!userEdited.priority && suggestions.priority && transactionType === 'expense') {
          if (suggestions.priority === 'must-have' || suggestions.priority === 'nice-to-have') {
            console.log('Автозаполнение приоритета:', suggestions.priority);
            setPriority(suggestions.priority as Priority);
          }
        }
        
        if (!userEdited.paymentMethodId && suggestions.paymentMethodId) {
          const foundPaymentMethod = filteredPaymentMethods.find(pm => pm.id === suggestions.paymentMethodId);
          if (foundPaymentMethod) {
            console.log('Автозаполнение способа оплаты:', suggestions.paymentMethodId);
            setPaymentMethodId(suggestions.paymentMethodId);
          } else {
            console.log('Способ оплаты не найден:', suggestions.paymentMethodId);
          }
        }
      } catch (error) {
        console.error('Ошибка автозаполнения:', error);
      } finally {
        setIsAutofilling(false);
      }
    }, 800);

    // Очистка при размонтировании
    return () => {
      if (autofillTimeoutRef.current) {
        clearTimeout(autofillTimeoutRef.current);
      }
    };
  }, [description, transactionType, expenseCategories, incomeCategories, category, userDetails, filteredPaymentMethods, recentTransactions, isEditMode]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };
  
  const handleParseReceipt = async () => {
    if (!receiptFile) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const parsedData: ParsedReceipt | null = await parseReceipt(receiptFile, categories);
      if (parsedData) {
        setAmount(parsedData.amount || '');
        setCategory(categories.find(c => c.name.toLowerCase() === parsedData.category?.toLowerCase())?.name || '');
        
        // Обрабатываем дату и время
        let dateTime = new Date();
        
        // Если дата указана в парсе, используем её
        if (parsedData.date) {
          const dateParts = parsedData.date.split('-');
          if (dateParts.length === 3) {
            dateTime = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          }
        }
        
        // Если время указано в парсе, используем его (не fallback на текущее время)
        if (parsedData.time && parsedData.time !== 'null' && parsedData.time.trim() !== '') {
          const timeParts = parsedData.time.split(':');
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            dateTime.setHours(hours);
            dateTime.setMinutes(minutes);
            dateTime.setSeconds(0);
            dateTime.setMilliseconds(0);
            console.log('Время извлечено из чека:', parsedData.time, '->', hours + ':' + minutes);
          }
        } else {
          // Если время не указано, используем текущее время как fallback
          const now = new Date();
          dateTime.setHours(now.getHours());
          dateTime.setMinutes(now.getMinutes());
          console.log('Время не найдено в чеке, используется текущее время');
        }
        
        setDate(formatISOForInput(dateTime.toISOString()));
        setDescription(parsedData.description || '');
      } else {
        setParseError('Не удалось распознать чек. Пожалуйста, введите данные вручную.');
      }
    } catch (e) {
      console.error('Ошибка при парсинге чека:', e);
      setParseError('Ошибка при обработке чека.');
    } finally {
      setIsParsing(false);
    }
  };

  const validateForm = () => {
    const errors: { amount?: boolean, category?: boolean } = {};
    if (!amount || Number(amount) <= 0) errors.amount = true;
    if (!category) errors.category = true;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!validateForm()) return;
      
      if (!amount || Number(amount) <= 0 || !category) {
        setFormErrors({ amount: !amount || Number(amount) <= 0, category: !category });
        return;
      }
      
      const finalAmount = currency === 'SUM' ? Number(amount) : Number(amount) * currencyRate;

      const transactionData = {
          description: description || category,
          amount: Math.round(finalAmount),
          category,
          subCategory,
          date: new Date(date).toISOString(),
          user,
          priority,
          type: transactionType,
          paymentMethodId,
      };

      if (isEditMode && transactionToEdit) {
          onUpdateTransaction({ ...transactionData, id: transactionToEdit.id });
      } else {
          const sourceId = isCreatingFromTemplate && transactionToEdit ? transactionToEdit.id.substring(5) : undefined;
          onAddTransaction(transactionData, sourceId);
      }
      handleClose();
    } catch (error) {
      console.error('Ошибка при сохранении транзакции:', error);
      alert('Произошла ошибка при сохранении. Попробуйте еще раз.');
    }
  };

  if (!isOpen) return null;
  const isFormValid = amount && Number(amount) > 0 && category;
  const tabColorClass = transactionType === 'expense' ? 'text-red-500' : 'text-green-500';
  const tabBgColorClass = transactionType === 'expense' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all text-gray-800 dark:text-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
             <div className="relative">
                <div className="flex justify-center border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setTransactionType('expense')} className={`w-28 py-2 text-sm font-semibold transition-colors focus:outline-none ${transactionType === 'expense' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{t('forms.expense')}</button>
                    <button onClick={() => setTransactionType('income')} className={`w-28 py-2 text-sm font-semibold transition-colors focus:outline-none ${transactionType === 'income' ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>{t('forms.income')}</button>
                </div>
                <div className={`absolute bottom-0 h-0.5 ${tabBgColorClass} transition-all duration-300 ease-in-out`} style={{ width: '50%', left: transactionType === 'expense' ? '0%' : '50%' }}></div>
            </div>
            <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 -mt-2">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
                    
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                {t('forms.description')}
                <i className="fas fa-brain text-teal-500 text-xs"></i>
              </label>
              <div className="relative flex items-center mt-1">
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => {
                    const value = e.target.value;
                    setDescription(value);
                    // Сбрасываем флаги редактирования при очистке
                    if (value.length === 0) {
                      setHasUserEdited({
                        category: false,
                        subCategory: false,
                        user: false,
                        priority: false,
                        paymentMethodId: false,
                        amount: false
                      });
                    }
                  }}
                  placeholder="Название магазина или товара..." 
                  className="block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 pr-10" 
                />
                {isAutofilling && !isEditMode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
                {transactionType === 'expense' && !isEditMode && (
                  <div className="flex items-center ml-2 space-x-1">
                      <label htmlFor="receipt-upload-camera" className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/80 rounded-full cursor-pointer transition-colors">
                          <i className="fas fa-camera"></i>
                      </label>
                      <input type="file" id="receipt-upload-camera" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                      <label htmlFor="receipt-upload-file" className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/80 rounded-full cursor-pointer transition-colors">
                          <i className="fas fa-paperclip"></i>
                      </label>
                      <input type="file" id="receipt-upload-file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                )}
              </div>
            </div>
            {receiptFile && transactionType === 'expense' && (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">Выбран файл: {receiptFile.name}</p>
                <button type="button" onClick={handleParseReceipt} disabled={isParsing} className="w-full bg-teal-500 text-white py-2 px-4 rounded-md hover:bg-teal-600 disabled:bg-teal-300 flex items-center justify-center">
                  {isParsing ? <Spinner size="sm" /> : <> <i className="fas fa-magic mr-2"></i> Распознать</>}
                </button>
                {parseError && <p className="text-sm text-center text-red-500 mt-2">{parseError}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('forms.category')}</label>
                <select 
                  value={category} 
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setHasUserEdited(prev => ({ ...prev, category: true }));
                  }} 
                  className={`mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 ${formErrors.category ? 'border-red-500' : ''}`}
                >
                  <option value="" disabled>Выберите</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {formErrors.category && <i className="fas fa-exclamation-circle text-red-500 absolute right-3 top-9"></i>}
              </div>
              {availableSubCategories.length > 0 && (
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('forms.subCategory')}</label>
                    <select 
                      value={subCategory} 
                      onChange={(e) => {
                        setSubCategory(e.target.value);
                        setHasUserEdited(prev => ({ ...prev, subCategory: true }));
                      }} 
                      className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Выберите</option>
                      {availableSubCategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
                    </select>
                </div>
              )}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('forms.amount')}</label>
                <div className="flex mt-1 items-center gap-3">
                    <div className="relative flex-grow">
                         <FormattedNumberInput 
                           value={amount} 
                           onChange={(value) => {
                             setAmount(value);
                             setHasUserEdited(prev => ({ ...prev, amount: true }));
                           }} 
                           className={`block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 ${formErrors.amount ? 'border-red-500' : ''}`} 
                           required 
                         />
                         {formErrors.amount && <i className="fas fa-exclamation-circle text-red-500 absolute right-3 top-2.5"></i>}
                    </div>
                    <CurrencySwitcher currency={currency} onChange={setCurrency} activeCurrencies={activeCurrencies} />
                </div>
                 {currency !== 'SUM' && amount && !loadingRate && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">≈ {Math.round(Number(amount) * currencyRate).toLocaleString('ru-RU')} SUM</p>}
                 {loadingRate && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{t('forms.loadingRate')}</p>}
            </div>


            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-teal-500 dark:text-teal-400 font-medium flex items-center space-x-2">
                <span>Дополнительные параметры</span>
                <i className={`fas fa-chevron-down text-xs transition-transform ${showAdvanced ? 'rotate-180' : ''}`}></i>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showAdvanced ? 'max-h-96 opacity-100 pt-4' : 'max-h-0 opacity-0'}`}>
                 <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('forms.dateTime')}</label>
                            <input type="datetime-local" value={date} max={maxDate} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('forms.account')}</label>
                            <select 
                              value={paymentMethodId} 
                              onChange={(e) => {
                                setPaymentMethodId(e.target.value);
                                setHasUserEdited(prev => ({ ...prev, paymentMethodId: true }));
                              }} 
                              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs"
                            >
                            <option value="">Не выбрано</option>
                            {filteredPaymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name} ({userDetails[pm.owner]?.name || pm.owner})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={`grid ${transactionType === 'expense' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Чей {transactionType === 'expense' ? 'расход' : 'доход'}</label>
                            <select 
                              value={user} 
                              onChange={(e) => {
                                setUser(e.target.value as User);
                                setHasUserEdited(prev => ({ ...prev, user: true }));
                              }} 
                              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs"
                            >
                                {userDetails && Object.keys(userDetails).map((userId) => (
                                    <option key={userId} value={userId}>{userDetails[userId as User]?.name || userId}</option>
                                ))}
                            </select>
                        </div>
                        {transactionType === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('forms.priority')}</label>
                            <select 
                              value={priority} 
                              onChange={(e) => {
                                setPriority(e.target.value as Priority);
                                setHasUserEdited(prev => ({ ...prev, priority: true }));
                              }} 
                              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs"
                            >
                                <option value="must-have">{t('transactions.mustHave')}</option>
                                <option value="nice-to-have">{t('transactions.niceToHave')}</option>
                            </select>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-6">
              {!isEditMode && onOpenBulkImport && (
                <button 
                  type="button" 
                  onClick={() => {
                    handleClose();
                    onOpenBulkImport();
                  }}
                  className="text-sm text-teal-500 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 flex items-center gap-2"
                >
                  <i className="fas fa-layer-group"></i>
                  <span>Массовый импорт</span>
                </button>
              )}
              {isEditMode && <div></div>}
              <div className="flex space-x-3 ml-auto">
                <button type="button" onClick={handleClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('forms.cancel')}</button>
                <button type="submit" disabled={!isFormValid} className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-md hover:bg-teal-600 disabled:bg-teal-300 dark:disabled:bg-teal-800 disabled:cursor-not-allowed">
                  {isEditMode ? t('forms.update') : t('forms.save')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;