# Run Services

## Mental Model
Like a **race director's clipboard** - it tracks who started, who finished, who's stuck, and keeps an ordered log of every step. Only one race can be "open" for a given course at a time.

## Responsibilities
- Create and manage Run objects in the database
- Track execution state: open, blocked, closed
- Maintain ordered execution log with timestamps
- Enforce one-open-run-per-rootCoords constraint
- Store blockage reasons for resumption context

## Non-Responsibilities
- Deciding which tile to execute next → See `~/lib/domains/mapping/services/_traversal-services`
- Actually executing tiles → See API layer
- Managing tile content → See `~/lib/domains/mapping`

## Interface
See `index.ts` for public API.
See `dependencies.json` for allowed imports.
