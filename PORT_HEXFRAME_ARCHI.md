# Port HexFrame Architecture to Hexframe Map

This document provides detailed instructions for creating a complete hierarchical architecture map of the HexFrame codebase using the Hexframe MCP tool.

## Overview

Create a comprehensive, navigable architecture map that mirrors the actual codebase structure by:
1. Following the `dependencies.json` files to identify subsystems
2. Using README files for authentic descriptions
3. Creating a hierarchical tile structure that matches the code organization
4. Ensuring complete coverage from root to leaf subsystems

## Prerequisites

- Access to Hexframe MCP tool (`mcp__hexframe-fixed__*` functions)
- Current user credentials and mapping access
- Access to the HexFrame codebase structure

## Step-by-Step Instructions

### 1. Initialize User Context

```typescript
// Get current user information
const user = await getCurrentUser()
// Use user.mappingId as userId for all tile operations
```

### 2. Create Root Architecture Tile

Create the main "HexFrame Architecture" tile using the main README.md content:

```typescript
// Coordinates: Root level (empty path)
coords: {userId: mappingId, groupId: 0, path: []}
title: "HexFrame Architecture"
descr: // Use content from /README.md
```

### 3. Create Major Subsystem Tiles (Level 2)

Based on the main codebase structure, create tiles for:

1. **Frontend (src/app/map)** - Position 1
2. **Backend API (src/server/api)** - Position 2
3. **Database (src/server/db)** - Position 3
4. **Agentic Domain (src/lib/domains/agentic)** - Position 4
5. **IAM Domain (src/lib/domains/iam)** - Position 5
6. **Mapping Domain (src/lib/domains/mapping)** - Position 6

**Important**: Use each subsystem's specific README.md file for descriptions, NOT the main README.

### 4. Systematic Subsystem Discovery

For each subsystem, follow this discovery pattern:

#### A. Read Dependencies File
```bash
# Find the dependencies.json file for each subsystem
src/{subsystem}/dependencies.json
```

#### B. Extract Subsystems
Look for the `"subsystems"` array in each dependencies.json:
```json
{
  "subsystems": [
    "./Cache",
    "./Canvas",
    "./Chat"
  ]
}
```

#### C. Find README Files
For each subsystem, look for:
```bash
src/{subsystem}/{sub}/README.md
```

#### D. Create Child Tiles
Create tiles using:
- **Coordinates**: `{userId, groupId, path: [parent_path..., position]}`
- **Title**: Subsystem name (cleaned up for display)
- **Description**: Content from the subsystem's README.md file

### 5. Subsystem Coverage Checklist

Ensure you cover ALL subsystems declared in dependencies.json files:

#### Frontend (src/app/map)
- [ ] Cache + Handlers
- [ ] Canvas + Tile
- [ ] Chat + Input + Timeline + State
- [ ] Hierarchy
- [ ] MapResolver
- [ ] Services + EventBus

#### Chat Timeline Deep Structure
- [ ] Timeline → Widgets
- [ ] Widgets → AIResponseWidget, LoginWidget, PreviewWidget

#### Backend API (src/server/api)
- [ ] Middleware
- [ ] Routers → Auth, Map, Agentic, User, MCP
- [ ] Services
- [ ] Types

#### Database (src/server/db)
- [ ] Schema

#### Agentic Domain
- [ ] Infrastructure → Inngest
- [ ] Repositories
- [ ] Services

#### IAM Domain
- [ ] Infrastructure → User
- [ ] Services

#### Mapping Domain
- [ ] Infrastructure → Base Item, Map Item
- [ ] Services
- [ ] Actions
- [ ] Utils

### 6. Quality Assurance

#### Verify Complete Coverage
```bash
# Count all dependencies.json files
find src/ -name "dependencies.json" | wc -l

# Ensure each has corresponding tiles
```

#### Description Accuracy
- [ ] Each tile uses content from its specific README.md
- [ ] No generic descriptions used
- [ ] Domain tiles use domain README, not main README
- [ ] Subsystem relationships accurately reflected

#### Coordinate Consistency
- [ ] All paths follow hexagonal positioning (1-6)
- [ ] No gaps in position sequences
- [ ] Parent-child relationships correctly established

### 7. Validation Steps

1. **Structural Validation**
   - Verify each `dependencies.json` subsystem has a corresponding tile
   - Check that no subsystems are missing from the map

2. **Content Validation**
   - Ensure README content is used accurately
   - Verify descriptions match actual subsystem purposes

3. **Hierarchical Validation**
   - Confirm parent-child relationships match code structure
   - Validate coordinate paths are consistent

### 8. Final Architecture Count

Expected final structure:
- **1 Root Tile**: HexFrame Architecture
- **6 Major Subsystems** (Level 2)
- **~20 Sub-subsystems** (Level 3)
- **~15 Sub-sub-subsystems** (Level 4)
- **~4 Deep Nested** (Level 5)
- **~3 Individual Components** (Level 6)
- **Total: ~49 tiles**

## Common Pitfalls to Avoid

1. **Using Wrong README**: Don't use main README.md for domain tiles
2. **Missing Subsystems**: Every item in `"subsystems"` array needs a tile
3. **Generic Descriptions**: Always use actual README content
4. **Coordinate Errors**: Ensure consistent hexagonal positioning
5. **Incomplete Coverage**: Check that all dependencies.json files are covered

## Expected Outcomes

- Complete, navigable architecture map
- Accurate representation of codebase structure
- Authentic descriptions from actual documentation
- Hierarchical organization matching code relationships
- Comprehensive coverage of all subsystems

## Verification Command

```bash
# Quick verification of dependencies coverage
find src/ -name "dependencies.json" | wc -l
# Should match the number of subsystems with dependencies files
```

This process creates a living architectural documentation that stays true to the actual codebase structure and provides an invaluable reference for understanding HexFrame's system organization.