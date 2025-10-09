import { useEffect, useRef } from 'react';

export function useProgressAnimation() {
  const styleInjected = useRef(false);

  useEffect(() => {
    if (!styleInjected.current && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
      styleInjected.current = true;

      // Cleanup on unmount
      return () => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };
    }
  }, []);
}
