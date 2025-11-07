'use client';

import { Mail } from 'lucide-react';

export default function CheckVerificationEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-primary/10 p-4">
              <Mail className="h-16 w-16 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
            Check Your Email
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-center">
            We&apos;ve sent you a verification email. Please click the link inside to verify your account and complete your registration.
          </p>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Quick note on verification:
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              We require email verification because we think AI features need to be tied to real users. With great power comes great responsibilities!
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Didn&apos;t receive the email? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
