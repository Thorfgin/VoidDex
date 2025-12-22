import React from 'react';
import Button from './Button';
import { AlertTriangle, LucideIcon, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;

  /** Configuration for the primary, confirmation action. */
  primaryAction: {
    label: string;
    handler: () => void;
    variant: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
    disabled?: boolean;
  };

  /** Configuration for the secondary, cancellation action (optional).
   If omitted, a default "Cancel" button linked to onClose is shown. */
  secondaryAction?: {
    label: string;
    handler: () => void;
    variant?: 'secondary' | 'ghost';
  };

  /** Icon to display next to the title (optional). */
  icon?: LucideIcon;
  iconColorClass?: string;

  /** Disables the modal's backdrop click-to-close behavior (default: false). */
  disableBackdropClick?: boolean;
}

/**
 * A generic modal component for confirmations, warnings, and simple user interactions.
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
                                                     isOpen,
                                                     onClose,
                                                     title,
                                                     message,
                                                     primaryAction,
                                                     secondaryAction,
                                                     icon: Icon = AlertTriangle, // Default icon is AlertTriangle
                                                     iconColorClass = "text-amber-600 dark:text-amber-500",
                                                     disableBackdropClick = false
                                                   }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  const SecondaryButton = secondaryAction
    ? {
      label: secondaryAction.label,
      handler: secondaryAction.handler,
      variant: secondaryAction.variant || 'secondary',
    }
    : {
      label: "Cancel",
      handler: onClose,
      variant: 'secondary',
    };


  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop" // Retaining Test IDs for the container for flexibility
      role="presentation"
    >
      {/* Modal Content */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700 transform transition-all scale-100"
        data-testid="modal-content"
        role="dialog"
        aria-modal="true"
      >

        {/* Header (Title and Icon) */}
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center gap-3 ${iconColorClass}`}>
            <Icon size={24} />
            <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white" data-testid="modal-title">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            data-testid="modal-close-button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Body */}
        <div className="text-sm text-gray-600 dark:text-gray-300 font-serif mb-6 leading-relaxed" data-testid="modal-message">
          {message}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {/* Secondary Button */}
          <Button
            variant={SecondaryButton.variant as 'secondary' | undefined}
            onClick={SecondaryButton.handler}
            data-testid="modal-secondary-button" // Test ID passed via the improved Button component
          >
            {SecondaryButton.label}
          </Button>

          {/* Primary Button */}
          <Button
            variant={primaryAction.variant}
            onClick={primaryAction.handler}
            isLoading={primaryAction.isLoading}
            disabled={primaryAction.disabled}
            data-testid="modal-primary-button" // Test ID passed via the improved Button component
          >
            {primaryAction.label}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;