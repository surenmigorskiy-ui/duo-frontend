// C:/duo-frontend/App.tsx

import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Transaction, Budget, View, User, Goal, PaymentMethod, Theme, Category, PlannedExpense, DashboardLayoutItem, UserDetails, Language } from './types';
import { MOCK_BUDGET, USER_DETAILS, MOCK_PAYMENT_METHODS, DEFAULT_CATEGORIES, INCOME_CATEGORIES, DEMO_DATA, DEMO_USER_DETAILS } from './constants';
import AddTransactionModal from './components/AddExpenseModal';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import BudgetView from './components/BudgetView';
import GoalsView from './components/GoalsView';
import AddPaymentMethodModal from './components/AddPaymentMethodModal';
import SideMenu from './components/SideMenu';
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './components/JoinPage';
import api from './services/api'; 

// Инициализация кода приглашения (выполняется безопасно)
if (typeof window !== 'undefined') {
  const path = window.location.pathname;
  if (path.startsWith('/join/')) {
    const code = path.split('/')[2];
    if (code) {
      console.log('Найден код приглашения (синхронно):', code);
      sessionStorage.setItem('inviteCode', code);
      // Очищаем URL, чтобы он не мешался при перезагрузках
      window.history.replaceState({}, document.title, "/");
    }
  }
}

