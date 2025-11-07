import { authClient } from '~/lib/auth';

interface RegisterParams {
  email: string;
  password: string;
  username: string;
}

interface RegisterResult {
  shouldClearForm: boolean;
  shouldSwitchToLogin: boolean;
  successMessage: string;
}

export async function handleRegisterFlow({ email, password, username }: RegisterParams): Promise<RegisterResult> {
  console.log('[RegisterHandler] Starting registration flow', { email, username });

  try {
    console.log('[RegisterHandler] Calling authClient.signUp.email...');
    const registerResponse = await authClient.signUp.email({
      email,
      password,
      name: username.trim() || (email.split('@')[0] ?? 'User'),
    });
    console.log('[RegisterHandler] Registration response received', {
      hasError: !!registerResponse.error,
      hasData: !!registerResponse.data
    });

    if (registerResponse.error) {
      console.error('[RegisterHandler] Registration error:', registerResponse.error);
      throw new Error(registerResponse.error.message ?? 'Registration failed');
    }

    // Check session state after registration
    console.log('[RegisterHandler] Checking session after registration...');
    const session = await authClient.getSession();
    console.log('[RegisterHandler] Session after registration:', {
      hasSession: !!session?.data,
      hasUser: !!session?.data?.user,
      emailVerified: session?.data?.user ? (session.data.user as { emailVerified?: boolean }).emailVerified : undefined,
      userId: session?.data?.user?.id
    });

    // Registration successful - email verification required
    // Note: better-auth might create a session with emailVerified: false
    // The auth state coordinator will check emailVerified and keep the widget open
    console.log('[RegisterHandler] Registration successful, returning result');
    return {
      shouldClearForm: true,
      shouldSwitchToLogin: false,
      successMessage: '✅ Registration successful! Please check your email to verify your account before logging in.',
    };
  } catch (registerError: unknown) {
    let errorMessage = 'Registration failed';

    if (registerError instanceof Error) {
      errorMessage = registerError.message;
    }

    console.error('[RegisterHandler] Registration failed:', errorMessage);
    throw new Error(errorMessage);
  }
}
