# Chat State Documentation

## Mental Model
Like a medical chart system - maintains an immutable timeline of events (symptoms, treatments, observations) that doctors use to derive current patient state and make informed decisions.

## Responsibilities
- Document the event sourcing architecture and patterns used by Chat state management
- Provide guidelines for working with immutable event streams and derived state
- Explain the integration points between Chat state and external systems
- Define the state flow from external events to UI rendering

## Non-Responsibilities
- Implementation of actual state management logic → See `../core/README.md`
- Event type definitions and processing → See `../_events/README.md`
- State reduction and transitions → See `../_reducers/README.md`
- State derivation and selection → See `../_selectors/README.md`
- Hook implementations → See `../_hooks/README.md`
- Operation handlers → See `../_operations/README.md`

## Interface
*See `dependencies.json` for what this documentation subsystem can reference*

Note: This is a documentation-only directory that explains the architecture and patterns used by the Chat state management subsystem.