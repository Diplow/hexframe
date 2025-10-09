/**
 * User preferences storage operations
 * Built on top of generic save/load operations
 */
export function _createPreferenceOperations(
  save: (key: string, data: unknown) => Promise<void>,
  load: <T = unknown>(key: string) => Promise<T | null>
) {
  const saveUserPreferences = async (preferences: unknown): Promise<void> => {
    return save('user-preferences', preferences);
  };

  const loadUserPreferences = async (): Promise<unknown> => {
    return load('user-preferences');
  };

  return {
    saveUserPreferences,
    loadUserPreferences,
  };
}
