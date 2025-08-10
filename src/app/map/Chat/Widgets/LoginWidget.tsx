'use client';

import { useState } from 'react';
import { registerAction } from '~/lib/domains/iam/actions';
import { authClient } from '~/lib/auth/auth-client';
import { LogIn, Mail, Key, UserPlus, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEventBus } from '../../Services/EventBus/event-bus-context';

interface LoginWidgetProps {
  message?: string;
}

export function LoginWidget({ message }: LoginWidgetProps) {
  const eventBus = useEventBus();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Starting login/register

    try {
      if (mode === 'login') {
        // Login mode - use better-auth client for proper session establishment
        // Logging in via better-auth client
        
        try {
          // Use better-auth client to login
          const loginResponse = await authClient.signIn.email({
            email,
            password,
          });
          
          // Check if login failed due to email verification
          if (loginResponse?.error) {
            if (loginResponse.error.code === 'EMAIL_NOT_VERIFIED' || 
                loginResponse.error.status === 403) {
              throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
            }
            // Other errors
            throw new Error(loginResponse.error.message || 'Login failed. Please check your credentials.');
          }
          
          // Check if login was successful
          if (!loginResponse?.data) {
            throw new Error('Login failed. Please check your credentials.');
          }
          
          // Login response received - session should be established immediately
          
          // Quick check for session
          const session = await authClient.getSession();
          
          if (!session?.data?.user) {
            // Session not established after login
            throw new Error('Failed to establish session. Please try again.');
          }
          
          // Refresh router to update server components
          // Refreshing router
          router.refresh();
          
          // Emit login success event
          eventBus.emit({
            type: 'auth.login',
            payload: {
              userId: session.data.user.id,
              userName: session.data.user.name || session.data.user.email
            },
            source: 'auth',
            timestamp: new Date(),
          });
          
          // Navigate to user's map immediately
          router.push('/map');
        } catch (loginError: unknown) {
          // Login failed
          let errorMessage = 'Invalid email or password';
          
          if (loginError instanceof Error) {
            errorMessage = loginError.message;
          }
          
          throw new Error(errorMessage);
        }
      } else {
        // Register mode - use Server Action
        // Calling register action
        
        const result = await registerAction({
          email,
          password,
          name: username.trim() || (email.split('@')[0] ?? 'User'),
        });
        
        // Register action completed
        
        if (!result.success) {
          throw new Error(result.error || 'Registration failed');
        }
        
        // Trigger the success flow
        if (result.userId && 'defaultMapId' in result) {
          // Check if email verification is required
          // For testing, this is hardcoded to true. In production, you might check NODE_ENV
          const requiresVerification = true; // Temporarily true for testing
          
          if (requiresVerification) {
            // Don't try to login, just show success message
            setError(''); // Clear any errors
            setSuccess('✅ Registration successful! Please check your email to verify your account. You\'ll be able to log in once your email is verified.');
            // Clear form
            setEmail('');
            setPassword('');
            setUsername('');
            // Switch to login mode for when they come back after verification
            setMode('login');
            return; // Exit early, don't try to login
          }
          
          // Only try to auto-login if email verification is not required
          // Perform login with the same credentials
          try {
            await authClient.signIn.email({
              email,
              password,
            });
            
            // Login response after registration
            
            // Wait for the session to be established
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify session is established
            const session = await authClient.getSession();
            // Session after login
            
            if (!session?.data?.user) {
              // Session not established after login
              throw new Error('Failed to establish session. Please try logging in manually.');
            }
            
            // Give auth context time to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Refresh router to update server components
            // Refreshing router
            router.refresh();
          } catch (_loginError) {
            console.warn('Failed to login after registration:', _loginError);
            throw new Error('Registration successful but login failed. Please try logging in manually.');
          }
          
          // Emit login success event (registration followed by login)
          eventBus.emit({
            type: 'auth.login',
            payload: {
              userId: result.userId,
              userName: username.trim() || (email.split('@')[0] ?? 'User')
            },
            source: 'auth',
            timestamp: new Date(),
          });
          
          // Navigate to user's map if they have one
          // This ensures the session is fully propagated and prevents race conditions
          if ('defaultMapId' in result && result.defaultMapId) {
            // Scheduling navigation to default map
            setTimeout(() => {
              // Navigating to default map now
              router.push(`/map?center=${result.defaultMapId}`);
            }, 1000); // Give time for session to propagate and map to be created
          } else {
            // If no default map ID, just navigate to /map which will resolve to user's map
            setTimeout(() => {
              // Navigating to /map after successful registration
              router.push('/map');
            }, 1000);
          }
        }
      }
    } catch (err) {
      // Submit error
      setError(err instanceof Error ? err.message : 'An unexpected server error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Widget cancellation handled by chat state
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-lg p-4 border border-secondary-200 dark:border-secondary-800 relative">
        {/* Register/Login toggle link */}
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="absolute top-4 right-4 text-sm text-secondary underline hover:text-secondary/80 transition-colors focus:outline-none rounded"
          disabled={isLoading}
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
                  disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive-600 dark:text-destructive-400">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-4 text-sm font-medium text-white bg-primary rounded-md 
                       hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading
                ? (mode === 'login' ? 'Logging in...' : 'Creating account...') 
                : (mode === 'login' ? 'Log in' : 'Register')
              }
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
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