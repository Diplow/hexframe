"use client";

import React from "react";
import Link from "next/link";
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
          <div className="flex items-center justify-center space-x-4">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="bg-se text-white hover:bg-se-dark focus:ring-se"
              >
                Login
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button 
                size="lg" 
                className="bg-se/80 text-white hover:bg-se focus:ring-se-light"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DynamicBaseTileLayout>
  );
}

// Named exports for index.ts
export const DynamicWelcomeTile = WelcomeTile;
export type DynamicWelcomeTileProps = WelcomeTileProps;