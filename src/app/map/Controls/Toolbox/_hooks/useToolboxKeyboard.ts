import { useEffect } from 'react';

export function useToolboxKeyboard(onToggle: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement | null;
      if (target) {
        const isEditable = 
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true';
        
        if (isEditable) {
          return;
        }
      }

      // Ignore shortcuts when modifier keys are pressed
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Toggle toolbox with 'T' key
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        onToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggle]);
}