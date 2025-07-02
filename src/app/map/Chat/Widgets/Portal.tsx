import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const portalRoot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find or create portal root
    let root = document.getElementById('portal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'portal-root';
      document.body.appendChild(root);
    }
    portalRoot.current = root;

    return () => {
      // Don't remove the portal root as other portals might be using it
    };
  }, []);

  if (!portalRoot.current) {
    return null;
  }

  return createPortal(children, portalRoot.current);
}