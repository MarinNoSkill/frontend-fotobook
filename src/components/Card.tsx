import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false
}) => {
  const hoverStyles = hover ? 'hover:shadow-subtle-hover hover:border-[#66FF44] cursor-pointer' : '';

  return (
    <div className={`bg-white rounded-lg p-6 border-2 border-[#39FF14] shadow-subtle ${hoverStyles} transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
};
