# Technical Debt Backlog

## Architecture
- **Domain Refactor**: rework mapping domain (tile, frame, map, system) - current structure is confusing → [All] - Foundation affects all capabilities

## Testing
- **E2E Tests**: implement comprehensive e2e test suite → [Foundation] - Testing infrastructure
- **Test Tooling**: have Claude be able to use logs with tests (better debugging) → [Foundation] - Developer tooling

## Infrastructure
- **Security**: implement rate limiting → [Foundation] - Essential for public sharing
- **Data Consistency**: fix inconsistent userId (needing a mapping to have an integer version of the string) → [Foundation] - Affects multi-user scenarios

## Code Cleanup
- **Dead Code**: remove unused UI components → [Foundation] - Cleaner codebase is more maintainable for active use
- **Remove Offline Mode**: Remove non-functional offline mode references → [Foundation] - Reduces confusion, simplifies architecture
- **Test Output Verbosity**: Configure test runners for concise output → [Foundation] - Enables AI to parse test results effectively