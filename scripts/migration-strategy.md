# Phase 3: Systematic Migration Strategy

## Migration Overview

Now that we've cleaned up invalid dependencies, we can systematically migrate to the allowedChildren cascading pattern. This will reduce the massive redundancy (like the 333 dependencies in map/dependencies.json) while maintaining explicit boundary enforcement.

## Migration Order: Bottom-Up Approach

### 1. Leaf Subsystems (No children) - PRIORITY 1
These subsystems have no child subsystems, so they're safe to migrate first:

**Already completed:**
- ✅ `Services/EventBus` (done in Phase 2)

**Remaining leaf subsystems to migrate:**
- `Chat/Timeline/services`
- `Chat/Timeline/Widgets/AIResponseWidget`
- `Chat/Timeline/Widgets/LoginWidget`
- `Chat/Timeline/Widgets/PreviewWidget`
- `Cache` (large subsystem)
- Domain infrastructure subsystems:
  - `lib/domains/agentic/infrastructure`
  - `lib/domains/iam/infrastructure` 
  - `lib/domains/mapping/infrastructure`

### 2. Mid-level Subsystems (Have children but also parents) - PRIORITY 2
- `Chat/Timeline/Widgets` (parent to AIResponseWidget, LoginWidget, PreviewWidget)
- `Chat/Timeline` (parent to Widgets, services)
- `Canvas/Tile` (parent to Item subsystems)
- `lib/domains/*` (parent to infrastructure)

### 3. Top-level Subsystems - PRIORITY 3
- `Chat` (parent to Timeline, Input, etc.)
- `Canvas` (parent to Tile)
- `Services` (already has structure from Phase 2)

### 4. Root Level - FINAL
- `src/app/map` (root with 126 dependencies after cleanup)

## Migration Process for Each Subsystem

### Step 1: Analyze Current Dependencies
```bash
node scripts/analyze-dependencies.cjs <path-to-subsystem>
```

### Step 2: Identify Common Patterns
Look for:
- Framework dependencies (react, next/*)
- Type imports (*/types)
- Utility imports (*/utils) 
- Domain-specific common patterns

### Step 3: Create Parent allowedChildren Structure
For parent subsystems, move common dependencies to `allowedChildren`:
```json
{
  "allowedChildren": ["react", "~/lib/utils", "~/app/map/types"],
  "allowed": ["parent-specific-deps"],
  "subsystems": ["./Child1", "./Child2"]
}
```

### Step 4: Simplify Children Dependencies
Remove dependencies that are now inherited from parent:
```json
{
  "allowed": ["child-specific-only"]
}
```

### Step 5: Validate
```bash
bash .husky/check-architecture <subsystem-path>
```

## Expected Outcomes per Priority

### Priority 1 (Leaf Subsystems)
- **Timeline/services**: 2 dependencies → minimal (inherits from Timeline)
- **Timeline/Widgets/AIResponseWidget**: 8 dependencies → 2-3 specific ones
- **Timeline/Widgets/LoginWidget**: 12 dependencies → 2-3 specific ones
- **Cache**: 13 dependencies → 5-8 specific ones (biggest leaf system)

**Expected reduction**: ~30-40% across leaf subsystems

### Priority 2 (Mid-level Parents) 
- **Timeline/Widgets**: Create allowedChildren for common widget dependencies
- **Timeline**: Create allowedChildren for common timeline dependencies  
- **Canvas/Tile**: Create allowedChildren for common tile dependencies

**Expected reduction**: ~50-60% as children inherit from parents

### Priority 3 (Top-level)
- **Chat**: Major allowedChildren consolidation (timeline, input, state patterns)
- **Canvas**: Tile rendering, interaction, coordinate patterns

**Expected reduction**: ~60-70% as multiple layers inherit

### Final (Root)
- **map**: From current 126 → estimated 30-40 direct dependencies
- All subsystems inherit common patterns (react, types, utils, etc.)

**Final target**: 70%+ total reduction as specified in original plan

## Success Metrics

- [ ] All leaf subsystems pass architecture validation
- [ ] Mid-level parents have meaningful allowedChildren arrays
- [ ] Top-level subsystems show major dependency reduction
- [ ] Root map dependencies.json under 50 entries
- [ ] Zero architecture violations across entire map system
- [ ] New subsystems follow the established pattern

## Risk Mitigation

1. **Test after each migration**: Run architecture check after each subsystem
2. **Commit working state**: Git commit after each successful subsystem migration
3. **Rollback ready**: Keep original files for rollback if needed
4. **Incremental approach**: Don't migrate multiple subsystems simultaneously

## Tools Created

- ✅ `validate-dependencies.cjs` - Find invalid paths
- ✅ `fix-dependencies.cjs` - Clean up invalid references  
- ✅ `analyze-dependencies.cjs` - Suggest optimal structure
- ✅ Enhanced architecture script with hierarchy logic

## Next Actions

1. Start with `Chat/Timeline/services` (smallest leaf)
2. Move to `Chat/Timeline/Widgets/*` (medium leaves)
3. Create `Chat/Timeline/Widgets/dependencies.json` with allowedChildren
4. Progress through the migration order systematically

This approach ensures we build a solid foundation and avoid breaking dependencies while achieving the 70%+ reduction goal.