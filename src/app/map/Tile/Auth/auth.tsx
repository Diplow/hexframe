"use client";

import React, { useState } from "react";
import { LoginForm } from "~/components/auth/login-form";
import { RegisterForm } from "~/components/auth/register-form";
import { DynamicBaseTileLayout } from "~/app/map/Tile/Base";
import { useCanvasTheme } from "~/app/map/Canvas";
import styles from "./auth.module.css";

export interface AuthTileProps {
  initialView?: "login" | "register";
}

// This component will be dynamically imported
export default function AuthTile({ initialView = "login" }: AuthTileProps) {
  const [showLogin, setShowLogin] = useState(initialView === "login");
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
              {showLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mt-2 text-center text-neutral-600">
              {showLogin
                ? "Please login to continue."
                : "Sign up to get started."}
            </p>
          </div>

          {showLogin ? <LoginForm /> : <RegisterForm />}

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowLogin(!showLogin)}
              className="text-sm text-se-600 hover:text-se-500 font-medium focus:outline-none"
              type="button"
            >
              {showLogin
                ? "Need an account? Register"
                : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </DynamicBaseTileLayout>
  );
}

// Named exports for index.ts
export const DynamicAuthTile = AuthTile;
export type DynamicAuthTileProps = AuthTileProps;
