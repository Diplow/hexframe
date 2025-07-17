import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";

interface MapErrorBoundaryProps {
  error: Error;
  onRetry: () => void;
  className?: string;
}

export function MapErrorBoundary({
  error,
  onRetry,
  className,
}: MapErrorBoundaryProps) {
  return (
    <div className={cn("grid h-full place-items-center bg-center-depth-0", className)}>
      <div className="max-w-md mx-auto p-6" role="alert">
        <div className="bg-destructive/10 dark:bg-destructive/20 rounded-lg p-6 border border-destructive/20 dark:border-destructive/30">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/20 dark:bg-destructive/30 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Map Navigation Error
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message || "Unable to navigate to the requested location"}
              </p>
              
              {/* Show technical details for development */}
              {process.env.NODE_ENV === 'development' && error.stack && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Technical details
                  </summary>
                  <pre className="mt-2 text-xs bg-neutral-100 dark:bg-neutral-900 p-2 rounded overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
            
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md 
                       hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary 
                       transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>

        {/* Fallback instructions */}
        <noscript>
          <div className="mt-4 rounded border border-secondary/20 bg-secondary/10 p-3">
            <p className="text-sm text-secondary-dark">
              JavaScript is required for interactive features. Please enable
              JavaScript or refresh the page.
            </p>
          </div>
        </noscript>
      </div>
    </div>
  );
}
