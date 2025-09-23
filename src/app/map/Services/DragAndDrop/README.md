# DragAndDrop Service Subsystem

## Mental Model
The DragAndDrop subsystem is like a "physical moving company" for hexagonal tiles - it handles the logistics of picking up, transporting, and placing tiles while following strict rules about what can go where. Unlike traditional React drag systems that rely on state updates, this operates like a direct physical manipulation system using pure DOM events and CSS visual feedback.

## Responsibilities
- DOM-based drag and drop operations using native events (no React state)
- Global coordination of drag operations across the entire map
- Validation of drag operations based on business rules
- Registration and management of draggable tile elements
- Visual feedback through CSS classes during drag operations

## Non-Responsibilities
- Tile rendering → See `../Canvas/README.md`
- Tile data management → See `../Cache/README.md`
- Business logic for tile relationships → See `~/lib/domains/mapping/README.md`
- Authentication checks → See `~/lib/domains/iam/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.