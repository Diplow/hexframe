# RunWidget

## Mental Model
The RunWidget is the "mission control panel" for executing a tile's system. It manages the full lifecycle of a run: starting, monitoring progress step-by-step, handling blockages with human-in-the-loop editing, and showing completion results.

## Responsibilities
- Rendering the run execution UI (pre-run, running, blocked, complete, error states)
- Managing run lifecycle (start, resume, stop) via the `useRunWidget` hook
- Displaying executed steps with expandable details (prompts, responses, tool calls)
- Providing hexplan editing during blocked states for human intervention

## Non-Responsibilities
- Run orchestration logic (server-side) -> See `src/lib/domains/agentic/README.md`
- Step list rendering internals -> See `./_subsystems/StepsList/`
- Shared widget primitives (BaseWidget, WidgetHeader) -> See `../_shared/`
- Map navigation -> See `src/app/map/Cache/README.md`

## Interface
See `index.ts` for the public API - exports `RunWidget` component and `useRunWidget` hook.
See `dependencies.json` for what this subsystem can import.
