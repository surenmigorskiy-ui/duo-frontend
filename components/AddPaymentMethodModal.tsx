import React, { useState, useEffect } from 'react';
import { PaymentMethod, PaymentMethodType, User } from '../types';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PaymentMethod, 'id'>) => void;
  onUpdate: (item: PaymentMethod) => void;
  itemToEdit: PaymentMethod | null;
}

const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({ isOpen, onClose, onAdd, onUpdate, itemToEdit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType>('Card');
  const [owner, setOwner] = useState<User>('shared');
  
  const isEditMode = itemToEdit !== null;

  useEffect(() => {
    if (isOpen) {
        if (isEditMode) {
            setName(itemToEdit.name);
            setType(itemToEdit.type);
            setOwner(itemToEdit.owner);
        } else {
            // Reset form for new entry
            setName('');
            setType('Card');
            setOwner('shared');
        }
    }
  }, [itemToEdit, isOpen, isEditMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const paymentMethodData = { name, type, owner };
    
    if (isEditMode) {
      onUpdate({ ...paymentMethodData, id: itemToEdit.id });
    } else {
      onAdd(paymentMethodData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all text-gray-800 dark:text-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{isEditMode ? 'Редактировать счет' : 'Добавить счет'}</h3>
              <button type="button" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Название</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" 
                  placeholder="Например, Visa Gold"
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Тип</label>
                  <select value={type} onChange={(e) => setType(e.target.value as PaymentMethodType)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                    <option value="Card">Карта</option>
                    <option value="Bank Account">Банковский счет</option>
                    <option value="Cash">Наличные</option>
                  </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Владелец</label>
                    <select value={owner} onChange={(e) => setOwner(e.target.value as User)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
                        <option value="Suren">Suren</option>
                        <option value="Alena">Alena</option>
                        <option value="shared">Общий</option>
                    </select>
                </div>
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

export default AddPaymentMethodModal;