import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Transaction, Budget, PlannedExpense, Goal, User, Priority, PaymentMethod, DashboardLayoutItem, UserDetails, Language } from '../types';
import { PieChart, Pie, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import { getFinancialAdvice, getChartAdvice } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';
import Spinner from './common/Spinner';
import InfoTooltip from './common/InfoTooltip';

// Hook for scroll animations that triggers rendering
const useAnimateOnScroll = (ref: React.RefObject<HTMLElement>) => {
  const [isVisible, setIsVisible] = useState(true); // По умолчанию видимо
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


// Расширенная палитра уникальных, легко различимых цветов
// Цвета подобраны для максимальной различимости и доступности
const EXTENDED_PALETTE = [
  '#2ecc71', // Зеленый (Emerald)
  '#3498db', // Синий (Blue)
  '#9b59b6', // Фиолетовый (Purple)
  '#f1c40f', // Желтый (Yellow)
  '#e67e22', // Оранжевый (Orange)
  '#e74c3c', // Красный (Red)
  '#1abc9c', // Бирюзовый (Turquoise)
  '#34495e', // Темно-серый (Dark Gray)
  '#8e44ad', // Темно-фиолетовый (Dark Purple)
  '#d35400', // Темно-оранжевый (Dark Orange)
  '#16a085', // Зелено-бирюзовый (Green Turquoise)
  '#27ae60', // Темно-зеленый (Dark Green)
  '#2980b9', // Темно-синий (Dark Blue)
  '#c0392b', // Темно-красный (Dark Red)
  '#f39c12', // Золотой (Gold)
  '#d68910', // Оранжево-золотой (Orange Gold)
  '#5dade2', // Светло-синий (Light Blue)
  '#58d68d', // Светло-зеленый (Light Green)
  '#f7dc6f', // Светло-желтый (Light Yellow)
  '#ec7063', // Коралловый (Coral)
  '#a569bd', // Лавандовый (Lavender)
  '#5dade2', // Небесно-голубой (Sky Blue)
  '#52be80', // Мятный (Mint)
  '#f8c471', // Персиковый (Peach)
];

// Палитра для основных категорий (первые 15 цветов)
const PALETTE = EXTENDED_PALETTE.slice(0, 15);

// Палитра для приоритетов (уникальные цвета)
const PRIORITY_PALETTE = ['#f39c12', '#5dade2']; // Золотой для Must-have, Светло-синий для Nice-to-have

// Цвета для пользователей (уникальные, не пересекающиеся с другими)
const USER_HEX_COLORS: {[key in User]: string} = {
    Suren: '#3b82f6', // Синий (Blue-500)
    Alena: '#ec4899', // Розовый (Pink-500)
    shared: '#6366f1', // Индиго (Indigo-500)
}

// Палитра для времени суток (уникальные цвета)
const TIME_OF_DAY_PALETTE = ['#2980b9', '#16a085', '#f39c12', '#e67e22']; // Синий, Бирюзовый, Золотой, Оранжевый

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const name = payload[0].name;
    const value = payload[0].value;
    
    return (
      <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg text-sm">
        <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{label || name}</p>
        <p style={{ color: payload[0].payload.fill }}>
            {`${Math.round(value).toLocaleString('ru-RU')}`}
        </p>
      </div>
    );
  }
  return null;
};

