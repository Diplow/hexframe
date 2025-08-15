# Architecture: LoginWidget Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
LoginWidget/
├── interface.ts         # Public API
├── dependencies.json    # Allowed imports
├── index.tsx            # Public entry point
├── LoginWidget.tsx      # Main widget component
├── FormActions.tsx      # Login/register buttons
├── FormFields.tsx       # Input field components
├── FormHeader.tsx       # Widget header
├── StatusMessages.tsx   # Error/success feedback
└── useLoginForm.tsx     # Form state management
```

## Key Patterns

- **Component Composition**: Widget built from focused sub-components
- **Form State Management**: Centralized form state via custom hook
- **Mode Switching**: Dynamic UI based on login vs registration mode
- **Validation Pattern**: Real-time form validation with user feedback
- **Status Management**: Clear error and success state handling

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks and components |
| ~/components/ui/* | Consistent UI components (Button, Input, Label) |
| ~/lib/auth/auth-client | Authentication operations |
| ~/contexts/UnifiedAuthContext | Auth state management |
| lucide-react | Icons (Eye, EyeOff, etc.) |

## Interactions

### Inbound (Who uses this subsystem)
- **Widget Renderers** → Renders LoginWidget for auth requirements
- **Chat System** → Creates login widgets when auth is needed

### Outbound (What this subsystem uses)
- **Auth Client** ← For login/registration operations
- **Unified Auth Context** ← For auth state coordination
- **UI Components** ← For consistent styling and behavior

## Form Flow

1. **Initialization** → Form appears in login mode by default
2. **Input Handling** → Real-time validation as user types
3. **Mode Switching** → Toggle between login and registration
4. **Submission** → Validates and submits to auth client
5. **Feedback** → Shows success/error states
6. **Completion** → Widget closes on successful auth

## Auth Integration

The LoginWidget integrates seamlessly with the unified auth system:
- Listens to auth state changes
- Automatically closes when user becomes authenticated
- Provides clear feedback for auth failures
- Supports both email/password and potential social auth flows