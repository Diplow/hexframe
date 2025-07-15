"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { DynamicBaseTileLayout } from "~/app/map/Tile/Base";
import { useCanvasTheme } from "~/app/map/Canvas";

export type WelcomeTileProps = Record<string, never>;

export default function WelcomeTile() {
  const { isDarkMode } = useCanvasTheme();
  
  return (
    <DynamicBaseTileLayout 
      coordId="welcome" 
      scale={3}
      color={{ color: "zinc", tint: "50" }}
      isDarkMode={isDarkMode}
    >
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="text-center">
          <h1 className="mb-6 text-3xl font-bold text-neutral-800">
            Welcome to <span className="text-secondary">HexFrame</span>
          </h1>
          <p className="mb-8 text-neutral-600">
            Join our community for deliberate people. Create and explore maps.
          </p>
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-neutral-500">
              Use the chat interface to log in or sign up
            </p>
            <Button 
              size="lg" 
              className="bg-se/50 text-white cursor-not-allowed"
              disabled
            >
              Open Chat to Get Started
            </Button>
          </div>
        </div>
      </div>
    </DynamicBaseTileLayout>
  );
}

// Named exports for index.ts
export const DynamicWelcomeTile = WelcomeTile;
export type DynamicWelcomeTileProps = WelcomeTileProps;