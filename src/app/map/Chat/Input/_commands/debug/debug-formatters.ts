import { debugLogger } from '~/lib/debug/debug-logger';
import { toBase64 } from './debug-utils';

export function createDebugCommandAction(mode: 'full' | 'succinct', limit: number) {
  return () => {
    const logs = debugLogger.formatLogs(mode, limit);
    if (logs.length === 0) {
      return 'No debug logs available.';
    }
    const logContent = logs.join('\n');
    const modeText = mode === 'full' ? 'Full' : 'Succinct';
    return `**Debug Logs (${modeText} Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
  };
}