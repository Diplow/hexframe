"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "~/contexts/AuthContext";
import AuthTile from "~/app/map/Tile/Auth/auth";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect to home
    // The home page will handle map checking and creation
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-600 p-4">
        <div className="text-xl font-semibold text-white">Loading...</div>
      </div>
    );
  }

  // Show login form if not authenticated
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-600 p-4">
      <AuthTile initialView="login" />
    </div>
  );
}