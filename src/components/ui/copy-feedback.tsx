'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface CopyFeedbackProps {
  message?: string;
  variant?: 'success' | 'error';
}

interface CopyFeedbackState {
  show: boolean;
  isError: boolean;
  triggerSuccess: () => void;
  triggerError: () => void;
}

// Z-index hierarchy for overlays (higher = more on top)
// - Regular tooltips: 50
// - Context menus: 100
// - Modals: 200
// - Ephemeral feedback (like this): 9999
const EPHEMERAL_FEEDBACK_Z_INDEX = 9999;

/**
 * Hook to manage copy feedback state with success/error variants
 * Returns show state, error state, and trigger functions for each variant
 */
export function useCopyFeedback(duration = 2000): CopyFeedbackState {
  const [show, setShow] = useState(false);
  const [isError, setIsError] = useState(false);

  const triggerSuccess = useCallback(() => {
    setIsError(false);
    setShow(true);
  }, []);

  const triggerError = useCallback(() => {
    setIsError(true);
    setShow(true);
  }, []);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  return { show, isError, triggerSuccess, triggerError };
}

/**
 * Ephemeral toast notification for clipboard copy feedback
 * Renders in a portal at document body level to appear on top of everything
 * Fixed position at bottom-right of the screen
 */
export function CopyFeedback({
  message = 'Copied to clipboard!',
  variant = 'success',
}: CopyFeedbackProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseClasses = "fixed bottom-4 right-4 px-3 py-2 rounded-md text-sm pointer-events-none shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200";
  const variantClasses = variant === 'error'
    ? "bg-red-600 text-white"
    : "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800";

  const content = (
    <div
      className={`${baseClasses} ${variantClasses}`}
      style={{
        zIndex: EPHEMERAL_FEEDBACK_Z_INDEX,
      }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );

  // Use portal to render at document body level, escaping any parent overflow/z-index constraints
  if (!mounted) {
    return null;
  }

  return createPortal(content, document.body);
}
