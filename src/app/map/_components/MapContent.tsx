"use client";

import type { ReactNode } from "react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { ToolCursor } from "./ToolCursor";

interface MapContentProps {
  children: ReactNode;
}

export function MapContent({ children }: MapContentProps) {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  return (
    <>
      <ToolCursor />
      {children}
    </>
  );
}