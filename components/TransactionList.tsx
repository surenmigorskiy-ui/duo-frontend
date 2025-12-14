import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Transaction, Category, User, DateRangePreset, PaymentMethodType, CustomDateRange, PaymentMethod, UserDetails, Language } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const PAYMENT_METHOD_TYPES: PaymentMethodType[] = ['Card', 'Cash', 'Bank Account'];

interface ActiveFilters {
  type: 'income' | 'expense' | null;
}

interface TransactionListProps {
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  userDetails: UserDetails;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  filters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  language: Language;
}

const TransactionItem: React.FC<{ 
    transaction: Transaction; 
    paymentMethod?: PaymentMethod; 
    categories: Category[],
    userDetails: UserDetails;
    onDelete: (id: string) => void, 
    onEdit: (transaction: Transaction) => void,
    isExpanded: boolean;
    onExpand: () => void;
    language: Language;
}> = ({ transaction, paymentMethod, categories, userDetails, onDelete, onEdit, isExpanded, onExpand, language }) => {
    const t = useTranslation(language);
    const isExpense = transaction.type === 'expense';
    // Ищем категорию по ID или по названию
    const categoryInfo = categories.find(c => c.id === transaction.category || c.name === transaction.category);
    const subCategoryInfo = categoryInfo?.subCategories?.find(sc => sc.name === transaction.subCategory);
    const icon = subCategoryInfo?.icon || categoryInfo?.icon || 'fas fa-question-circle';
    // Безопасное извлечение информации о пользователе
    const userDetail = userDetails?.[transaction.user];
    let userInfo: { name: string; color: string; avatar: string };
    
    if (userDetail) {
      // Проверяем, что это объект с нужными полями
      if (typeof userDetail === 'object' && userDetail !== null) {
        // Если это объект из API (с полями id, email, familyId), извлекаем только нужные поля
        if ('name' in userDetail && typeof userDetail.name === 'string') {
          userInfo = {
            name: userDetail.name,
            color: ('color' in userDetail && typeof userDetail.color === 'string') ? userDetail.color : 'bg-gray-500',
            avatar: ('avatar' in userDetail && typeof userDetail.avatar === 'string') ? userDetail.avatar : '👤'
          };
        } else {
          // Если структура неожиданная, используем fallback
          userInfo = { name: String(transaction.user), color: 'bg-gray-500', avatar: '👤' };
        }
      } else {
        userInfo = { name: String(transaction.user), color: 'bg-gray-500', avatar: '👤' };
      }
    } else {
      userInfo = { name: String(transaction.user), color: 'bg-gray-500', avatar: '👤' };
    }
    const spoilerContentRef = useRef<HTMLDivElement>(null);
    const [spoilerHeight, setSpoilerHeight] = useState(0);
    
    const priorityColorClass = isExpense ? (transaction.priority === 'must-have' ? 'bg-orange-400' : 'bg-yellow-400') : '';
    const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
    const amountPrefix = isExpense ? '-' : '+';
    
    // Определяем, является ли транзакция массовой (bulk import)
    const isBulkTransaction = transaction.id?.startsWith('bulk-') || (transaction as any)._importTimestamp;
    
    // Определяем, требуется ли ручное редактирование категории
    const needsCategoryReview = (transaction as any)._needsCategoryReview || !transaction.category || transaction.category === '';

    useEffect(() => {
        const el = spoilerContentRef.current;
        if (!el) return;

        const updateHeight = () => setSpoilerHeight(el.scrollHeight);

        if (isExpanded) {
            updateHeight();
            window.addEventListener('resize', updateHeight);
            return () => window.removeEventListener('resize', updateHeight);
        } else {
            setSpoilerHeight(0);
        }
    }, [isExpanded]);

    return (
        <li className={`bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
            needsCategoryReview 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                : isBulkTransaction 
                    ? 'bg-teal-50/30 dark:bg-teal-900/10' 
                    : ''
        }`}>
             <div className="p-2.5">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={onExpand}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-sm flex-shrink-0`}>
                        <i className={`${icon} text-gray-500 dark:text-gray-400`}></i>
                    </div>
                    <div className="flex-grow min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                            <p className="font-medium text-xs text-gray-800 dark:text-gray-100 truncate flex-1">{transaction.description}</p>
                            {isBulkTransaction && (
                                <span 
                                    className="flex-shrink-0 text-teal-500 dark:text-teal-400" 
                                    title="Массовый импорт"
                                >
                                    <i className="fas fa-layer-group text-xs"></i>
                                </span>
                            )}
                        </div>
                         <div className="mt-1">
                            {needsCategoryReview ? (
                                <span className="text-xs px-1.5 py-0.5 bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 rounded-md">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Требуется категория
                                </span>
                            ) : (
                                <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                                    {transaction.subCategory || transaction.category || 'Без категории'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className={`font-mono ${amountColor} text-xs font-semibold whitespace-nowrap`}>{amountPrefix}{Math.round(transaction.amount).toLocaleString('ru-RU')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div 
                    className={`spoiler ${isExpanded ? 'expanded' : ''}`}
                    style={{ maxHeight: `${spoilerHeight}px` }}
                >
                    <div ref={spoilerContentRef} className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                         <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1.5 pl-11 max-h-48 overflow-y-auto">
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('transactions.category')}:</span> <span className="break-words">{transaction.category}</span></p>
                            {transaction.subCategory && <p className="break-words"><span className="font-semibold w-24 inline-block">{t('transactions.subCategory')}:</span> <span className="break-words">{transaction.subCategory}</span></p>}
                            <div className="flex items-center flex-wrap">
                                <span className="font-semibold w-24 inline-block">{t('transactions.user')}:</span>
                                <span className={`px-2 py-0.5 rounded-full text-white text-opacity-80 text-xs ${userInfo.color}`}>{userInfo.name}</span>
                            </div>
                            {isExpense && <p className="break-words"><span className="font-semibold w-24 inline-block">{t('transactions.priority')}:</span><span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${priorityColorClass}`}></span>{transaction.priority === 'must-have' ? t('transactions.mustHave') : t('transactions.niceToHave')}</p>}
                            {paymentMethod && <p className="break-words"><span className="font-semibold w-24 inline-block">{t('transactions.account')}:</span> <span className="break-words">{paymentMethod.name}</span></p>}
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('transactions.dateTime')}:</span> {new Date(transaction.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex items-center justify-end space-x-1.5 mt-3 flex-wrap gap-1 sticky bottom-0 bg-white dark:bg-gray-800 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(transaction); }} className="btn-press text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors py-1.5 px-2.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap z-10">
                                <i className="fas fa-pencil-alt mr-1"></i> {t('transactions.edit')}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }} className="btn-press text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors py-1.5 px-2.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap z-10">
                                <i className="fas fa-trash-alt mr-1"></i> {t('transactions.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};

const CategoryFilterItem: React.FC<{
    category: Category,
    selectedCategories: string[],
    selectedSubCategories: string[],
    onCategoryToggle: (name: string) => void,
    onSubCategoryToggle: (name: string) => void,
}> = ({ category, selectedCategories, selectedSubCategories, onCategoryToggle, onSubCategoryToggle }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasSubcategories = category.subCategories && category.subCategories.length > 0;

    return (
        <div>
            <div className="flex items-center justify-between p-1">
                <label className="flex items-center space-x-2 text-sm cursor-pointer flex-grow">
                    <input type="checkbox" checked={selectedCategories.includes(category.name)} onChange={() => onCategoryToggle(category.name)} className="rounded text-teal-500 focus:ring-teal-500"/>
                    <span>{category.name}</span>
                </label>
                {hasSubcategories && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-xs text-gray-400">
                         <i className={`fas fa-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </button>
                )}
            </div>
            {isExpanded && hasSubcategories && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 ml-3">
                    {category.subCategories?.map((sub, index) => (
                         <label key={`${category.id}-${sub.id}-${index}`} className="flex items-center space-x-2 text-sm cursor-pointer p-1">
                            <input type="checkbox" checked={selectedSubCategories.includes(sub.name)} onChange={() => onSubCategoryToggle(sub.name)} className="rounded text-teal-500 focus:ring-teal-500"/>
                            <span>{sub.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, paymentMethods, expenseCategories, incomeCategories, userDetails, onDeleteTransaction, onEditTransaction, filters, onFilterChange, language }) => {
    const t = useTranslation(language);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState<DateRangePreset>('month');
    const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({ start: null, end: null });
    const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<PaymentMethodType[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAllCategories, setShowAllCategories] = useState(false);
    
    const paymentMethodMap = useMemo(() => {
        return new Map(paymentMethods.map(pm => [pm.id, pm]));
    }, [paymentMethods]);

    const allCategories = useMemo(() => {
        // Объединяем категории с уникальными ключами
        const expenseWithType = expenseCategories.map(cat => ({ ...cat, _type: 'expense', _uniqueId: `expense-${cat.id}` }));
        const incomeWithType = incomeCategories.map(cat => ({ ...cat, _type: 'income', _uniqueId: `income-${cat.id}` }));
        return [...expenseWithType, ...incomeWithType].sort((a,b) => a.name.localeCompare(b.name));
    }, [expenseCategories, incomeCategories]);

    const sortedTransactions = useMemo(() => 
        [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setShowFilters(false);
            }
        };
        const handleScroll = (event: Event) => {
            // Проверяем, что скролл происходит вне панели фильтров
            const target = event.target as HTMLElement;
            if (!filterPanelRef.current) return;
            
            // Проверяем, что скролл не внутри панели фильтров
            let isInsideFilter = false;
            let current: HTMLElement | null = target;
            while (current && current !== document.body) {
                if (current === filterPanelRef.current) {
                    isInsideFilter = true;
                    break;
                }
                current = current.parentElement;
            }
            
            // Закрываем фильтр только если скролл происходит вне его
            if (!isInsideFilter) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        // Используем capture phase для перехвата всех событий скролла
        document.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setExpandedId(prev => (prev ? null : prev));
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    const handleUserToggle = (user: User) => {
        setSelectedUsers(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]);
    };
    
    const handleCategoryToggle = (categoryName: string) => {
        setSelectedCategories(prev => prev.includes(categoryName) ? prev.filter(c => c !== categoryName) : [...prev, categoryName]);
    };

    const handleSubCategoryToggle = (subCategoryName: string) => {
        setSelectedSubCategories(prev => prev.includes(subCategoryName) ? prev.filter(sc => sc !== subCategoryName) : [...prev, subCategoryName]);
    };
    
    const handlePaymentTypeToggle = (type: PaymentMethodType) => {
        setSelectedPaymentTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const resetFilters = () => {
        setSelectedUsers([]);
        setSelectedPaymentTypes([]);
        setSelectedCategories([]);
        setSelectedSubCategories([]);
    };

    const activeFilterCount = selectedUsers.length + selectedPaymentTypes.length + selectedCategories.length + selectedSubCategories.length;

    const filteredTransactions = useMemo(() => {
        return sortedTransactions.filter(t => {
            if (filters.type && t.type !== filters.type) return false;
            if (selectedUsers.length > 0 && !selectedUsers.includes(t.user)) return false;

            const noCategoryFilters = selectedCategories.length === 0 && selectedSubCategories.length === 0;
            if (!noCategoryFilters) {
                const categoryMatch = selectedCategories.includes(t.category);
                const subCategoryMatch = t.subCategory && selectedSubCategories.includes(t.subCategory);
                if (!categoryMatch && !subCategoryMatch) return false;
            }

            const transactionDate = new Date(t.date);
            if (dateFilter !== 'all') {
                 if (dateFilter === 'month') {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    if (transactionDate < startOfMonth) return false;
                 }
                 if (dateFilter === 'week') {
                    const now = new Date();
                    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                    startOfWeek.setHours(0,0,0,0);
                    if (transactionDate < startOfWeek) return false;
                 }
                 if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
                    const startDate = new Date(customDateRange.start);
                    startDate.setHours(0,0,0,0);
                    const endDate = new Date(customDateRange.end);
                    endDate.setHours(23,59,59,999);
                    if (transactionDate < startDate || transactionDate > endDate) return false;
                 }
            }

            if (selectedPaymentTypes.length > 0) {
                const pm = paymentMethodMap.get(t.paymentMethodId || '');
                if (!pm || !selectedPaymentTypes.includes(pm.type)) return false;
            }

            return true;
        });
    }, [sortedTransactions, selectedUsers, selectedCategories, selectedSubCategories, dateFilter, customDateRange, selectedPaymentTypes, paymentMethodMap, filters.type]);
    
    const { totalIncome, totalExpense } = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            if (tx.type === 'income') acc.totalIncome += tx.amount;
            else acc.totalExpense += tx.amount;
            return acc;
        }, { totalIncome: 0, totalExpense: 0 });
    }, [filteredTransactions]);

    const groupedTransactions = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        filteredTransactions.forEach(tx => {
            const date = new Date(tx.date);
            const key = date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        });
        return groups;
    }, [filteredTransactions]);
    
    const getCategoriesForType = (type: 'income' | 'expense') => type === 'expense' ? expenseCategories : incomeCategories;

  return (
    <div className="p-4 md:p-6 text-gray-900 dark:text-gray-100">
        <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">{t('transactions.title')}</h2>
            <div className="flex gap-3 items-end">
                <div className="relative flex-grow">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Период</label>
                    <select 
                      value={dateFilter} 
                      onChange={(e) => setDateFilter(e.target.value as DateRangePreset)}
                      className="bg-gray-100 dark:bg-gray-700 border-0 rounded-md focus:ring-teal-500 focus:border-teal-500 w-full text-sm p-2 appearance-none pr-8 cursor-pointer"
                    >
                        <option value="month">Этот месяц</option>
                        <option value="week">Эта неделя</option>
                        <option value="all">Все время</option>
                        <option value="custom">Свой период</option>
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 top-5 flex items-center px-2 text-gray-500 dark:text-gray-400">
                        <i className="fas fa-chevron-down text-xs"></i>
                    </div>
                </div>
                {dateFilter === 'custom' && (
                    <div className="flex-grow grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">От</label>
                            <input type="date" value={customDateRange.start || ''} onChange={e => setCustomDateRange(prev => ({...prev, start: e.target.value}))} className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm w-full text-sm p-1.5" />
                        </div>
                        <div>
                             <label className="text-xs font-medium text-gray-500 dark:text-gray-400">До</label>
                            <input type="date" value={customDateRange.end || ''} onChange={e => setCustomDateRange(prev => ({...prev, end: e.target.value}))} className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm w-full text-sm p-1.5" />
                        </div>
                    </div>
                )}
                <div className="relative flex-shrink-0">
                    <button onClick={() => setShowFilters(!showFilters)} className="w-full bg-gray-100 dark:bg-gray-700 border border-transparent rounded-md p-2 text-sm flex justify-between items-center h-full btn-press">
                        <i className="fas fa-filter mr-2"></i>
                        <span>{t('transactions.filter')}</span>
                        {activeFilterCount > 0 && <span className="ml-2 bg-teal-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>}
                    </button>
                    {showFilters && (
                        <div 
                            ref={filterPanelRef} 
                            className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 p-4 animate-slide-in"
                            onWheel={(e) => e.stopPropagation()}
                        >
                           <div 
                               className="max-h-96 overflow-y-auto pr-2 space-y-4"
                               onWheel={(e) => e.stopPropagation()}
                               onScroll={(e) => e.stopPropagation()}
                           >
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Пользователи</h4>
                                    {userDetails && Object.keys(userDetails).filter(user => userDetails[user as User]).map(user => (
                                        <label key={user} className="flex items-center space-x-2 text-sm cursor-pointer p-1">
                                            <input type="checkbox" checked={selectedUsers.includes(user as User)} onChange={() => handleUserToggle(user as User)} className="rounded text-teal-500 focus:ring-teal-500"/>
                                            <span>{userDetails[user as User]?.name || user}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <h4 className="font-semibold text-sm mb-2">Категории</h4>
                                    <div className="space-y-1">
                                       {(showAllCategories ? allCategories : allCategories.slice(0, 6)).map((cat, index) => (
                                          <CategoryFilterItem 
                                            key={cat._uniqueId || `${cat._type}-${cat.id}-${index}`}
                                            category={cat}
                                            selectedCategories={selectedCategories}
                                            selectedSubCategories={selectedSubCategories}
                                            onCategoryToggle={handleCategoryToggle}
                                            onSubCategoryToggle={handleSubCategoryToggle}
                                          />
                                       ))}
                                       {allCategories.length > 6 && (
                                          <button 
                                            onClick={() => setShowAllCategories(!showAllCategories)}
                                            className="w-full text-left text-xs text-teal-500 hover:text-teal-600 dark:hover:text-teal-400 mt-2 p-1 font-medium"
                                          >
                                            {showAllCategories ? t('transactions.hide') : t('transactions.showAll')} ({allCategories.length - 6})
                                          </button>
                                       )}
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <h4 className="font-semibold text-sm mb-2">Тип счета</h4>
                                    {PAYMENT_METHOD_TYPES.map(type => (
                                        <label key={type} className="flex items-center space-x-2 text-sm cursor-pointer p-1">
                                            <input type="checkbox" checked={selectedPaymentTypes.includes(type)} onChange={() => handlePaymentTypeToggle(type)} className="rounded text-teal-500 focus:ring-teal-500"/>
                                            <span>{type === 'Bank Account' ? 'Банк. счет' : type === 'Card' ? 'Карта' : 'Наличные'}</span>
                                        </label>
                                    ))}
                                </div>
                           </div>
                           <button onClick={resetFilters} className="w-full text-center text-xs text-red-500 hover:underline btn-press mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">Сбросить фильтры</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex justify-around text-center mb-6 space-x-4">
             <button onClick={() => onFilterChange({ ...filters, type: filters.type === 'income' ? null : 'income' })} className={`p-4 rounded-lg w-full transition-all duration-300 ${filters.type === 'income' ? 'bg-green-100 dark:bg-green-500/20 ring-2 ring-green-400 transform scale-105' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('transactions.incomeForPeriod')}</p>
                <p className="text-sm font-bold text-green-500">+{Math.round(totalIncome).toLocaleString('ru-RU')}</p>
            </button>
            <button onClick={() => onFilterChange({ ...filters, type: filters.type === 'expense' ? null : 'expense' })} className={`p-4 rounded-lg w-full transition-all duration-300 ${filters.type === 'expense' ? 'bg-red-100 dark:bg-red-500/10 ring-2 ring-red-400 transform scale-105' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('transactions.expenseForPeriod')}</p>
                <p className="text-sm font-bold text-red-500">-{Math.round(totalExpense).toLocaleString('ru-RU')}</p>
            </button>
        </div>

        {filteredTransactions.length > 0 ? (
             <div className="space-y-2">
                {Object.entries(groupedTransactions).map(([groupTitle, txs]: [string, Transaction[]]) => {
                    const dailyExpenseTotal = txs.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
                    return (
                        <div key={groupTitle}>
                            <div className="flex justify-between items-center py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                                <h3 className="font-semibold">{groupTitle}</h3>
                                {dailyExpenseTotal > 0 && <span className="font-mono">-{Math.round(dailyExpenseTotal).toLocaleString('ru-RU')}</span>}
                            </div>
                            <ul className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {txs.map(tx => <TransactionItem 
                                    key={tx.id} 
                                    transaction={tx} 
                                    paymentMethod={paymentMethodMap.get(tx.paymentMethodId || '')} 
                                    categories={getCategoriesForType(tx.type)}
                                    userDetails={userDetails}
                                    onDelete={onDeleteTransaction} 
                                    onEdit={onEditTransaction}
                                    isExpanded={tx.id === expandedId}
                                    onExpand={() => setExpandedId(prev => prev === tx.id ? null : tx.id)}
                                    language={language}
                                />)}
                            </ul>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <i className="fas fa-receipt text-5xl text-gray-400 dark:text-gray-500 mb-4"></i>
                <h3 className="text-xl font-semibold">Операций не найдено</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Попробуйте изменить фильтры или добавьте новую запись.</p>
            </div>
        )}
    </div>
  );
};

export default TransactionList;