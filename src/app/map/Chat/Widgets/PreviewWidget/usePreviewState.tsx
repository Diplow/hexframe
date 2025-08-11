'use client';

import { useState, useEffect } from 'react';

interface UsePreviewStateProps {
  title: string;
  content: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  tileId: string;
}

export function usePreviewState({
  title,
  content,
  forceExpanded,
  openInEditMode,
  tileId,
}: UsePreviewStateProps) {
  // Start collapsed if content is empty
  const [isExpanded, setIsExpanded] = useState(!!content);
  const [isEditing, setIsEditing] = useState(openInEditMode ?? false);
  const [editTitle, setEditTitle] = useState(title);
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

  // Update expansion state when tileId or content changes
  useEffect(() => {
    if (forceExpanded === undefined) {
      if (!content) {
        // Keep collapsed if no content
        setIsExpanded(false);
      } else {
        // Collapse briefly then expand for animation
        setIsExpanded(false);
        const timer = setTimeout(() => setIsExpanded(true), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [tileId, content, forceExpanded]);

  // Update edit fields when props change
  useEffect(() => {
    setEditTitle(title);
    setEditContent(content);
  }, [title, content]);

  return {
    isExpanded,
    setIsExpanded,
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
  };
}