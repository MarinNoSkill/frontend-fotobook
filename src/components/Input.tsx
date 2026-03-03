import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
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
      <input
        className={`w-full px-4 py-2 rounded-lg border-2 border-[#39FF14] bg-white text-[#003300]
          focus:border-[#00AA00] focus:ring-2 focus:ring-[#39FF14]/30 focus:outline-none
          placeholder-[#6B7280] font-bebas transition-all duration-200
          hover:border-[#66FF44] ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 font-bebas">{error}</p>
      )}
    </div>
  );
};
