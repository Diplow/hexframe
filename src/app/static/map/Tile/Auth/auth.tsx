import React from "react";
import { StaticBaseTileLayout } from "~/app/static/map/Tile/Base/base";
import { Button } from "~/components/ui/button"; // Assuming you have a Button component

export interface StaticAuthTileProps {
  showLogin: boolean;
  onToggleView: () => void;
  loginFormComponent: React.ReactNode;
  registerFormComponent: React.ReactNode;
}

export const StaticAuthTile = ({
  showLogin,
  onToggleView,
  loginFormComponent,
  registerFormComponent,
}: StaticAuthTileProps) => {
  return (
    <StaticBaseTileLayout coordId="auth-static" scale={3}>
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-center text-2xl font-bold text-neutral-800">
              {showLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mt-2 text-center text-neutral-600">
              {showLogin
                ? "Please login to continue."
                : "Sign up to get started."}
            </p>
          </div>

          {showLogin ? loginFormComponent : registerFormComponent}

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={onToggleView}
              className="text-sm text-se-600 hover:text-se-500 focus:outline-none"
            >
              {showLogin
                ? "Need an account? Register"
                : "Already have an account? Login"}
            </Button>
          </div>
        </div>
      </div>
    </StaticBaseTileLayout>
  );
};

// Alias for backward compatibility
export const AuthTile = StaticAuthTile;
export type AuthTileProps = StaticAuthTileProps;
