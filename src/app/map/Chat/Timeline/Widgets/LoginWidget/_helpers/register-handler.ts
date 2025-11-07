import { authClient } from '~/lib/auth';

interface RegisterParams {
  email: string;
  password: string;
  username: string;
}

interface RegisterResult {
  shouldRedirect: boolean;
  redirectUrl?: string;
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

    // Registration successful - redirect to email verification page
    return {
      shouldRedirect: true,
      redirectUrl: '/auth/check-verification-email',
    };
  } catch (registerError: unknown) {
    const errorMessage = registerError instanceof Error ? registerError.message : 'Registration failed';
    throw new Error(errorMessage);
  }
}
