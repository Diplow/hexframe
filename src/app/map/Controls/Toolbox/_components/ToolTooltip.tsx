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
        "bg-popover text-popover-foreground text-sm shadow-lg border border-border",
        "opacity-0 group-hover:opacity-100 pointer-events-none",
        "transition-opacity duration-200",
        "whitespace-nowrap z-[60]"
      )}
      role="tooltip"
    >
      <div className="font-medium">{label}</div>
      {shortcut && <div className="text-xs text-muted-foreground">Press {shortcut}</div>}
    </div>
  );
}