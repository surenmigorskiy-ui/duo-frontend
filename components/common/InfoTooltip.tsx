import React, { useState, useRef, useEffect } from 'react';

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button 
        type="button" 
        onClick={() => setIsOpen(true)} 
        className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors btn-press"
        aria-label="Показать информацию"
      >
        <i className="fas fa-info-circle"></i>
      </button>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-up" 
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-xl w-full max-w-sm text-center border border-gray-200 dark:border-gray-700" 
            onClick={e => e.stopPropagation()}
          >
            <div className="text-3xl mb-4">
              <i className="fas fa-info-circle text-teal-400"></i>
            </div>
            <p className="text-sm leading-relaxed">{text}</p>
            <button 
              onClick={() => setIsOpen(false)} 
              className="mt-6 bg-teal-500 text-white font-semibold py-2 px-8 rounded-md hover:bg-teal-600 btn-press"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;