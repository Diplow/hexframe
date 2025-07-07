import React, { useState } from "react";
import { authClient } from "~/lib/auth/auth-client";
import { api } from "~/commons/trpc/react"; // For tRPC utils if needed for cache invalidation
import { useRouter } from "next/navigation"; // If manual redirection is needed
import { StaticRegisterForm } from "./register-form.static";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Optional name field
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const trpcUtils = api.useUtils();
  const router = useRouter();
  
  // Use the new IAM domain registration
  const registerMutation = api.user.register.useMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Use the new IAM domain registration endpoint
      const result = await registerMutation.mutateAsync({
        email,
        password,
        name: name || email.split('@')[0],
        createDefaultMap: true
      });
      
      // Invalidate session to trigger AuthContext update
      await trpcUtils.auth.getSession.invalidate();
      
      // Navigate to the user's map if created
      if (result.defaultMapId) {
        router.push(`/map?center=${result.defaultMapId}`);
      } else {
        // If no map was created, just go to home
        router.push('/map');
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StaticRegisterForm
      nameValue={name}
      emailValue={email}
      passwordValue={password}
      error={error}
      isLoading={isLoading || registerMutation.isPending}
      onNameChange={(e) => setName(e.target.value)}
      onEmailChange={(e) => setEmail(e.target.value)}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onSubmit={handleSubmit}
      formAction="/api/auth/register-action"
      // formAction is for non-JS fallback
    />
  );
}
