import { useState, useRef, useCallback, useEffect } from 'react';

interface UseDragInteractionProps {
  isDark: boolean;
  onThresholdCrossed: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useDragInteraction({ isDark, onThresholdCrossed, containerRef }: UseDragInteractionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startXRef = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : ('clientX' in e ? e.clientX : 0);
    startXRef.current = clientX;
    setDragOffset(0);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : ('clientX' in e ? e.clientX : 0);
    const deltaX = clientX - startXRef.current;
    const containerWidth = containerRef.current.offsetWidth;
    const pillWidth = containerWidth / 2 + 40;
    const maxDrag = containerWidth - pillWidth;
    
    let constrainedOffset = deltaX;
    if (isDark) {
      constrainedOffset = Math.min(0, Math.max(deltaX, -maxDrag));
    } else {
      constrainedOffset = Math.max(0, Math.min(deltaX, maxDrag));
    }
    
    setDragOffset(constrainedOffset);
    
    const threshold = containerWidth / 4;
    if ((!isDark && constrainedOffset > threshold) || (isDark && constrainedOffset < -threshold)) {
      onThresholdCrossed();
      setIsDragging(false);
      setDragOffset(0);
    }
  }, [isDragging, isDark, onThresholdCrossed, containerRef]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    isDragging,
    dragOffset,
    handleDragStart
  };
}