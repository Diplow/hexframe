import { useState } from 'react';
import type { CreateKeyData, CreateKeyResult } from './useMcpKeys';

interface KeyCreationProps {
  onCreate: (data: CreateKeyData) => Promise<CreateKeyResult>;
  onSuccess: (result: CreateKeyResult) => void;
  onCancel: () => void;
}

export function KeyCreation({ onCreate, onSuccess, onCancel }: KeyCreationProps) {
  const [formData, setFormData] = useState<CreateKeyData>({
    name: '',
    password: '',
    expiresAt: undefined
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Key name is required');
      return;
    }
    
    if (!formData.password) {
      setError('Password is required for security');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await onCreate(formData);
      onSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create API key';
      
      // Make expiration errors more specific
      if (errorMessage.includes('expiresIn is smaller than')) {
        setError('Expiration date is too soon. Please choose a date at least 24 hours in the future.');
      } else if (errorMessage.includes('expiresIn')) {
        setError('Invalid expiration date. Please choose a valid future date.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      {/* Hidden field to prevent password managers from detecting this as a login form */}
      <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} />
      <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} />
      
      <div>
        <label htmlFor="key-name" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Key Name
        </label>
        <input
          id="key-name"
          type="text"
          name="api-key-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Claude Code MCP"
          className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          disabled={isCreating}
          required
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          role="textbox"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Confirm Password
        </label>
        <input
          id="password"
          type="password"
          name="security-verification"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Enter your password"
          className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          disabled={isCreating}
          required
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
        />
        <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
          Required for security verification
        </p>
      </div>

      <div>
        <label htmlFor="expires-at" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Expires At (optional)
        </label>
        <input
          id="expires-at"
          type="datetime-local"
          value={formData.expiresAt ? formData.expiresAt.toISOString().slice(0, 16) : ''}
          onChange={(e) => setFormData({ 
            ...formData, 
            expiresAt: e.target.value ? new Date(e.target.value) : undefined 
          })}
          className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary [color-scheme:light] dark:[color-scheme:dark]"
          disabled={isCreating}
          autoComplete="off"
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive-50 dark:bg-destructive-900/20 border border-destructive-200 dark:border-destructive-800 rounded-md">
          <p className="text-sm text-destructive-800 dark:text-destructive-200">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-background dark:bg-neutral-700 border border-secondary-300 dark:border-secondary-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-secondary-500"
          disabled={isCreating}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Key'}
        </button>
      </div>
    </form>
  );
}