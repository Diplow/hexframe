import { createDebugCommandAction } from '~/app/map/Chat/Input/_commands/debug/debug-formatters';

interface Command {
  description: string;
  action?: () => string;
}

export const debugCommands: Record<string, Command> = {
  '/debug': {
    description: 'Show debug logs (use /debug/full or /debug/succinct)',
    action: () => {
      const timestamp = new Date().toLocaleTimeString();
      return `**Debug Commands ${timestamp}**

Available debug log options:
- \`/debug/full/10\` - Show last 10 full debug logs
- \`/debug/full/25\` - Show last 25 full debug logs
- \`/debug/full/50\` - Show last 50 full debug logs
- \`/debug/succinct/10\` - Show last 10 succinct debug logs
- \`/debug/succinct/25\` - Show last 25 succinct debug logs
- \`/debug/succinct/50\` - Show last 50 succinct debug logs

**Full logs** include complete details and stack traces.
**Succinct logs** show condensed information for quick overview.`;
    }
  },
  '/debug/full': {
    description: 'Show last 50 full debug logs (use /debug/full/X for custom limit)',
    action: createDebugCommandAction('full', 50)
  },
  '/debug/full/10': {
    description: 'Show last 10 full debug logs',
    action: createDebugCommandAction('full', 10)
  },
  '/debug/full/25': {
    description: 'Show last 25 full debug logs',
    action: createDebugCommandAction('full', 25)
  },
  '/debug/full/50': {
    description: 'Show last 50 full debug logs',
    action: createDebugCommandAction('full', 50)
  },
  '/debug/succinct': {
    description: 'Show last 50 succinct debug logs (use /debug/succinct/X for custom limit)',
    action: createDebugCommandAction('succinct', 50)
  },
  '/debug/succinct/10': {
    description: 'Show last 10 succinct debug logs',
    action: createDebugCommandAction('succinct', 10)
  },
  '/debug/succinct/25': {
    description: 'Show last 25 succinct debug logs',
    action: createDebugCommandAction('succinct', 25)
  },
  '/debug/succinct/50': {
    description: 'Show last 50 succinct debug logs',
    action: createDebugCommandAction('succinct', 50)
  }
};