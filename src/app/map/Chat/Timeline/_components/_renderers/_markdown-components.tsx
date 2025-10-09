import { CommandButtonRenderer } from '~/app/map/Chat/Timeline/_components/CommandButtonRenderer';

export function _createMarkdownComponents(isSystemMessage: boolean) {
  return {
    p: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
    br: () => <br />,
    ul: ({ children }: { children?: React.ReactNode }) => <ul>{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol>{children}</ol>,
    li: ({ children, ..._props }: { children?: React.ReactNode } & React.LiHTMLAttributes<HTMLLIElement>) => (
      <li {..._props}>{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className={`font-semibold ${isSystemMessage ? 'text-muted-foreground' : 'text-foreground'}`}>
        {children}
      </strong>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (href?.startsWith('#hexframe-command:')) {
        return <CommandButtonRenderer href={href} isSystemMessage={isSystemMessage}>{children}</CommandButtonRenderer>;
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    code: ({ className, children, ..._props }: { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => {
      const isInline = !className;
      const mutedStyle = isSystemMessage
        ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400'
        : 'bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100';

      return isInline ? (
        <code className={`${mutedStyle} px-1 py-0.5 rounded`} {..._props}>
          {children}
        </code>
      ) : (
        <pre className={`${mutedStyle} p-4 rounded-lg overflow-x-auto my-2`}>
          <code className={className} {..._props}>
            {children}
          </code>
        </pre>
      );
    },
  };
}
