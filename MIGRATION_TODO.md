# Firebase to Supabase Migration TODO

## Overview
이 파일들은 아직 Firebase를 사용하고 있으며, Supabase로 마이그레이션이 필요합니다.

## Files that need migration

### 1. Permission Hooks
- `apps/web-app/src/hooks/useProjectPermissions.ts`
- `apps/web-app/src/hooks/useTaskPermissions.ts`

**Status**: ❌ Not migrated  
**Priority**: Medium  
**Description**: Firebase Firestore를 사용하는 권한 관리 훅들. Supabase 테이블과 RLS로 마이그레이션 필요.

### 2. Optimized Task Hook
- `apps/web-app/src/hooks/useTasksOptimized.ts`

**Status**: ❌ Not migrated  
**Priority**: Low  
**Description**: Firebase 기반의 최적화된 태스크 훅. 현재 `useApiService.ts`의 `useTasks`를 사용하고 있으므로 우선순위 낮음.

### 3. Dependencies that can be removed

#### Completed ✅
- `firebase-admin` package - Removed from package.json
- Firebase migration scripts - Removed from package.json scripts
- Firebase environment variables - Removed from .env files

## Migration Strategy

### Phase 1: Remove unused Firebase code
- ✅ Remove firebase-admin dependency
- ✅ Remove migration-related scripts
- ✅ Remove Firebase environment variables
- ❌ Add TODO comments to Firebase-dependent files

### Phase 2: Migrate Permission System (Future)
1. Create Supabase tables for permissions
2. Implement RLS (Row Level Security) policies
3. Migrate hooks to use Supabase client
4. Update components that use permission hooks
5. Test permission system thoroughly

### Phase 3: Cleanup (Future)
1. Remove all Firebase imports
2. Remove Firebase config files
3. Remove Firebase types if not used elsewhere
4. Update documentation

## Notes
- All files with Firebase dependencies have been marked with TODO comments
- Current priority is on core functionality using Supabase
- Permission system migration can be done later as it's not critical for basic functionality
- The app currently works with Supabase for basic features (auth, teams, tasks)

## Affected Components
Components that use the permission hooks (low priority to fix):
- `ProjectPermissionsPanel.tsx`
- `ProjectPermissionList.tsx`
- `TaskPermissionsPanel.tsx`
- `ProjectPermissionModal.tsx`
- `TaskPermissionList.tsx`
- `TaskPermissionModal.tsx`
- `TaskPermissionEditModal.tsx`