import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import type { Message } from '../_state/_events/event.types';
import { useChatState } from '../_state/ChatProvider';

interface MessageActionsProps {
  message: Message;
}

export function MessageActions({ message }: MessageActionsProps) {
  const chatState = useChatState();
  const [editedContent, setEditedContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Only show actions for user messages
  if (message.actor !== 'user') {
    return null;
  }

  const handleStartEdit = () => {
    chatState.startEditingMessage(message.id);
    setEditedContent(message.content);
  };

  const handleSaveEdit = () => {
    chatState.saveEditedMessage(message.id, editedContent);
  };

  const handleCancelEdit = () => {
    chatState.saveEditedMessage(message.id, message.originalContent ?? message.content);
    setEditedContent(message.content);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    chatState.deleteMessage(message.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (message.isEditing) {
    return (
      <div className="mt-2">
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-2 text-sm bg-input border border-border rounded-md resize-none"
          rows={3}
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSaveEdit}
            className="p-1 text-success hover:bg-muted rounded transition-colors"
            title="Save edit"
          >
            <Check size={16} />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 text-destructive hover:bg-muted rounded transition-colors"
            title="Cancel edit"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="inline-flex gap-2 ml-2">
        <span className="text-xs text-muted-foreground">Delete this message?</span>
        <button
          onClick={handleConfirmDelete}
          className="text-xs text-destructive hover:underline"
        >
          Yes
        </button>
        <button
          onClick={handleCancelDelete}
          className="text-xs text-muted-foreground hover:underline"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleStartEdit}
        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
        title="Edit message"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={handleDelete}
        className="p-1 text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
        title="Delete message"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}