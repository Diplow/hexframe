# Architecture Check System Refactor Plan

# 🚀 CURRENT STATUS (Updated)

## ✅ COMPLETED
- **Phase 1**: Script enhancement, usage docs, package.json scripts
- **Phase 2**: allowedChildren cascading, path hierarchy logic implemented and tested
- **Major Cleanup**: Fixed invalid dependencies across 20+ files automatically
- **Tools Created**: 
  - `scripts/validate-dependencies.cjs` (finds invalid paths)
  - `scripts/fix-dependencies.cjs` (cleans up invalid references) 
  - `scripts/migration-strategy.md` (detailed migration plan)
  - Enhanced `scripts/analyze-dependencies.cjs` (suggests allowedChildren)

## 🎯 READY FOR
- **Phase 3**: Systematic migration starting with leaf subsystems
- **Current Target**: Chat/Timeline/services (smallest leaf subsystem)  
- **Migration Strategy**: Follow bottom-up approach in scripts/migration-strategy.md

## 📊 ACHIEVEMENTS
- **map/dependencies.json**: 333 → 126 dependencies (62% reduction)
- **Services/EventBus**: Empty allowed array (inherits from parent via allowedChildren)
- **Invalid Dependencies**: Hundreds → 5 remaining (mostly interface→index refs)
- **Files Cleaned**: 20 out of 31 dependencies.json files automatically fixed
- **Working Example**: Services subsystem demonstrates allowedChildren cascading

## 🛠️ TOOLS READY
- `pnpm check:architecture` - Enhanced script with hierarchy logic
- `node scripts/analyze-dependencies.cjs <path>` - Suggests optimal structure
- `node scripts/validate-dependencies.cjs` - Finds invalid paths
- `node scripts/fix-dependencies.cjs` - Auto-fixes common issues

## 🎯 NEXT ACTIONS
1. Start leaf subsystem migration: `Chat/Timeline/services`
2. Create parent allowedChildren structures for mid-level subsystems  
3. Continue bottom-up migration per migration-strategy.md
4. Target: 70%+ total dependency reduction

---

## Original Analysis (Pre-Implementation)

## Current State Analysis

### What's Working
1. **Script Design**: The check-architecture script has been updated to expect absolute paths (with `~/` prefix)
2. **Subsystem Detection**: Properly finds directories with dependencies.json
3. **Validation Logic**: Good checks for imports, boundaries, and hierarchical dependencies

### Current Problems
1. **Mixed Path Formats**: Dependencies.json files contain mix of:
   - Relative paths: `../Services`, `../../types`, `./Cache`
   - Absolute paths: `~/lib/domains/mapping/utils`
   - Extreme redundancy: src/app/map/dependencies.json has 337 entries with many duplicates

2. **No Path Expansion**: Each child path must be explicitly listed even if parent is allowed
   - If `~/lib/utils` is allowed, still need to list `~/lib/utils/cn`
   - Creates massive redundancy

3. **Script Execution Issues**:
   - Works via `pnpm lint:architecture` 
   - Fails when run directly (likely PATH issues)
   - Missing usage documentation

4. **allowedChildren Field**: Not being utilized for cascading common dependencies

## Philosophy & Goals

### Original Vision (Still Valid)
- **Boundaries as Complexity Inflection Points**: When the script fails, it signals unnecessary complexity
- **Trust Through Architecture**: Clear boundaries help both humans and AI understand the system
- **Living Systems**: Architecture should guide, not constrain

### Key Insight
The complexity you're facing comes from two sources:
1. **Accidental Complexity**: Path redundancy, mixed formats, poor tooling
2. **Inherent Complexity**: Real dependencies that need explicit declaration

We can eliminate the accidental complexity while preserving the valuable boundary checking.

## Implementation Plan

### Phase 1: Fix Script Documentation & Execution
**Goal**: Make the script easy to run and understand

1. Add usage documentation at top of script:
```bash
#!/bin/sh
#
# Architecture Boundary Check
# 
# Usage:
#   pnpm lint:architecture [path]     # Recommended: uses pnpm environment
#   bash .husky/check-architecture    # Direct execution (may fail if tools not in PATH)
#
# Required tools: find, grep, sed, awk, wc (jq optional for better performance)
```

2. Update package.json scripts:
```json
{
  "check:architecture": "bash .husky/check-architecture",
  "check:architecture:map": "bash .husky/check-architecture src/app/map",
  "check:architecture:fix": "node scripts/fix-dependencies.cjs",
  "lint": "... && pnpm check:architecture"
}
```

### Phase 2: Implement Path Hierarchy Logic
**Goal**: Reduce redundancy through intelligent path matching

