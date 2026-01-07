'use client';

import { useState, useEffect } from 'react';

interface UseTileStateProps {
  title: string;
  preview?: string;
  content: string;
  itemType?: string | null;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  tileId: string;
}

export function useTileState({
  title,
  preview = '',
  content,
  itemType,
  forceExpanded,
  openInEditMode,
  tileId,
}: UseTileStateProps) {
  // Start collapsed by default (changed from !!content to false)
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(openInEditMode ?? false);
  const [editTitle, setEditTitle] = useState(title);
  const [editPreview, setEditPreview] = useState(preview);
  const [editContent, setEditContent] = useState(content);
  // Default to 'context' if itemType is null/undefined
  const [editItemType, setEditItemType] = useState<string>(
    itemType ?? 'context'
  );

  // Update expansion state when forceExpanded changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded && !!content);
    }
  }, [forceExpanded, content]);

  // Handle openInEditMode flag
  useEffect(() => {
    if (openInEditMode) {
      setIsEditing(true);
      setIsExpanded(true);
    }
  }, [openInEditMode]);

  // Update expansion state when tileId changes (keep collapsed by default)
  useEffect(() => {
    if (forceExpanded === undefined) {
      if (isEditing) return; // Skip when editing
      // Always start collapsed when tile changes
      setIsExpanded(false);
    }
  }, [tileId, forceExpanded, isEditing]);

  // Update edit fields when props change
  useEffect(() => {
    setEditTitle(title);
    setEditPreview(preview);
    setEditContent(content);
    setEditItemType(itemType ?? 'context');
  }, [title, preview, content, itemType]);

  return {
    expansion: { isExpanded, setIsExpanded },
    editing: {
      isEditing,
      setIsEditing,
      title: editTitle,
      setTitle: setEditTitle,
      preview: editPreview,
      setPreview: setEditPreview,
      content: editContent,
      setContent: setEditContent,
      itemType: editItemType,
      setItemType: setEditItemType,
    },
  };
}