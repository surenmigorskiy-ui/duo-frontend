import React, { useState } from 'react';
import { Language, Currency, LanguageSetting } from '../types';
import { LANGUAGES, CURRENCIES } from '../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    onLanguageChange: (lang: Language) => void;
    activeCurrencies: { [key: string]: boolean };
    onCurrenciesChange: (currencies: { [key: string]: boolean }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, language, onLanguageChange, activeCurrencies, onCurrenciesChange
}) => {
    const [activeTab, setActiveTab] = useState<'language' | 'currency'>('language');

    const handleCurrencyToggle = (currencyCode: string) => {
        onCurrenciesChange({ ...activeCurrencies, [currencyCode]: !activeCurrencies[currencyCode] });
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'language', label: 'Язык' },
        { id: 'currency', label: 'Валюта' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all text-gray-800 dark:text-gray-200">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold">Настройки</h3>
                </div>
                <div className="relative mb-6">
                    <div className="flex justify-center border-b border-gray-200 dark:border-gray-700">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id as any)} 
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

                <div className="p-6 max-h-80 overflow-y-auto">
                    {activeTab === 'language' && (
                        <div className="space-y-2">
                            {LANGUAGES.map((lang: LanguageSetting) => (
                                <button key={lang.code} onClick={() => onLanguageChange(lang.code)} className={`flex items-center w-full p-3 text-left rounded-lg transition-colors ${language === lang.code ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    {lang.name}
                                    {language === lang.code && <i className="fas fa-check-circle ml-auto"></i>}
                                </button>
                            ))}
                        </div>
                    )}
                    {activeTab === 'currency' && (
                        <div className="space-y-2">
                            {CURRENCIES.map((curr: Currency) => (
                                <label key={curr.code} className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    <span>{curr.name} ({curr.code})</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={activeCurrencies[curr.code] || false} onChange={() => handleCurrencyToggle(curr.code)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-teal-500"></div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="bg-teal-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-teal-600">Готово</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
