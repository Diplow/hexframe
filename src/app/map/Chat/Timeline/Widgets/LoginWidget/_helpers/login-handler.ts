import { authClient } from '~/lib/auth';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { EventBusService } from '~/app/map/types/events';

interface LoginParams {
  email: string;
  password: string;
  router: AppRouterInstance;
  eventBus: EventBusService;
}

export async function handleLoginFlow({ email, password, router, eventBus }: LoginParams): Promise<void> {
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
}
