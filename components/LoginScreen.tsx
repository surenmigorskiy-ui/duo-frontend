// C:/duo-frontend/components/LoginScreen.tsx (ФИНАЛЬНАЯ, ЧИСТАЯ ВЕРСИЯ)

import React, { useState } from 'react';

interface LoginScreenProps {
    onLogin: (loginData: { email: string; password: string; }) => Promise<void>;
    onRegister: (registerData: { name: string; email: string; password: string; avatar: string; }) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister }) => {
    const [view, setView] = useState<'welcome' | 'login' | 'register'>('welcome');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Пожалуйста, заполните все поля.');
            return;
        }

        setIsLoading(true);
        try {
            await onLogin({ email, password });
        } catch (err) {
            setError('Неверный email или пароль.');
            setIsLoading(false);
        }
    };
    
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) {
            setError('Пожалуйста, заполните все поля.');
            return;
        }
        
        setIsLoading(true);
        try {
            await onRegister({ name, email, password, avatar: '😀' });
        } catch (err) {
            setError('Не удалось зарегистрироваться. Возможно, email уже занят.');
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (view === 'welcome') {
            return (
                <div className="animate-fade-in-up">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold mb-4">Duo Finance</h1>
                        <p className="text-lg text-gray-300">Возьмите личные и семейные финансы под полный контроль.</p>
                    </div>
                    
                    <div className="space-y-6 text-left mb-12">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                                <i className="fas fa-receipt text-2xl text-teal-300"></i>
                            </div>
                            <div>
                                <h3 className="font-semibold">Умное сканирование чеков</h3>
                                <p className="text-sm text-gray-400">Добавляйте расходы за секунды, просто сфотографировав чек.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <i className="fas fa-users text-2xl text-blue-300"></i>
                            </div>
                            <div>
                                <h3 className="font-semibold">Семейный бюджет</h3>
                                <p className="text-sm text-gray-400">Управляйте общими и личными счетами, видя полную картину.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                                <i className="fas fa-bullseye text-2xl text-pink-300"></i>
                            </div>
                            <div>
                                <h3 className="font-semibold">Цели и планы</h3>
                                <p className="text-sm text-gray-400">Ставьте финансовые цели и отслеживайте прогресс их достижения.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <i className="fas fa-brain text-2xl text-purple-300"></i>
                            </div>
                            <div>
                                <h3 className="font-semibold">Советы от ИИ</h3>
                                <p className="text-sm text-gray-400">Получайте персональные рекомендации по оптимизации расходов.</p>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setView('login')} 
                        className="w-full bg-teal-500 font-semibold p-3 rounded-md hover:bg-teal-600 transition-colors"
                    >
                        Войти или зарегистрироваться
                    </button>
                </div>
            );
        }

        if (view === 'register') {
            return (
                <div className="animate-fade-in-up">
                    <h2 className="text-2xl font-bold text-center mb-1">Регистрация</h2>
                    <p className="text-center text-gray-400 mb-6">Создайте новый аккаунт</p>
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Имя</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md p-3" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md p-3" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Пароль</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md p-3" required />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-teal-500 font-semibold p-3 rounded-md hover:bg-teal-600 disabled:bg-teal-800 transition-colors flex items-center justify-center">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Создать аккаунт'}
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <button onClick={() => setView('login')} className="text-sm text-gray-400 hover:text-white">Уже есть аккаунт? <span className="underline">Войти</span></button>
                    </div>
                    <div className="mt-2 text-center">
                        <button onClick={() => setView('welcome')} className="text-sm text-gray-400 hover:text-white">← Назад</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in-up">
                <h2 className="text-2xl font-bold text-center mb-1">Вход</h2>
                <p className="text-center text-gray-400 mb-6">Войдите в свой аккаунт</p>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md p-3" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Пароль</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md p-3" required />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-teal-500 font-semibold p-3 rounded-md hover:bg-teal-600 disabled:bg-teal-800 transition-colors flex items-center justify-center">
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Войти'}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <button 
                        onClick={() => {
                            const email = prompt('Введите email для восстановления пароля:');
                            if (email) {
                                // TODO: Реализовать функционал восстановления пароля
                                alert('Инструкции по восстановлению пароля будут отправлены на ' + email);
                            }
                        }} 
                        className="text-sm text-gray-400 hover:text-white underline transition-colors"
                    >
                        Забыли пароль?
                    </button>
                </div>
                 <div className="mt-4 text-center">
                    <button onClick={() => setView('register')} className="text-sm text-gray-400 hover:text-white">Нет аккаунта? <span className="underline">Зарегистрироваться</span></button>
                </div>
                <div className="mt-2 text-center">
                    <button onClick={() => setView('welcome')} className="text-sm text-gray-400 hover:text-white">← Назад</button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {renderContent()}
                    {error && <p className="text-red-400 text-sm mt-4 text-center animate-fade-in-up">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;