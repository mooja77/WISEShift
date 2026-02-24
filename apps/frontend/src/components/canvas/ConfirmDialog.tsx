import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
      role="alertdialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="modal-content w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
        <h4 id="confirm-dialog-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <p id="confirm-dialog-message" className="text-xs text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-750"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
