// Test case: React component with complex string patterns (like DebugLogsWidget)
export function ComplexReactComponent({ title, content, onClose }: ComplexProps) {
  // This function contains the patterns that caused the original bug

  // String with double braces (template placeholders)
  const isInteractive = content.includes('{{INTERACTIVE_CONTROLS:');

  // Template literals with code blocks
  const renderCode = () => {
    if (content.includes('```')) {
      const parts = content.split(/(```[\s\S]*?```)/);
      return parts.map((part, index) => {
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
              return line ? <div key={lineIndex} className="mb-1">{line}</div> : null;
            })}
          </div>
        );
      });
    }
    return <div className="text-sm">{content}</div>;
  };

  // Complex object with nested braces
  const config = {
    templates: {
      success: 'Operation {{type}} completed successfully',
      error: 'Error in {{operation}}: {{message}}',
      warning: 'Warning: {{details}}'
    },
    patterns: [
      /\{\{([^}]+)\}\}/g,
      /\${([^}]+)}/g,
      /{([^}]+)}/g
    ],
    handlers: {
      process: (input: string) => {
        return input.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          return `processed_${key}`;
        });
      },
      validate: (data: any) => {
        return data && typeof data === 'object';
      }
    }
  };

  // String with escaped braces and complex patterns
  const complexTemplate = `
    function processTemplate(data) {
      const result = data.map(item => ({
        id: item.id,
        value: \`\${item.value}_processed\`,
        metadata: {
          timestamp: new Date().toISOString(),
          processed: true
        }
      }));
      return { processed: result.length, data: result };
    }
  `;

  // Multi-line JSX with braces
  return (
    <div className="complex-component">
      <header>
        <h1>{title}</h1>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </header>

      <main>
        {isInteractive ? (
          <div className="interactive-content">
            <pre className="template-code">{complexTemplate}</pre>
            <div className="config-display">
              {JSON.stringify(config, null, 2)}
            </div>
          </div>
        ) : (
          <div className="static-content">
            {renderCode()}
          </div>
        )}
      </main>

      <footer>
        <div className="metadata">
          Processed at: {new Date().toISOString()}
        </div>
      </footer>
    </div>
  );
  // This function should be detected as ~100+ lines and trigger an error
}

interface ComplexProps {
  title: string;
  content: string;
  onClose?: () => void;
}