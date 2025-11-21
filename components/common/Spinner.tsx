import React from 'react';

const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
  };
  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-teal-400 border-r-teal-400 border-b-gray-300 dark:border-b-gray-600 border-l-gray-300 dark:border-l-gray-600`}></div>
  );
};

export default Spinner;