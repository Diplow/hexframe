"use client";

import React from "react";
import { DynamicBaseTileLayout } from "~/app/map/Tile/Base";
import { useCanvasTheme } from "~/app/map/Canvas";
import styles from "./auth.module.css";

export interface AuthTileProps {
  initialView?: "login" | "register";
}

// This component will be dynamically imported
export default function AuthTile({ initialView = "login" }: AuthTileProps) {
  const { isDarkMode } = useCanvasTheme();

  return (
    <DynamicBaseTileLayout 
      coordId="auth" 
      scale={3}
      color={{ color: "zinc", tint: "50" }}
      isDarkMode={isDarkMode}
    >
      <div className={styles.authTileContent}>
        <div className={`${styles.authCard} mx-auto p-4`}>
          <div className="mb-6">
            <h2 className="text-center text-2xl font-bold text-neutral-800">
              Authentication
            </h2>
            <p className="mt-2 text-center text-neutral-600">
              Please use the chat interface to log in or sign up.
            </p>
          </div>

          <div className="text-center p-8">
            <p className="text-neutral-500 mb-4">
              The chat assistant will help you authenticate.
            </p>
            <p className="text-sm text-neutral-400">
              Open the chat panel and follow the prompts to {initialView === "login" ? "log in" : "create an account"}.
            </p>
          </div>
        </div>
      </div>
    </DynamicBaseTileLayout>
  );
}

// Named exports for index.ts
export const DynamicAuthTile = AuthTile;
export type DynamicAuthTileProps = AuthTileProps;
