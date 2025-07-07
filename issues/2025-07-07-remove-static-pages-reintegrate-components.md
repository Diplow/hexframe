# Issue: Remove static pages and reintegrate components to dynamic pages

**Date**: 2025-07-07
**Status**: Open
**Tags**: #refactor #architecture #tech #medium
**GitHub Issue**: #70
**Branch**: issue-70-remove-static-pages

## Problem Statement
The codebase currently has both static and dynamic versions of pages. Static components need to be reintegrated into dynamic pages where the dynamic version uses the static version. Static versions that are not used by dynamic pages should be removed to reduce code duplication and maintenance overhead.

## User Impact
- Developers face confusion with duplicate page implementations
- Maintenance burden of keeping static and dynamic versions in sync
- Potential inconsistencies between static and dynamic page behaviors
- Increased codebase complexity affecting development velocity

## Steps to Reproduce
1. Examine the codebase for pages with both static and dynamic versions
2. Identify which static components are used by dynamic pages
3. Note the redundancy and maintenance challenges

## Environment
- Development environment
- All pages with static/dynamic duplicates
- Frequency: Ongoing maintenance issue

## Related Issues
- Architecture and code organization improvements
- Technical debt reduction