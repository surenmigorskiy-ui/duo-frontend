// C:/duo-frontend/components/LoginScreen.tsx (ФИНАЛЬНАЯ, ЧИСТАЯ ВЕРСИЯ)

import React, { useState } from 'react';

interface LoginScreenProps {
    onLogin: (loginData: { email: string; password: string; }) => Promise<void>;
    onRegister: (registerData: { name: string; email: string; password: string; avatar: string; }) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister }) => {
    const [view, setView] = useState<'login' | 'register'>('login');
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
                 <div className="mt-6 text-center">
                    <button onClick={() => setView('register')} className="text-sm text-gray-400 hover:text-white">Нет аккаунта? <span className="underline">Зарегистрироваться</span></button>
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