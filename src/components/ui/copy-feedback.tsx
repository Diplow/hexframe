'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface CopyFeedbackProps {
  message?: string;
}

interface CopyFeedbackState {
  show: boolean;
  triggerCopy: () => void;
}

// Z-index hierarchy for overlays (higher = more on top)
// - Regular tooltips: 50
// - Context menus: 100
// - Modals: 200
// - Ephemeral feedback (like this): 9999
const EPHEMERAL_FEEDBACK_Z_INDEX = 9999;

/**
 * Hook to manage copy feedback state
 * Returns show state and a trigger function to show the feedback
 */
export function useCopyFeedback(duration = 2000): CopyFeedbackState {
  const [show, setShow] = useState(false);

  const triggerCopy = useCallback(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  return { show, triggerCopy };
}

/**
 * Ephemeral toast notification for clipboard copy feedback
 * Renders in a portal at document body level to appear on top of everything
 * Fixed position at bottom-right of the screen
 */
export function CopyFeedback({
  message = 'Copied to clipboard!',
}: CopyFeedbackProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <div
      className="fixed bottom-4 right-4 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 px-3 py-2 rounded-md text-sm pointer-events-none shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
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
