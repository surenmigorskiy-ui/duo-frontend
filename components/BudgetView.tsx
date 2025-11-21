import React, { useMemo, useState, useEffect } from 'react';
import { Budget, Transaction, PaymentMethod, Category, UserDetails, Language } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import FormattedNumberInput from './common/FormattedNumberInput';
import CategoriesManager from './CategoriesManager';
import InfoTooltip from './common/InfoTooltip';

interface BudgetViewProps {
  budget: Budget;
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  expenseCategories: Category[];
  userDetails: UserDetails;
  onUpdateBudget: (budget: Budget) => void;
  onAddPaymentMethod: (item: Omit<PaymentMethod, 'id'>) => void;
  onUpdatePaymentMethod: (item: PaymentMethod) => void;
  onDeletePaymentMethod: (id: string) => void;
  onStartEditPaymentMethod: (item: PaymentMethod | null) => void;
  onUpdateCategories: (categories: Category[]) => void;
  language: Language;
}

const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const colorClass = percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-teal-400';

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
                className={`h-2.5 rounded-full ${colorClass} transition-all duration-500`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
        </div>
    );
};

const getPaymentMethodIcon = (type: PaymentMethod['type']) => {
    switch(type) {
        case 'Card': return 'fa-credit-card';
        case 'Bank Account': return 'fa-university';
        case 'Cash': return 'fa-money-bill-wave';
        default: return 'fa-wallet';
    }
};

