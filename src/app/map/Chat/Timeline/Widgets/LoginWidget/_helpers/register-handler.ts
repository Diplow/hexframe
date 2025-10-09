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

    // Registration successful
    return {
      shouldClearForm: true,
      shouldSwitchToLogin: true,
      successMessage: '✅ Registration successful! You can now log in with your credentials.',
    };
  } catch (registerError: unknown) {
    let errorMessage = 'Registration failed';

    if (registerError instanceof Error) {
      errorMessage = registerError.message;
    }

    throw new Error(errorMessage);
  }
}
