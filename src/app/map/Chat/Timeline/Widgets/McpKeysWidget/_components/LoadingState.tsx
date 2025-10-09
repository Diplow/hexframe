export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m12 6 0 6 6 0-6-6z"></path>
        </svg>
        <span>Loading API keys...</span>
      </div>
    </div>
  );
}
