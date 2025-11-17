// C:/duo-frontend/components/SideMenu.tsx

import React, { useState, useEffect } from 'react';
import { User, Theme, UserDetails } from '../types';
import api from '../services/api';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUserChange: (user: User) => void;
    userDetails: UserDetails;
    theme: Theme;
    onThemeCycle: () => void;
    themeIcon: string;
    onSync: () => void;
    onReset: () => void;
    isDemoMode: boolean;
    onToggleDemoMode: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
}

interface Member {
    id: string;
    name: string;
    avatar: string;
    // Добавим color, чтобы компонент не ругался
    color?: string; 
}

const SideMenu: React.FC<SideMenuProps> = ({ 
    isOpen, onClose, currentUser, onUserChange, userDetails,
    theme, onThemeCycle, themeIcon, onSync, onReset, 
    isDemoMode, onToggleDemoMode, onOpenSettings, onLogout
}) => {
    
    const [members, setMembers] = useState<Member[] | null>(null); // <-- Начинаем с null
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    
    useEffect(() => {
        const fetchMembers = async () => {
            if (!isOpen) return; // Не загружаем, если меню закрыто
            setIsLoadingMembers(true);
            try {
                const response = await api.get('/family/members');
                // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
                // Бэкенд возвращает просто массив, поэтому берем response.data
                setMembers(response.data); 
            } catch (error) {
                console.error("Не удалось загрузить членов семьи:", error);
                setMembers([]); // В случае ошибки ставим пустой массив
            } finally {
                setIsLoadingMembers(false);
            }
        };

        fetchMembers();
        
    }, [isOpen]);

    const handleInvite = async () => {
        try {
            const response = await api.post('/family/invitation');
            const { inviteCode } = response.data;
            const inviteLink = `${window.location.origin}/join/${inviteCode}`;
            
            await navigator.clipboard.writeText(inviteLink);
            alert('Ссылка-приглашение скопирована в буфер обмена!');
        } catch (error) {
            console.error("Ошибка создания приглашения:", error);
            alert('Не удалось создать ссылку. Попробуйте позже.');
        }
    };

    const handleUserChange = (user: User) => {
        onUserChange(user);
        onClose();
    };

    const handleReset = () => {
        onReset();
        onClose();
    }
    
    const handleDemoToggle = () => {
        onToggleDemoMode();
        onClose();
    };

    const handleOpenSettings = () => {
        onOpenSettings();
        onClose();
    }

    const handleLogout = () => {
        onLogout();
        onClose();
    }

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black bg-opacity-60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <div 
                className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-6 flex flex-col h-full">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Duo Finance</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Меню управления</p>
                    </div>
                    
                    <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Профиль</p>
                        {/* --- УЛУЧШЕННАЯ ЛОГИКА ОТОБРАЖЕНИЯ --- */}
                        {isLoadingMembers && (
                            <div className="text-center text-gray-500">Загрузка...</div>
                        )}
                        {/* Проверяем, что members не null и не пустой массив */}
                        {members && members.length > 0 && (
                            members.map(member => {
                                // Получаем детали пользователя из userDetails, чтобы взять цвет
                                const memberDetails = userDetails[member.id];
                                return (
                                    <div key={member.id} className={`flex items-center w-full px-4 py-3 text-sm rounded-lg ${currentUser.id === member.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        <span className={`w-8 h-8 rounded-full ${memberDetails?.color || 'bg-gray-500'} text-white flex items-center justify-center text-base mr-3`}>{member.avatar}</span> 
                                        {member.name}
                                        {currentUser.id === member.id && <i className="fas fa-check-circle ml-auto"></i>}
                                    </div>
                                )
                            })
                        )}
                         <button onClick={handleInvite} className="flex items-center w-full px-4 py-3 mt-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-user-plus w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> Пригласить в семью
                        </button>
                    </div>

                    <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Настройки</p>
                         <button onClick={onThemeCycle} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className={`fas ${themeIcon} w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400`}></i> {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                        </button>
                        <button onClick={handleOpenSettings} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-globe w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> Язык и валюта
                        </button>
                         <button onClick={onSync} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-sync-alt w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> Синхронизировать
                        </button>
                         <button onClick={handleDemoToggle} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className={`fas fa-flask w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400`}></i> {isDemoMode ? 'Вернуться к данным' : 'Демо-режим'}
                        </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                        <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-sign-out-alt w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> Выйти из профиля
                        </button>
                         <button onClick={handleReset} className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                            <i className="fas fa-trash-alt w-8 text-center mr-3 text-lg"></i> Сбросить данные
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SideMenu;