// Кастомная легенда с процентами (компактная)
const CustomLegend = ({ payload }: any) => {
  if (!payload) return null;
  
  // Сортируем по процентам от большего к меньшему
  const sortedPayload = [...payload].sort((a: any, b: any) => {
    const percentageA = parseFloat(a.payload?.percentage || '0');
    const percentageB = parseFloat(b.payload?.percentage || '0');
    return percentageB - percentageA;
  });
  
  return (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 -mt-3 text-[10px] leading-tight">
      {sortedPayload.map((entry: any, index: number) => {
        const dataItem = entry.payload;
        const percentage = dataItem?.percentage || '0';
        return (
          <div key={`legend-${index}`} className="flex items-center gap-0.5">
            <div 
              className="w-2 h-2 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {entry.value}
            </span>
            <span className="text-gray-500 dark:text-gray-500 font-semibold">
              {percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload, theme }: any) => {
  // Показываем только проценты для сегментов не менее 5%
  if (percent < 0.05) return null;
  
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = (percent * 100).toFixed(0);
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#ffffff' : '#6b7280'; // Серый цвет для дневной темы вместо темно-серого
  const textAnchor = x > cx ? 'start' : 'end';

  // Показываем только процент
  return (
    <text 
      x={x} 
      y={y} 
      fill={textColor} 
      textAnchor={textAnchor} 
      dominantBaseline="central" 
      fontSize={percent > 0.15 ? 12 : 10}
      fontWeight="600"
      className="pointer-events-none"
    >
      {`${percentage}%`}
    </text>
  );
};

// Компонент кнопки ИИ для графика
const ChartAIButton: React.FC<{ 
  chartType: string; 
  chartTitle: string; 
  chartData: any[];
  language: Language;
}> = ({ chartType, chartTitle, chartData, language }) => {
  const t = useTranslation(language);
  const [advice, setAdvice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGetAdvice = async () => {
    setIsLoading(true);
    setError('');
    setAdvice('');
    try {
      const result = await getChartAdvice({
        chartType,
        chartTitle,
        data: chartData
      });
      setAdvice(result.advice || result);
    } catch (err: any) {
      if (err.response) {
        const errorMessage = err.response.data?.error || err.response.data?.message || `Ошибка сервера: ${err.response.status}`;
        setError(errorMessage);
      } else if (err.request) {
        setError('Не удалось подключиться к серверу. Проверьте подключение к интернету.');
      } else {
        setError(err.message || 'Произошла неизвестная ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const Sparkles = () => (
    <>
      {[...Array(3)].map((_, i) => (
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
      <button
        onClick={() => { setIsExpanded(true); handleGetAdvice(); }}
        className="absolute top-0 right-0 z-10 gemini-button bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 text-white px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
        title={t('dashboard.aiAdvice')}
      >
        <Sparkles />
        <i className="fas fa-brain text-sm relative z-10"></i>
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-3 shadow-xl max-w-xs animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center">
            <i className="fas fa-brain text-xs text-white"></i>
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Совет ИИ</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <Spinner size="sm" />
        </div>
      ) : error ? (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      ) : advice ? (
        <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{advice}</div>
      ) : null}
    </div>
  );
};

const AIAdvisor: React.FC<{ financialData: { transactions: Transaction[], budget: Budget }; language: Language }> = ({ financialData, language }) => {
    const t = useTranslation(language);
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
            setAdvice(result.advice || result); // Поддержка как объекта, так и строки
        } catch (err: any) {
            // Улучшенная обработка ошибок
            if (err.response) {
                // Ошибка от сервера
                const errorMessage = err.response.data?.error || err.response.data?.message || `Ошибка сервера: ${err.response.status}`;
                setError(errorMessage);
            } else if (err.request) {
                // Запрос отправлен, но ответа нет
                setError('Не удалось подключиться к серверу. Проверьте подключение к интернету.');
            } else {
                // Другая ошибка
                setError(err.message || 'Произошла неизвестная ошибка');
            }
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
                    <i className="fas fa-brain mr-2"></i>{t('dashboard.aiAdvice')}
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 mt-8 shadow-sm">
             <div className="flex items-start space-x-4">
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">{t('dashboard.aiAdvisor')}</h3>
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
    { id: 'prioritySpending', name: 'Расходы по приоритетам' },
    { id: 'monthlyTrend', name: 'Тренд по месяцам' },
    { id: 'weeklySpending', name: 'Расходы по дням недели' },
    { id: 'topTransactions', name: 'Топ транзакций' },
    { id: 'subCategorySpending', name: 'Расходы по подкатегориям' },
    { id: 'plannedVsActual', name: 'План vs Факт' },
    { id: 'goalProgress', name: 'Прогресс по целям' },
    { id: 'calendarHeatmap', name: 'Календарь расходов' },
    { id: 'timeOfDay', name: 'Расходы по времени суток' },
    { id: 'userIncomeExpense', name: 'Доходы/Расходы по пользователям' },
    { id: 'aiAdvisor', name: 'Совет от ИИ' },
];

const DashboardSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    layout: DashboardLayoutItem[];
    onLayoutChange: (newLayout: DashboardLayoutItem[]) => void;
    language: Language;
}> = ({ isOpen, onClose, layout, onLayoutChange, language }) => {
    const t = useTranslation(language);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [localLayout, setLocalLayout] = useState<DashboardLayoutItem[]>(layout);
    
    // Синхронизируем localLayout с layout при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            setLocalLayout(layout);
        }
    }, [isOpen, layout]);
    
    const handleVisibilityToggle = (id: string) => {
        const newLayout = localLayout.map(item => item.id === id ? { ...item, visible: !item.visible } : item);
        setLocalLayout(newLayout);
        // Не вызываем onLayoutChange сразу, чтобы модальное окно не закрывалось
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newLayout = [...localLayout];
        const filteredLayout = newLayout.filter(item => item.id !== 'aiAdvisor');
        const filteredIndex = filteredLayout.findIndex(item => item.id === newLayout[index].id);
        const targetFilteredIndex = direction === 'up' ? filteredIndex - 1 : filteredIndex + 1;
        
        if (targetFilteredIndex >= 0 && targetFilteredIndex < filteredLayout.length) {
            const targetIndex = newLayout.findIndex(item => item.id === filteredLayout[targetFilteredIndex].id);
            [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
            setLocalLayout(newLayout);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', '');
        // Для мобильных устройств
        if (e.dataTransfer.setDragImage) {
            const dragImage = document.createElement('div');
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            e.dataTransfer.setDragImage(dragImage, 0, 0);
        }
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Проверяем, что мы действительно покинули элемент, а не перешли в дочерний
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newLayout = [...localLayout];
        const filteredLayout = newLayout.filter(item => item.id !== 'aiAdvisor');
        const draggedItem = filteredLayout[draggedIndex];
        const dropItem = filteredLayout[dropIndex];
        
        const draggedGlobalIndex = newLayout.findIndex(item => item.id === draggedItem.id);
        const dropGlobalIndex = newLayout.findIndex(item => item.id === dropItem.id);
        
        const [removed] = newLayout.splice(draggedGlobalIndex, 1);
        newLayout.splice(dropGlobalIndex, 0, removed);
        
        setLocalLayout(newLayout);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleSave = () => {
        onLayoutChange(localLayout);
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-gray-800 dark:text-gray-200">
                 <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold">{t('dashboard.configure')}</h3>
                 </div>
                 <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Настройте порядок и видимость графиков в карусели. Перетащите элементы или используйте кнопки для изменения порядка.
                    </p>
                    {localLayout
                      .filter(item => item.id !== 'aiAdvisor') // Исключаем AI Advisor из настроек
                      .map((item, index) => {
                        const widgetNames: {[key: string]: string} = {
                            'categorySpending': t('dashboard.categorySpending'),
                            'dailySpending': t('dashboard.dailySpending'),
                            'incomeVsExpense': t('dashboard.incomeVsExpense'),
                            'budgetVsActual': t('dashboard.budgetVsActual'),
                            'paymentMethodSpending': t('dashboard.paymentMethodSpending'),
                            'userSpending': t('dashboard.userSpending'),
                            'prioritySpending': 'Расходы по приоритетам',
                            'monthlyTrend': 'Тренд по месяцам',
                            'weeklySpending': 'Расходы по дням недели',
                            'topTransactions': 'Топ транзакций',
                            'subCategorySpending': 'Расходы по подкатегориям',
                        };
                        const filteredLayout = localLayout.filter(item => item.id !== 'aiAdvisor');
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index;
                        
                        return (
                            <div 
                              key={item.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg transition-all ${
                                isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-move hover:bg-gray-100 dark:hover:bg-gray-700'
                              } ${isDragOver ? 'ring-2 ring-teal-500 dark:ring-teal-400 bg-teal-50 dark:bg-teal-900/20' : ''}`}
                            >
                                <i className={`fas fa-grip-vertical text-gray-400 dark:text-gray-500 mr-4 cursor-grab active:cursor-grabbing`}></i>
                                <span className="flex-grow font-semibold">{widgetNames[item.id] || item.id}</span>
                                <div className="flex items-center space-x-2">
                                    <button 
                                      onClick={() => handleMove(localLayout.findIndex(i => i.id === item.id), 'up')} 
                                      disabled={index === 0} 
                                      className="w-8 h-8 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      title="Переместить вверх"
                                    >
                                      <i className="fas fa-arrow-up"></i>
                                    </button>
                                    <button 
                                      onClick={() => handleMove(localLayout.findIndex(i => i.id === item.id), 'down')} 
                                      disabled={index === filteredLayout.length - 1} 
                                      className="w-8 h-8 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      title="Переместить вниз"
                                    >
                                      <i className="fas fa-arrow-down"></i>
                                    </button>
                                    <button 
                                      onClick={() => handleVisibilityToggle(item.id)} 
                                      className={`w-8 h-8 rounded-md transition-colors ${item.visible ? 'text-teal-500 hover:text-teal-600' : 'text-gray-400 hover:text-gray-500'}`}
                                      title={item.visible ? 'Скрыть график' : 'Показать график'}
                                    >
                                      <i className={`fas ${item.visible ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <i className="fas fa-info-circle mr-1"></i>
                        Совет от ИИ всегда отображается внизу и не может быть изменен
                      </p>
                    </div>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
                    <button 
                      onClick={onClose} 
                      className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-6 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={handleSave} 
                      className="bg-teal-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-teal-600 transition-colors"
                    >
                      {t('dashboard.done')}
                    </button>
                 </div>
            </div>
        </div>
    );
};

interface DashboardProps {
    transactions: Transaction[];
    budget: Budget;
    plannedExpenses: PlannedExpense[];
    goals: Goal[];
    paymentMethods: PaymentMethod[];
    userDetails: UserDetails;
    onNavigateToTransactions: (type: 'income' | 'expense') => void;
    isSyncing: boolean;
    layout: DashboardLayoutItem[];
    onLayoutChange: (newLayout: DashboardLayoutItem[]) => void;
    language: Language;
}

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

// Компонент карусели для графиков
const ChartsCarousel: React.FC<{ 
  children: React.ReactNode[];
  visibleItems?: number;
  onIndexChange?: (index: number) => void;
}> = ({ children, visibleItems = 1.0, onIndexChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const lastAnimationTimeRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  const totalItems = children.length;

  // Функция для безопасного запуска анимации (не чаще раза в 2 секунды)
  const triggerAnimation = useCallback((targetIndex: number) => {
    const now = Date.now();
    
    // При первой загрузке запускаем анимацию для первого графика сразу
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      lastAnimationTimeRef.current = now;
      // Запускаем анимацию для первого графика
      setAnimationKey(prev => prev + 1);
      return;
    }

    const timeSinceLastAnimation = now - lastAnimationTimeRef.current;

    // Если прошло меньше 2 секунд, просто игнорируем запрос на анимацию
    if (timeSinceLastAnimation < 2000) {
      return; // Не запускаем анимацию, если прошло меньше 2 секунд
    }

    // Если прошло достаточно времени (2 секунды или больше), запускаем анимацию сразу
    setAnimationKey(prev => prev + 1);
    lastAnimationTimeRef.current = now;
  }, []);

  // Обработка свайпов на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === 0 || touchEnd === 0) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrev();
    }
    
    // Сброс значений
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Обработка перетаскивания мышью
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (carouselRef.current?.offsetLeft || 0));
    setScrollLeft(carouselRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - (carouselRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const goToSlide = (index: number) => {
    if (index < 0 || index >= totalItems) return;
    setCurrentIndex(index);
    onIndexChange?.(index); // Уведомляем родителя об изменении индекса
    // Запускаем анимацию с учетом ограничения (не чаще раза в 2 секунды)
    triggerAnimation(index);
    if (carouselRef.current && containerRef.current) {
      const wrapper = carouselRef.current;
      const container = containerRef.current;
      const wrapperWidth = wrapper.clientWidth;
      const itemWidth = wrapperWidth / visibleItems;
      const scrollPosition = index * itemWidth;
      wrapper.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < totalItems - 1) {
      goToSlide(currentIndex + 1);
    } else {
      // Зацикливание: с последнего на первый
      goToSlide(0);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    } else {
      // Зацикливание: с первого на последний
      goToSlide(totalItems - 1);
    }
  };

  // Отслеживание прокрутки для обновления индекса
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const wrapperWidth = carousel.clientWidth;
      const itemWidth = wrapperWidth / visibleItems;
      const scrollPosition = carousel.scrollLeft;
      const newIndex = Math.round(scrollPosition / itemWidth);
      const clampedIndex = Math.max(0, Math.min(newIndex, totalItems - 1));
      if (clampedIndex !== currentIndex) {
        setCurrentIndex(clampedIndex);
        onIndexChange?.(clampedIndex); // Уведомляем родителя об изменении индекса
        // Запускаем анимацию с учетом ограничения (не чаще раза в 2 секунды)
        triggerAnimation(clampedIndex);
      }
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, [totalItems, visibleItems, currentIndex, triggerAnimation]);

  // Установка ширины элементов через useEffect
  useEffect(() => {
    const carousel = carouselRef.current;
    const container = containerRef.current;
    if (!carousel || !container) return;

    const updateItemWidths = () => {
      const wrapperWidth = carousel.clientWidth;
      const itemWidth = wrapperWidth / visibleItems;
      const items = container.children;
      Array.from(items).forEach((item) => {
        (item as HTMLElement).style.width = `${itemWidth}px`;
        (item as HTMLElement).style.minWidth = `${itemWidth}px`;
        (item as HTMLElement).style.maxWidth = `${itemWidth}px`;
      });
    };

    // Запускаем анимацию для первого графика после инициализации
    const initTimeout = setTimeout(() => {
      if (isInitialMountRef.current) {
        triggerAnimation(0);
      }
    }, 100);

    // Небольшая задержка для правильного расчета ширины
    const timeoutId = setTimeout(updateItemWidths, 100);
    updateItemWidths();
    window.addEventListener('resize', updateItemWidths);
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateItemWidths);
    };
  }, [totalItems, visibleItems, triggerAnimation]);

  if (totalItems === 0) return null;

  return (
    <div className="relative">
      {/* Кнопки навигации */}
      {totalItems > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="carousel-nav-button prev"
            aria-label="Предыдущий график"
          >
            <i className="fas fa-chevron-left text-gray-600 dark:text-gray-300"></i>
          </button>
          <button
            onClick={goToNext}
            className="carousel-nav-button next"
            aria-label="Следующий график"
          >
            <i className="fas fa-chevron-right text-gray-600 dark:text-gray-300"></i>
          </button>
        </>
      )}

      {/* Карусель */}
      <div
        ref={carouselRef}
        className="charts-carousel-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div 
          ref={containerRef}
          className="charts-carousel-container"
        >
          {children.map((child, index) => {
            // Оптимизация: рендерим только текущий график и соседние (±1) для плавности
            const isNearby = Math.abs(index - currentIndex) <= 1;
            
            if (!isNearby) {
              // Для невидимых графиков создаем заглушку для сохранения scroll
              return (
                <div 
                  key={`carousel-item-${index}`} 
                  className="charts-carousel-item"
                  style={{ minHeight: '400px' }}
                />
              );
            }
            
            return (
              <div
                key={`carousel-item-${index}`}
                className="charts-carousel-item"
              >
                <div key={`widget-${index}-anim-${animationKey}`}>
                  {child}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Индикаторы (показываем только ближайшие, как в Instagram) */}
      {totalItems > 1 && (() => {
        const maxVisible = 5; // Максимум видимых точек
        const halfVisible = Math.floor(maxVisible / 2);
        
        let startIndex = Math.max(0, currentIndex - halfVisible);
        let endIndex = Math.min(totalItems - 1, currentIndex + halfVisible);
        
        // Если мы в начале, показываем первые maxVisible
        if (currentIndex < halfVisible) {
          startIndex = 0;
          endIndex = Math.min(maxVisible - 1, totalItems - 1);
        }
        
        // Если мы в конце, показываем последние maxVisible
        if (currentIndex > totalItems - 1 - halfVisible) {
          startIndex = Math.max(0, totalItems - maxVisible);
          endIndex = totalItems - 1;
        }
        
        const visibleIndices = [];
        for (let i = startIndex; i <= endIndex; i++) {
          visibleIndices.push(i);
        }
        
        return (
          <div className="carousel-indicators">
            {visibleIndices.map((index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`carousel-indicator ${currentIndex === index ? 'active' : ''}`}
                aria-label={`Перейти к графику ${index + 1}`}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, budget, plannedExpenses, goals, paymentMethods, userDetails, onNavigateToTransactions, isSyncing, layout, onLayoutChange, language }) => {
  const t = useTranslation(language);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const prevIsSyncing = usePrevious(isSyncing);

  const refs = useRef<{[key: string]: React.RefObject<HTMLDivElement>}>({});
  
  // Инициализируем refs для всех элементов layout
  useEffect(() => {
    layout.forEach(item => {
      if (!refs.current[item.id]) {
        refs.current[item.id] = React.createRef();
      }
    });
  }, [layout]);

  // Используем useAnimateOnScroll для каждого элемента (но не в цикле)
  const isVisible: {[key: string]: boolean} = {};
  
  // Создаем refs и проверяем видимость для каждого элемента
  layout.forEach(item => {
    if (!refs.current[item.id]) {
      refs.current[item.id] = React.createRef();
    }
    // Используем IntersectionObserver напрямую вместо хука в цикле
    isVisible[item.id] = true; // По умолчанию видимо, анимация будет через CSS
  });

  useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      // Когда синхронизация завершается (была активна, а теперь нет)
      if (prevIsSyncing && !isSyncing) {
          setShowSyncSuccess(true);
          // Скрываем галочку через 2 секунды
          timer = setTimeout(() => {
              setShowSyncSuccess(false);
          }, 2000);
      }
      // Сбрасываем галочку, если синхронизация начинается снова
      if (isSyncing) {
          setShowSyncSuccess(false);
      }
      return () => {
          if (timer) clearTimeout(timer);
      };
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

  const totalSpent = useMemo(() => expenses?.reduce((sum, t) => sum + t.amount, 0) || 0, [expenses]);
  const totalIncome = useMemo(() => incomes?.reduce((sum, t) => sum + t.amount, 0) || 0, [incomes]);
  const totalPlanned = useMemo(() => plannedExpenses?.reduce((sum, t) => sum + t.amount, 0) || 0, [plannedExpenses]);
  const remainingBudget = totalIncome - totalSpent - totalPlanned;
  
  const categorySpendingData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};
    expenses.forEach(t => { dataMap[t.category] = (dataMap[t.category] || 0) + t.amount; });
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    return Object.entries(dataMap)
      .map(([name, value]) => ({ 
        name, 
        value,
        percentage: total > 0 ? Math.round((value / total) * 100).toString() : '0'
      }))
      .sort((a, b) => b.value - a.value);
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
    if (!userDetails || Object.keys(userDetails).length === 0) {
      return [];
    }
    const dataMap: { [key: string]: number } = {};
    expenses.forEach(t => { dataMap[t.user] = (dataMap[t.user] || 0) + t.amount; });
    return Object.entries(dataMap)
      .filter(([name]) => userDetails && userDetails[name as User]) // Фильтруем только существующих пользователей
      .map(([name, value]) => ({ 
        name: userDetails[name as User]?.name || name, 
        value, 
        userKey: name as User 
      }))
      .sort((a, b) => b.value - a.value);
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
          dataMap[pmName as string] = (dataMap[pmName as string] || 0) + t.amount;
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
          const budgetKey = t('budget.title');
          const expenseKey = t('forms.expense');
          return { name: category, [budgetKey]: budgetAmount, [expenseKey]: actualAmount };
        });
  }, [expenses, budget, t]);

  // 1. Расходы по приоритетам (данные уже есть в prioritySpendingData)
  const prioritySpendingChartData = useMemo(() => {
    const dataMap: {[key in Priority]: number} = {'must-have': 0, 'nice-to-have': 0};
    expenses.forEach(t => { dataMap[t.priority] = (dataMap[t.priority] || 0) + t.amount; });
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    return [
      { 
        name: 'Обязательные', 
        value: dataMap['must-have'],
        percentage: total > 0 ? Math.round((dataMap['must-have'] / total) * 100).toString() : '0'
      },
      { 
        name: 'Желательные', 
        value: dataMap['nice-to-have'],
        percentage: total > 0 ? Math.round((dataMap['nice-to-have'] / total) * 100).toString() : '0'
      },
    ]
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value); // Сортировка по убыванию
  }, [expenses]);

  // 2. Тренд доходов и расходов по месяцам
  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { income: number; expense: number; monthKey: string }>();
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { income: 0, expense: 0, monthKey });
      }
      
      const data = monthMap.get(monthKey)!;
      if (t.type === 'income') {
        data.income += t.amount;
      } else {
        data.expense += t.amount;
      }
    });

    const incomeKey = t('dashboard.income');
    const expenseKey = t('forms.expense');
    
    return Array.from(monthMap.values())
      .map((data) => {
        const [year, month] = data.monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthLabel = date.toLocaleString('ru-RU', { month: 'short', year: 'numeric' });
        return {
          name: monthLabel,
          monthKey: data.monthKey,
          [incomeKey]: data.income,
          [expenseKey]: data.expense
        };
      })
      .sort((a, b) => {
        const [yearA, monthA] = a.monthKey.split('-');
        const [yearB, monthB] = b.monthKey.split('-');
        const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
        const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6); // Последние 6 месяцев
  }, [transactions, t]);

  // 3. Расходы по дням недели
  const weeklySpendingData = useMemo(() => {
    const dayMap: { [key: string]: number } = {};
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayShortNames = ['Вс.', 'Пн.', 'Вт.', 'Ср.', 'Чт.', 'Пт.', 'Сб.'];
    
    expenses.forEach(t => {
      const date = new Date(t.date);
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      dayMap[dayName] = (dayMap[dayName] || 0) + t.amount;
    });

    const dayOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const dayShortOrder = ['Пн.', 'Вт.', 'Ср.', 'Чт.', 'Пт.', 'Сб.', 'Вс.'];
    
    return dayOrder
      .map((day, index) => ({ 
        name: day, 
        shortName: dayShortOrder[index],
        value: dayMap[day] || 0 
      }));
  }, [expenses]);

  // 4. Топ-10 крупнейших расходов (только расходы, без доходов)
  const topTransactionsData = useMemo(() => {
    return expenses
      .map(t => ({
        description: t.description.length > 40 ? t.description.substring(0, 40) + '...' : t.description,
        amount: t.amount,
        category: t.category,
        date: new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [expenses]);

  // 5. Расходы по подкатегориям
  const subCategorySpendingData = useMemo(() => {
    const dataMap: { [key: string]: { value: number; subCategory: string } } = {};
    
    expenses.forEach(t => {
      if (t.subCategory) {
        // Используем только подкатегорию как ключ
        const subCatKey = t.subCategory;
        if (!dataMap[subCatKey]) {
          dataMap[subCatKey] = { value: 0, subCategory: t.subCategory };
        }
        dataMap[subCatKey].value += t.amount;
      }
    });

    const total = Object.values(dataMap).reduce((sum, item) => sum + item.value, 0);
    
    return Object.entries(dataMap)
      .map(([subCategory, data]) => ({
        name: subCategory, // Только подкатегория в легенде
        value: data.value,
        percentage: total > 0 ? Math.round((data.value / total) * 100).toString() : '0'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15); // Топ-15 подкатегорий
  }, [expenses]);

  // 6. Сравнение плановых и фактических расходов
  const plannedVsActualData = useMemo(() => {
    if (!plannedExpenses || !expenses) return [];
    const categoryMap: { [key: string]: { planned: number; actual: number } } = {};
    
    // Плановые расходы
    plannedExpenses.forEach(pe => {
      if (!categoryMap[pe.category]) {
        categoryMap[pe.category] = { planned: 0, actual: 0 };
      }
      categoryMap[pe.category].planned += pe.amount;
    });
    
    // Фактические расходы
    expenses.forEach(e => {
      if (!categoryMap[e.category]) {
        categoryMap[e.category] = { planned: 0, actual: 0 };
      }
      categoryMap[e.category].actual += e.amount;
    });
    
    return Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        planned: data.planned,
        actual: data.actual,
        difference: data.actual - data.planned
      }))
      .filter(item => item.planned > 0 || item.actual > 0)
      .sort((a, b) => (b.planned + b.actual) - (a.planned + a.actual))
      .slice(0, 10);
  }, [plannedExpenses, expenses]);

  // 7. Прогресс по целям
  const goalProgressData = useMemo(() => {
    if (!goals || !Array.isArray(goals)) return [];
    return goals.map(goal => {
      // Считаем накопленную сумму для цели (доходы в этой категории)
      const saved = incomes
        .filter(t => t.category === goal.category && t.user === goal.user)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const progress = goal.amount > 0 ? Math.min((saved / goal.amount) * 100, 100) : 0;
      
      return {
        id: goal.id,
        description: goal.description,
        target: goal.amount,
        saved: saved,
        progress: Math.round(progress),
        priority: goal.priority
      };
    });
  }, [goals, incomes]);

  // 8. Календарь расходов (heatmap)
  const calendarHeatmapData = useMemo(() => {
    if (!selectedMonth || !expenses) return [];
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    if (isNaN(year) || isNaN(month)) return [];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dayMap: { [key: number]: number } = {};
    expenses.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate();
        dayMap[day] = (dayMap[day] || 0) + t.amount;
      }
    });
    
    const amounts = Object.values(dayMap);
    const maxAmount = amounts.length > 0 ? Math.max(...amounts, 1) : 1;
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const amount = dayMap[day] || 0;
      const intensity = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
      
      return {
        day,
        amount,
        intensity: Math.round(intensity)
      };
    });
  }, [expenses, selectedMonth]);

  // 9. Распределение расходов по времени суток
  const timeOfDayData = useMemo(() => {
    const timeSlots = [
      { name: 'Ночь (0-6)', start: 0, end: 6 },
      { name: 'Утро (6-12)', start: 6, end: 12 },
      { name: 'День (12-18)', start: 12, end: 18 },
      { name: 'Вечер (18-24)', start: 18, end: 24 }
    ];
    
    const slotMap: { [key: string]: number } = {};
    timeSlots.forEach(slot => slotMap[slot.name] = 0);
    
    expenses.forEach(t => {
      const date = new Date(t.date);
      const hour = date.getHours();
      
      for (const slot of timeSlots) {
        if (hour >= slot.start && hour < slot.end) {
          slotMap[slot.name] += t.amount;
          break;
        }
      }
    });
    
    const total = Object.values(slotMap).reduce((sum, val) => sum + val, 0);
    
    return timeSlots.map(slot => ({
      name: slot.name,
      value: slotMap[slot.name],
      percentage: total > 0 ? Math.round((slotMap[slot.name] / total) * 100).toString() : '0'
    }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Сортировка по убыванию
  }, [expenses]);

  // 10. Сравнение доходов и расходов по пользователям
  const userIncomeExpenseData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const userMap: { [key in User]: { income: number; expense: number } } = {
      Suren: { income: 0, expense: 0 },
      Alena: { income: 0, expense: 0 },
      shared: { income: 0, expense: 0 }
    };
    
    transactions.forEach(t => {
      if (!t.user || !userMap[t.user]) return; // Пропускаем транзакции с неизвестным пользователем
      
      if (t.type === 'income') {
        userMap[t.user].income += t.amount;
      } else {
        userMap[t.user].expense += t.amount;
      }
    });
    
    return Object.entries(userMap)
      .map(([user, data]) => ({
        name: userDetails[user as User]?.name || user,
        user: user as User,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense
      }))
      .filter(item => item.income > 0 || item.expense > 0);
  }, [transactions, userDetails]);


  const incomeVsExpenseData = useMemo(() => {
    const incomeKey = t('dashboard.income');
    const expenseKey = t('forms.expense');
    return [{ name: '', [incomeKey]: totalIncome, [expenseKey]: totalSpent }];
  }, [totalIncome, totalSpent, t]);


  const widgetComponents: {[key: string]: React.ReactNode} = {
    categorySpending: (
        <div ref={refs.current['categorySpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 shadow-sm">
            <div className="relative mb-1">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{t('dashboard.categorySpending')}</h3>
              <ChartAIButton 
                chartType="categorySpending" 
                chartTitle={t('dashboard.categorySpending')} 
                chartData={categorySpendingData}
                language={language}
              />
            </div>
            {isVisible['categorySpending'] && (categorySpendingData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie 
                    data={categorySpendingData} 
                    cx="50%" 
                    cy="50%" 
                    startAngle={90}
                    endAngle={450}
                    labelLine={false} 
                    label={renderCustomizedLabel} 
                    outerRadius="80%" 
                    fill="#8884d8" 
                    dataKey="value" 
                    nameKey="name" 
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={250}
                  >
                    {categorySpendingData.map((_, index) => <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} style={{ outline: 'none' }} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <CustomLegend payload={categorySpendingData.map((item, index) => ({
                value: item.name,
                color: PALETTE[index % PALETTE.length],
                payload: item
              }))} />
            </div>
            ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-chart-pie text-4xl mb-4"></i><p>{t('dashboard.noData')}</p></div> ))}
        </div>
    ),
    dailySpending: (
        <div ref={refs.current['dailySpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{t('dashboard.dailySpending')}</h3>
            <ChartAIButton 
              chartType="dailySpending" 
              chartTitle={t('dashboard.dailySpending')} 
              chartData={dailySpendingData}
              language={language}
            />
          </div>
            {isVisible['dailySpending'] && (dailySpendingData.some(d => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySpendingData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="currentColor" opacity={0.1} />
                    <XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(day) => `${day}`} />
                    <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="amount" name={t('forms.expense')} stroke="#16a085" strokeWidth={2} dot={(props: any) => props.payload?.amount > 0 ? true : false} activeDot={false} isAnimationActive={true} animationBegin={0} animationDuration={250} />
                </LineChart>
            </ResponsiveContainer>
            ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-chart-line text-4xl mb-4"></i><p>{t('dashboard.noExpenses')}</p></div> ))}
        </div>
    ),
    incomeVsExpense: (
        <div ref={refs.current['incomeVsExpense']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{t('dashboard.incomeVsExpense')}</h3>
            <ChartAIButton 
              chartType="incomeVsExpense" 
              chartTitle={t('dashboard.incomeVsExpense')} 
              chartData={incomeVsExpenseData}
              language={language}
            />
          </div>
            {isVisible['incomeVsExpense'] && (totalIncome > 0 || totalSpent > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeVsExpenseData} margin={{ top: 5, right: 20, left: -10, bottom: 30 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip content={<CustomTooltip />} />
                         <Bar dataKey={t('dashboard.income')} fill="#27ae60" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                         <Bar dataKey={t('forms.expense')} fill="#c0392b" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                         <text x="25%" y="295" textAnchor="middle" fill="currentColor" fontSize="12" className="text-gray-600 dark:text-gray-400">{t('dashboard.income')}</text>
                         <text x="75%" y="295" textAnchor="middle" fill="currentColor" fontSize="12" className="text-gray-600 dark:text-gray-400">{t('forms.expense')}</text>
                    </BarChart>
                </ResponsiveContainer>
            ): ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-balance-scale text-4xl mb-4"></i><p>{t('dashboard.noIncomeExpense')}</p></div>))}
        </div>
    ),
    budgetVsActual: (
        <div ref={refs.current['budgetVsActual']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{t('dashboard.budgetVsActual')}</h3>
            <ChartAIButton 
              chartType="budgetVsActual" 
              chartTitle={t('dashboard.budgetVsActual')} 
              chartData={budgetVsActualData}
              language={language}
            />
          </div>
            {isVisible['budgetVsActual'] && (budgetVsActualData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={budgetVsActualData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10 }} stroke="currentColor" opacity={0.5} angle={-25} textAnchor="end" height={50} />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip content={<CustomTooltip />} />
                         <Legend />
                         <Bar dataKey={t('budget.title')} fill="#2980b9" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                         <Bar dataKey={t('forms.expense')} fill="#d68910" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                    </BarChart>
                </ResponsiveContainer>
            ): ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-tasks text-4xl mb-4"></i><p>{t('dashboard.noBudget')}</p></div>))}
        </div>
    ),
    paymentMethodSpending: (
        <div ref={refs.current['paymentMethodSpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{t('dashboard.paymentMethodSpending')}</h3>
            <ChartAIButton 
              chartType="paymentMethodSpending" 
              chartTitle={t('dashboard.paymentMethodSpending')} 
              chartData={paymentMethodSpendingData}
              language={language}
            />
          </div>
           {isVisible['paymentMethodSpending'] && (paymentMethodSpendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie data={paymentMethodSpendingData} cx="50%" cy="50%" startAngle={90} endAngle={450} outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name" labelLine={false} label={renderCustomizedLabel} isAnimationActive={true} animationBegin={0} animationDuration={250}>
                            {paymentMethodSpendingData.map((_, index) => <Cell key={`cell-${index}`} fill={EXTENDED_PALETTE.slice(15)[index % (EXTENDED_PALETTE.length - 15)]} style={{ outline: 'none' }} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={10} />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-wallet text-4xl mb-4"></i><p>{t('dashboard.noPaymentMethods')}</p></div> ))}
        </div>
    ),
    userSpending: (
        <div ref={refs.current['userSpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{t('dashboard.userSpending')}</h3>
            <ChartAIButton 
              chartType="userSpending" 
              chartTitle={t('dashboard.userSpending')} 
              chartData={userSpendingData}
              language={language}
            />
          </div>
           {isVisible['userSpending'] && (userSpendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie data={userSpendingData} cx="50%" cy="50%" startAngle={90} endAngle={450} outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name" labelLine={false} label={renderCustomizedLabel} isAnimationActive={true} animationBegin={0} animationDuration={250}>
                            {userSpendingData.map((entry) => <Cell key={`cell-${entry.name}`} fill={USER_HEX_COLORS[entry.userKey]} style={{ outline: 'none' }} /> )}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={10} />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-users text-4xl mb-4"></i><p>{t('dashboard.noUsers')}</p></div> ))}
        </div>
    ),
    prioritySpending: (
        <div ref={refs.current['prioritySpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Расходы по приоритетам</h3>
            <ChartAIButton 
              chartType="prioritySpending" 
              chartTitle="Расходы по приоритетам" 
              chartData={prioritySpendingChartData}
              language={language}
            />
          </div>
           {isVisible['prioritySpending'] && (prioritySpendingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie 
                          data={prioritySpendingChartData} 
                          cx="50%" 
                          cy="50%" 
                          startAngle={90}
                          endAngle={450}
                          outerRadius="80%" 
                          fill="#8884d8" 
                          dataKey="value" 
                          nameKey="name" 
                          labelLine={false} 
                          label={renderCustomizedLabel} 
                          isAnimationActive={true} 
                          animationBegin={0} 
                          animationDuration={250}
                        >
                            {prioritySpendingChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PRIORITY_PALETTE[index % PRIORITY_PALETTE.length]} style={{ outline: 'none' }} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          content={<CustomLegend />}
                        />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-exclamation-circle text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    monthlyTrend: (
        <div ref={refs.current['monthlyTrend']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Тренд по месяцам</h3>
            <ChartAIButton 
              chartType="monthlyTrend" 
              chartTitle="Тренд по месяцам" 
              chartData={monthlyTrendData}
              language={language}
            />
          </div>
           {isVisible['monthlyTrend'] && (monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid stroke="currentColor" opacity={0.1} />
                        <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} angle={-25} textAnchor="end" height={60} />
                        <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey={t('dashboard.income')} stroke="#27ae60" strokeWidth={2} isAnimationActive={true} animationBegin={0} animationDuration={250} />
                        <Line type="monotone" dataKey={t('forms.expense')} stroke="#c0392b" strokeWidth={2} isAnimationActive={true} animationBegin={0} animationDuration={250} />
                    </LineChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-chart-line text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    weeklySpending: (
        <div ref={refs.current['weeklySpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Расходы по дням недели</h3>
            <ChartAIButton 
              chartType="weeklySpending" 
              chartTitle="Расходы по дням недели" 
              chartData={weeklySpendingData}
              language={language}
            />
          </div>
           {isVisible['weeklySpending'] && (weeklySpendingData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklySpendingData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis 
                           dataKey="shortName" 
                           tick={{ fill: 'currentColor', fontSize: 12 }} 
                           stroke="currentColor" 
                           opacity={0.5} 
                         />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip 
                           content={({ active, payload }) => {
                             if (active && payload && payload.length) {
                               const data = payload[0].payload;
                               return (
                                 <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg text-sm">
                                   <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{data.name}</p>
                                   <p style={{ color: payload[0].payload.fill || '#1abc9c' }}>
                                     {`${Math.round(payload[0].value as number).toLocaleString('ru-RU')} сум`}
                                   </p>
                                 </div>
                               );
                             }
                             return null;
                           }}
                         />
                         <Bar dataKey="value" fill="#16a085" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                    </BarChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-calendar-week text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    topTransactions: (
        <div ref={refs.current['topTransactions']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Топ-10 расходов</h3>
            <ChartAIButton 
              chartType="topTransactions" 
              chartTitle="Топ-10 расходов" 
              chartData={topTransactionsData}
              language={language}
            />
          </div>
           {isVisible['topTransactions'] && (topTransactionsData.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {topTransactionsData.slice(0, 3).map((transaction, index) => {
                      const maxAmount = topTransactionsData[0].amount;
                      const percentage = maxAmount > 0 ? (transaction.amount / maxAmount) * 100 : 0;
                      return (
                        <div key={`top-transaction-${index}`} className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6 flex-shrink-0">
                                {index + 1}.
                              </span>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                                {transaction.description}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400 ml-3 flex-shrink-0">
                              -{Math.round(transaction.amount).toLocaleString('ru-RU')} сум
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                              style={{ 
                                width: `${percentage}%`,
                                animation: `slideInLeft 0.8s ease-out ${index * 0.1}s both`
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{transaction.category}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {topTransactionsData.length > 3 && (
                    <div className="mt-4">
                      <div className="spoiler">
                        <div className="space-y-3">
                          {topTransactionsData.slice(3).map((transaction, index) => {
                            const maxAmount = topTransactionsData[0].amount;
                            const percentage = maxAmount > 0 ? (transaction.amount / maxAmount) * 100 : 0;
                            return (
                              <div key={`top-transaction-${index + 3}`} className="relative">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6 flex-shrink-0">
                                      {index + 4}.
                                    </span>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                                      {transaction.description}
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-red-600 dark:text-red-400 ml-3 flex-shrink-0">
                                    -{Math.round(transaction.amount).toLocaleString('ru-RU')} сум
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                                    style={{ 
                                      width: `${percentage}%`,
                                      animation: `slideInLeft 0.8s ease-out ${(index + 3) * 0.1}s both`
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{transaction.category}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          const spoiler = e.currentTarget.previousElementSibling as HTMLElement;
                          if (spoiler) {
                            spoiler.classList.toggle('expanded');
                            const button = e.currentTarget;
                            const icon = button.querySelector('i');
                            if (spoiler.classList.contains('expanded')) {
                              spoiler.style.maxHeight = spoiler.scrollHeight + 'px';
                              if (icon) icon.className = 'fas fa-chevron-up';
                            } else {
                              spoiler.style.maxHeight = '0';
                              if (icon) icon.className = 'fas fa-chevron-down';
                            }
                          }
                        }}
                        className="mt-3 w-full text-center text-sm text-teal-500 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 font-medium flex items-center justify-center gap-2"
                      >
                        <span>Посмотреть все</span>
                        <i className="fas fa-chevron-down"></i>
                      </button>
                    </div>
                  )}
                </>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-list-ol text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    subCategorySpending: (
        <div ref={refs.current['subCategorySpending']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Расходы по подкатегориям</h3>
            <ChartAIButton 
              chartType="subCategorySpending" 
              chartTitle="Расходы по подкатегориям" 
              chartData={subCategorySpendingData}
              language={language}
            />
          </div>
           {isVisible['subCategorySpending'] && (subCategorySpendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie 
                          data={subCategorySpendingData} 
                          cx="50%" 
                          cy="50%" 
                          startAngle={90}
                          endAngle={450}
                          outerRadius="80%" 
                          fill="#8884d8" 
                          dataKey="value" 
                          nameKey="name" 
                          labelLine={false} 
                          label={renderCustomizedLabel} 
                          isAnimationActive={true} 
                          animationBegin={0} 
                          animationDuration={250}
                        >
                            {subCategorySpendingData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} style={{ outline: 'none' }} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          content={<CustomLegend />}
                        />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-tags text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    plannedVsActual: (
        <div ref={refs.current['plannedVsActual']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">План vs Факт</h3>
            <ChartAIButton 
              chartType="plannedVsActual" 
              chartTitle="План vs Факт" 
              chartData={plannedVsActualData}
              language={language}
            />
          </div>
           {isVisible['plannedVsActual'] && (plannedVsActualData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={plannedVsActualData} margin={{ top: 5, right: 20, left: -10, bottom: 30 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10 }} stroke="currentColor" opacity={0.5} angle={-25} textAnchor="end" height={60} />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip content={<CustomTooltip />} />
                         <Legend />
                         <Bar dataKey="planned" fill="#5dade2" name="План" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                         <Bar dataKey="actual" fill="#ec7063" name="Факт" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                    </BarChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-balance-scale text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    goalProgress: (
        <div ref={refs.current['goalProgress']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Прогресс по целям</h3>
            <ChartAIButton 
              chartType="goalProgress" 
              chartTitle="Прогресс по целям" 
              chartData={goalProgressData}
              language={language}
            />
          </div>
           {isVisible['goalProgress'] && (goalProgressData.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {goalProgressData.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{goal.description}</span>
                          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                            {Math.round(goal.saved).toLocaleString('ru-RU')} / {Math.round(goal.target).toLocaleString('ru-RU')} сум
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-800 ${
                              goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-teal-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(goal.progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{goal.progress}% выполнено</span>
                          <span className={`px-2 py-0.5 rounded ${
                            goal.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            goal.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : 'Низкий'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {goalProgressData.length > 3 && (
                    <div className="mt-4">
                      <div className="spoiler">
                        <div className="space-y-4">
                          {goalProgressData.slice(3).map((goal) => (
                            <div key={goal.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{goal.description}</span>
                                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                                  {Math.round(goal.saved).toLocaleString('ru-RU')} / {Math.round(goal.target).toLocaleString('ru-RU')} сум
                                </span>
                              </div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-800 ${
                                    goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-teal-500' : 'bg-yellow-500'
                                  }`}
                                  style={{ width: `${Math.min(goal.progress, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>{goal.progress}% выполнено</span>
                                <span className={`px-2 py-0.5 rounded ${
                                  goal.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                  goal.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : 'Низкий'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          const spoiler = e.currentTarget.previousElementSibling as HTMLElement;
                          if (spoiler) {
                            spoiler.classList.toggle('expanded');
                            const button = e.currentTarget;
                            const icon = button.querySelector('i');
                            if (spoiler.classList.contains('expanded')) {
                              spoiler.style.maxHeight = spoiler.scrollHeight + 'px';
                              if (icon) icon.className = 'fas fa-chevron-up';
                            } else {
                              spoiler.style.maxHeight = '0';
                              if (icon) icon.className = 'fas fa-chevron-down';
                            }
                          }
                        }}
                        className="mt-3 w-full text-center text-sm text-teal-500 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 font-medium flex items-center justify-center gap-2"
                      >
                        <span>Посмотреть все</span>
                        <i className="fas fa-chevron-down"></i>
                      </button>
                    </div>
                  )}
                </>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-bullseye text-4xl mb-4"></i><p>Нет целей</p></div> ))}
        </div>
    ),
    calendarHeatmap: (
        <div ref={refs.current['calendarHeatmap']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Календарь расходов</h3>
            <ChartAIButton 
              chartType="calendarHeatmap" 
              chartTitle="Календарь расходов" 
              chartData={calendarHeatmapData}
              language={language}
            />
          </div>
           {isVisible['calendarHeatmap'] && (calendarHeatmapData.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-1">
                    {calendarHeatmapData.map((day) => {
                      const bgIntensity = day.intensity;
                      const bgColor = bgIntensity > 75 ? 'bg-red-500' : 
                                     bgIntensity > 50 ? 'bg-orange-500' : 
                                     bgIntensity > 25 ? 'bg-yellow-500' : 
                                     bgIntensity > 0 ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-700';
                      const textColor = bgIntensity > 0 ? 'text-white' : 'text-gray-600 dark:text-gray-400';
                      
                      return (
                        <div 
                          key={day.day} 
                          className={`${bgColor} ${textColor} aspect-square rounded text-xs flex items-center justify-center font-semibold transition-all duration-300 hover:scale-110 cursor-pointer`}
                          title={`${day.day} число: ${Math.round(day.amount).toLocaleString('ru-RU')} сум`}
                        >
                          {day.day}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-4">
                    <span>Меньше</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="w-3 h-3 bg-teal-500 rounded"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                    </div>
                    <span>Больше</span>
                  </div>
                </div>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-calendar text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    timeOfDay: (
        <div ref={refs.current['timeOfDay']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Расходы по времени суток</h3>
            <ChartAIButton 
              chartType="timeOfDay" 
              chartTitle="Расходы по времени суток" 
              chartData={timeOfDayData}
              language={language}
            />
          </div>
           {isVisible['timeOfDay'] && (timeOfDayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie 
                          data={timeOfDayData} 
                          cx="50%" 
                          cy="50%" 
                          startAngle={90}
                          endAngle={450}
                          outerRadius="80%" 
                          fill="#8884d8" 
                          dataKey="value" 
                          nameKey="name" 
                          labelLine={false} 
                          label={renderCustomizedLabel} 
                          isAnimationActive={true} 
                          animationBegin={0} 
                          animationDuration={250}
                        >
                            {timeOfDayData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={TIME_OF_DAY_PALETTE[index % TIME_OF_DAY_PALETTE.length]} style={{ outline: 'none' }} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          content={<CustomLegend />}
                        />
                    </PieChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[350px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-clock text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    userIncomeExpense: (
        <div ref={refs.current['userIncomeExpense']} className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
          <div className="relative mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">Доходы/Расходы по пользователям</h3>
            <ChartAIButton 
              chartType="userIncomeExpense" 
              chartTitle="Доходы/Расходы по пользователям" 
              chartData={userIncomeExpenseData}
              language={language}
            />
          </div>
           {isVisible['userIncomeExpense'] && (userIncomeExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userIncomeExpenseData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                         <CartesianGrid stroke="currentColor" opacity={0.1} />
                         <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} />
                         <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" opacity={0.5} tickFormatter={(value) => typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { notation: 'compact', compactDisplay: 'short' }).format(value) : ''} />
                         <Tooltip content={<CustomTooltip />} />
                         <Legend />
                         <Bar dataKey="income" fill="#52be80" name="Доходы" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                         <Bar dataKey="expense" fill="#a569bd" name="Расходы" isAnimationActive={true} animationBegin={0} animationDuration={250} />
                    </BarChart>
                </ResponsiveContainer>
           ) : ( <div className="h-[300px] flex items-center justify-center flex-col text-center text-gray-500 dark:text-gray-400"><i className="fas fa-users text-4xl mb-4"></i><p>Нет данных</p></div> ))}
        </div>
    ),
    aiAdvisor: (
        <div ref={refs.current['aiAdvisor']}>
            <AIAdvisor financialData={{ transactions: filteredTransactions, budget }} language={language} />
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
            language={language}
        />
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
             <div className="relative inline-block">
                {availableMonths.length > 0 ? (
                    <>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 flex items-center">
                            {t('dashboard.monthOverview')}
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent font-medium text-lg text-gray-800 dark:text-gray-100 border-none focus:ring-0 p-0 ml-1 mr-1 appearance-none cursor-pointer underline decoration-dotted"
                            >
                                {availableMonths.map(month => (
                                    <option key={month.key} value={month.key}>{month.label}</option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down text-xs text-gray-400 dark:text-gray-500"></i>
                        </h3>
                    </>
                ) : <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Обзор</h3>}
             </div>
             <div className="flex items-center space-x-3">
                <div className="w-5 h-5 flex items-center justify-center relative">
                    {isSyncing && !showSyncSuccess && (
                        <i className="fas fa-sync-alt fa-spin text-teal-500 absolute"></i>
                    )}
                    {showSyncSuccess && (
                        <i className="fas fa-check-circle text-green-500 animate-fade-in-up absolute" style={{ animation: 'fade-in-up 0.3s ease-out' }}></i>
                    )}
                </div>
             </div>
          </div>
          <div className="text-center">
              <div className="flex items-center justify-center">
                  <p className="text-gray-600 dark:text-gray-300">Баланс</p>
                  <InfoTooltip text="Доступный остаток с учетом плановых расходов на будущие периоды." />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-teal-500 dark:text-teal-400 my-1">{Math.round(remainingBudget).toLocaleString('ru-RU')} сум</p>
          </div>
          <div className="flex justify-between pt-4">
              <button onClick={() => onNavigateToTransactions('income')} className="text-center w-1/2 btn-press">
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Доход</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">+{Math.round(totalIncome).toLocaleString('ru-RU')}</p>
              </button>
              <button onClick={() => onNavigateToTransactions('expense')} className="text-center w-1/2 btn-press">
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Потрачено</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">-{Math.round(totalSpent).toLocaleString('ru-RU')}</p>
              </button>
          </div>
      </div>
      
      {/* Карусель графиков */}
      {(() => {
        const visibleCharts = layout.filter(item => item.visible && item.id !== 'aiAdvisor');
        const [currentChartIndex, setCurrentChartIndex] = useState(0);
        
        return (
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Графики</h3>
              <div className="flex items-center gap-3">
                {/* Счетчик графиков */}
                {visibleCharts.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {currentChartIndex + 1}/{visibleCharts.length}
                  </span>
                )}
                <button 
                  onClick={() => setIsSettingsOpen(true)} 
                  className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-teal-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Настройки графиков"
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>
            </div>
            <ChartsCarousel 
              visibleItems={1.0}
              onIndexChange={setCurrentChartIndex}
            >
              {visibleCharts.map((item, carouselIndex) => (
                <div key={`${item.id}-carousel-${carouselIndex}`} className="w-full">
                  {widgetComponents[item.id]}
                </div>
              ))}
            </ChartsCarousel>
          </div>
        );
      })()}

      {/* AI Advisor отдельно, так как он занимает всю ширину */}
      {layout.find(item => item.visible && item.id === 'aiAdvisor') && (
        <div className="mt-8">
          {widgetComponents['aiAdvisor']}
        </div>
      )}

    </div>
  );
};

export default Dashboard;