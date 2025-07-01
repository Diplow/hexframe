import React from "react";

export interface StaticLoginFormProps {
  emailValue: string;
  passwordValue: string;
  error?: string | null;
  isLoading: boolean;
  onEmailChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  formAction?: string; // Optional: if you still want a server action for non-JS environments
  formMethod?: string; // Optional: default "POST"
}

export function StaticLoginForm({
  emailValue,
  passwordValue,
  error,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  formAction, // Can be omitted if only client-side submission is desired
  formMethod = "POST",
}: StaticLoginFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      action={formAction}
      method={formAction ? formMethod : undefined} // Only set method if action is present
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="email-login-static"
          className="block text-sm font-medium text-neutral-700"
        >
          Email address
        </label>
        <input
          id="email-login-static"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={emailValue}
          onChange={onEmailChange}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-se focus:outline-none focus:ring-se sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password-login-static"
          className="block text-sm font-medium text-neutral-700"
        >
          Password
        </label>
        <input
          id="password-login-static"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={passwordValue}
          onChange={onPasswordChange}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-se focus:outline-none focus:ring-se sm:text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md border border-transparent bg-se px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-se-dark focus:outline-none focus:ring-2 focus:ring-se focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </div>
    </form>
  );
}
