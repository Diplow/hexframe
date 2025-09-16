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
- \`/debug/full/all\` - Show all full debug logs
- \`/debug/full/100\` - Show last 100 full debug logs
- \`/debug/succinct/all\` - Show all succinct debug logs
- \`/debug/succinct/100\` - Show last 100 succinct debug logs

**Full logs** include complete details and stack traces.
**Succinct logs** show condensed information for quick overview.`;
    }
  },
  '/debug/full/all': {
    description: 'Show all full debug logs',
    action: createDebugCommandAction('full', -1)
  },
  '/debug/full/100': {
    description: 'Show last 100 full debug logs',
    action: createDebugCommandAction('full', 100)
  },
  '/debug/succinct/all': {
    description: 'Show all succinct debug logs',
    action: createDebugCommandAction('succinct', -1)
  },
  '/debug/succinct/100': {
    description: 'Show last 100 succinct debug logs',
    action: createDebugCommandAction('succinct', 100)
  }
};