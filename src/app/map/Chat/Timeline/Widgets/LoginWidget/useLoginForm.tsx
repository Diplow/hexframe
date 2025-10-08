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
        await handleLoginFlow({ email, password, router, eventBus });
      } else {
        const result = await handleRegisterFlow({ email, password, username });

        // Handle successful registration
        setError('');
        setSuccess(result.successMessage);

        if (result.shouldClearForm) {
          setEmail('');
          setPassword('');
          setUsername('');
        }

        if (result.shouldSwitchToLogin) {
          setMode('login');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected server error occurred.');
    } finally {
      setIsLoading(false);
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