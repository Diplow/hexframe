'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function VerifySuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) clearInterval(timer);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Navigate when countdown reaches 0
    if (countdown === 0) {
      router.push('/map');
    }
  }, [countdown, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>
          
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Email Verified Successfully!
          </h1>
          
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Your email has been verified. You can now log in to your account.
          </p>
          
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Redirecting to Hexframe in {countdown} seconds...
            </p>
            
            <button
              onClick={() => router.push('/map')}
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Hexframe Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}