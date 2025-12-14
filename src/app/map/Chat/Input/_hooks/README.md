# Chat Input Hooks

## Mental Model
The Input Hooks are the "nervous system" of the chat input - they coordinate keyboard events, autocomplete suggestions, command parsing, and message handling into a cohesive input experience.

## Responsibilities
- Managing autocomplete state and suggestions (commands and favorites)
- Handling keyboard navigation and input events
- Processing message submission (regular messages, commands, @mentions)
- Managing input history navigation

## Non-Responsibilities
- UI rendering → See `../` (parent Input component)
- Command definitions → See `../_commands/README.md`
- Mention parsing → See `../mention-parser.ts`
- Favorites data fetching → See `~/lib/domains/iam`

## Interface
See `index.ts` for the public API.
See `dependencies.json` for allowed imports.
