import React from 'react';

// Helper to format number with spaces
const formatNumber = (num: number | ''): string => {
  if (num === '' || num === null || num === undefined) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Helper to parse string back to number
const parseNumber = (str: string): number | '' => {
  const cleaned = str.replace(/\s/g, '');
  if (cleaned === '') return '';
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? '' : num;
};

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | '';
  onChange: (value: number | '') => void;
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    onChange(numericValue);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatNumber(value)}
      onChange={handleChange}
      {...props}
    />
  );
};

export default FormattedNumberInput;
