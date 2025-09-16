// UTF-8 safe base64 encoder
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

// Remove timestamp pattern like "2:55:56 PM [DEBUG]..." from log lines
export function stripTimestamp(logLine: string): string {
  return logLine.replace(/^\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+/, '');
}