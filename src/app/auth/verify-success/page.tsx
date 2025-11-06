'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { api } from '~/commons/trpc/react';

export default function VerifySuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Query user map to check if it exists
  const { data: userMapResponse, isLoading: isLoadingMap } = api.map.getUserMap.useQuery(undefined, {
    enabled: isInitializing,
    retry: 1,
  });

  // Mutation to create default map if it doesn't exist
  const createMapMutation = api.map.user.createDefaultMapForCurrentUser.useMutation();

  useEffect(() => {
    async function initializeUserMap() {
      if (!isInitializing || isLoadingMap) return;

      try {
        // If user already has a map, we're done
        if (userMapResponse?.success && userMapResponse.map?.id) {
          setIsInitializing(false);
          return;
        }

        // No map found - create one
        const createResult = await createMapMutation.mutateAsync();

        if (!createResult?.success || !createResult.mapId) {
          throw new Error('Failed to create user map');
        }

        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize user map:', error);
        setInitError('Failed to initialize your map. You may need to refresh the page.');
        setIsInitializing(false);
      }
    }

    void initializeUserMap();
  }, [isInitializing, isLoadingMap, userMapResponse, createMapMutation]);

  useEffect(() => {
    // Only start countdown after initialization is complete
    if (isInitializing || initError) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) clearInterval(timer);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInitializing, initError]);

  useEffect(() => {
    // Navigate when countdown reaches 0
    if (countdown === 0 && !isInitializing && !initError) {
      // Navigate to user's map with center parameter
      const mapId = userMapResponse?.map?.id ?? createMapMutation.data?.mapId;
      if (mapId) {
        router.push(`/map?center=${mapId}`);
      } else {
        // Fallback to /map without center - let the app handle it
        router.push('/map');
      }
    }
  }, [countdown, router, isInitializing, initError, userMapResponse, createMapMutation.data]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            {isInitializing ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : (
              <CheckCircle className="h-16 w-16 text-success" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            {isInitializing ? 'Setting up your account...' : 'Email Verified Successfully!'}
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {isInitializing
              ? 'Creating your personal map...'
              : initError ?? 'Your email has been verified. Redirecting you to your map...'}
          </p>

          {!isInitializing && !initError && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                Redirecting to Hexframe in {countdown} seconds...
              </p>

              <button
                onClick={() => {
                  const mapId = userMapResponse?.map?.id ?? createMapMutation.data?.mapId;
                  if (mapId) {
                    router.push(`/map?center=${mapId}`);
                  } else {
                    router.push('/map');
                  }
                }}
                className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Go to Hexframe Now
              </button>
            </div>
          )}

          {initError && (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}