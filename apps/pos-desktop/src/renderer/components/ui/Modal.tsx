/**
 * Modal Component - Design System
 * Red & White Theme
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`relative w-full ${sizeClasses[size]} bg-neutral-0 rounded-2xl shadow-2xl overflow-hidden z-10`}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-200">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-headline-sm font-semibold text-neutral-900">{title}</h2>
                  )}
                  {description && (
                    <p className="text-body-md text-neutral-600 mt-1">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-4">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

// Confirmation Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-body-md text-neutral-700">{message}</p>
    </Modal>
  );
};

// Alert Dialog (one action)
interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
}) => {
  const variantClasses = {
    success: 'bg-success-50 text-success-700',
    error: 'bg-error-50 text-error-700',
    warning: 'bg-warning-50 text-warning-700',
    info: 'bg-primary-50 text-primary-700',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose} fullWidth>
          {buttonText}
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4 ${variantClasses[variant]}`}>
          {icons[variant]}
        </div>
        <h3 className="text-headline-sm font-semibold text-neutral-900 mb-2">{title}</h3>
        <p className="text-body-md text-neutral-600">{message}</p>
      </div>
    </Modal>
  );
};

// Slide-over Panel (for mobile or side panels)
interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
  };

  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  const animationProps = {
    left: { x: '-100%' },
    right: { x: '100%' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={animationProps[position]}
            animate={{ x: 0 }}
            exit={animationProps[position]}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`absolute top-0 bottom-0 ${positionClasses[position]} ${sizeClasses[size]} bg-neutral-0 shadow-2xl flex flex-col`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                <h2 className="text-headline-sm font-semibold text-neutral-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