interface AppData {
  transactions: Transaction[];
  budget: Budget;
  goals: Goal[];
  plannedExpenses: PlannedExpense[];
  paymentMethods: PaymentMethod[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  dashboardLayout?: DashboardLayoutItem[];
}
interface ActiveFilters {
  type: 'income' | 'expense' | null;
}

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutItem[] = [
    { id: 'categorySpending', visible: true },
    { id: 'dailySpending', visible: true },
    { id: 'incomeVsExpense', visible: true },
    { id: 'budgetVsActual', visible: true },
    { id: 'paymentMethodSpending', visible: true },
    { id: 'userSpending', visible: true },
    { id: 'prioritySpending', visible: true },
    { id: 'monthlyTrend', visible: true },
    { id: 'weeklySpending', visible: true },
    { id: 'topTransactions', visible: true },
    { id: 'subCategorySpending', visible: true },
    { id: 'plannedVsActual', visible: true },
    { id: 'goalProgress', visible: true },
    { id: 'calendarHeatmap', visible: true },
    { id: 'timeOfDay', visible: true },
    { id: 'userIncomeExpense', visible: true },
    { id: 'aiAdvisor', visible: true },
];

// Функция для объединения существующего layout с дефолтным (добавляет новые графики)
const mergeDashboardLayout = (existingLayout: DashboardLayoutItem[] | undefined): DashboardLayoutItem[] => {
  if (!existingLayout) return DEFAULT_DASHBOARD_LAYOUT;
  
  const existingIds = new Set(existingLayout.map(item => item.id));
  const merged = [...existingLayout];
  
  // Добавляем новые графики, которых нет в существующем layout
  DEFAULT_DASHBOARD_LAYOUT.forEach(defaultItem => {
    if (!existingIds.has(defaultItem.id)) {
      merged.push(defaultItem);
    }
  });
  
  return merged;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedUser = localStorage.getItem('currentUser');
      const token = localStorage.getItem('authToken');
      return storedUser && token ? JSON.parse(storedUser) as User : null;
    } catch {
      return null;
    }
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget>(MOCK_BUDGET);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(INCOME_CATEGORIES);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayoutItem[]>(() => {
    // При инициализации проверяем localStorage на наличие сохраненного layout
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dashboardLayout');
        if (stored) {
          const parsed = JSON.parse(stored);
          return mergeDashboardLayout(parsed);
        }
      } catch (e) {
        console.error('Error loading dashboard layout from localStorage:', e);
      }
    }
    return DEFAULT_DASHBOARD_LAYOUT;
  });
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [paymentMethodToEdit, setPaymentMethodToEdit] = useState<PaymentMethod | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ type: null });

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [realData, setRealData] = useState<AppData | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails>(USER_DETAILS);

  const [language, setLanguage] = useState<Language>('ru');
  const [activeCurrencies, setActiveCurrencies] = useState<{ [key: string]: boolean }>({ SUM: true, USD: true });


  // ---------- THEME (robust) ----------
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = localStorage.getItem('theme') as Theme | null;
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // Игнорируем ошибки localStorage
    }
    // Если тема не сохранена, используем светлую по умолчанию (не системную)
    return 'light';
  });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    
    // Применяем тему явно
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Игнорируем ошибки localStorage
    }
    root.setAttribute('data-theme', theme);
    
    // Устанавливаем color-scheme для предотвращения автоматического определения системной темы
    if (theme === 'dark') {
      root.style.colorScheme = 'dark';
    } else {
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // Динамический заголовок страницы
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewTitles: { [key in View]: string } = {
      dashboard: 'Обзор',
      transactions: 'Мониторинг',
      accounts: 'Счета',
      budget: 'Бюджет',
      goals: 'Цели',
    };
    
    const title = viewTitles[currentView] || 'Duo Finance';
    document.title = `${title} | Duo Finance`;
    
    // Обновляем favicon
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/favicon.svg';
    }
  }, [currentView]);

  const cycleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);
  
  useEffect(() => {
    if (currentUser) {
        loadDataFromServer();
    } else {
        setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isLoading && !isDemoMode && currentUser) {
        const timer = setTimeout(() => {
            saveDataToServer();
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [transactions, budget, goals, paymentMethods, expenseCategories, incomeCategories, plannedExpenses, dashboardLayout]);


  const loadDataFromServer = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/family/data');
      const data: AppData = response.data;
      
      setTransactions(data.transactions || []);
      setBudget(data.budget || MOCK_BUDGET);
      setGoals(data.goals || []);
      setPlannedExpenses(data.plannedExpenses || []);
      setPaymentMethods(data.paymentMethods || MOCK_PAYMENT_METHODS);
      setExpenseCategories(data.expenseCategories || DEFAULT_CATEGORIES);
      setIncomeCategories(data.incomeCategories || INCOME_CATEGORIES);
      setDashboardLayout(mergeDashboardLayout(data.dashboardLayout));

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      alert('Не удалось загрузить данные. Возможно, ваша сессия истекла. Попробуйте войти снова.');
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const saveDataToServer = async (updatedData?: Partial<AppData>) => {
    if (isDemoMode || isLoading) return;

    try {
      setIsSyncing(true);
      const data: AppData = updatedData ? {
        transactions: updatedData.transactions ?? transactions,
        budget: updatedData.budget ?? budget,
        goals: updatedData.goals ?? goals,
        plannedExpenses: updatedData.plannedExpenses ?? plannedExpenses,
        paymentMethods: updatedData.paymentMethods ?? paymentMethods,
        expenseCategories: updatedData.expenseCategories ?? expenseCategories,
        incomeCategories: updatedData.incomeCategories ?? incomeCategories,
        dashboardLayout: updatedData.dashboardLayout ?? dashboardLayout,
      } : {
        transactions, budget, goals, plannedExpenses, paymentMethods, expenseCategories, incomeCategories, dashboardLayout
      };
      await api.put('/family/data', data);
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const toggleDemoMode = () => {
    setIsDemoMode(prev => {
      const newMode = !prev;
      
      if (newMode) {
        // ВХОД В ДЕМО-РЕЖИМ
        // Сохраняем текущие (реальные) данные в realData
        setRealData({ 
          transactions, 
          budget, 
          goals, 
          plannedExpenses, 
          paymentMethods, 
          expenseCategories, 
          incomeCategories, 
          dashboardLayout 
        });
        
        // Загружаем демо-данные во все основные состояния приложения
        setTransactions(DEMO_DATA.transactions as Transaction[]);
        setBudget(DEMO_DATA.budget);
        setGoals(DEMO_DATA.goals as Goal[]);
        setPlannedExpenses(DEMO_DATA.plannedExpenses as PlannedExpense[]);
        setPaymentMethods(DEMO_DATA.paymentMethods as PaymentMethod[]);
        setExpenseCategories(DEMO_DATA.expenseCategories);
        setIncomeCategories(DEMO_DATA.incomeCategories);
        setUserDetails(DEMO_USER_DETAILS);
      } else if (realData) {
        // ВЫХОД ИЗ ДЕМО-РЕЖИМА
        // Восстанавливаем реальные данные из realData
        setTransactions(realData.transactions);
        setBudget(realData.budget);
        setGoals(realData.goals);
        setPlannedExpenses(realData.plannedExpenses);
        setPaymentMethods(realData.paymentMethods);
        setExpenseCategories(realData.expenseCategories);
        setIncomeCategories(realData.incomeCategories);
        setDashboardLayout(mergeDashboardLayout(realData.dashboardLayout));
        
        // Возвращаем обычные имена пользователей
        setUserDetails(USER_DETAILS);
        
        // Очищаем "резервную копию"
        setRealData(null);
      }
      
      return newMode;
    });
  };

  const forceSync = async () => {
    await saveDataToServer();
    await loadDataFromServer();
    alert('Данные синхронизированы!');
  };

  const handleResetData = async () => {
    // Шаг 1: Запрос пароля
    const password = prompt('Для удаления всех данных введите пароль от вашего профиля:');
    if (!password) return;
    
    try {
      // Проверяем пароль
      const verifyResponse = await api.post('/auth/verify-password', { password });
      if (!verifyResponse.data.valid) {
        alert('Неверный пароль. Операция отменена.');
        return;
      }
      
      // Шаг 2: Подтверждение
      if (!window.confirm('Вы уверены, что хотите удалить все данные? Это действие необратимо.')) {
        return;
      }
      
      // Шаг 3: Подтверждение всех пользователей (если есть другие)
      try {
        const membersResponse = await api.get('/family/members');
        const members = membersResponse.data || [];
        if (members.length > 1) {
          const confirmedMembers = new Set<string>();
          confirmedMembers.add(currentUser.id);
          
          for (const member of members) {
            if (member.id !== currentUser.id) {
              const memberConfirm = confirm(`Пользователь ${member.name} должен подтвердить удаление данных. Продолжить?`);
              if (memberConfirm) {
                confirmedMembers.add(member.id);
              }
            }
          }
          
          if (confirmedMembers.size < members.length) {
            alert('Не все пользователи подтвердили удаление. Операция отменена.');
            return;
          }
        }
      } catch (error) {
        console.error('Ошибка проверки членов семьи:', error);
      }
      
      // Удаляем данные
      await api.delete('/family/data');
      await loadDataFromServer();
      alert('Все данные были сброшены.');
    } catch (error: any) {
      console.error('Ошибка удаления данных:', error);
      if (error.response?.status === 401) {
        alert('Неверный пароль. Операция отменена.');
      } else {
        alert('Произошла ошибка при удалении данных.');
      }
    }
  };

 // ВАШ ГЛАВНЫЙ ФАЙЛ (например, App.tsx)

// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ ВХОДА ---
const handleLogin = async (loginData: any) => {
  try {
    // 1. Отправляем запрос на вход
    const response = await api.post('/auth/login', loginData);
    const { token, user } = response.data;
    
    // 2. Сохраняем токен и данные пользователя
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    // Устанавливаем токен для всех будущих запросов
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // --- ЛОГИКА ПРИСОЕДИНЕНИЯ К СЕМЬЕ ПОСЛЕ ВХОДА ---

    // 3. Проверяем, есть ли в памяти браузера "ожидающий" код
    const inviteCode = sessionStorage.getItem('inviteCode');

    if (inviteCode) {
        console.log('Найден код приглашения, присоединяемся к семье...');
        // 4. Если код есть, отправляем запрос на присоединение
        await api.post('/family/join', { inviteCode });
        // Удаляем код, чтобы он не использовался повторно
        sessionStorage.removeItem('inviteCode');
        
        // 5. Просто перезагружаем приложение. 
        // Это самый надежный способ обновить все данные о новой семье.
        alert('Вы успешно присоединились к семье!');
        window.location.reload(); 
        return; // Завершаем выполнение функции здесь
    }
    
    // Если кода не было, просто обновляем состояние пользователя
    setCurrentUser(user);
    
  } catch (error) {
    console.error('Login failed:', error);
    alert('Неверный email или пароль.');
  }
};
  
// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ РЕГИСТРАЦИИ (простая версия) ---
const handleRegister = async (newUserInfo: any) => {
  try {
      const response = await api.post('/auth/register', newUserInfo);
      const { token, user } = response.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const inviteCode = sessionStorage.getItem('inviteCode');
      if (inviteCode) {
          console.log('Пользователь зарегистрирован, присоединяемся к семье...');
          await api.post('/family/join', { inviteCode });
          sessionStorage.removeItem('inviteCode');
          // Просто перезагружаем страницу.
          window.location.reload(); 
          return;
      }
      
      setCurrentUser(user);
      
  } catch (error) {
      console.error('Registration failed:', error);
      alert('Не удалось зарегистрироваться. Возможно, email уже занят.');
  }
};

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    setTransactions([]);
    setBudget(MOCK_BUDGET);
    setGoals([]);
    setPlannedExpenses([]);
    setPaymentMethods(MOCK_PAYMENT_METHODS);
    setExpenseCategories(DEFAULT_CATEGORIES);
    setIncomeCategories(INCOME_CATEGORIES);
    setDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>, sourceId?: string) => {
    const newTransaction = { ...transaction, id: new Date().toISOString() + Math.random() };
    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    if (sourceId) {
        if (plannedExpenses.some(p => p.id === sourceId)) {
            deletePlannedExpense(sourceId);
        } else if (goals.some(g => g.id === sourceId)) {
            deleteGoal(sourceId);
        }
    }
    // Сохраняем на сервер сразу после добавления с обновленными данными
    if (!isDemoMode) {
      try {
        await saveDataToServer({ transactions: updatedTransactions });
      } catch (error) {
        console.error('Ошибка сохранения транзакции на сервер:', error);
      }
    }
  };
  
  const updateTransaction = async (updatedTransaction: Transaction) => {
    const updatedTransactions = transactions.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx);
    setTransactions(updatedTransactions);
    // Сохраняем на сервер сразу после обновления с обновленными данными
    if (!isDemoMode) {
      try {
        await saveDataToServer({ transactions: updatedTransactions });
      } catch (error) {
        console.error('Ошибка сохранения обновленной транзакции на сервер:', error);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter(tx => tx.id !== id);
    setTransactions(updatedTransactions);
    // Сохраняем на сервер сразу после удаления с обновленными данными
    if (!isDemoMode) {
      try {
        await saveDataToServer({ transactions: updatedTransactions });
      } catch (error) {
        console.error('Ошибка сохранения удаления транзакции на сервер:', error);
      }
    }
  };
  
  const handleStartEditTransaction = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsTransactionModalOpen(true);
  };
  
  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setTransactionToEdit(null);
  };

  const addPaymentMethod = (item: Omit<PaymentMethod, 'id'>) => {
    setPaymentMethods(prev => [{ ...item, id: new Date().toISOString() + Math.random() }, ...prev]);
  };

  const updatePaymentMethod = (updatedItem: PaymentMethod) => {
    setPaymentMethods(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(item => item.id !== id));
  };

  const handleStartEditPaymentMethod = (item: PaymentMethod | null) => {
    setPaymentMethodToEdit(item);
    setIsPaymentMethodModalOpen(true);
  };
  
  const updateBudget = (newBudget: Budget) => {
    setBudget(newBudget);
  };

  const addGoal = (item: Omit<Goal, 'id'>) => {
    setGoals(prev => [{ ...item, id: new Date().toISOString() + Math.random() }, ...prev]);
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(item => item.id !== id));
  };
  
  const addPlannedExpense = (item: Omit<PlannedExpense, 'id'>) => {
    setPlannedExpenses(prev => [{ ...item, id: new Date().toISOString() + Math.random() }, ...prev]);
  };

  const deletePlannedExpense = (id: string) => {
    setPlannedExpenses(prev => prev.filter(item => item.id !== id));
  };

  const handleConvertToTransaction = (item: Goal | PlannedExpense) => {
    if (!currentUser) return;
    const fakeTransaction: Transaction = {
        id: `temp-${item.id}`,
        description: item.description,
        amount: item.amount,
        category: item.category,
        subCategory: undefined,
        date: 'dueDate' in item ? item.dueDate : new Date().toISOString(),
        user: item.user,
        priority: 'nice-to-have',
        type: 'expense',
        paymentMethodId: undefined,
    };
    setTransactionToEdit(fakeTransaction);
    setIsTransactionModalOpen(true);
  };
  
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setActiveFilters({ type: null });
    setIsSideMenuOpen(false);
  };
  
  const handleNavigateToTransactions = (type: 'income' | 'expense') => {
    setActiveFilters({ type });
    setCurrentView('transactions');
  };

  const NavItem: React.FC<{ view: View; label: string; icon: string; }> = ({ view, label, icon }) => (
    <button onClick={() => handleViewChange(view)} className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${currentView === view ? 'text-teal-500 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
      <i className={`fas ${icon} text-xl`}></i>
      <span className="mt-1 text-xs font-medium">{label}</span>
    </button>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard 
            transactions={transactions} 
            budget={budget} 
            plannedExpenses={plannedExpenses} 
            goals={goals}
            paymentMethods={paymentMethods}
            userDetails={userDetails}
            onNavigateToTransactions={handleNavigateToTransactions} 
            isSyncing={isSyncing} 
            layout={dashboardLayout}
            onLayoutChange={setDashboardLayout}
            language={language}
        />;
      case 'transactions':
        return <TransactionList 
          transactions={transactions} 
          paymentMethods={paymentMethods} 
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          userDetails={userDetails}
          onDeleteTransaction={deleteTransaction} 
          onEditTransaction={handleStartEditTransaction}
          filters={activeFilters}
          onFilterChange={setActiveFilters}
          language={language}
        />;
      case 'budget':
        return <BudgetView 
          budget={budget}
          onUpdateBudget={updateBudget}
          transactions={transactions}
          paymentMethods={paymentMethods}
          expenseCategories={expenseCategories}
          userDetails={userDetails}
          onAddPaymentMethod={addPaymentMethod}
          onUpdatePaymentMethod={updatePaymentMethod}
          onDeletePaymentMethod={deletePaymentMethod}
          onStartEditPaymentMethod={handleStartEditPaymentMethod}
          onUpdateCategories={setExpenseCategories}
        />;
      case 'goals':
        return <GoalsView 
          goals={goals} 
          plannedExpenses={plannedExpenses}
          transactions={transactions} 
          budget={budget}
          currentUser={currentUser}
          userDetails={userDetails}
          onAddGoal={addGoal}
          onDeleteGoal={deleteGoal}
          onAddPlannedExpense={addPlannedExpense}
          onDeletePlannedExpense={deletePlannedExpense}
          onConvertToTransaction={handleConvertToTransaction}
          language={language}
        />;
      default:
        return <Dashboard 
            transactions={transactions} 
            budget={budget} 
            plannedExpenses={plannedExpenses} 
            paymentMethods={paymentMethods}
            userDetails={userDetails}
            onNavigateToTransactions={handleNavigateToTransactions} 
            isSyncing={isSyncing} 
            layout={dashboardLayout}
            onLayoutChange={setDashboardLayout}
            language={language}
        />;
    }
  };

  // КОПИРУЙТЕ И ВСТАВЛЯЙТЕ ВЕСЬ ЭТОТ БЛОК В КОНЕЦ ФАЙЛА APP.TSX

  // --- КОМПОНЕНТ ДЛЯ ОСНОВНОГО ПРИЛОЖЕНИЯ ---
  // В него мы просто обернули вашу старую разметку
  const MainAppLayout = () => {
    // Если данные еще грузятся, показываем экран загрузки
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-teal-500 mb-4"></i>
            <p className="text-gray-600 dark:text-gray-400">Загрузка данных...</p>
          </div>
        </div>
      );
    }

    // Когда загрузка завершена, показываем основной интерфейс
    return (
      <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <div className="flex items-center">
              <button onClick={() => setIsSideMenuOpen(true)} className="w-10 h-10 flex items-center justify-center text-lg text-gray-600 dark:text-gray-300 mr-2">
                  <i className="fas fa-bars"></i>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Duo Finance</h1>
              {isSyncing && !isDemoMode && (
                  <span className="ml-3 text-xs text-teal-500 flex items-center">
                  <i className="fas fa-sync fa-spin mr-1"></i> Синхронизация...
                  </span>
              )}
               {isDemoMode && (
                  <span className="ml-3 text-xs text-yellow-500 font-semibold bg-yellow-500/10 px-2 py-1 rounded-md">
                      Демо-режим
                  </span>
              )}
          </div>
        </header>

        <SideMenu 
          isOpen={isSideMenuOpen} 
          onClose={() => setIsSideMenuOpen(false)}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          userDetails={userDetails}
          theme={theme}
          onThemeCycle={cycleTheme}
          themeIcon={theme === 'light' ? 'fa-moon' : 'fa-sun'}
          onSync={forceSync}
          onReset={handleResetData}
          isDemoMode={isDemoMode}
          onToggleDemoMode={toggleDemoMode}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onLogout={handleLogout}
          language={language}
        />
        
        <main className="flex-grow pb-24">
          {renderView()}
        </main>
        
        <AddTransactionModal
          isOpen={isTransactionModalOpen}
          recentTransactions={transactions}
          onClose={handleCloseTransactionModal}
          onAddTransaction={addTransaction}
          onUpdateTransaction={updateTransaction}
          currentUser={currentUser}
          transactionToEdit={transactionToEdit}
          paymentMethods={paymentMethods}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          userDetails={userDetails}
          activeCurrencies={activeCurrencies}
          language={language}
        />

        <AddPaymentMethodModal
          isOpen={isPaymentMethodModalOpen}
          onClose={() => setIsPaymentMethodModalOpen(false)}
          onAdd={addPaymentMethod}
          onUpdate={updatePaymentMethod}
          itemToEdit={paymentMethodToEdit}
        />

        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          language={language}
          onLanguageChange={setLanguage}
          activeCurrencies={activeCurrencies}
          onCurrenciesChange={setActiveCurrencies}
        />

        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 z-40 shadow-lg">
          <div className="flex justify-around items-center h-full max-w-lg mx-auto">
            <div className="w-1/5 h-full"><NavItem view="dashboard" label="Главная" icon="fa-chart-pie" /></div>
            <div className="w-1/5 h-full"><NavItem view="transactions" label="Мониторинг" icon="fa-list-ul" /></div>

            <div className="w-1/5 h-full flex justify-center">
              <button 
                onClick={() => { setTransactionToEdit(null); setIsTransactionModalOpen(true); }}
                className="w-16 h-16 bg-teal-500 rounded-full text-white flex items-center justify-center -translate-y-6 shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-transform duration-200 ease-in-out transform hover:scale-110 hover:-translate-y-7 active:scale-95 active:-translate-y-5 btn-press"
              >
                <i className="fas fa-plus text-2xl"></i>
              </button>
            </div>
            <div className="w-1/5 h-full"><NavItem view="budget" label="Бюджет" icon="fa-piggy-bank" /></div>
            <div className="w-1/5 h-full"><NavItem view="goals" label="Цели" icon="fa-bullseye" /></div>
          </div>
        </div>
      </div>
    );
  };

  // --- ГЛАВНАЯ ЛОГИКА РОУТИНГА ---
  return (
    <BrowserRouter>
      <Routes>
        {/* Адрес для страницы-приглашения */}
        <Route 
          path="/join" 
          element={<JoinPage isLoggedIn={!!currentUser} token={typeof window !== 'undefined' ? localStorage.getItem('authToken') : null} />} 
        />

        {/* Адрес для страницы входа */}
        <Route 
          path="/login" 
          element={ currentUser ? <Navigate to="/" /> : <LoginScreen onLogin={handleLogin} onRegister={handleRegister} /> } 
        />

        {/* Любой другой адрес (главная страница и т.д.) */}
        <Route 
          path="/*" 
          element={ currentUser ? <MainAppLayout /> : <Navigate to="/login" /> } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;