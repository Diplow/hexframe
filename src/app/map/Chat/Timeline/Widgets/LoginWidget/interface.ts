/**
 * Public API for LoginWidget Subsystem
 * 
 * Consumers: Widget renderers, chat system
 */

// Main Login Widget
export { LoginWidget } from './index';

// Form Components
export { FormActions } from './FormActions';
export { FormFields } from './FormFields';
export { FormHeader } from './FormHeader';
export { StatusMessages } from './StatusMessages';

// Form State Management
export { useLoginForm } from './useLoginForm';

/**
 * LoginWidget Subsystem Public Interface
 * 
 * Provides comprehensive authentication interface within chat system,
 * handling both login and registration flows with validation and feedback.
 * 
 * All components and hooks are exported above for direct usage.
 */