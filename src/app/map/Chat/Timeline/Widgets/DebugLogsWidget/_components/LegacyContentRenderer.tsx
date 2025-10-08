'use client';

interface LegacyContentRendererProps {
  content: string;
}

export function LegacyContentRenderer({ content }: LegacyContentRendererProps) {
  // Handle legacy content - simple markdown rendering
  if (content.includes('```')) {
    const parts = content.split(/(```[\s\S]*?```)/);
    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const code = part.slice(3, -3).trim();
            return (
              <pre key={index} className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto">
                <code>{code}</code>
              </pre>
            );
          }
          return (
            <div key={index} className="text-sm">
              {part.split('\n').map((line, lineIndex) => {
                if (line.startsWith('• ')) {
                  return (
                    <div key={lineIndex} className="flex items-start mb-1">
                      <span className="text-neutral-500 mt-0.5 mr-1">•</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                }
                if (line.includes('**') && line.includes('**')) {
                  const boldParts = line.split(/(\*\*[^*]+\*\*)/);
                  return (
                    <div key={lineIndex} className="mb-1">
                      {boldParts.map((boldPart, boldIndex) =>
                        boldPart.startsWith('**') && boldPart.endsWith('**') ? (
                          <strong key={boldIndex} className="font-semibold">
                            {boldPart.slice(2, -2)}
                          </strong>
                        ) : (
                          boldPart
                        )
                      )}
                    </div>
                  );
                }
                return line ? <div key={lineIndex} className="mb-1">{line}</div> : null;
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return <div className="text-sm">{content}</div>;
}
