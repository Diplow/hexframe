import React from "react";

export interface StaticRegisterFormProps {
  nameValue: string;
  emailValue: string;
  passwordValue: string;
  error?: string | null;
  isLoading: boolean;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  formAction?: string;
  formMethod?: string;
}

export function StaticRegisterForm({
  nameValue,
  emailValue,
  passwordValue,
  error,
  isLoading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  formAction,
  formMethod = "POST",
}: StaticRegisterFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      action={formAction}
      method={formAction ? formMethod : undefined}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="name-static"
          className="block text-sm font-medium text-neutral-700"
        >
          Name (Optional)
        </label>
        <input
          id="name-static"
          name="name"
          type="text"
          value={nameValue}
          onChange={onNameChange}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-se focus:outline-none focus:ring-se sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="email-register-static"
          className="block text-sm font-medium text-neutral-700"
        >
          Email address
        </label>
        <input
          id="email-register-static"
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
          htmlFor="password-register-static"
          className="block text-sm font-medium text-neutral-700"
        >
          Password
        </label>
        <input
          id="password-register-static"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
          {isLoading ? "Registering..." : "Register"}
        </button>
      </div>
    </form>
  );
}
