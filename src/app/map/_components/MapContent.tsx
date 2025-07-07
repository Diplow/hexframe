"use client";

import type { ReactNode } from "react";

interface MapContentProps {
  children: ReactNode;
}

export function MapContent({ children }: MapContentProps) {
  return children;
}