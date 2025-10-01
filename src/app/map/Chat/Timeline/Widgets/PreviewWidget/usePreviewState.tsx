'use client';

import { useState, useEffect } from 'react';

interface UsePreviewStateProps {
  title: string;
  preview?: string;
  content: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  tileId: string;
}

export function usePreviewState({
  title,
  preview = '',
  content,
  forceExpanded,
  openInEditMode,
  tileId,
}: UsePreviewStateProps) {
  // Start collapsed by default (changed from !!content to false)
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(openInEditMode ?? false);
  const [editTitle, setEditTitle] = useState(title);
  const [editPreview, setEditPreview] = useState(preview);
  const [editContent, setEditContent] = useState(content);

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
  }, [title, preview, content]);

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
    },
  };
}