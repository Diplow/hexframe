'use client';

import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface EditControlsProps {
  onSave: () => void;
  onCancel: () => void;
}

export function EditControls({ onSave, onCancel }: EditControlsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        aria-label="Save"
        onClick={onSave}
      >
        <Check className="h-4 w-4 text-[color:var(--success-color-600)]" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        aria-label="Cancel"
        onClick={onCancel}
      >
        <X className="h-4 w-4 text-[color:var(--destructive-color-600)]" />
      </Button>
    </>
  );
}