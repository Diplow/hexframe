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

    // Check if a session was created (it shouldn't be, but better-auth might)
    const session = await authClient.getSession();
    if (session?.data?.user) {
      console.warn('[Registration] Unexpected session created after registration:', session.data.user);
      // Sign out to prevent the widget from closing
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            console.log('[Registration] Signed out unwanted session');
          }
        }
      });
    }

    // Registration successful - email verification required
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
