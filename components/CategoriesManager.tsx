import React, { useState } from 'react';
import { Category } from '../types';
import CategoryEditModal from './CategoryEditModal';

interface CategoriesManagerProps {
    expenseCategories: Category[];
    onUpdateCategories: (categories: Category[]) => void;
}

const CategoryItem: React.FC<{
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
}> = ({ category, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-600 text-xl">
                <i className={`fas ${category.icon} text-gray-500 dark:text-gray-400`}></i>
            </div>
            <div className="flex-grow min-w-0">
                <p className="font-bold text-gray-800 dark:text-gray-100">{category.name}</p>
                 {category.subCategories && category.subCategories.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {category.subCategories.map(sc => sc.name).join(', ')}
                    </p>
                )}
            </div>
            <div className="flex items-center">
                <button onClick={() => onEdit(category)} className="text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors p-2 btn-press">
                    <i className="fas fa-pencil-alt"></i>
                </button>
                <button onClick={() => onDelete(category.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 btn-press">
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    </div>
);


const CategoriesManager: React.FC<CategoriesManagerProps> = ({ expenseCategories, onUpdateCategories }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    const handleOpenModal = (category: Category | null) => {
        setCategoryToEdit(category);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setCategoryToEdit(null);
        setIsModalOpen(false);
    };

    const handleSaveCategory = (category: Category) => {
        let updatedCategories;
        if (categoryToEdit) { // Editing existing
            updatedCategories = expenseCategories.map(c => c.id === category.id ? category : c);
        } else { // Adding new
            updatedCategories = [...expenseCategories, { ...category, id: new Date().toISOString() }];
        }
        onUpdateCategories(updatedCategories);
    };
    
    const handleDeleteCategory = (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту категорию? Все связанные транзакции останутся, но могут потерять свою категорию.')) {
            onUpdateCategories(expenseCategories.filter(c => c.id !== id));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Управление категориями</h2>
                    <p className="text-gray-500 dark:text-gray-400">Настройте список категорий расходов.</p>
                </div>
                <button onClick={() => handleOpenModal(null)} className="bg-teal-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-teal-600 transition-colors shadow btn-press">
                    <i className="fas fa-plus"></i>
                </button>
            </div>
            
            <div className="space-y-3">
                {expenseCategories.map(cat => (
                    <CategoryItem 
                        key={cat.id} 
                        category={cat} 
                        onEdit={handleOpenModal} 
                        onDelete={handleDeleteCategory}
                    />
                ))}
            </div>

            {isModalOpen && (
                 <CategoryEditModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveCategory}
                    categoryToEdit={categoryToEdit}
                />
            )}
        </div>
    );
};

export default CategoriesManager;