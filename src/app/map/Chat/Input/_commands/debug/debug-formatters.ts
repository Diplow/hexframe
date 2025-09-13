import { debugLogger } from '~/lib/debug/debug-logger';
import { toBase64 } from '~/app/map/Chat/Input/_commands/debug/debug-utils';

export function createDebugCommandAction(mode: 'full' | 'succinct', limit: number) {
  return () => {
    const logs = debugLogger.formatLogs(mode, limit);
    if (logs.length === 0) {
      return 'No debug logs available.';
    }

    // Remove timestamps from individual log lines since we'll show timestamp in the header
    const cleanLogs = logs.map(log => {
      // Remove timestamp pattern like "2:55:56 PM [DEBUG]..."
      return log.replace(/^\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+/, '');
    });

    const logContent = cleanLogs.join('\n');

    return `\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
  };
}