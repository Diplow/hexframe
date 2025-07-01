"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid h-screen place-items-center">
      <div>
        <p className="mb-2 text-destructive">Error loading map data:</p>
        <pre className="mb-4 whitespace-pre-wrap rounded bg-destructive/10 p-2 text-sm">
          {error.message}
        </pre>
        <button
          onClick={reset}
          className="rounded bg-link px-4 py-2 text-white hover:bg-link-dark"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
