import React from "react";
import { StaticBaseTileLayout } from "~/app/static/map/Tile/Base/base";

export interface StaticAuthTileProps {
  initialView?: "login" | "register";
}

export const StaticAuthTile = ({
  initialView = "login",
}: StaticAuthTileProps) => {
  return (
    <StaticBaseTileLayout coordId="auth-static" scale={3}>
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
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
    </StaticBaseTileLayout>
  );
};

// Alias for backward compatibility
export const AuthTile = StaticAuthTile;
export type AuthTileProps = StaticAuthTileProps;
