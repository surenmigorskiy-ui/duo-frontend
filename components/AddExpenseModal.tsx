import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Transaction, User, Priority, Category, ParsedReceipt, SubCategory, PaymentMethod, UserDetails } from '../types';
import { parseReceipt } from '../services/geminiService';
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

const USD_TO_SUM_RATE = 12000;

const CurrencySwitcher: React.FC<{ currency: 'SUM' | 'USD'; onChange: (c: 'SUM' | 'USD') => void }> = ({ currency, onChange }) => {
    return (
        <div className="relative flex w-24 h-9 bg-gray-200 dark:bg-gray-700 rounded-full p-1">
            <div className={`absolute top-1 left-1 w-1/2 h-7 bg-white dark:bg-gray-900 rounded-full shadow transition-transform duration-300 ease-in-out ${currency === 'USD' ? 'translate-x-full' : ''}`}></div>
            <button type="button" onClick={() => onChange('SUM')} className="relative z-10 w-1/2 text-sm font-semibold focus:outline-none">{currency === 'SUM' ? 'SUM' : <span className="text-gray-400">SUM</span>}</button>
            <button type="button" onClick={() => onChange('USD')} className="relative z-10 w-1/2 text-sm font-semibold focus:outline-none">{currency === 'USD' ? 'USD' : <span className="text-gray-400">USD</span>}</button>
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
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onAddTransaction, onUpdateTransaction, currentUser, transactionToEdit, paymentMethods, expenseCategories, incomeCategories, userDetails }) => {
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
  const [currency, setCurrency] = useState<'SUM' | 'USD'>('SUM');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
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
    setTransactionType('expense');
    setDescription('');
    setAmount('');
    setCategory('');
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
  }, [currentUser, paymentMethods]);

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
      setSubCategory(undefined);
    } else if (isEditMode && transactionToEdit?.category === category){
      setSubCategory(transactionToEdit.subCategory)
    }

  }, [category, categories, transactionToEdit, isEditMode]);
  
  useEffect(() => {
    if (!isEditMode) setUser(currentUser);
  }, [currentUser, isEditMode]);

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
        setDate(formatISOForInput(new Date(parsedData.date || new Date()).toISOString()));
        setDescription(parsedData.description || '');
      } else {
        setParseError('Не удалось распознать чек. Пожалуйста, введите данные вручную.');
      }
    } catch (e) {
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
    if (!validateForm()) return;
    
    const finalAmount = currency === 'USD' ? Number(amount) * USD_TO_SUM_RATE : Number(amount);

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

    if (isEditMode) {
        onUpdateTransaction({ ...transactionData, id: transactionToEdit.id });
    } else {
        const sourceId = isCreatingFromTemplate ? transactionToEdit.id.substring(5) : undefined;
        onAddTransaction(transactionData, sourceId);
    }
    handleClose();
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
                    <button onClick={() => setTransactionType('expense')} className={`w-28 py-2 text-sm font-semibold transition-colors focus:outline-none ${transactionType === 'expense' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>Расход</button>
                    <button onClick={() => setTransactionType('income')} className={`w-28 py-2 text-sm font-semibold transition-colors focus:outline-none ${transactionType === 'income' ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>Доход</button>
                </div>
                <div className={`absolute bottom-0 h-0.5 ${tabBgColorClass} transition-all duration-300 ease-in-out`} style={{ width: '50%', left: transactionType === 'expense' ? '0%' : '50%' }}></div>
            </div>
            <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 -mt-2">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
                    
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Категория</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 ${formErrors.category ? 'border-red-500' : ''}`}>
                  <option value="" disabled>Выберите</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {formErrors.category && <i className="fas fa-exclamation-circle text-red-500 absolute right-3 top-9"></i>}
              </div>
              {availableSubCategories.length > 0 && (
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Подкатегория</label>
                    <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                      <option value="">Выберите</option>
                      {availableSubCategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
                    </select>
                </div>
              )}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Сумма</label>
                <div className="flex mt-1 items-center gap-3">
                    <div className="relative flex-grow">
                         <FormattedNumberInput value={amount} onChange={setAmount} className={`block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 ${formErrors.amount ? 'border-red-500' : ''}`} required />
                         {formErrors.amount && <i className="fas fa-exclamation-circle text-red-500 absolute right-3 top-2.5"></i>}
                    </div>
                    <CurrencySwitcher currency={currency} onChange={setCurrency} />
                </div>
                 {currency === 'USD' && amount && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">≈ {Math.round(Number(amount) * USD_TO_SUM_RATE).toLocaleString('ru-RU')} SUM</p>}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Описание</label>
              <div className="flex items-center mt-1">
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Название магазина или товара..." className="block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" />
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


            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-teal-500 dark:text-teal-400 font-medium flex items-center space-x-2">
                <span>Дополнительные параметры</span>
                <i className={`fas fa-chevron-down text-xs transition-transform ${showAdvanced ? 'rotate-180' : ''}`}></i>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showAdvanced ? 'max-h-96 opacity-100 pt-4' : 'max-h-0 opacity-0'}`}>
                 <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Дата и время</label>
                            <input type="datetime-local" value={date} max={maxDate} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Счет</label>
                            <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs">
                            <option value="">Не выбрано</option>
                            {filteredPaymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name} ({userDetails[pm.owner].name})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={`grid ${transactionType === 'expense' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Чей {transactionType === 'expense' ? 'расход' : 'доход'}</label>
                            <select value={user} onChange={(e) => setUser(e.target.value as User)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs">
                                <option value="Suren">{userDetails['Suren'].name}</option>
                                <option value="Alena">{userDetails['Alena'].name}</option>
                                <option value="shared">{userDetails['shared'].name}</option>
                            </select>
                        </div>
                        {transactionType === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Приоритет</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-xs">
                                <option value="must-have">Обязательный</option>
                                <option value="nice-to-have">Желательный</option>
                            </select>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 space-x-3">
              <button type="button" onClick={handleClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Отмена</button>
              <button type="submit" disabled={!isFormValid} className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-md hover:bg-teal-600 disabled:bg-teal-300 dark:disabled:bg-teal-800 disabled:cursor-not-allowed">
                {isEditMode ? 'Обновить' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;