import React, { useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** QA D18: optional aria-describedby override. */
  describedBy?: string;
}

/**
 * Modal with proper a11y semantics.
 *
 * QA D18: focus trap on open, Escape closes, focus restored to the previously
 * focused element on close, role="dialog" + aria-modal + aria-labelledby.
 * QA B54 / C62: same focus-trap behaviour applies to all modals consuming it.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, describedBy }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const node = dialogRef.current;
      if (!node) return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (focusables[0] ?? node).focus();
    };

    // Focus on the next tick so AnimatePresence has rendered the dialog.
    const t = setTimeout(focusFirst, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            // QA B50: theme-aware backdrop instead of hardcoded black/50.
            className="absolute inset-0 bg-neutral-900/60 dark:bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={describedBy}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-8 py-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-white/80 dark:bg-neutral-900/80 sticky top-0 z-10">
              <h2 id={titleId} className="text-2xl font-black text-gray-900 dark:text-neutral-100 font-manrope tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2.5 bg-gray-50 dark:bg-neutral-800 text-gray-400 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto font-manrope">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