const BudgetContent: React.FC<{budget: Budget; expenses: Transaction[], expenseCategories: Category[], onUpdateBudget: (budget: Budget) => void; language: Language}> = ({ budget, expenses, expenseCategories, onUpdateBudget, language }) => {
    const t = useTranslation(language);
    const [isEditing, setIsEditing] = useState(false);
    const [editableBudget, setEditableBudget] = useState<Budget>(budget);

    useEffect(() => {
        setEditableBudget(budget);
    }, [budget]);

    const totalSpent = useMemo(() => expenses.reduce((sum, t) => sum + t.amount, 0), [expenses]);
    
    const spendingByCategory = useMemo(() => {
        const spent: { [key: string]: number } = {};
        expenses.forEach(t => {
          spent[t.category] = (spent[t.category] || 0) + t.amount;
        });
        return spent;
    }, [expenses]);

    const budgetWithSpending = useMemo(() => {
        return expenseCategories.map(categoryInfo => {
            const categoryName = categoryInfo.name;
            const budgetPercentage = budget.byCategory[categoryName] || 0;
            const budgetAmount = (budget.total * budgetPercentage) / 100;
            const spentAmount = spendingByCategory[categoryName] || 0;
            return {
                name: categoryName,
                icon: categoryInfo.icon,
                budget: budgetAmount,
                spent: spentAmount,
                remaining: budgetAmount - spentAmount,
                percentage: budgetPercentage,
            };
        }).sort((a, b) => b.percentage - a.percentage);
    }, [budget, spendingByCategory, expenseCategories]);

    // FIX: This function was allowing non-numeric values (like empty strings) to be set in the budget state,
    // causing type errors in other components. It's now hardened to ensure only numbers are stored.
    const handleBudgetChange = (key: 'total' | string, value: string | number | '') => {
        const parsed = typeof value === 'string' ? parseInt(value.replace(/\s/g, ''), 10) : value;

        // Use 0 for empty or invalid inputs to avoid storing NaN or strings in the state
        const numValue = (typeof parsed === 'number' && !isNaN(parsed)) ? parsed : 0;
        
        if (key === 'total') {
            setEditableBudget(prev => ({ ...prev, total: numValue }));
        } else {
            setEditableBudget(prev => ({
                ...prev,
                byCategory: { ...prev.byCategory, [key]: numValue }
            }));
        }
    };
    
    const totalAllocatedPercentage = useMemo(() => {
        return Object.keys(editableBudget.byCategory).reduce((sum, key) => {
            return sum + (Number(editableBudget.byCategory[key]) || 0);
        }, 0);
    }, [editableBudget.byCategory]);

    const handleSave = () => {
        onUpdateBudget(editableBudget);
        setIsEditing(false);
    };
      
    const handleCancel = () => {
        setEditableBudget(budget);
        setIsEditing(false);
    };

    return (
        <>
            <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center">
                    <h2 className="text-2xl font-bold">{t('budget.distribution')}</h2>
                    <InfoTooltip text="Планируйте расходы, задавая процент от общего бюджета на каждую категорию." />
                </div>
                {!isEditing && <button onClick={() => setIsEditing(true)} className="text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 w-10 h-10 rounded-full flex items-center justify-center transition-colors btn-press"><i className="fas fa-pencil-alt"></i></button>}
            </div>
            
            <div className="my-8">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('budget.monthlyBudget')}</span>
                    {!isEditing ? (
                        <span className="text-lg font-bold text-teal-500 dark:text-teal-400 font-mono">
                            {Math.round(budget.total).toLocaleString('ru-RU')}
                        </span>
                    ) : (
                        <FormattedNumberInput value={editableBudget.total} onChange={value => handleBudgetChange('total', value)} className="w-40 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1 text-right font-mono" />
                    )}
                </div>
                {!isEditing && <ProgressBar value={totalSpent} max={budget.total} />}
            </div>

            {isEditing && (
                <div className={`mb-6 p-3 rounded-lg text-center ${totalAllocatedPercentage > 100 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    <span className="font-bold">{t('budget.allocated')}: {totalAllocatedPercentage}% из 100%</span>
                </div>
            )}

            <div className="space-y-6">
              {budgetWithSpending.map(item => (
                (isEditing || item.percentage > 0) && <div key={item.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <i className={`${item.icon} mr-3 text-lg w-6 text-center text-gray-400 dark:text-gray-500 flex-shrink-0`} style={{ width: '24px' }}></i>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</span>
                    </div>
                    {!isEditing ? (
                        <div className="text-sm">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{Math.round(item.spent).toLocaleString('ru-RU')}</span>
                          <span className="text-gray-500 dark:text-gray-400"> / {Math.round(item.budget).toLocaleString('ru-RU')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" value={editableBudget.byCategory[item.name] || 0} onChange={e => handleBudgetChange(item.name, e.target.value)} className="w-24 accent-teal-500" />
                            <FormattedNumberInput value={editableBudget.byCategory[item.name] || 0} onChange={value => handleBudgetChange(item.name, value)} className="w-20 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1 text-center font-mono" />
                            <span className="text-lg font-mono">%</span>
                        </div>
                    )}
                  </div>
                  {!isEditing && (
                    <>
                        <ProgressBar value={item.spent} max={item.budget} />
                         <div className="text-right mt-1.5 text-xs font-medium">
                          {item.remaining >= 0 
                            ? <span className="text-green-600">Остаток: {Math.round(item.remaining).toLocaleString('ru-RU')}</span>
                            : <span className="text-red-600">Перерасход: {Math.round(Math.abs(item.remaining)).toLocaleString('ru-RU')}</span>
                          }
                         </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
                <div className="flex justify-end pt-8 space-x-3">
                  <button onClick={handleCancel} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 btn-press">Отмена</button>
                  <button onClick={handleSave} className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-md hover:bg-teal-600 disabled:bg-teal-300 btn-press" disabled={totalAllocatedPercentage > 100}>Сохранить</button>
                </div>
            )}
        </>
    );
};

const AccountsContent: React.FC<{
    paymentMethods: PaymentMethod[];
    userDetails: UserDetails;
    onDelete: (id: string) => void;
    onStartEdit: (item: PaymentMethod) => void;
    onAddNew: () => void;
    language: Language;
}> = ({ paymentMethods, userDetails, onDelete, onStartEdit, onAddNew, language }) => {
    const t = useTranslation(language);
    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center">
                    <h2 className="text-2xl font-bold">{t('budget.accounts')}</h2>
                    <InfoTooltip text="Ваши источники средств для расходов. Например, банковские карты, наличные или счета." />
                </div>
                <button onClick={onAddNew} className="bg-teal-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-teal-600 transition-colors shadow btn-press">
                    <i className="fas fa-plus"></i>
                </button>
            </div>
            <div className="space-y-3">
                {paymentMethods.map(pm => (
                    <div key={pm.id} className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex items-center space-x-4">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-600 text-xl`}>
                            <i className={`fas ${getPaymentMethodIcon(pm.type)} text-gray-500 dark:text-gray-400`}></i>
                        </div>
                        <div className="flex-grow">
                            <p className="font-bold text-gray-800 dark:text-gray-100">{pm.name}</p>
                            <div className="flex items-center space-x-3 text-xs mt-1">
                                <span className="text-gray-500 dark:text-gray-400">{pm.type}</span>
                                <span className={`px-2 py-0.5 rounded-full text-white text-opacity-80 text-xs ${userDetails[pm.owner]?.color || 'bg-gray-500'}`}>{userDetails[pm.owner]?.name || pm.owner}</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <button onClick={() => onStartEdit(pm)} className="text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors p-2 btn-press">
                                <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button onClick={() => onDelete(pm.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 btn-press">
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
};


const BudgetView: React.FC<BudgetViewProps> = ({ budget, transactions, paymentMethods, expenseCategories, userDetails, onUpdateBudget, onAddPaymentMethod, onUpdatePaymentMethod, onDeletePaymentMethod, onStartEditPaymentMethod, onUpdateCategories, language }) => {
    const t = useTranslation(language);
    const [activeTab, setActiveTab] = useState<'budget' | 'accounts' | 'categories'>('budget');
    const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);

    const tabs = [
        { id: 'budget', label: t('budget.title') },
        { id: 'accounts', label: t('accounts.title') },
        { id: 'categories', label: 'Категории' },
    ];

    return (
        <div className="p-4 md:p-6 space-y-6 text-gray-900 dark:text-gray-100">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="relative mb-6">
                    <div className="flex justify-center border-b border-gray-200 dark:border-gray-700">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id as any)} 
                                className={`w-1/3 py-3 text-sm font-semibold transition-colors focus:outline-none ${activeTab === tab.id ? 'text-teal-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
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

                {activeTab === 'budget' && <BudgetContent budget={budget} expenses={expenses} expenseCategories={expenseCategories} onUpdateBudget={onUpdateBudget} language={language} />}
                {activeTab === 'accounts' && <AccountsContent 
                    paymentMethods={paymentMethods}
                    userDetails={userDetails}
                    onDelete={onDeletePaymentMethod}
                    onStartEdit={onStartEditPaymentMethod}
                    onAddNew={() => onStartEditPaymentMethod(null)}
                    language={language}
                />}
                {activeTab === 'categories' && <CategoriesManager 
                    expenseCategories={expenseCategories}
                    onUpdateCategories={onUpdateCategories}
                />}
            </div>
        </div>
    );
};

export default BudgetView;