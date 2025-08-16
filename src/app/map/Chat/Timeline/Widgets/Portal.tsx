import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  // Find or create portal root
  let root = document.getElementById('portal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'portal-root';
    document.body.appendChild(root);
  }

  return createPortal(children, root);
}