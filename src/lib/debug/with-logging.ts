/**
 * Wraps a service export with logging instrumentation.
 *
 * All *Service exports from domain index files must go through this wrapper.
 * This ensures a single extension point for adding observability to service calls
 * without changing any consumer code.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLogging<T>(serviceName: string, service: T): T {
  return service;
}
