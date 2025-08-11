'use client';

import { useState } from 'react';
import { registerAction } from '~/lib/domains/iam/actions';
import { authClient } from '~/lib/auth/auth-client';
import { useRouter } from 'next/navigation';
import { useEventBus } from '../../../Services/EventBus/event-bus-context';
import { env } from '~/env';

export function useLoginForm() {
  const eventBus = useEventBus();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const _handleLoginFlow = async () => {
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
        throw new Error(loginResponse.error.message ?? 'Login failed. Please check your credentials.');
      }
      
      // Check if login was successful
      if (!loginResponse?.data) {
        throw new Error('Login failed. Please check your credentials.');
      }
      
      // Quick check for session
      const session = await authClient.getSession();
      
      if (!session?.data?.user) {
        throw new Error('Failed to establish session. Please try again.');
      }
      
      // Refresh router to update server components
      router.refresh();
      
      // Emit login success event
      eventBus.emit({
        type: 'auth.login',
        payload: {
          userId: session.data.user.id,
          userName: session.data.user.name ?? session.data.user.email
        },
        source: 'auth',
        timestamp: new Date(),
      });
      
      // Navigate to user's map immediately
      router.push('/map');
    } catch (loginError: unknown) {
      let errorMessage = 'Invalid email or password';
      
      if (loginError instanceof Error) {
        errorMessage = loginError.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const _handleRegisterFlow = async () => {
    const result = await registerAction({
      email,
      password,
      name: username.trim() || (email.split('@')[0] ?? 'User'),
    });
    
    if (!result.success) {
      throw new Error(result.error ?? 'Registration failed');
    }
    
    // Trigger the success flow
    if (result.userId && 'defaultMapId' in result) {
      // Check if email verification is required
      const requiresVerification = env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION;
      
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
      try {
        await authClient.signIn.email({
          email,
          password,
        });
        
        // Wait for the session to be established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session is established
        const session = await authClient.getSession();
        
        if (!session?.data?.user) {
          throw new Error('Failed to establish session. Please try logging in manually.');
        }
        
        // Give auth context time to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh router to update server components
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
      if ('defaultMapId' in result && result.defaultMapId) {
        setTimeout(() => {
          router.push(`/map?center=${result.defaultMapId}`);
        }, 1000);
      } else {
        setTimeout(() => {
          router.push('/map');
        }, 1000);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await _handleLoginFlow();
      } else {
        await _handleRegisterFlow();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected server error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Widget cancellation handled by chat state
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    username,
    setUsername,
    error,
    success,
    isLoading,
    handleSubmit,
    handleCancel,
  };
}