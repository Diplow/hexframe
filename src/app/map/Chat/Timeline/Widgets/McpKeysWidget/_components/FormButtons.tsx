interface FormButtonsProps {
  isCreating: boolean;
  onCancel: () => void;
}

export function FormButtons({ isCreating, onCancel }: FormButtonsProps) {
  return (
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
  );
}
