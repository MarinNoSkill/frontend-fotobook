import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bebas text-[#003300] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full px-4 py-3 rounded-lg bg-white border-2 border-[#39FF14]
            focus:border-[#00AA00] focus:ring-2 focus:ring-[#39FF14]/30 focus:outline-none
            appearance-none text-[#003300] font-bebas cursor-pointer transition-all duration-200
            hover:border-[#66FF44] ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white text-[#003300]">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#39FF14] pointer-events-none" />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 font-bebas">⚠️ {error}</p>
      )}
    </div>
  );
};
