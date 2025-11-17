import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Transaction, Budget, PlannedExpense, User, Priority, PaymentMethod, DashboardLayoutItem, UserDetails } from '../types';
import { PieChart, Pie, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import { getFinancialAdvice } from '../services/geminiService';
import Spinner from './common/Spinner';
import InfoTooltip from './common/InfoTooltip';

// Hook for scroll animations that triggers rendering
const useAnimateOnScroll = (ref: React.RefObject<HTMLElement>) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    
    const currentRef = ref.current;
    if (currentRef) {
        observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref]);
  return isVisible;
};


const PALETTE = ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#8e44ad', '#d35400'];
const PRIORITY_PALETTE = ['#f39c12', '#3498db']; // Orange for Must-have, Blue for Nice-to-have

const USER_HEX_COLORS: {[key in User]: string} = {
    Suren: '#3b82f6',
    Alena: '#ec4899',
    shared: '#6366f1',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const name = payload[0].name;
    const value = payload[0].value;
    
    return (
      <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg text-sm">
        <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{label || name}</p>
        <p style={{ color: payload[0].payload.fill }}>
            {`${Math.round(value).toLocaleString('ru-RU')} сум`}
        </p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }: any) => {
  const radius = outerRadius * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = (percent * 100).toFixed(0);
  const name = payload.name;

  if (percent < 0.05) return null;

  const words = name.split(' ');
  if (words.length > 1 && name.length > 12) {
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold pointer-events-none">
          <tspan x={x} dy="-0.5em">{words[0]}</tspan>
          <tspan x={x} dy="1.1em">{`${words.slice(1).join(' ')} ${percentage}%`}</tspan>
        </text>
      );
  }

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold pointer-events-none">
      {`${name} ${percentage}%`}
    </text>
  );
};

