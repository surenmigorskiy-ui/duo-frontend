import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Goal, GoalPriority, Transaction, Budget, PlannedExpense, User, UserDetails } from '../types';
import { GOAL_PRIORITY_DETAILS, GOAL_CATEGORIES, DEFAULT_CATEGORIES } from '../constants';
import FormattedNumberInput from './common/FormattedNumberInput';

interface GoalsViewProps {
  goals: Goal[];
  plannedExpenses: PlannedExpense[];
  transactions: Transaction[];
  budget: Budget;
  currentUser: User;
  userDetails: UserDetails;
  onAddGoal: (item: Omit<Goal, 'id'>) => void;
  onDeleteGoal: (id: string) => void;
  onAddPlannedExpense: (item: Omit<PlannedExpense, 'id'>) => void;
  onDeletePlannedExpense: (id: string) => void;
  onConvertToTransaction: (item: Goal | PlannedExpense) => void;
}

type ActiveTab = 'goals' | 'plans';

const GoalsContent: React.FC<Pick<GoalsViewProps, 'goals' | 'onAddGoal' | 'onDeleteGoal' | 'onConvertToTransaction' | 'currentUser' | 'userDetails'>> = ({ goals, onAddGoal, onDeleteGoal, onConvertToTransaction, currentUser, userDetails }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [priority, setPriority] = useState<GoalPriority>('medium');
    const [category, setCategory] = useState<string>(GOAL_CATEGORIES[0].name);
    const [user, setUser] = useState<User>(currentUser);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [userFilter, setUserFilter] = useState<User | 'all'>('all');
    
    const viewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (expandedId) setExpandedId(null);
        };
        window.addEventListener('scroll', handleScroll, true); // Use capture phase
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [expandedId]);

    const filteredGoals = useMemo(() => {
        return goals.filter(g => userFilter === 'all' || g.user === userFilter);
    }, [goals, userFilter]);

    const sortedGoals = useMemo(() => {
        const priorityOrder: { [key in GoalPriority]: number } = { high: 1, medium: 2, low: 3 };
        return [...filteredGoals].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }, [filteredGoals]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (description && amount) {
            onAddGoal({ description, amount: Number(amount), priority, category, user });
            setDescription('');
            setAmount('');
            setPriority('medium');
            setCategory(GOAL_CATEGORIES[0].name);
            setUser(currentUser);
            setIsAdding(false);
        }
    };
  
    const GoalItem: React.FC<{ item: Goal, isExpanded: boolean, onExpand: () => void }> = ({ item, isExpanded, onExpand }) => {
        const categoryInfo = GOAL_CATEGORIES.find(c => c.name === item.category);
        const itemRef = useRef<HTMLLIElement>(null);

        useEffect(() => {
            if (isExpanded) {
                setTimeout(() => {
                    itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        }, [isExpanded]);

        return (
            <li ref={itemRef} className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="p-4 cursor-pointer" onClick={onExpand}>
                    <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                           <i className={`${categoryInfo?.icon || 'fa-star'} text-gray-400`}></i>
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{item.description}</p>
                             <span className="font-mono text-sm text-gray-500">
                                {Math.round(item.amount).toLocaleString('ru-RU')} сум
                            </span>
                        </div>
                         <div className="flex items-center flex-shrink-0">
                            <span className={`w-3 h-3 rounded-full mr-1.5 ${GOAL_PRIORITY_DETAILS[item.priority].color}`}></span>
                            <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </div>
                    </div>
                </div>
                <div className={`spoiler ${isExpanded ? 'expanded' : ''}`}>
                    <div className="px-4">
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2 pl-14">
                            <p className="whitespace-normal font-semibold text-gray-500 dark:text-gray-400">{item.description}</p>
                            <p><span className="font-semibold w-24 inline-block">Приоритет:</span> {GOAL_PRIORITY_DETAILS[item.priority].label}</p>
                            <p><span className="font-semibold w-24 inline-block">Категория:</span> {item.category}</p>
                            <p><span className="font-semibold w-24 inline-block">Чья цель:</span> {userDetails[item.user]?.name || 'Неопределен'}</p>
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-3">
                            <button onClick={() => onConvertToTransaction(item)} className="btn-press text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-plus-circle mr-1"></i> Выполнить
                            </button>
                            <button onClick={() => onDeleteGoal(item.id)} className="btn-press text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-trash-alt mr-1"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        )
    }

    return (
        <div ref={viewRef} className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
                {(['all', 'Suren', 'Alena'] as const).map(userKey => (
                    <button
                        key={userKey}
                        onClick={() => setUserFilter(userKey)}
                        className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors ${userFilter === userKey ? 'bg-white dark:bg-gray-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        {userKey === 'all' ? 'Все' : userDetails[userKey].name}
                    </button>
                ))}
            </div>

            {!isAdding && (
                 <button onClick={() => setIsAdding(true)} className="w-full text-center py-3 border-2 border-dashed border-teal-400/50 text-teal-500 dark:text-teal-400 rounded-lg transition-all btn-press shadow-[0_0_0px_0_rgba(45,212,191,0)] hover:shadow-[0_0_15px_0_rgba(45,212,191,0.5)] hover:border-solid">
                    <i className="fas fa-plus mr-2"></i> Добавить цель
                </button>
            )}

            {isAdding && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-fade-in-up">
                    <h3 className="text-xl font-semibold mb-4">Новая цель</h3>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Описание</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Категория</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" >
                                    {GOAL_CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Сумма</label>
                                <FormattedNumberInput value={amount} onChange={setAmount} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Приоритет</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as GoalPriority)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" >
                                <option value="high">Высокий</option>
                                <option value="medium">Средний</option>
                                <option value="low">Низкий</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Чья цель</label>
                            <select value={user} onChange={e => setUser(e.target.value as User)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                                <option value="Suren">{userDetails['Suren'].name}</option>
                                <option value="Alena">{userDetails['Alena'].name}</option>
                                <option value="shared">{userDetails['shared'].name}</option>
                            </select>
                        </div>
                        <div className="flex justify-end pt-2 space-x-3">
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 btn-press">Отмена</button>
                            <button type="submit" className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-teal-600 btn-press">Сохранить</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                 {sortedGoals.length > 0 ? (
                    <ul className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                       {sortedGoals.map(item => (
                           <GoalItem 
                                key={item.id}
                                item={item}
                                isExpanded={item.id === expandedId}
                                onExpand={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                            />
                       ))}
                    </ul>
                 ) : !isAdding && (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <i className="fas fa-bullseye text-5xl text-gray-400 dark:text-gray-500 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Целей пока нет</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Добавьте свою первую финансовую цель, чтобы начать планирование.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const PlannedExpensesContent: React.FC<Pick<GoalsViewProps, 'plannedExpenses' | 'onAddPlannedExpense' | 'onDeletePlannedExpense' | 'onConvertToTransaction' | 'currentUser' | 'userDetails'>> = ({ plannedExpenses, onAddPlannedExpense, onDeletePlannedExpense, onConvertToTransaction, currentUser, userDetails }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0].name);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [user, setUser] = useState<User>(currentUser);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [userFilter, setUserFilter] = useState<User | 'all'>('all');

     const filteredPlannedExpenses = useMemo(() => {
        return plannedExpenses.filter(p => userFilter === 'all' || p.user === userFilter);
    }, [plannedExpenses, userFilter]);

    const sortedPlannedExpenses = useMemo(() => {
        return [...filteredPlannedExpenses].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [filteredPlannedExpenses]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (description && amount) {
            onAddPlannedExpense({ description, amount: Number(amount), category, dueDate: new Date(dueDate).toISOString(), user });
            setDescription('');
            setAmount('');
            setCategory(DEFAULT_CATEGORIES[0].name);
            setDueDate(new Date().toISOString().split('T')[0]);
            setUser(currentUser);
            setIsAdding(false);
        }
    };
    
    const PlannedExpenseItem: React.FC<{ item: PlannedExpense, isExpanded: boolean, onExpand: () => void }> = ({ item, isExpanded, onExpand }) => {
        const categoryInfo = DEFAULT_CATEGORIES.find(c => c.name === item.category);
        const itemRef = useRef<HTMLLIElement>(null);

        useEffect(() => {
            if (isExpanded) {
                 setTimeout(() => {
                    itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        }, [isExpanded]);

        return (
            <li ref={itemRef} className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="p-4 cursor-pointer" onClick={onExpand}>
                    <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0`}>
                            <i className={`${categoryInfo?.icon || 'fa-star'} text-gray-400`}></i>
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{item.description}</p>
                            <div className="flex items-center space-x-3 text-sm mt-1">
                                <span className="font-mono text-gray-500">
                                    {Math.round(item.amount).toLocaleString('ru-RU')} сум
                                </span>
                                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <i className="fas fa-calendar-alt mr-1.5"></i> {new Date(item.dueDate).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                        </div>
                        <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </div>
                </div>
                <div className={`spoiler ${isExpanded ? 'expanded' : ''}`}>
                     <div className="px-4">
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2 pl-14">
                            <p className="whitespace-normal font-semibold text-gray-500 dark:text-gray-400">{item.description}</p>
                            <p><span className="font-semibold w-24 inline-block">Категория:</span> {item.category}</p>
                            <p><span className="font-semibold w-24 inline-block">Чей план:</span> {userDetails[item.user]?.name || 'Неопределен'}</p>
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-3">
                            <button onClick={() => onConvertToTransaction(item)} className="btn-press text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-check-circle mr-1"></i> Оплачено
                            </button>
                            <button onClick={() => onDeletePlannedExpense(item.id)} className="btn-press text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-trash-alt mr-1"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
                {(['all', 'Suren', 'Alena'] as const).map(userKey => (
                    <button
                        key={userKey}
                        onClick={() => setUserFilter(userKey)}
                        className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors ${userFilter === userKey ? 'bg-white dark:bg-gray-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        {userKey === 'all' ? 'Все' : userDetails[userKey].name}
                    </button>
                ))}
            </div>

            {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="w-full text-center py-3 border-2 border-dashed border-teal-400/50 text-teal-500 dark:text-teal-400 rounded-lg transition-all btn-press shadow-[0_0_0px_0_rgba(45,212,191,0)] hover:shadow-[0_0_15px_0_rgba(45,212,191,0.5)] hover:border-solid">
                    <i className="fas fa-plus mr-2"></i> Добавить план
                </button>
            )}
            
            {isAdding && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-fade-in-up">
                    <h3 className="text-xl font-semibold mb-4">Добавить плановый расход</h3>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Описание</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Категория расхода</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" >
                                    {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Сумма</label>
                                <FormattedNumberInput value={amount} onChange={setAmount} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Планируемая дата</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Чей план</label>
                            <select value={user} onChange={e => setUser(e.target.value as User)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                                <option value="Suren">{userDetails['Suren'].name}</option>
                                <option value="Alena">{userDetails['Alena'].name}</option>
                                <option value="shared">{userDetails['shared'].name}</option>
                            </select>
                        </div>
                        <div className="flex justify-end pt-2 space-x-3">
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 btn-press">Отмена</button>
                            <button type="submit" className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-teal-600 btn-press">Сохранить</button>
                        </div>
                    </form>
                </div>
            )}

             <div className="space-y-3">
                 {sortedPlannedExpenses.length > 0 ? (
                    <ul className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                       {sortedPlannedExpenses.map(item => (
                            <PlannedExpenseItem 
                                key={item.id} 
                                item={item} 
                                isExpanded={item.id === expandedId}
                                onExpand={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                            />
                        ))}
                    </ul>
                 ) : !isAdding && (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <i className="fas fa-calendar-check text-5xl text-gray-400 dark:text-gray-500 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Планов пока нет</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Запланируйте предстоящие расходы, чтобы не забыть о них.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const GoalsView: React.FC<GoalsViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('goals');
    const { transactions, goals, plannedExpenses } = props;

    const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0), [transactions]);
    const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), [transactions]);
    const totalPlannedGlobal = useMemo(() => plannedExpenses.reduce((sum, t) => sum + t.amount, 0), [plannedExpenses]);
    
    const availableBalance = totalIncome - totalExpense - totalPlannedGlobal;

    const forecastAmount = useMemo(() => {
        return activeTab === 'goals'
            ? goals.reduce((sum, g) => sum + g.amount, 0)
            : plannedExpenses.reduce((sum, p) => sum + p.amount, 0);
    }, [activeTab, goals, plannedExpenses]);

    const forecastTitle = activeTab === 'goals' ? "Прогноз по целям" : "Сумма планов";
    
    const tabs = [
        { id: 'goals', label: 'Цели' },
        { id: 'plans', label: 'Планы' },
    ];

    return (
        <div className="p-4 md:p-6 space-y-6 text-gray-900 dark:text-gray-100">
             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{forecastTitle}</p>
                <p className="text-xl font-bold text-teal-500 dark:text-teal-400 my-1">{Math.round(forecastAmount).toLocaleString('ru-RU')} сум</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">можно выделить из остатка в {Math.round(availableBalance).toLocaleString('ru-RU')} сум</p>
            </div>
            
             <div className="relative">
                <div className="flex justify-center border-b border-gray-200 dark:border-gray-700">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as ActiveTab)} 
                            className={`w-1/2 py-3 text-sm font-semibold transition-colors focus:outline-none ${activeTab === tab.id ? 'text-teal-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div 
                    className="absolute bottom-0 h-0.5 bg-teal-500 transition-all duration-300 ease-in-out"
                    style={{
                        width: `${100 / tabs.length}%`,
                        left: `${tabs.findIndex(t => t.id === activeTab) * (100 / tabs.length)}%`,
                    }}
                ></div>
            </div>
            {activeTab === 'goals' && <GoalsContent {...props} />}
            {activeTab === 'plans' && <PlannedExpensesContent {...props} />}
        </div>
    );
};

export default GoalsView;