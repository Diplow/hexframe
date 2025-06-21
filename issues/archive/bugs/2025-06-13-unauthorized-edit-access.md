# Debug Session: Unauthorized Edit Access to Non-Owned Items

## Issue Description
User reports being able to edit center 8 despite only owning center 128. This suggests a permission/authorization bug where edit access is being granted incorrectly.

## Working Assumption
The permission check for edit functionality is likely comparing IDs incorrectly (possibly a string/number comparison issue or incorrect ID field being checked). This could be happening in:
1. Frontend permission checks (UI showing edit button when it shouldn't)
2. Backend authorization (API allowing edits when it shouldn't)
3. ID comparison logic treating "8" as substring of "128"

## Architectural Context
Based on the codebase architecture:
- **Frontend Layer**: Edit buttons and UI permissions handled in components
- **Backend Layer**: API authorization in tRPC routers (recently secured with protectedProcedure)
- **Domain Layer**: Permission logic in mapping domain
- **Data Layer**: User/item ownership stored in database

This issue likely affects:
- UI components showing edit controls
- Permission checking logic
- ID comparison functionality

## Investigation Log

### Hypothesis 1: ID Comparison Issue
Added debug logging to see the permission check values.

### Discovery: Wrong User ID Being Used!
Found the root cause in `/src/app/map/Canvas/index.tsx` line 175:

```typescript
currentUserId={centerInfo.userId}
```

This is passing the MAP OWNER's userId (from the URL/coordinates) instead of the CURRENT USER's ID. This explains why:
- When viewing map 128, all tiles think the current user is user 128
- User can edit any tile owned by user 128, including center 8
- This is a critical security bug - any user viewing someone's map can edit their tiles!

### Root Cause
The DynamicMapCanvas is using `centerInfo.userId` (the map owner) as `currentUserId` instead of getting the actual logged-in user's ID from the auth context.

## Fix Applied
1. Imported `useAuth` hook in `/src/app/map/Canvas/index.tsx`
2. Get the actual current user from auth context: `const { user } = useAuth()`
3. Pass the correct currentUserId to DynamicFrame: `currentUserId={user ? parseInt(user.id, 10) : undefined}`
4. Correctly handle the string-to-number conversion since auth user.id is a string but coordinates use numbers

## Verification
The fix ensures that:
- Only the actual logged-in user's ID is used for permission checks
- Users can only edit tiles they actually own
- Viewing someone else's map doesn't grant edit permissions to their tiles

## Additional Security Issue Found
After fixing the frontend permission check, discovered that the backend API mutations were only checking authentication (logged in) but NOT authorization (ownership). This meant any logged-in user could call the API to modify any tile.

## Backend Authorization Fix Applied
Added ownership checks to all mutation endpoints in `/src/server/api/routers/map-items.ts`:

1. **addItem**: 
   - Check if creating root item in own space
   - Check if user owns parent when adding child items

2. **removeItem**: 
   - Check if user owns the item being deleted

3. **updateItem**: 
   - Check if user owns the item being updated

4. **moveMapItem**: 
   - Check if user owns the item being moved
   - Check if user owns the destination parent tile

All mutations now throw a FORBIDDEN error if the user doesn't own the resource they're trying to modify.

## Test Added
Should add E2E tests that verify:
- User A can edit their own tiles
- User A cannot edit User B's tiles when viewing User B's map
- Edit buttons only appear on owned tiles
- API calls fail with FORBIDDEN when trying to modify non-owned items
