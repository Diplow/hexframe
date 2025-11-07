import { FormButton } from '~/app/components';

interface FormButtonsProps {
  isCreating: boolean;
  onCancel: () => void;
}

export function FormButtons({ isCreating, onCancel }: FormButtonsProps) {
  return (
    <div className="flex justify-end gap-2">
      <FormButton
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isCreating}
      >
        Cancel
      </FormButton>
      <FormButton
        type="submit"
        variant="primary"
        isLoading={isCreating}
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Create Key'}
      </FormButton>
    </div>
  );
}
