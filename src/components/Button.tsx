import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-6 py-3 rounded-lg font-bebas uppercase text-sm transition-all duration-300 font-medium';

  const variants = {
    primary: 'bg-[#39FF14] text-[#003300] border-2 border-[#39FF14] hover:bg-[#66FF44] hover:border-[#66FF44] active:scale-95 shadow-subtle hover:shadow-subtle-hover',
    secondary: 'bg-white border-2 border-[#39FF14] text-[#003300] hover:bg-[#F9FAFB] hover:border-[#00AA00] active:scale-95 shadow-subtle',
    ghost: 'bg-transparent border-2 border-[#39FF14] text-[#39FF14] hover:bg-[#F9FAFB] active:scale-95',
    danger: 'bg-red-500 text-white border-2 border-red-500 hover:bg-red-600 hover:border-red-600 active:scale-95 shadow-subtle'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
