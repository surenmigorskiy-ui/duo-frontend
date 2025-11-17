import React, { useState, useEffect } from 'react';
import { Category, SubCategory } from '../types';

interface CategoryEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Category) => void;
    categoryToEdit: Category | null;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('fa-question-circle');
    const [subCategories, setSubCategories] = useState<Partial<SubCategory>[]>([]);
    
    const isEditMode = categoryToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(categoryToEdit.name);
                setIcon(categoryToEdit.icon);
                setSubCategories(categoryToEdit.subCategories || []);
            } else {
                setName('');
                setIcon('fa-question-circle');
                setSubCategories([]);
            }
        }
    }, [categoryToEdit, isOpen, isEditMode]);

    const handleSubCategoryChange = (index: number, field: 'name' | 'icon', value: string) => {
        const newSubs = [...subCategories];
        newSubs[index] = { ...newSubs[index], [field]: value };
        setSubCategories(newSubs);
    };

    const addSubCategory = () => {
        setSubCategories([...subCategories, { id: `new-${Date.now()}`, name: '', icon: 'fa-tag' }]);
    };

    const removeSubCategory = (index: number) => {
        setSubCategories(subCategories.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const finalSubCategories = subCategories
            .filter(sc => sc.name)
            .map(sc => ({
                id: sc.id?.startsWith('new-') ? `${name.toLowerCase()}-${sc.name?.toLowerCase().replace(' ', '-')}` : sc.id!,
                name: sc.name!,
                icon: sc.icon || 'fa-tag',
            }));

        const categoryData: Category = {
            id: categoryToEdit?.id || `custom-${Date.now()}`,
            name,
            icon,
            type: 'expense',
            subCategories: finalSubCategories,
        };
        
        onSave(categoryData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all text-gray-800 dark:text-gray-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{isEditMode ? 'Редактировать категорию' : 'Добавить категорию'}</h3>
                            <button type="button" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Название</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Иконка</label>
                                    <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="fas fa-star" className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm" required />
                                    <p className="text-xs text-gray-400 mt-1">Напр., 'fas fa-car' (Font Awesome)</p>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-md font-semibold mb-2">Подкатегории</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {subCategories.map((sub, index) => (
                                        <div key={sub.id || index} className="flex items-center gap-2">
                                            <input type="text" placeholder="Название" value={sub.name || ''} onChange={(e) => handleSubCategoryChange(index, 'name', e.target.value)} className="flex-grow bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm p-2" />
                                            <input type="text" placeholder="Иконка" value={sub.icon || ''} onChange={(e) => handleSubCategoryChange(index, 'icon', e.target.value)} className="w-28 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm p-2" />
                                            <button type="button" onClick={() => removeSubCategory(index)} className="text-red-500 hover:text-red-700 p-2"><i className="fas fa-minus-circle"></i></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addSubCategory} className="mt-2 text-sm text-teal-600 dark:text-teal-400 font-semibold hover:underline">
                                    <i className="fas fa-plus mr-1"></i> Добавить подкатегорию
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Отмена</button>
                        <button type="submit" className="bg-teal-500 text-white font-semibold py-2 px-5 rounded-md hover:bg-teal-600">
                            {isEditMode ? 'Обновить' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryEditModal;
