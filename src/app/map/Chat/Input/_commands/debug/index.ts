import { createDebugCommandAction } from './debug-formatters';

interface Command {
  description: string;
  action?: () => string;
}

export const debugCommands: Record<string, Command> = {
  '/debug': {
    description: 'Show debug logs (use /debug/full or /debug/succinct)',
  },
  '/debug/full': {
    description: 'Show last 50 full debug logs (use /debug/full/X for custom limit)',
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