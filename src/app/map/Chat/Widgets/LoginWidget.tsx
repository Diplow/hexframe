'use client';

import { useState } from 'react';
import { authClient } from '~/lib/auth/auth-client';
import { api } from '~/commons/trpc/react';
import { useChatCacheOperations } from '../Cache/hooks/useChatCacheOperations';
import { LogIn, Mail, Key, AlertCircle, UserPlus, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoginWidgetProps {
  message?: string;
}

export function LoginWidget({ message }: LoginWidgetProps) {
  const { dispatch } = useChatCacheOperations();
  const trpcUtils = api.useUtils();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the new IAM domain registration
  const registerMutation = api.user.register.useMutation({
    onSuccess: async (data) => {
      // Invalidate session to trigger AuthContext update
      await trpcUtils.auth.getSession.invalidate();
      
      // Dispatch success event
      dispatch({
        type: 'widget_resolved',
        payload: {
          widgetId: 'login-widget',
          action: 'success'
        },
        id: `widget-resolved-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
      
      // Add success message
      dispatch({
        type: 'message',
        payload: {
          content: `✅ Account created successfully! Welcome to **HexFrame**.`,
          actor: 'system',
        },
        id: `register-success-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
      
      // Navigate to the user's map if created
      if (data.defaultMapId) {
        router.push(`/map?center=${data.defaultMapId}`);
      }
    },
    onError: (error) => {
      setError(error.message || "Failed to create account.");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const result = await authClient.signIn.email(
          {
            email,
            password,
          },
          {
            onSuccess: async () => {
              // Invalidate session to trigger AuthContext update
              await trpcUtils.auth.getSession.invalidate();
              
              // Get the updated session to retrieve the username
              const session = authClient.useSession.get();
              const username = session.data?.user?.name ?? email.split('@')[0];
              
              // On success, dispatch a success event that will close the widget
              dispatch({
                type: 'widget_resolved',
                payload: {
                  widgetId: 'login-widget',
                  action: 'success'
                },
                id: `widget-resolved-${Date.now()}`,
                timestamp: new Date(),
                actor: 'system',
              });
              
              // Add success message
              dispatch({
                type: 'message',
                payload: {
                  content: `✅ Successfully logged in as **${username}**`,
                  actor: 'system',
                },
                id: `login-success-${Date.now()}`,
                timestamp: new Date(),
                actor: 'system',
              });
            },
            onError: (ctx: unknown) => {
              // Check different possible error structures
              let errorMessage = "Failed to login. Please check your credentials.";
              
              if (ctx && typeof ctx === 'object') {
                if ('error' in ctx && ctx.error && typeof ctx.error === 'object' && 'message' in ctx.error) {
                  errorMessage = String(ctx.error.message);
                } else if ('message' in ctx) {
                  errorMessage = String(ctx.message);
                }
              } else if (typeof ctx === 'string') {
                errorMessage = ctx;
              }
              
              setError(errorMessage);
            },
          },
        );

        // Handle error from authClient.signIn.email if it's returned in the result
        if (result?.error) {
          setError(
            result.error.message ?? "An unexpected error occurred during login.",
          );
        }
      } else {
        // Register mode - use the new IAM domain endpoint
        await registerMutation.mutateAsync({
          email,
          password,
          name: username || email.split('@')[0],
          createDefaultMap: true
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected server error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Widget removal happens automatically when operation is cancelled
    dispatch({
      type: 'operation_completed',
      payload: {
        operation: 'login',
        result: 'failure',
        message: 'Login cancelled',
      },
      id: `login-cancel-${Date.now()}`,
      timestamp: new Date(),
      actor: 'user',
    });
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-lg p-4 border border-secondary-200 dark:border-secondary-800 relative">
        {/* Register/Login toggle link */}
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="absolute top-4 right-4 text-sm text-secondary underline hover:text-secondary/80 transition-colors focus:outline-none rounded"
          disabled={isLoading || registerMutation.isPending}
          type="button"
        >
          {mode === 'login' ? 'Register' : 'Log in'}
        </button>

        <div className="flex items-center gap-2 mb-3">
          {mode === 'login' ? (
            <LogIn className="h-5 w-5 text-secondary-600" />
          ) : (
            <UserPlus className="h-5 w-5 text-secondary-600" />
          )}
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
            {mode === 'login' ? (
              <>Log in to <span className="font-light">Hex</span><span className="font-bold">Frame</span></>
            ) : (
              'Create an account'
            )}
          </h3>
        </div>

        {(mode === 'login' ? message : 'Join HexFrame to start creating your own systems.') && (
          <p className="text-sm text-secondary-700 dark:text-secondary-300 mb-4">
            {mode === 'login' ? message : (
              <>Join <span className="font-light">Hex</span><span className="font-bold">Frame</span> to start creating your own systems.</>
            )}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                           bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  placeholder="johndoe"
                  required
                  disabled={isLoading || registerMutation.isPending}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                         bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                placeholder="you@example.com"
                required
                disabled={isLoading || registerMutation.isPending}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                         bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                placeholder="••••••••"
                required
                disabled={isLoading || registerMutation.isPending}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive-600 dark:text-destructive-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isLoading || registerMutation.isPending}
              className="flex-1 py-2 px-4 text-sm font-medium text-white bg-primary rounded-md 
                       hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              {(isLoading || registerMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {(isLoading || registerMutation.isPending)
                ? (mode === 'login' ? 'Logging in...' : 'Creating account...') 
                : (mode === 'login' ? 'Log in' : 'Register')
              }
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading || registerMutation.isPending}
              className="flex-1 py-2 px-4 text-sm font-medium text-secondary-700 dark:text-secondary-300 
                       bg-white dark:bg-neutral-800 border border-secondary-300 dark:border-secondary-700 
                       rounded-md hover:bg-secondary-50 dark:hover:bg-neutral-700 
                       focus:outline-none focus:ring-2 focus:ring-secondary-500 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}