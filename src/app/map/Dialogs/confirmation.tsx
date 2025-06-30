"use client";

import React from "react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "",
  cancelLabel = "Cancel",
  confirmLabel = "Yes, I'm sure",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {description && <p className="mb-6">{description}</p>}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="rounded bg-neutral-200 px-4 py-2 hover:bg-neutral-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-destructive px-4 py-2 text-white hover:bg-destructive-light"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
