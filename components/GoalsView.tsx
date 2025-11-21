import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Goal, GoalPriority, Transaction, Budget, PlannedExpense, User, UserDetails, Language } from '../types';
import { GOAL_PRIORITY_DETAILS, GOAL_CATEGORIES, DEFAULT_CATEGORIES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
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
  language: Language;
}

type ActiveTab = 'goals' | 'plans';

const GoalsContent: React.FC<Pick<GoalsViewProps, 'goals' | 'onAddGoal' | 'onDeleteGoal' | 'onConvertToTransaction' | 'currentUser' | 'userDetails' | 'language'>> = ({ goals, onAddGoal, onDeleteGoal, onConvertToTransaction, currentUser, userDetails, language }) => {
    const t = useTranslation(language);
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
            setExpandedId(prev => (prev ? null : prev));
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

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
        const spoilerContentRef = useRef<HTMLDivElement>(null);
        const [spoilerHeight, setSpoilerHeight] = useState(0);

        useEffect(() => {
            if (isExpanded) {
                setTimeout(() => {
                    itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        }, [isExpanded]);

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
            <li ref={itemRef} className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="p-4 cursor-pointer" onClick={onExpand}>
                    <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                           <i className={`${categoryInfo?.icon || 'fa-star'} text-gray-400`}></i>
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{item.description}</p>
                             <span className="font-mono text-sm text-gray-500">
                                {Math.round(item.amount).toLocaleString('ru-RU')}
                            </span>
                        </div>
                         <div className="flex items-center flex-shrink-0">
                            <span className={`w-3 h-3 rounded-full mr-1.5 ${GOAL_PRIORITY_DETAILS[item.priority].color}`}></span>
                            <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </div>
                    </div>
                </div>
                <div 
                    className={`spoiler ${isExpanded ? 'expanded' : ''}`}
                    style={{ maxHeight: `${spoilerHeight}px`, overflowY: 'auto' }}
                >
                    <div ref={spoilerContentRef} className="px-4 pb-4">
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2 pl-14 pt-4">
                            <p className="whitespace-normal font-semibold text-gray-500 dark:text-gray-400 break-words">{item.description}</p>
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('goals.priority')}:</span> {GOAL_PRIORITY_DETAILS[item.priority].label}</p>
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('goals.category')}:</span> {item.category}</p>
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('goals.whoseGoal')}:</span> {userDetails[item.user]?.name || 'Неопределен'}</p>
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-3 pl-14">
                            <button onClick={(e) => { e.stopPropagation(); onConvertToTransaction(item); }} className="btn-press text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-plus-circle mr-1"></i> {t('goals.execute')}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteGoal(item.id); }} className="btn-press text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-trash-alt mr-1"></i> {t('goals.delete')}
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
                {(['all', ...(userDetails ? Object.keys(userDetails).filter((key) => key !== 'shared') : [])] as (User | 'all')[]).map(userKey => (
                    <button
                        key={userKey}
                        onClick={() => setUserFilter(userKey)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${userFilter === userKey ? 'bg-white dark:bg-gray-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        {userKey === 'all' ? t('goals.all') : (userDetails && userDetails[userKey as User]?.name) || userKey}
                    </button>
                ))}
            </div>

            {!isAdding && (
                 <button onClick={() => setIsAdding(true)} className="w-full text-center py-3 border-2 border-dashed border-teal-400/50 text-teal-500 dark:text-teal-400 rounded-lg transition-all btn-press shadow-[0_0_0px_0_rgba(45,212,191,0)] hover:shadow-[0_0_15px_0_rgba(45,212,191,0.5)] hover:border-solid">
                    <i className="fas fa-plus mr-2"></i> {t('goals.add')}
                </button>
            )}

            {isAdding && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-fade-in-up">
                    <h3 className="text-xl font-semibold mb-4">{t('goals.add')}</h3>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.description')}</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.category')}</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" >
                                    {GOAL_CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.amount')}</label>
                                <FormattedNumberInput value={amount} onChange={setAmount} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.priority')}</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as GoalPriority)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" >
                                <option value="high">{t('goals.high')}</option>
                                <option value="medium">{t('goals.medium')}</option>
                                <option value="low">{t('goals.low')}</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.whoseGoal')}</label>
                            <select value={user} onChange={e => setUser(e.target.value as User)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                                {userDetails && Object.keys(userDetails).map((userId) => (
                                    <option key={userId} value={userId}>{userDetails[userId as User]?.name || userId}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end pt-2 space-x-3">
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 btn-press">{t('common.cancel')}</button>
                            <button type="submit" className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-teal-600 btn-press">{t('common.save')}</button>
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

const PlannedExpensesContent: React.FC<Pick<GoalsViewProps, 'plannedExpenses' | 'onAddPlannedExpense' | 'onDeletePlannedExpense' | 'onConvertToTransaction' | 'currentUser' | 'userDetails' | 'language'>> = ({ plannedExpenses, onAddPlannedExpense, onDeletePlannedExpense, onConvertToTransaction, currentUser, userDetails, language }) => {
    const t = useTranslation(language);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0].name);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [user, setUser] = useState<User>(currentUser);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [userFilter, setUserFilter] = useState<User | 'all'>('all');

    useEffect(() => {
        const handleScroll = () => {
            setExpandedId(prev => (prev ? null : prev));
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

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
        const spoilerContentRef = useRef<HTMLDivElement>(null);
        const [spoilerHeight, setSpoilerHeight] = useState(0);

        useEffect(() => {
            if (isExpanded) {
                 setTimeout(() => {
                    itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        }, [isExpanded]);

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
                                    {Math.round(item.amount).toLocaleString('ru-RU')}
                                </span>
                                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <i className="fas fa-calendar-alt mr-1.5"></i> {new Date(item.dueDate).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                        </div>
                        <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </div>
                </div>
                <div 
                    className={`spoiler ${isExpanded ? 'expanded' : ''}`}
                    style={{ maxHeight: `${spoilerHeight}px`, overflowY: 'auto' }}
                >
                     <div ref={spoilerContentRef} className="px-4 pb-4">
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2 pl-14 pt-4">
                            <p className="whitespace-normal font-semibold text-gray-500 dark:text-gray-400 break-words">{item.description}</p>
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('goals.category')}:</span> {item.category}</p>
                            <p className="break-words"><span className="font-semibold w-24 inline-block">{t('goals.whosePlan')}:</span> {userDetails[item.user]?.name || 'Неопределен'}</p>
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-3 pl-14">
                            <button onClick={(e) => { e.stopPropagation(); onConvertToTransaction(item); }} className="btn-press text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-check-circle mr-1"></i> {t('goals.paid')}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeletePlannedExpense(item.id); }} className="btn-press text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors py-1 px-3 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <i className="fas fa-trash-alt mr-1"></i> {t('goals.delete')}
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
                {(['all', ...Object.keys(userDetails).filter((key) => key !== 'shared')] as (User | 'all')[]).map(userKey => (
                    <button
                        key={userKey}
                        onClick={() => setUserFilter(userKey)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${userFilter === userKey ? 'bg-white dark:bg-gray-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        {userKey === 'all' ? t('goals.all') : userDetails[userKey as User]?.name || userKey}
                    </button>
                ))}
            </div>

            {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="w-full text-center py-3 border-2 border-dashed border-teal-400/50 text-teal-500 dark:text-teal-400 rounded-lg transition-all btn-press shadow-[0_0_0px_0_rgba(45,212,191,0)] hover:shadow-[0_0_15px_0_rgba(45,212,191,0.5)] hover:border-solid">
                    <i className="fas fa-plus mr-2"></i> {t('goals.addPlan')}
                </button>
            )}
            
            {isAdding && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-fade-in-up">
                    <h3 className="text-xl font-semibold mb-4">{t('goals.addPlan')}</h3>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.description')}</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.category')}</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" >
                                    {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.amount')}</label>
                                <FormattedNumberInput value={amount} onChange={setAmount} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.plannedDate')}</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">{t('goals.whosePlan')}</label>
                            <select value={user} onChange={e => setUser(e.target.value as User)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                                {userDetails && Object.keys(userDetails).map((userId) => (
                                    <option key={userId} value={userId}>{userDetails[userId as User]?.name || userId}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end pt-2 space-x-3">
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 btn-press">{t('common.cancel')}</button>
                            <button type="submit" className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-teal-600 btn-press">{t('common.save')}</button>
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
    const { transactions, goals, plannedExpenses, language } = props;
    const t = useTranslation(language);

    const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0), [transactions]);
    const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), [transactions]);
    const totalPlannedGlobal = useMemo(() => plannedExpenses.reduce((sum, t) => sum + t.amount, 0), [plannedExpenses]);
    
    const availableBalance = totalIncome - totalExpense - totalPlannedGlobal;

    const forecastAmount = useMemo(() => {
        return activeTab === 'goals'
            ? goals.reduce((sum, g) => sum + g.amount, 0)
            : plannedExpenses.reduce((sum, p) => sum + p.amount, 0);
    }, [activeTab, goals, plannedExpenses]);

    const forecastTitle = activeTab === 'goals' ? t('goals.forecast') : t('goals.plansSum');
    
    const tabs = [
        { id: 'goals', label: t('goals.title') },
        { id: 'plans', label: t('goals.plans') },
    ];

    return (
        <div className="p-4 md:p-6 space-y-6 text-gray-900 dark:text-gray-100">
             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{forecastTitle}</p>
                <p className="text-xl font-bold text-teal-500 dark:text-teal-400 my-1">{Math.round(forecastAmount).toLocaleString('ru-RU')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('goals.canAllocate')} {Math.round(availableBalance).toLocaleString('ru-RU')}</p>
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