import React, { useState } from 'react';
import { ChevronsDown, ChevronsUp } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  expandable?: boolean;
}

/**
 * A custom Input component that handles:
 * 1. Standard text inputs
 * 2. Multiline textareas
 * 3. Expandable textareas (Collapses to a single line, expands on click)
 * 4. Read-only states with special styling
 */
const Input: React.FC<InputProps> = ({ label, error, multiline = false, expandable = true, className = '', ...props }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isReadOnly = !!props.readOnly;

  // Updated baseClasses to use `focus:border-brand-primary` and `focus:ring-brand-primary`
  // Changed rounded -> rounded-md to respect theme radius variable
  const baseClasses = `w-full px-3 py-2 border rounded-md shadow-inner font-serif text-sm transition-all duration-200
    ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-brand-primary'} 
    ${isReadOnly 
      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' 
      : 'bg-white text-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-600'}
    focus:outline-none focus:ring-1 focus:ring-brand-primary
    ${className}`;

  return (
    <div className="mb-4 w-full">
      {label && (
        <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-1.5 text-left">
          {label}:
        </label>
      )}
      <div className="w-full relative">
        {multiline && expandable ? (
          !isExpanded ? (
            // --- COLLAPSED VIEW ---
            <div 
              onClick={() => setIsExpanded(true)}
              className={`${baseClasses} cursor-pointer relative pr-8 truncate flex items-center`}
              style={{ minHeight: '38px' }}
              role="button"
              aria-expanded={false}
              title="Tap to expand"
            >
              <span className={!props.value ? "text-gray-400 dark:text-gray-400" : ""}>
                 {props.value 
                    ? String(props.value).replace(/\n/g, ', ') 
                    : (props.placeholder || (isReadOnly ? "Empty" : ""))}
              </span>
              <div className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 dark:text-gray-400">
                <ChevronsDown size={14} />
              </div>
            </div>
          ) : (
            // --- EXPANDED VIEW ---
            <div className="relative w-full">
               {isReadOnly ? (
                  <div 
                    onClick={() => setIsExpanded(false)}
                    className={`${baseClasses} cursor-pointer relative pr-8 whitespace-pre-wrap`}
                    role="button"
                    aria-expanded={true}
                    title="Tap to collapse"
                  >
                     {props.value || <span className="opacity-0">Empty</span>}
                     <div className="absolute bottom-2 right-2 text-gray-400 dark:text-gray-400">
                        <ChevronsUp size={14} />
                     </div>
                  </div>
               ) : (
                  <>
                    <textarea
                       className={`${baseClasses} resize-none pr-8`}
                       {...props as any}
                       autoFocus
                    />
                    <div 
                       onClick={(e) => {
                         e.stopPropagation();
                         setIsExpanded(false);
                       }}
                       className="absolute bottom-2 right-2 text-gray-400 dark:text-gray-400 cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                       title="Tap to collapse"
                    >
                       <ChevronsUp size={14} />
                    </div>
                  </>
               )}
            </div>
          )
        ) : multiline ? (
           <textarea
             className={`${baseClasses} resize-none`}
             {...props as any}
           />
        ) : (
           <input
             className={baseClasses}
             {...props}
           />
        )}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-serif">{error}</p>}
      </div>
    </div>
  );
};

export default Input;