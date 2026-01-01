/**
 * Animated thinking indicator for streaming messages
 * Shows pulsing dots while waiting for content
 */

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 text-muted-foreground py-1">
      <span className="text-sm">Thinking</span>
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
      </span>
    </div>
  );
}
