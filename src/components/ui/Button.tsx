import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Nunca sobrescreva a cor de fundo via `className` em um caller — adicione
  // um variant novo aqui. Misturar bg-* externo com variantClasses gera
  // conflito de especificidade do Tailwind (a ordem de qual "ganha" não é
  // previsível) e foi a causa da inconsistência visual dos botões.
  const variantClasses = {
    primary: 'bg-military-600 hover:bg-military-700 text-white focus:ring-military-500',
    secondary: 'bg-olive-200 hover:bg-olive-300 text-olive-900 focus:ring-olive-500',
    outline: 'bg-white border-olive-300 text-olive-800 hover:bg-olive-50 focus:ring-olive-400',
    ghost: 'bg-transparent text-olive-700 hover:bg-olive-100 focus:ring-olive-400',
    danger: 'bg-red-700 hover:bg-red-800 text-white focus:ring-red-600',
    success: 'bg-military-500 hover:bg-military-600 text-white focus:ring-military-400',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando...
        </span>
      ) : children}
    </button>
  );
}
