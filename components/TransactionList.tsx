import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Transaction, Category, User, DateRangePreset, PaymentMethodType, CustomDateRange, PaymentMethod, UserDetails } from '../types';

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
}> = ({ transaction, paymentMethod, categories, userDetails, onDelete, onEdit, isExpanded, onExpand }) => {
    const isExpense = transaction.type === 'expense';
    const categoryInfo = categories.find(c => c.name === transaction.category);
    const subCategoryInfo = categoryInfo?.subCategories?.find(sc => sc.name === transaction.subCategory);
    const icon = subCategoryInfo?.icon || categoryInfo?.icon || 'fas fa-question-circle';
    const userInfo = userDetails[transaction.user];
    const spoilerContentRef = useRef<HTMLDivElement>(null);
    const [spoilerHeight, setSpoilerHeight] = useState(0);
    
    const priorityColorClass = isExpense ? (transaction.priority === 'must-have' ? 'bg-orange-400' : 'bg-yellow-400') : '';
    const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
    const amountPrefix = isExpense ? '-' : '+';

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
        <li className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
             <div className="p-4">
                <div className="flex items-center space-x-4 cursor-pointer" onClick={onExpand}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-xl flex-shrink-0`}>
                        <i className={`${icon} text-gray-500 dark:text-gray-400`}></i>
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-100">{transaction.description}</p>
                         <div className="mt-1.5">
                            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">{transaction.subCategory || transaction.category}</span>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className={`font-mono ${amountColor} text-lg font-semibold whitespace-nowrap`}>{amountPrefix}{Math.round(transaction.amount).toLocaleString('ru-RU')} сум</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div 
                    className={`spoiler ${isExpanded ? 'expanded' : ''}`}
                    style={{ maxHeight: `${spoilerHeight}px` }}
                >
                    <div ref={spoilerContentRef} className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                         <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2 pl-14">
                            <p><span className="font-semibold w-24 inline-block">Категория:</span> {transaction.category}</p>
                            {transaction.subCategory && <p><span className="font-semibold w-24 inline-block">Подкатегория:</span> {transaction.subCategory}</p>}
                            <div className="flex items-center">
                                <span className="font-semibold w-24 inline-block">Пользователь:</span>
                                <span className={`px-2 py-0.5 rounded-full text-white text-opacity-80 text-xs ${userInfo.color}`}>{userInfo.name}</span>
                            </div>
                            {isExpense && <p><span className="font-semibold w-24 inline-block">Приоритет:</span><span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${priorityColorClass}`}></span>{transaction.priority === 'must-have' ? 'Обязательный' : 'Желательный'}</p>}
                            {paymentMethod && <p><span className="font-semibold w-24 inline-block">Счет:</span> {paymentMethod.name}</p>}
                            <p><span className="font-semibold w-24 inline-block">Дата и время:</span> {new Date(transaction.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-3">
                            <button onClick={() => onEdit(transaction)} className="btn-press text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-pencil-alt mr-1"></i> Изменить
                            </button>
                            <button onClick={() => onDelete(transaction.id)} className="btn-press text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-trash-alt mr-1"></i> Удалить
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
                    {category.subCategories?.map(sub => (
                         <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer p-1">
                            <input type="checkbox" checked={selectedSubCategories.includes(sub.name)} onChange={() => onSubCategoryToggle(sub.name)} className="rounded text-teal-500 focus:ring-teal-500"/>
                            <span>{sub.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, paymentMethods, expenseCategories, incomeCategories, userDetails, onDeleteTransaction, onEditTransaction, filters, onFilterChange }) => {
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState<DateRangePreset>('month');
    const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({ start: null, end: null });
    const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<PaymentMethodType[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    
    const paymentMethodMap = useMemo(() => {
        return new Map(paymentMethods.map(pm => [pm.id, pm]));
    }, [paymentMethods]);

    const allCategories = useMemo(() => [...expenseCategories, ...incomeCategories].sort((a,b) => a.name.localeCompare(b.name)), [expenseCategories, incomeCategories]);

    const sortedTransactions = useMemo(() => 
        [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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
            <h2 className="text-2xl font-bold mb-4">Мониторинг</h2>
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
                        <span>Фильтры</span>
                        {activeFilterCount > 0 && <span className="ml-2 bg-teal-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>}
                    </button>
                    {showFilters && (
                        <div ref={filterPanelRef} className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 p-4 animate-slide-in">
                           <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Пользователи</h4>
                                    {(['Suren', 'Alena', 'shared'] as User[]).map(user => (
                                        <label key={user} className="flex items-center space-x-2 text-sm cursor-pointer p-1">
                                            <input type="checkbox" checked={selectedUsers.includes(user)} onChange={() => handleUserToggle(user)} className="rounded text-teal-500 focus:ring-teal-500"/>
                                            <span>{userDetails[user].name}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <h4 className="font-semibold text-sm mb-2">Категории</h4>
                                    <div className="space-y-1">
                                       {allCategories.map(cat => (
                                          <CategoryFilterItem 
                                            key={cat.id}
                                            category={cat}
                                            selectedCategories={selectedCategories}
                                            selectedSubCategories={selectedSubCategories}
                                            onCategoryToggle={handleCategoryToggle}
                                            onSubCategoryToggle={handleSubCategoryToggle}
                                          />
                                       ))}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Доход за период</p>
                <p className="text-lg font-bold text-green-500">+{Math.round(totalIncome).toLocaleString('ru-RU')} сум</p>
            </button>
            <button onClick={() => onFilterChange({ ...filters, type: filters.type === 'expense' ? null : 'expense' })} className={`p-4 rounded-lg w-full transition-all duration-300 ${filters.type === 'expense' ? 'bg-red-100 dark:bg-red-500/10 ring-2 ring-red-400 transform scale-105' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                <p className="text-sm text-gray-500 dark:text-gray-400">Расход за период</p>
                <p className="text-lg font-bold text-red-500">-{Math.round(totalExpense).toLocaleString('ru-RU')} сум</p>
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
                                {dailyExpenseTotal > 0 && <span className="font-mono">-{Math.round(dailyExpenseTotal).toLocaleString('ru-RU')} сум</span>}
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