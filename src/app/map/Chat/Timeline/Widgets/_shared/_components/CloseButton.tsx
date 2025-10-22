'use client';

import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface CloseButtonProps {
  onClose?: () => void;
}

export function CloseButton({ onClose }: CloseButtonProps) {
  if (!onClose) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 flex-shrink-0"
      onClick={onClose}
      aria-label="Close widget"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
