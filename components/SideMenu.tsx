// C:/duo-frontend/components/SideMenu.tsx

import React, { useState, useEffect, useRef } from 'react';
import { User, Theme, UserDetails, Language } from '../types';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

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
    language: Language;
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
    isDemoMode, onToggleDemoMode, onOpenSettings, onLogout, language
}) => {
    const t = useTranslation(language || 'ru');
    
    const [members, setMembers] = useState<Member[]>([]); // Начинаем с пустого массива
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string>('');
    const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Отслеживаем загрузку для placeholder
    
    // Загружаем данные сразу при монтировании компонента
    useEffect(() => {
        const fetchMembers = async () => {
            setIsLoading(true);
            
            // Загружаем в фоне без показа индикатора загрузки
            try {
                const response = await api.get('/family/members');
                const newMembers = response.data || [];
                // Сортируем: текущий пользователь всегда первый
                const sortedMembers = [...newMembers].sort((a, b) => {
                    if (a.id === currentUser.id) return -1;
                    if (b.id === currentUser.id) return 1;
                    return 0;
                });
                setMembers(sortedMembers);
            } catch (error) {
                console.error("Не удалось загрузить членов семьи:", error);
                // В случае ошибки оставляем пустой массив
            } finally {
                setIsLoading(false);
            }
        };

        fetchMembers();
        
    }, [currentUser.id]); // Загружаем при монтировании или при смене пользователя

    const handleInvite = async () => {
        try {
            const response = await api.post('/family/invitation');
            const { inviteCode } = response.data;
            const inviteLink = `${window.location.origin}/join/${inviteCode}`;
            
            await navigator.clipboard.writeText(inviteLink);
            alert(t('menu.invite') + ' - ' + t('common.success'));
        } catch (error) {
            console.error("Ошибка создания приглашения:", error);
            alert(t('common.error'));
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

    const handleStartEditName = (member: Member) => {
        setEditingMemberId(member.id);
        setEditingName(member.name);
    };

    const handleSaveName = async (memberId: string) => {
        if (!editingName.trim()) {
            return;
        }
        try {
            await api.put(`/family/members/${memberId}/name`, { name: editingName.trim() });
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, name: editingName.trim() } : m));
            setEditingMemberId(null);
            setEditingName('');
        } catch (error: any) {
            console.error('Ошибка сохранения имени:', error);
            // Если ошибка 404, возможно, эндпоинт не реализован на бэкенде
            if (error.response?.status === 404) {
                // Обновляем локально, даже если API не поддерживает это
                setMembers(prev => prev.map(m => m.id === memberId ? { ...m, name: editingName.trim() } : m));
                setEditingMemberId(null);
                setEditingName('');
            } else {
                alert(t('common.error'));
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingMemberId(null);
        setEditingName('');
    };

    const handleAvatarClick = async (memberId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            setUploadingAvatar(memberId);
            try {
                const formData = new FormData();
                formData.append('avatar', file);
                const response = await api.post(`/family/members/${memberId}/avatar`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMembers(prev => prev.map(m => m.id === memberId ? { ...m, avatar: response.data.avatar } : m));
            } catch (error) {
                console.error('Ошибка загрузки фото:', error);
                alert(t('common.error'));
            } finally {
                setUploadingAvatar(null);
            }
        };
        input.click();
    };

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
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('menu.settings')}</p>
                    </div>
                    
                    <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('menu.profile')}</p>
                        {/* Отображаем список профилей - всегда стабильный, без прыгания */}
                        <div className="min-h-[120px]">
                            {isLoading || members.length === 0 ? (
                                // Показываем анимацию загрузки
                                <div className="flex flex-col items-center justify-center py-8">
                                    <i className="fas fa-spinner fa-spin text-2xl text-teal-500 mb-2"></i>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('common.loading')}</p>
                                </div>
                            ) : (
                                members.map(member => {
                                    const isEditing = editingMemberId === member.id;
                                    return (
                                        <div 
                                            key={member.id} 
                                            className={`flex items-center w-full px-4 py-3 text-sm rounded-lg ${currentUser.id === member.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-200'}`}
                                        >
                                            <button 
                                                onClick={() => handleAvatarClick(member.id)}
                                                disabled={uploadingAvatar === member.id}
                                                className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 text-white flex items-center justify-center mr-3 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                            >
                                                {uploadingAvatar === member.id ? (
                                                    <i className="fas fa-spinner fa-spin text-xs"></i>
                                                ) : (
                                                    <i className="fas fa-user text-xs"></i>
                                                )}
                                            </button>
                                            {isEditing ? (
                                                <div className="flex items-center flex-grow min-w-0 gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={editingName} 
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveName(member.id);
                                                            if (e.key === 'Escape') handleCancelEdit();
                                                        }}
                                                        className="flex-grow min-w-0 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-teal-500 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                        autoFocus
                                                    />
                                                    <button 
                                                        onClick={() => handleSaveName(member.id)}
                                                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded"
                                                    >
                                                        <i className="fas fa-check text-xs"></i>
                                                    </button>
                                                    <button 
                                                        onClick={handleCancelEdit}
                                                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                                                    >
                                                        <i className="fas fa-times text-xs"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span 
                                                        className="flex-grow min-w-0 cursor-pointer hover:underline"
                                                        onClick={() => handleStartEditName(member)}
                                                    >
                                                        {member.name}
                                                    </span>
                                                    {currentUser.id === member.id && <i className="fas fa-check-circle ml-auto flex-shrink-0"></i>}
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <button onClick={handleInvite} className="flex items-center w-full px-4 py-3 mt-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-user-plus w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> {t('menu.invite')}
                        </button>
                    </div>

                    <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('menu.settings')}</p>
                         <button onClick={onThemeCycle} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className={`fas ${themeIcon} w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400`}></i> {theme === 'light' ? t('menu.darkTheme') : t('menu.lightTheme')}
                        </button>
                        <button onClick={handleOpenSettings} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-globe w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> {t('menu.language')}
                        </button>
                         <button onClick={onSync} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-sync-alt w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> {t('menu.sync')}
                        </button>
                         <button onClick={handleDemoToggle} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className={`fas fa-flask w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400`}></i> {isDemoMode ? t('menu.returnToData') : t('menu.demoMode')}
                        </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                        <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-sign-out-alt w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> {t('menu.logout')}
                        </button>
                         <button onClick={handleReset} className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                            <i className="fas fa-trash-alt w-8 text-center mr-3 text-lg"></i> {t('menu.resetData')}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SideMenu;