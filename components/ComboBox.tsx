import React from 'react';

interface ComboBoxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ComboBox: React.FC<ComboBoxProps> = ({ options, value, onChange, placeholder }) => {
  const dataListId = React.useId();

  return (
    <div>
      <input
        type="text"
        list={dataListId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none"
      />
      <datalist id={dataListId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
};
