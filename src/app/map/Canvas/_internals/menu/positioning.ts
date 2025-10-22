import { useEffect, useState, type RefObject } from "react";

interface Position {
  x: number;
  y: number;
}

export function useMenuPositioning(
  menuRef: RefObject<HTMLDivElement>,
  position: Position
): Position {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust if menu goes off right edge
    if (position.x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10;
    }

    // Adjust if menu goes off bottom edge
    if (position.y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position, menuRef]);

  return adjustedPosition;
}
