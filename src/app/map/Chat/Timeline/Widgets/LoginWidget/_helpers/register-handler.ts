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
  try {
    const registerResponse = await authClient.signUp.email({
      email,
      password,
      name: username.trim() || (email.split('@')[0] ?? 'User'),
    });

    if (registerResponse.error) {
      throw new Error(registerResponse.error.message ?? 'Registration failed');
    }

    // Registration successful - email verification required
    // Note: better-auth might create a session with emailVerified: false
    // The auth state coordinator will check emailVerified and keep the widget open
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

    throw new Error(errorMessage);
  }
}
