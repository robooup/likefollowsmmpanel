'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';

export const TOAST_DURATION_MS = 2000;

// A form message shown as the shared top-right notification card instead of an inline box.
// It leaves on its own after two seconds; `inline` keeps it in the flow for permanent notices.
export function FormToast({
  message,
  type,
  children,
}: {
  message?: string;
  type: 'success' | 'error';
  children?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || !visible || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`toast toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children ?? message}</span>
      <button type="button" className="toast-close" aria-label="Close" onClick={() => setVisible(false)}>
        <FaTimes className="toast-close-icon" />
      </button>
    </div>,
    document.body
  );
}
