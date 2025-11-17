// C:/duo-frontend/components/SideMenu.tsx

import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { User, Theme, UserDetails, Language } from '../types';
import { LANGUAGES } from '../constants';
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
    language: Language;
    activeCurrencies: { [key: string]: boolean };
    onOpenSettings: () => void;
    onLogout: () => void;
}

interface Member {
    id: string;
    name: string;
    avatar?: string;
    photoUrl?: string;
    color?: string; 
}

const MEMBER_PHOTO_STORAGE_KEY = 'duoMemberPhotos';
const MEMBER_CACHE_KEY = 'duoMembersCache';

const isFullName = (value?: string) => !!value && value.trim().includes(' ');

const loadCachedMembers = (): Member[] => {
    try {
        const data = localStorage.getItem(MEMBER_CACHE_KEY);
        return data ? (JSON.parse(data) as Member[]).filter(member => isFullName(member.name)) : [];
    } catch {
        return [];
    }
};

const saveMembersToCache = (members: Member[]) => {
    localStorage.setItem(MEMBER_CACHE_KEY, JSON.stringify(members.filter(member => isFullName(member.name))));
};

const SideMenu: React.FC<SideMenuProps> = ({ 
    isOpen, onClose, currentUser, onUserChange, userDetails,
    theme, onThemeCycle, themeIcon, onSync, onReset, 
    isDemoMode, onToggleDemoMode, language, activeCurrencies,
    onOpenSettings, onLogout
}) => {
    
    const [members, setMembers] = useState<Member[]>(() => loadCachedMembers());
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [hasLoadedMembers, setHasLoadedMembers] = useState(false);
    const [customPhotos, setCustomPhotos] = useState<Record<string, string>>(() => {
        try {
            const stored = localStorage.getItem(MEMBER_PHOTO_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });
    const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isSavingMember, setIsSavingMember] = useState(false);

    const mergeMembers = useCallback((base: Member[], incoming: Member[]) => {
        const filteredBase = base.filter(member => isFullName(member.name));
        const map = new Map<string, Member>();
        filteredBase.forEach(member => map.set(member.id, member));
        incoming
            .filter(member => isFullName(member.name))
            .forEach(member => {
            const prev = map.get(member.id);
            map.set(member.id, { ...prev, ...member });
        });
        return Array.from(map.values());
    }, []);
    
    const fetchMembers = useCallback(async () => {
        setIsLoadingMembers(true);
        try {
            const response = await api.get('/family/members');
            const normalizedMembers: Member[] = response.data?.map((member: Member) => ({
                id: member.id,
                name: member.name,
                avatar: member.avatar,
                photoUrl: member.photoUrl,
                color: member.color,
            })) || [];
            setMembers(prev => {
                const merged = mergeMembers(prev, normalizedMembers);
                saveMembersToCache(merged);
                return merged;
            });
            setHasLoadedMembers(true);
        } catch (error) {
            console.error("Не удалось загрузить членов семьи:", error);
        } finally {
            setIsLoadingMembers(false);
        }
    }, [mergeMembers]);

    useEffect(() => {
        if (!currentUser || hasLoadedMembers) return;
        fetchMembers();
    }, [currentUser, hasLoadedMembers, fetchMembers]);

    useEffect(() => {
        localStorage.setItem(MEMBER_PHOTO_STORAGE_KEY, JSON.stringify(customPhotos));
    }, [customPhotos]);

    const handlePhotoInputChange = (memberId: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setCustomPhotos(prev => ({ ...prev, [memberId]: dataUrl }));
            setMembers(prev => {
                const next = prev.map(member => member.id === memberId ? { ...member, photoUrl: dataUrl } : member);
                saveMembersToCache(next);
                return next;
            });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleRemovePhoto = (memberId: string) => {
        setCustomPhotos(prev => {
            const next = { ...prev };
            delete next[memberId];
            return next;
        });
        setMembers(prev => {
            const next = prev.map(member => member.id === memberId ? { ...member, photoUrl: undefined } : member);
            saveMembersToCache(next);
            return next;
        });
    };

    const handleAvatarClick = (memberId: string) => {
        fileInputsRef.current[memberId]?.click();
    };

    const startEditingName = (member: Member) => {
        setEditingMemberId(member.id);
        setEditingName(member.name);
    };

    const cancelEditingName = () => {
        setEditingMemberId(null);
        setEditingName('');
    };

    const handleSaveEditedName = async () => {
        if (!editingMemberId) return;
        const normalized = editingName.trim().replace(/\s+/g, ' ');
        if (!normalized || !normalized.includes(' ')) {
            alert('Введите имя и фамилию через пробел.');
            return;
        }
        try {
            setIsSavingMember(true);
            await api.patch(`/family/members/${editingMemberId}`, { name: normalized });
            setMembers(prev => {
                const next = prev.map(member => member.id === editingMemberId ? { ...member, name: normalized } : member);
                saveMembersToCache(next);
                return next;
            });
            cancelEditingName();
        } catch (error) {
            console.error('Не удалось обновить участника', error);
            alert('Не получилось сохранить имя. Попробуйте ещё раз.');
        } finally {
            setIsSavingMember(false);
        }
    };

    const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSaveEditedName();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingName();
        }
    };

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

    const handleLogout = () => {
        onLogout();
        onClose();
    }

    const languageLabel = LANGUAGES.find(lang => lang.code === language)?.name || language.toUpperCase();
    const activeCurrencyList = Object.entries(activeCurrencies).filter(([, enabled]) => enabled).map(([code]) => code);
    const currencyLabel = activeCurrencyList.length ? activeCurrencyList.join(', ') : 'Не выбрано';

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
                        <div className="relative min-h-[140px]">
                            <div className={`${isLoadingMembers ? 'opacity-40 pointer-events-none' : ''} space-y-2`}>
                                {members.length > 0 ? (
                                    [...members]
                                .sort((a, b) => {
                                    if (a.id === currentUser.id) return -1;
                                    if (b.id === currentUser.id) return 1;
                                    return a.name.localeCompare(b.name);
                                })
                                .map(member => {
                                    const memberDetails = userDetails[member.id];
                                    const avatarUrl = member.photoUrl || memberDetails?.photoUrl;
                                    const hasPhoto = Boolean(avatarUrl);
                                    const isCurrent = currentUser.id === member.id;
                                    const customPhotoExists = Boolean(customPhotos[member.id]);
                                    const isEditing = editingMemberId === member.id;

                                    return (
                                        <div 
                                            key={member.id} 
                                            className={`flex items-center w-full px-4 py-3 text-sm rounded-lg transition-colors ${isCurrent ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleAvatarClick(member.id)}
                                                className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center mr-3 border border-transparent hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                                                title="Нажмите, чтобы обновить фото"
                                            >
                                                {hasPhoto ? (
                                                    <img 
                                                        src={avatarUrl as string} 
                                                        alt={member.name} 
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <i className="fas fa-user text-lg"></i>
                                                )}
                                            </button>
                                            <div className="flex-1 flex items-center space-x-2">
                                                {isEditing ? (
                                                    <>
                                                        <input 
                                                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-teal-500 focus:border-teal-500"
                                                            value={editingName}
                                                            onChange={e => setEditingName(e.target.value)}
                                                            onKeyDown={handleNameKeyDown}
                                                            autoFocus
                                                        />
                                                        <button 
                                                            className="p-1 text-teal-500 disabled:opacity-50"
                                                            onClick={handleSaveEditedName}
                                                            disabled={isSavingMember}
                                                            title="Сохранить"
                                                        >
                                                            <i className={`fas ${isSavingMember ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                                                        </button>
                                                        <button 
                                                            className="p-1 text-gray-400 hover:text-red-500"
                                                            onClick={cancelEditingName}
                                                            title="Отменить"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        className="flex-1 text-left truncate hover:text-teal-500"
                                                        onClick={() => startEditingName(member)}
                                                        title="Нажмите, чтобы изменить имя"
                                                    >
                                                        {member.name}
                                                    </button>
                                                )}
                                                {isCurrent && <i className="fas fa-check-circle text-teal-500"></i>}
                                            </div>
                                            {customPhotoExists && (
                                                <button 
                                                    onClick={() => handleRemovePhoto(member.id)}
                                                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Удалить фото"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="hidden"
                                                ref={el => { fileInputsRef.current[member.id] = el; }}
                                                onChange={(event) => handlePhotoInputChange(member.id, event)}
                                            />
                                        </div>
                                    )
                                })
                                ) : (
                                    <div className="text-sm text-gray-400 dark:text-gray-500 px-4 py-3">
                                        Участники ещё не добавлены.
                                    </div>
                                )}
                            </div>
                            {isLoadingMembers && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-300 text-sm font-semibold rounded-lg">
                                    <i className="fas fa-spinner fa-spin mr-2"></i> Загрузка...
                                </div>
                            )}
                        </div>
                        <button onClick={handleInvite} className="flex items-center w-full px-4 py-3 mt-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className="fas fa-user-plus w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400"></i> Пригласить в семью
                        </button>
                    </div>

                    <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Настройки</p>
                         <button onClick={onThemeCycle} className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <i className={`fas ${themeIcon} w-8 text-center mr-3 text-lg text-gray-500 dark:text-gray-400`}></i> {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                        </button>
                        <button 
                            onClick={onOpenSettings} 
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <div className="flex-1 text-left">
                                <p className="font-medium">Язык и валюта</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{languageLabel} · {currencyLabel}</p>
                            </div>
                            <i className="fas fa-chevron-right text-gray-400"></i>
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