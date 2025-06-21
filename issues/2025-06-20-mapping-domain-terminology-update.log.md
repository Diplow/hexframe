# Issue #49 Log: Update mapping domain to use new terminology

This file documents the complete history and evolution of issue #49.

## 2025-06-20 00:09 - Issue Created

*Created by @Diplow via /issue command*

### Initial Problem Statement
The mapping domain uses outdated terminology that doesn't align with the current conceptual model of the application. This inconsistency makes the codebase harder to understand and maintain.

### Initial Tags
#refactor #architecture #tech #mapping #medium

### GitHub Issue
Created issue #49: https://github.com/Diplow/hexframe/issues/49

---

## 2025-06-20 00:17 - User Feedback on Language Consistency

*Comment by @Diplow*

Clarified that this is not just a mismatch between "front" code and domain code, but rather a lack of clarity compared to what is conceptualized. Consistent language has proven track records of better results for both humans and AI.

### Changes to Issue File
- Updated problem statement to emphasize conceptual clarity
- Added impact on AI understanding and DDD principles

---

## 2025-06-20 00:37 - Context Analysis

*Added by @Diplow via /context command*

### Investigation Process
- Read `/src/lib/domains/mapping/README.md`
- Analyzed directory structure of mapping domain
- Counted terminology occurrences across codebase
- Compared frontend vs backend terminology usage

### Detailed Findings

#### Terminology Count Analysis
- Backend (`/src/lib/domains/mapping/`): 2,774 occurrences of "item/mapItem"
- Frontend (`/src/app/map/`): 1,077 occurrences of "tile"
- Database migrations: 14 references to "item"
- "descendants": 58 occurrences in backend
- No occurrences of "relocate" or "reorder" found

#### Architecture Discoveries
- Recent refactoring eliminated separate "Map" entities
- Maps now represented by root USER-type MapItem
- Clear DDD structure with domain objects, repositories, services, and infrastructure layers
- Two types of MapItems: USER (root) and BASE (with parents)

#### Key Components Identified
- `MapItem` domain object
- `BaseItem` domain object
- `MappingService` - main coordinating service
- `ItemManagementService` - handles item-level operations
- `MapManagementService` - handles map-level operations

### Changes Made to Issue File
- Added comprehensive Context section
- Documented architecture overview
- Listed all affected areas
- Identified technical constraints and risks

---

## 2025-06-20 00:41 - Scope Restrictions Added

*Comments by @Diplow*

### Scope Clarification
User specified that the refactor will initially focus on:
- Domain objects
- Repositories  
- Actions

Will NOT change (in this phase):
- Domain services
- Database tables

### Approach Guidance
During solution planning, should:
- List all current objects, actions, repositories, and service methods
- Discuss which terms to update, keep, or remove
- Understand current implementations before proposing changes

### Changes to Issue File
- Added "Scope Restrictions" section
- Updated affected areas to reflect limited scope
- Noted phased approach to refactoring

---

## 2025-06-20 - Context Analysis Update

*Added by @Diplow via /context command*

### Investigation Process
- Read all README files in mapping domain and parent directories
- Verified documentation against actual code implementation
- Analyzed file structure in _objects/, _repositories/, _actions/, and services/
- Counted terminology occurrences with ripgrep
- Examined database schema definitions
- Compared backend vs frontend terminology usage

### Detailed Findings

#### Documentation Discrepancies
Found significant gaps between documentation and reality:
- Main README references non-existent HexMap aggregate and hex-map.ts files
- Documentation doesn't reflect the elimination of separate Map entities
- Actions layer has been completely restructured with helper classes
- Services layer split into multiple specialized services

#### Terminology Analysis (Updated Counts)
More precise counts within mapping domain only:
- "item": 1,938 occurrences (dominant backend term)
- "tile": 0 occurrences in backend
- "descendants": 106 occurrences (preferred over "children": 15)
- "move": 308 occurrences (no "relocate" found)
- "swap": 85 occurrences (no "reorder" found)

#### Architecture Deep Dive
Current implementation shows sophisticated DDD structure:
- Domain objects: MapItem and BaseItem only (no HexMap)
- Repository pattern with abstract interfaces
- Actions layer with specialized helpers for creation, movement, queries
- Services layer with 5 specialized services coordinated by MappingService
- Infrastructure layer provides concrete repository implementations

#### Database Schema Analysis
Tables use "item" terminology throughout:
- `vde_map_items`: Main table with hierarchical coordinates
- `vde_base_items`: Content storage
- `vde_user_mapping`: Bridge between auth and mapping users
- Constraints enforce USER items as roots, BASE items must have parents

### Synthesis
The context reveals a mature DDD implementation with clear separation of concerns, but terminology is inconsistent between backend ("item") and frontend ("tile"). The documentation is outdated in places but the code structure is clean and well-organized. The refactoring scope is well-defined to avoid breaking changes while aligning the domain language.

### Changes Made to Issue File
- Replaced previous Context section with comprehensive analysis
- Added Existing Documentation subsection with verification results
- Provided Domain Overview with architecture and evolution
- Listed Key Components with detailed descriptions
- Added Implementation Details with file organization and patterns
- Included Code Examples showing current terminology
- Documented Dependencies and Integration points

---

## 2025-06-20 - Context Update: GenericAggregate Pattern

*Added by @Diplow via user request*

### Additional Context Added
User requested information about GenericAggregate pattern used in the domain objects.

### GenericAggregate Analysis
- Found in `/src/lib/domains/utils/generic-objects.ts`
- Base class for all domain aggregates providing standardized structure
- Properties: `id`, `history` (createdAt/updatedAt), `attrs`, `relatedItems`, `relatedLists`
- Both MapItem and BaseItem extend GenericAggregate:
  - MapItem uses all features: attrs, relatedItems (ref, parent, origin), relatedLists (neighbors)
  - BaseItem uses only attrs (title, descr, link) as a simple value object

### Benefits of GenericAggregate Pattern
1. Consistent structure across all domain objects
2. Type-safe generic parameters for attributes and relationships
3. Automatic history tracking (createdAt/updatedAt)
4. Clear separation of concerns between attributes and relationships
5. Enables generic repository implementations

### Changes to Issue File
- Updated Domain Overview with GenericAggregate pattern explanation
- Enhanced Key Components to show how MapItem and BaseItem extend GenericAggregate
- Added details about attrs, relatedItems, and relatedLists for each domain object

---