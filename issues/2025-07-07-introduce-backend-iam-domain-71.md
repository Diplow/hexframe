# Issue: Introduce backend IAM domain for better authentication architecture

**Date**: 2025-07-07
**Status**: Open
**Tags**: #enhancement #refactor #architecture #auth #api #medium
**GitHub Issue**: #71
**Branch**: issue-71-introduce-backend-iam-domain

## Problem Statement
The current authentication implementation around betterauth works fine but lacks a proper backend domain structure. While betterauth provides solid authentication functionality, the codebase would benefit from introducing a backend IAM (Identity and Access Management) domain to improve code organization and maintain consistency with the domain-driven design approach used elsewhere in the project.

## User Impact
- Developers face inconsistent architecture patterns between authentication and other domains
- Future authentication-related features are harder to implement without clear domain boundaries
- Maintenance and testing of authentication logic is more complex without proper domain isolation
- Code reusability is limited without a well-structured IAM domain service

## Steps to Reproduce
1. Examine the current authentication implementation using betterauth
2. Compare with other domain implementations (e.g., mapping domain)
3. Notice the lack of a dedicated IAM domain with its own service layer
4. Observe that authentication operations are not exposed via tRPC like other domains

## Environment
- Development environment
- Backend architecture
- Frequency: Ongoing architectural concern

## Related Issues
- Architecture and domain-driven design improvements
- API consistency across domains