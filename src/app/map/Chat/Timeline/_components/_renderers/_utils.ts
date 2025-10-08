export function _safeStringify(value: unknown, space = 0): string | undefined {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return undefined;
  }
}
