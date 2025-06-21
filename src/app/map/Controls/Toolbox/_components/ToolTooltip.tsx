import { cn } from '~/lib/utils';

interface ToolTooltipProps {
  label: string;
  shortcut: string;
  show: boolean;
}

export function ToolTooltip({ label, shortcut, show }: ToolTooltipProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute left-full ml-2 px-3 py-2 rounded-lg",
        "bg-gray-900 dark:bg-gray-700 text-white text-sm shadow-lg",
        "opacity-0 group-hover:opacity-100 pointer-events-none",
        "transition-opacity duration-200",
        "whitespace-nowrap z-[60]"
      )}
      role="tooltip"
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-gray-300">Press {shortcut}</div>
    </div>
  );
}