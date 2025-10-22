'use client';

interface HeaderContentProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function HeaderContent({ title, subtitle }: HeaderContentProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-sm truncate">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
