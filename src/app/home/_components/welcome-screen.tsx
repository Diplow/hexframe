import React from "react";
import WelcomeTile from "~/app/map/Tile/Welcome/welcome";

/**
 * Welcome screen shown to unauthenticated users
 */
export function WelcomeScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-600 p-4">
      <WelcomeTile />
    </div>
  );
}