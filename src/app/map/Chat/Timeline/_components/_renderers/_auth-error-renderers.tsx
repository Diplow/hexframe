import type { Widget, AuthRequiredPayload, ErrorOccurredPayload } from '~/app/map/Chat/_state';
import { LoginWidget, ErrorWidget } from '~/app/map/Chat/Timeline/Widgets';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';
import { _safeStringify } from '~/app/map/Chat/Timeline/_components/_renderers/_utils';

export function _renderLoginWidget(widget: Widget, handlers: WidgetHandlers) {
  const loginData = widget.data as AuthRequiredPayload;
  const { handleCancel = () => { /* noop */ } } = handlers;
  return (
    <LoginWidget
      message={loginData.reason}
      onClose={handleCancel}
    />
  );
}

// Define interface for alternative error format
interface AlternativeErrorPayload {
  message?: string;
  details?: unknown;
  severity?: string;
}

// Union type for both error payload structures
type ErrorWidgetData = ErrorOccurredPayload | AlternativeErrorPayload;

export function _renderErrorWidget(widget: Widget, handlers: WidgetHandlers) {
  const { handleCancel = () => { /* noop */ } } = handlers;

  // Handle both error payload structures:
  // 1. ErrorOccurredPayload: {error, context, retryable}
  // 2. Alternative format: {message, details, severity}
  const errorData = widget.data as ErrorWidgetData;

  // Extract error message from either structure
  const errorMessage =
    ('error' in errorData ? errorData.error : undefined) ??
    ('message' in errorData ? errorData.message : undefined) ??
    'An error occurred';

  // Extract context/details from either structure
  const errorContext =
    ('context' in errorData ? errorData.context : undefined) ??
    ('details' in errorData ? errorData.details : undefined);

  // Extract operation type from context if available
  const operation =
    'context' in errorData &&
    errorData.context &&
    typeof errorData.context === 'object' &&
    errorData.context !== null &&
    'operation' in errorData.context
      ? (errorData.context as { operation?: string }).operation as 'create' | 'update' | 'delete' | 'move' | 'swap' | undefined
      : undefined;

  // Only show technical details for ErrorOccurredPayload (has 'error' and 'context' fields)
  // Don't show details for user-facing validation errors (has 'message' and 'details' fields)
  const shouldShowTechnicalDetails = 'error' in errorData && 'context' in errorData;

  return (
    <ErrorWidget
      message={errorMessage}
      error={shouldShowTechnicalDetails && errorContext ? _safeStringify(errorContext, 2) : undefined}
      operation={operation}
      retry={
        'retryable' in errorData && errorData.retryable ? () => {
          // Handle retry
        } : undefined
      }
      onDismiss={handleCancel}
    />
  );
}
