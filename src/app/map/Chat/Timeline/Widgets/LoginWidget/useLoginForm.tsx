'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEventBus } from '~/app/map/Services';
import { handleLoginFlow } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/_helpers/login-handler';
import { handleRegisterFlow } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/_helpers/register-handler';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        console.log('[useLoginForm] Starting login flow');
        await handleLoginFlow({ email, password, router, eventBus });
        console.log('[useLoginForm] Login flow completed');
      } else {
        console.log('[useLoginForm] Starting registration flow');
        const result = await handleRegisterFlow({ email, password, username });
        console.log('[useLoginForm] Registration flow completed', {
          shouldClearForm: result.shouldClearForm,
          shouldSwitchToLogin: result.shouldSwitchToLogin
        });

        // Handle successful registration
        setError('');
        setSuccess(result.successMessage);
        console.log('[useLoginForm] Set success message');

        if (result.shouldClearForm) {
          console.log('[useLoginForm] Clearing form fields');
          setEmail('');
          setPassword('');
          setUsername('');
        }

        if (result.shouldSwitchToLogin) {
          console.log('[useLoginForm] Switching to login mode');
          setMode('login');
        }
        console.log('[useLoginForm] Registration handling complete');
      }
    } catch (err) {
      console.error('[useLoginForm] Error during submit:', err);
      setError(err instanceof Error ? err.message : 'An unexpected server error occurred.');
    } finally {
      setIsLoading(false);
      console.log('[useLoginForm] Submit completed, isLoading set to false');
    }
  };

  const handleCancel = () => {
    // Clear form state
    setEmail('');
    setPassword('');
    setUsername('');
    setError('');
    setSuccess('');
    setMode('login');
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