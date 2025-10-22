import { useState } from 'react';
import type { CreateKeyData, CreateKeyResult } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';
import { KeyNameField } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/form-fields/KeyNameField';
import { PasswordField } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/form-fields/PasswordField';
import { ExpirationField } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/form-fields/ExpirationField';
import { FormButtons } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/form-fields/FormButtons';

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

      <KeyNameField
        value={formData.name}
        onChange={(name) => setFormData({ ...formData, name })}
        disabled={isCreating}
      />

      <PasswordField
        value={formData.password}
        onChange={(password) => setFormData({ ...formData, password })}
        disabled={isCreating}
      />

      <ExpirationField
        value={formData.expiresAt}
        onChange={(expiresAt) => setFormData({ ...formData, expiresAt })}
        disabled={isCreating}
      />

      {error && (
        <div className="p-3 bg-destructive-50 dark:bg-destructive-900/20 border border-destructive-200 dark:border-destructive-800 rounded-md">
          <p className="text-sm text-destructive-800 dark:text-destructive-200">{error}</p>
        </div>
      )}

      <FormButtons isCreating={isCreating} onCancel={onCancel} />
    </form>
  );
}