1. Modify the script's path checking (around line 460-471) to:
   - If `~/lib/utils` is allowed, automatically allow `~/lib/utils/*`
   - Exception: Subsystems in allowed paths still need explicit permission
   - Example: `~/app/map` allows `~/app/map/types` but NOT `~/app/map/Cache` (subsystem)

2. Add helper function:
```bash
is_path_allowed() {
  local import_path=$1
  local allowed_deps=$2
  local subsystem_dir=$3
  
  # Check direct matches first
  # Then check if any allowed path is a parent
  # But exclude if the child is a known subsystem
}
```

### Phase 3: Implement allowedChildren Cascading
**Goal**: Common dependencies inherited by all children

1. Modify dependencies.json schema usage:
   - `allowed`: Direct dependencies for this subsystem
   - `allowedChildren`: Dependencies that cascade to all children
   - `subsystems`: Child subsystems (relative paths)

2. Example transformation:
```json
{
  "allowedChildren": ["react", "next/navigation", "~/lib/utils"],
  "allowed": ["~/server/api/types"],
  "subsystems": ["./Cache", "./Canvas"]
}
```

### Phase 4: Create Migration Tools
**Goal**: Automate the conversion process

1. **Dependency Analyzer** (`scripts/analyze-dependencies.js`):
   - Scan a subsystem's actual imports
   - Generate minimal dependencies.json
   - Identify common patterns for allowedChildren

2. **Path Converter** (`scripts/convert-dependencies-to-absolute.cjs`):
   - Convert all relative paths to absolute
   - Remove redundant entries
   - Preserve subsystems as relative

3. **Validation Helper** (`scripts/validate-dependencies.js`):
   - Check for redundancy
   - Suggest allowedChildren candidates
   - Find unused dependencies

### Phase 5: Gradual Migration Strategy
**Goal**: Systematic rollout without breaking everything

1. **Start Small**: Pick one subsystem (e.g., `Services/EventBus`)
   - Clean up its dependencies.json
   - Test with the updated script
   - Document learnings

2. **Bottom-Up Migration**:
   - Start with leaf subsystems (no children)
   - Move up to parent subsystems
   - Finally tackle root-level dependencies

3. **Validation Checkpoints**:
   - After each subsystem: run `pnpm check:architecture`
   - Commit working state before moving to next
   - Keep a migration log

## Expected Outcomes

### Short Term (This Sprint)
1. Script works reliably with clear error messages
2. Path redundancy reduced by 70%+ through hierarchy logic
3. Migration tools ready for use

### Medium Term (Next Sprint)
1. All subsystems migrated to new format
2. CI integration working smoothly
3. Developer friction minimized

### Long Term (2-3 Sprints)
1. Architecture boundaries clearly documented and enforced
2. AI can understand and respect boundaries
3. New features naturally follow established patterns

## Success Metrics
- Dependencies.json files < 50 lines (from current 300+)
- Zero false positives in architecture checks
- New subsystems created correctly first time
- Clear understanding of system boundaries

## Risk Mitigation
1. **Breaking Changes**: Use gradual migration, test each step
2. **Developer Resistance**: Provide clear tools and documentation
3. **CI Failures**: Run in warning mode initially, then enforce

## Next Session Tasks

### Priority 0: Script Enhancement
1. Add usage documentation
2. Implement path hierarchy logic
3. Test with Services/EventBus

### Priority 1: Migration Tools
1. Create analyze-dependencies.js
2. Update convert-dependencies-to-absolute.cjs
3. Create validate-dependencies.js

### Priority 2: Systematic Migration
1. Migrate Services/EventBus (smallest subsystem)
2. Migrate Chat subsystem
3. Migrate root map dependencies

### Priority 3: CI Integration
1. Add to GitHub Actions
2. Create pre-merge checks
3. Document for team

## Key Decisions to Document
1. Why absolute paths over relative (consistency, clarity)
2. Why allowedChildren exists (reduce redundancy)
3. Why subsystems stay relative (local scope)
4. Why hierarchy expansion excludes subsystems (explicit boundaries)

## Notes for Implementation
- Keep the idealistic vision - it's good!
- Focus on eliminating accidental complexity first
- Document WHY, not just WHAT
- Make tools that help, not hinder
- Remember: "Boundaries are complexity inflection points"

## Command Reference
```bash
# Check architecture
pnpm check:architecture

# Check specific subsystem
pnpm check:architecture src/app/map

# Analyze actual dependencies
node scripts/analyze-dependencies.js src/app/map/Services/EventBus

# Convert to absolute paths
node scripts/convert-dependencies-to-absolute.cjs

# Validate and suggest improvements
node scripts/validate-dependencies.js src/app/map
```

---

This plan preserves your idealistic vision while addressing the practical challenges. The key insight: the complexity you're facing is mostly accidental (poor tooling, redundancy) not inherent (actual architectural complexity). By improving the tools and migration path, we can achieve the original goal of clear, trustable architecture boundaries.