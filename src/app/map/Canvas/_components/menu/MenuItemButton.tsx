import type { LucideIcon } from "lucide-react";

interface MenuItemButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  onClose: () => void;
  className?: string;
  separator?: boolean;
  showSeparator?: boolean;
}

export function MenuItemButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  onClose,
  className,
  separator,
  showSeparator = false,
}: MenuItemButtonProps) {
  return (
    <div>
      {separator && showSeparator && (
        <div className="my-1 border-t border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]" />
      )}
      <button
        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[color:var(--bg-color-100)] dark:hover:bg-[color:var(--bg-color-700)] transition-colors ${
          className ?? "text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)]"
        }`}
        onClick={() => {
          onClick();
          onClose();
        }}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        {shortcut && (
          <span className="text-xs text-[color:var(--text-color-500)] dark:text-[color:var(--text-color-400)] ml-4">
            {shortcut}
          </span>
        )}
      </button>
    </div>
  );
}
