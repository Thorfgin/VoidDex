import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;

  // Explicitly declare data-testid
  'data-testid'?: string;
}

/**
 * Standard UI Button Component.
 * Supports loading states.
 */
const Button: React.FC<ButtonProps> = ({
                                         children,
                                         variant = 'primary',
                                         isLoading = false,
                                         className = '',
                                         disabled,
                                         type = 'button',
                                         'data-testid': dataTestId, // Destructure data-testid
                                         ...props
                                       }) => {

  // Base styles: rounded-md maps to var(--radius-btn), font-serif maps to var(--font-body)
  const baseStyles = "rounded-md font-serif font-bold text-sm transition-all duration-200 flex items-center justify-center border shadow-sm active:translate-y-px select-none";

  // Apply dynamic padding using style prop to use CSS variables
  const dynamicStyle = {
    paddingTop: 'var(--btn-py)',
    paddingBottom: 'var(--btn-py)',
    paddingLeft: 'var(--btn-px)',
    paddingRight: 'var(--btn-px)'
  };

  const variants = {
    primary: "bg-brand-primary text-white border-transparent hover:brightness-110 dark:hover:brightness-110 shadow-md",
    secondary: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600",
    // Neutralized Danger: Gray default, red on hover
    danger: "bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:text-red-400 dark:hover:border-red-900"
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={dynamicStyle}
      disabled={disabled || isLoading}
      data-testid={dataTestId} // Apply the destructured data-testid attribute here
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
};

export default Button;