import React from 'react';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
}

/**
 * A modal to confirm destructive actions or navigation away from unsaved changes.
 * Uses a fixed overlay with backdrop blur.
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Discard Changes?", 
  message = "You have unsaved changes. Are you sure you want to discard them?",
  confirmLabel = "Discard",
  confirmVariant = "danger"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 mb-4">
          <AlertTriangle size={24} />
          <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 font-serif mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;