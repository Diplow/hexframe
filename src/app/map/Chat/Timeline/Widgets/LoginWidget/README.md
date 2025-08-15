# LoginWidget Subsystem

## Why This Exists
The LoginWidget provides a comprehensive authentication interface within the chat system, handling both login and registration flows with form validation, status feedback, and integration with the unified auth system.

## Mental Model
Think of LoginWidget as a self-contained authentication portal that manages the complete user auth flow from within the chat interface, providing seamless transition between login and registration modes.

## Core Responsibility
This subsystem owns:
- Authentication form rendering and validation
- Login/registration mode switching
- Form state management and submission
- Auth status feedback and error handling
- Integration with unified auth context

This subsystem does NOT own:
- Actual authentication logic (delegates to IAM domain)
- Session management (delegates to auth client)
- Navigation after auth (delegates to parent components)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `LoginWidget` - Main authentication widget
- `FormActions` - Login/register action buttons
- `FormFields` - Input field components
- `FormHeader` - Auth form header
- `StatusMessages` - Error/success feedback
- `useLoginForm` - Form state management hook

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.