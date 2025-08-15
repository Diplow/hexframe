'use client';

import { useState } from 'react';
import { authClient } from '~/lib/auth/auth-client';
import { useRouter } from 'next/navigation';
import { useEventBus } from '../../../../Services/EventBus/event-bus-context';

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
    try {
      const registerResponse = await authClient.signUp.email({
        email,
        password,
        name: username.trim() || (email.split('@')[0] ?? 'User'),
      });
      
      if (registerResponse.error) {
        throw new Error(registerResponse.error.message ?? 'Registration failed');
      }
      
      // Registration successful
      setError(''); // Clear any errors
      setSuccess('✅ Registration successful! You can now log in with your credentials.');
      
      // Clear form
      setEmail('');
      setPassword('');
      setUsername('');
      
      // Switch to login mode
      setMode('login');
      
    } catch (registerError: unknown) {
      let errorMessage = 'Registration failed';
      
      if (registerError instanceof Error) {
        errorMessage = registerError.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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