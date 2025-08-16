# Architecture: AIResponseWidget Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
AIResponseWidget/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
└── index.tsx          # Main AI response widget
```

## Key Patterns

- **State Machine Pattern**: Clear states (pending → processing → completed/failed/direct)
- **Polling Pattern**: Real-time job status updates via tRPC queries
- **Progressive Enhancement**: Graceful fallbacks for different response types
- **Dynamic Styling**: Client-side CSS injection for animations
- **Error Boundaries**: Comprehensive error handling for job failures

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks (useEffect, useState, useRef) |
| ~/commons/trpc/react | AI job status polling |
| ~/lib/debug/debug-logger | Development logging |
| ~/lib/domains/agentic/types/job.types | Job type definitions |
| lucide-react | Status icons (Loader2, CheckCircle, etc.) |
| ../../Messages/MarkdownRenderer | Content rendering |

## Interactions

### Inbound (Who uses this subsystem)
- **Widget Renderers** → Renders AIResponseWidget for AI interactions
- **Chat System** → Creates widgets for AI job responses

### Outbound (What this subsystem uses)
- **Agentic Domain** ← For job status polling and type definitions
- **Messages Subsystem** ← For markdown content rendering
- **tRPC API** ← For real-time job status updates
- **Debug Logger** ← For development feedback

## State Flow

1. **Initialization** → Determines initial state based on props (direct vs job)
2. **Polling** → If jobId provided, polls for status updates every 2 seconds
3. **State Updates** → Responds to job status changes from API
4. **Completion** → Displays final result (success response or error)
5. **Cleanup** → Stops polling and cleans up timers on completion

## Widget States

- **direct**: Immediate response without job tracking
- **pending**: Job queued, waiting to start
- **processing**: Job actively running with progress indication
- **completed**: Job finished successfully with response
- **failed**: Job failed with error message