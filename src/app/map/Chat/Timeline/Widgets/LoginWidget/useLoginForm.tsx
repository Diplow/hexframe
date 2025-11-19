'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEventBus } from '~/app/map/Services/EventBus';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await handleLoginFlow({ email, password, router, eventBus });
      } else {
        const result = await handleRegisterFlow({ email, password, username });

        // Handle successful registration - redirect to verification page
        if (result.shouldRedirect && result.redirectUrl) {
          router.push(result.redirectUrl);
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
    isLoading,
    handleSubmit,
    handleCancel,
  };
}