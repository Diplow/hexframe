import { useState, useCallback } from "react";

interface DialogState {
  showUpdateDialog: boolean;
  showDeleteDialog: boolean;
}

interface DialogHandlers {
  openUpdateDialog: () => void;
  openDeleteDialog: () => void;
  closeDialogs: () => void;
}

export type UseTileDialogsReturn = DialogState & DialogHandlers;

/**
 * Hook for managing tile dialog states
 * Handles both update and delete dialogs with a single close handler
 */
export function useTileDialogs(): UseTileDialogsReturn {
  const [dialogState, setDialogState] = useState<DialogState>({
    showUpdateDialog: false,
    showDeleteDialog: false,
  });

  const openUpdateDialog = useCallback(() => {
    setDialogState({
      showUpdateDialog: true,
      showDeleteDialog: false,
    });
  }, []);

  const openDeleteDialog = useCallback(() => {
    setDialogState({
      showUpdateDialog: false,
      showDeleteDialog: true,
    });
  }, []);

  const closeDialogs = useCallback(() => {
    setDialogState({
      showUpdateDialog: false,
      showDeleteDialog: false,
    });
  }, []);

  return {
    showUpdateDialog: dialogState.showUpdateDialog,
    showDeleteDialog: dialogState.showDeleteDialog,
    openUpdateDialog,
    openDeleteDialog,
    closeDialogs,
  };
}