const AIAdvisor: React.FC<{ financialData: { transactions: Transaction[], budget: Budget } }> = ({ financialData }) => {
    const [advice, setAdvice] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleGetAdvice = async () => {
        setIsLoading(true);
        setError('');
        setAdvice('');
        try {
            const result = await getFinancialAdvice(financialData);
            setAdvice(result);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const Sparkles = () => (
        <>
            {[...Array(4)].map((_, i) => (
                <div key={i} className="sparkle" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                }} />
            ))}
        </>
    );

    if (!isExpanded) {
        return (
            <div className="mt-8">
                <button
                    onClick={() => { setIsExpanded(true); handleGetAdvice(); }}
                    className="gemini-button w-full relative text-sm font-semibold bg-gradient-to-r from-teal-400 to-blue-500 text-white py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                >
                    <Sparkles/>
                    <i className="fas fa-brain mr-2"></i>Получить совет от ИИ
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mt-8">
             <div className="flex items-start space-x-4">
                <div className="text-2xl mt-1">✨</div>
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Совет от ИИ-ассистента</h3>
                    {isLoading ? (
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                            <Spinner size="sm" />
                            <span>Анализирую ваши финансы...</span>
                        </div>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : advice ? (
                        <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{advice}</div>
                    ) : null }
                </div>
            </div>
        </div>
    )
}

const WIDGETS_CONFIG = [
    { id: 'categorySpending', name: 'Расходы по категориям' },
    { id: 'dailySpending', name: 'Динамика расходов' },
    { id: 'incomeVsExpense', name: 'Доходы / Расходы' },
    { id: 'budgetVsActual', name: 'Бюджет vs. Расходы' },
    { id: 'paymentMethodSpending', name: 'Расходы по счетам' },
    { id: 'userSpending', name: 'Расходы по пользователям' },
    { id: 'aiAdvisor', name: 'Совет от ИИ' },
];

const DashboardSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    layout: DashboardLayoutItem[];
    onLayoutChange: (newLayout: DashboardLayoutItem[]) => void;
}> = ({ isOpen, onClose, layout, onLayoutChange }) => {
    
    const handleVisibilityToggle = (id: string) => {
        const newLayout = layout.map(item => item.id === id ? { ...item, visible: !item.visible } : item);
        onLayoutChange(newLayout);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newLayout = [...layout];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newLayout.length) {
            [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
            onLayoutChange(newLayout);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-gray-800 dark:text-gray-200">
                 <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold">Настроить дашборд</h3>
                 </div>
                 <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                    {layout.map((item, index) => {
                        const config = WIDGETS_CONFIG.find(w => w.id === item.id);
                        return (
                            <div key={item.id} className="flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <i className={`fas fa-grip-vertical text-gray-400 dark:text-gray-500 mr-4`}></i>
                                <span className="flex-grow font-semibold">{config?.name}</span>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="w-8 h-8 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"><i className="fas fa-arrow-up"></i></button>
                                    <button onClick={() => handleMove(index, 'down')} disabled={index === layout.length - 1} className="w-8 h-8 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"><i className="fas fa-arrow-down"></i></button>
                                    <button onClick={() => handleVisibilityToggle(item.id)} className={`w-8 h-8 rounded-md ${item.visible ? 'text-teal-500' : 'text-gray-400'}`}><i className={`fas ${item.visible ? 'fa-eye' : 'fa-eye-slash'}`}></i></button>
                                </div>
                            </div>
                        )
                    })}
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="bg-teal-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-teal-600">Готово</button>
                 </div>
            </div>
        </div>
    );
};

interface DashboardProps {
    transactions: Transaction[];
    budget: Budget;
    plannedExpenses: PlannedExpense[];
    paymentMethods: PaymentMethod[];
    userDetails: UserDetails;
    onNavigateToTransactions: (type: 'income' | 'expense') => void;
    isSyncing: boolean;
    layout: DashboardLayoutItem[];
    onLayoutChange: (newLayout: DashboardLayoutItem[]) => void;
}

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, budget, plannedExpenses, paymentMethods, userDetails, onNavigateToTransactions, isSyncing, layout, onLayoutChange }) => {
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const prevIsSyncing = usePrevious(isSyncing);

  const refs = useRef<{[key: string]: React.RefObject<HTMLDivElement>}>({});
  const isVisible: {[key: string]: boolean} = {};

  layout.forEach(item => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      refs.current[item.id] = useRef(null);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      isVisible[item.id] = useAnimateOnScroll(refs.current[item.id]);
  });

  useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      if (prevIsSyncing && !isSyncing) {
          setShowSyncSuccess(true);
          timer = setTimeout(() => setShowSyncSuccess(false), 2000);
      }
      return () => clearTimeout(timer);
  }, [isSyncing, prevIsSyncing]);

  const availableMonths = useMemo(() => {
    const months = new Map<string, string>();
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!months.has(monthKey)) {
             months.set(monthKey, date.toLocaleString('ru-RU', { month: 'long' }));
        }
    });
    const sortedKeys = Array.from(months.keys()).sort((a,b) => {
        const dateA = new Date(parseInt(a.split('-')[0]), parseInt(a.split('-')[1]));
        const dateB = new Date(parseInt(b.split('-')[0]), parseInt(b.split('-')[1]));
        return dateB.getTime() - dateA.getTime();
    });
    return sortedKeys.map(key => ({ key, label: months.get(key)! }));
  }, [transactions]);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]?.key || '');

   useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].key);
    }
   }, [availableMonths, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        const effectiveMonth = selectedMonth || availableMonths[0]?.key;
        if (!effectiveMonth) return true;
        
        const transactionDate = new Date(t.date);
        const [year, month] = effectiveMonth.split('-');
        return transactionDate.getFullYear() === parseInt(year) && transactionDate.getMonth() === parseInt(month);
    });
  }, [transactions, selectedMonth, availableMonths]);

  const expenses = useMemo(() => filteredTransactions.filter(t => t.type === 'expense'), [filteredTransactions]);
  const incomes = useMemo(() => filteredTransactions.filter(t => t.type === 'income'), [filteredTransactions]);

  const totalSpent = useMemo(() => expenses.reduce((sum, t) => sum + t.amount, 0), [expenses]);
  const totalIncome = useMemo(() => incomes.reduce((sum, t) => sum + t.amount, 0), [incomes]);
  const totalPlanned = useMemo(() => plannedExpenses.reduce((sum, t) => sum + t.amount, 0), [plannedExpenses]);
  const remainingBudget = totalIncome - totalSpent - totalPlanned;
  
  const categorySpendingData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};
    expenses.forEach(t => { dataMap[t.category] = (dataMap[t.category] || 0) + t.amount; });
    return Object.entries(dataMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);
  
  const dailySpendingData = useMemo(() => {
    if (!selectedMonth) return [];
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: 0 }));
    
    expenses.forEach(t => {
        const date = new Date(t.date);
        if(date.getFullYear() === year && date.getMonth() === month) {
            const dayOfMonth = date.getDate();
            const index = dailyData.findIndex(d => d.day === dayOfMonth);
            if(index !== -1) {
                dailyData[index].amount += t.amount;
            }
        }
    });

    return dailyData;
  }, [expenses, selectedMonth]);

  const userSpendingData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};
    expenses.forEach(t => { dataMap[t.user] = (dataMap[t.user] || 0) + t.amount; });
    return Object.entries(dataMap).map(([name, value]) => ({ name: userDetails[name as User].name, value, userKey: name as User })).sort((a, b) => b.value - a.value);
  }, [expenses, userDetails]);
  
  const prioritySpendingData = useMemo(() => {
    const dataMap: {[key in Priority]: number} = {'must-have': 0, 'nice-to-have': 0};
    expenses.forEach(t => { dataMap[t.priority] = (dataMap[t.priority] || 0) + t.amount; });
    return [
      { name: 'Обязательные', value: dataMap['must-have']},
      { name: 'Желательные', value: dataMap['nice-to-have']},
    ].filter(d => d.value > 0);
  }, [expenses]);
  
  const paymentMethodSpendingData = useMemo(() => {
      const dataMap: { [key: string]: number } = {};
      const pmMap = new Map(paymentMethods.map(pm => [pm.id, pm.name]));
      expenses.forEach(t => {
          const pmName = pmMap.get(t.paymentMethodId || 'cash') || 'Неизвестно';
          dataMap[pmName] = (dataMap[pmName] || 0) + t.amount;
      });
      return Object.entries(dataMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [expenses, paymentMethods]);
  
  const budgetVsActualData = useMemo(() => {
      const spentByCategory: { [key: string]: number } = {};
      expenses.forEach(t => {
          spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
      });
      // FIX: Refactored to avoid destructuring in arguments and explicitly typed the array entries, 
      // which can prevent subtle type inference errors.
      return Object.entries(budget.byCategory)
        .filter((entry: [string, number]) => entry[1] > 0)
        .map((entry: [string, number]) => {
          const category = entry[0];
          const percentage = entry[1];
          const budgetAmount = (budget.total * percentage) / 100;
          const actualAmount = spentByCategory[category] || 0;
          return { name: category, Бюджет: budgetAmount, Расход: actualAmount };
        });
  }, [expenses, budget]);


  const incomeVsExpenseData = [{ name: 'Потоки', Доход: totalIncome, Расход: totalSpent }];

  const spendingInsight = useMemo(() => {
    if (categorySpendingData.length < 2 || totalSpent === 0) return null;
    const top1 = categorySpendingData[0]; const top2 = categorySpendingData[1];
    // FIX: The toFixed method requires an argument specifying the number of digits after the decimal point.
    const top1_percent = ((top1.value / totalSpent) * 100).toFixed(0); const top2_percent = ((top2.value / totalSpent) * 100).toFixed(0);
    return `💡 Основные расходы — ${top1.name} (${top1_percent}%) и ${top2.name} (${top2_percent}%)`;
  }, [categorySpendingData, totalSpent]);

  const widgetComponents: {[key: string]: React.ReactNode} = {
    categorySpending: (
        <div ref={refs.current['categorySpending']} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Расходы по категориям</h3>
            {spendingInsight && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{spendingInsight}</p>}
            {isVisible['categorySpending'] && (categorySpendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                <Pie data={categorySpendingData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name">
                    {categorySpendingData.map((_, index) => <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} className="focus:outline-none" />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{fontSize: "12px", paddingTop: '20px' }}/>
                </PieChart>
            </ResponsiveContainer>
            ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-chart-pie text-4xl mb-4"></i><p>Недостаточно данных для построения графика.</p></div> ))}
        </div>
    ),
    dailySpending: (
        <div ref={refs.current['dailySpending']} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Динамика расходов по дням</h3>
            {isVisible['dailySpending'] && (dailySpendingData.some(d => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySpendingData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="currentColor" opacity={0.1} />
                    <XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(day) => `${day}`} />
                    <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="amount" name="Расход" stroke="#1abc9c" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
            ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-chart-line text-4xl mb-4"></i><p>Нет расходов в этом месяце.</p></div> ))}
        </div>
    ),
    incomeVsExpense: (
        <div ref={refs.current['incomeVsExpense']} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Доходы / Расходы</h3>
            {isVisible['incomeVsExpense'] && (totalIncome > 0 || totalSpent > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeVsExpenseData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip content={<CustomTooltip />} />
                         <Legend />
                         <Bar dataKey="Доход" fill="#2ecc71" />
                         <Bar dataKey="Расход" fill="#e74c3c" />
                    </BarChart>
                </ResponsiveContainer>
            ): ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-balance-scale text-4xl mb-4"></i><p>Нет данных о доходах или расходах.</p></div>))}
        </div>
    ),
    budgetVsActual: (
        <div ref={refs.current['budgetVsActual']} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Бюджет vs. Расходы</h3>
            {isVisible['budgetVsActual'] && (budgetVsActualData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={budgetVsActualData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10 }} stroke="currentColor" opacity={0.5} angle={-25} textAnchor="end" height={50} />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip content={<CustomTooltip />} />
                         <Legend />
                         <Bar dataKey="Бюджет" fill="#3498db" />
                         <Bar dataKey="Расход" fill="#f1c40f" />
                    </BarChart>
                </ResponsiveContainer>
            ): ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-tasks text-4xl mb-4"></i><p>Нет категорий с бюджетом для сравнения.</p></div>))}
        </div>
    ),
    paymentMethodSpending: (
        <div ref={refs.current['paymentMethodSpending']} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Расходы по счетам</h3>
           {isVisible['paymentMethodSpending'] && (paymentMethodSpendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={paymentMethodSpendingData} cx="50%" cy="50%" outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name" labelLine={false} label={renderCustomizedLabel}>
                            {paymentMethodSpendingData.map((_, index) => <Cell key={`cell-${index}`} fill={PALETTE.slice(2)[index % PALETTE.slice(2).length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={10} />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-wallet text-4xl mb-4"></i><p>Нет данных о расходах по счетам.</p></div> ))}
        </div>
    ),
    userSpending: (
        <div ref={refs.current['userSpending']} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Расходы по пользователям</h3>
           {isVisible['userSpending'] && (userSpendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={userSpendingData} cx="50%" cy="50%" outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name" labelLine={false} label={renderCustomizedLabel}>
                            {userSpendingData.map((entry) => <Cell key={`cell-${entry.name}`} fill={USER_HEX_COLORS[entry.userKey]} /> )}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={10} />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-users text-4xl mb-4"></i><p>Нет данных о расходах.</p></div> ))}
        </div>
    ),
    aiAdvisor: (
        <div ref={refs.current['aiAdvisor']}>
            <AIAdvisor financialData={{ transactions: filteredTransactions, budget }} />
        </div>
    )
  }

  const singleColWidgets = ['categorySpending', 'budgetVsActual', 'aiAdvisor'];

  return (
    <div className="p-4 md:p-6 space-y-8 text-gray-900 dark:text-gray-100">
        <DashboardSettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            layout={layout}
            onLayoutChange={onLayoutChange}
        />
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
             <div className="relative inline-block">
                {availableMonths.length > 0 ? (
                    <>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                            Обзор за
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent font-medium text-lg text-gray-800 dark:text-gray-100 border-none focus:ring-0 p-0 ml-1 appearance-none cursor-pointer"
                            >
                                {availableMonths.map(month => (
                                    <option key={month.key} value={month.key}>{month.label}</option>
                                ))}
                            </select>
                        </h3>
                    </>
                ) : <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Обзор</h3>}
             </div>
             <div className="flex items-center space-x-3">
                <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-teal-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <i className="fas fa-cog"></i>
                </button>
                <div className="w-5 h-5 flex items-center justify-center">
                    {showSyncSuccess ? <i className="fas fa-check-circle text-green-500 animate-fade-in-up"></i> : isSyncing ? <i className="fas fa-sync-alt fa-spin text-teal-500"></i> : null}
                </div>
             </div>
          </div>
          <div className="text-center">
              <div className="flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">Баланс</p>
                  <InfoTooltip text="Доступный остаток с учетом плановых расходов на будущие периоды." />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-teal-500 dark:text-teal-400 my-1">{Math.round(remainingBudget).toLocaleString('ru-RU')} сум</p>
          </div>
          <div className="flex justify-between pt-4">
              <button onClick={() => onNavigateToTransactions('income')} className="text-center w-1/2 btn-press">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Доход</p>
                  <p className="text-xl font-semibold text-green-500">+{Math.round(totalIncome).toLocaleString('ru-RU')}</p>
              </button>
              <button onClick={() => onNavigateToTransactions('expense')} className="text-center w-1/2 btn-press">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Потрачено</p>
                  <p className="text-xl font-semibold text-red-500">-{Math.round(totalSpent).toLocaleString('ru-RU')}</p>
              </button>
          </div>
      </div>
      
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {layout.filter(item => item.visible).map(item => (
            <div key={item.id} className={singleColWidgets.includes(item.id) ? 'lg:col-span-2' : ''}>
                {widgetComponents[item.id]}
            </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;