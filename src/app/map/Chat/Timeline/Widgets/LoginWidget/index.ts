/**
 * Public API for LoginWidget Subsystem
 * 
 * Consumers: Widget renderers, chat system
 */

// Main Login Widget
export { LoginWidget } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/login-widget';

// Form Components
export { FormActions } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormActions';
export { FormFields } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormFields';
export { StatusMessages } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/StatusMessages';

// Form State Management
export { useLoginForm } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/useLoginForm';

/**
 * LoginWidget Subsystem Public Interface
 * 
 * Provides comprehensive authentication interface within chat system,
 * handling both login and registration flows with validation and feedback.
 * 
 * All components and hooks are exported above for direct usage.
 */