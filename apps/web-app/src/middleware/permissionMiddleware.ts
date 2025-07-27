// Frontend permission utilities - no Express dependencies needed
import { PermissionAction, ResourceType } from '../types/team';

// Express 미들웨어는 백엔드용이므로, 프론트엔드에서는 React 컴포넌트 미들웨어를 구현
// 대신 권한 검증을 위한 유틸리티 함수들을 제공

export interface PermissionCheck {
  resourceType: ResourceType;
  resourceId: string;
  action: PermissionAction;
  required?: boolean; // false일 경우 선택적 권한
}

export interface PermissionValidationResult {
  granted: boolean;
  reason?: string;
  missingPermissions?: PermissionCheck[];
}

/**
 * 단일 권한 검증 함수
 */
export const validatePermission = (
  hasPermissionFn: (
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ) => boolean,
  check: PermissionCheck
): PermissionValidationResult => {
  const granted = hasPermissionFn(
    check.resourceType,
    check.resourceId,
    check.action
  );

  if (!granted && check.required !== false) {
    return {
      granted: false,
      reason: `Insufficient permission for ${check.action} on ${check.resourceType}:${check.resourceId}`,
      missingPermissions: [check],
    };
  }

  return { granted: true };
};

/**
 * 다중 권한 검증 함수
 */
export const validateMultiplePermissions = (
  hasPermissionFn: (
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ) => boolean,
  checks: PermissionCheck[],
  operator: 'AND' | 'OR' = 'AND'
): PermissionValidationResult => {
  const results = checks.map(check => ({
    check,
    granted: hasPermissionFn(
      check.resourceType,
      check.resourceId,
      check.action
    ),
  }));

  const requiredChecks = results.filter(
    result => result.check.required !== false
  );
  const optionalChecks = results.filter(
    result => result.check.required === false
  );

  let granted: boolean;
  let missingPermissions: PermissionCheck[] = [];

  if (operator === 'AND') {
    // 모든 필수 권한이 있어야 함
    const requiredGranted = requiredChecks.every(result => result.granted);
    granted = requiredGranted;

    if (!granted) {
      missingPermissions = requiredChecks
        .filter(result => !result.granted)
        .map(result => result.check);
    }
  } else {
    // 하나 이상의 권한이 있으면 됨 (필수 권한 우선)
    const hasRequiredPermission = requiredChecks.some(result => result.granted);
    const hasOptionalPermission = optionalChecks.some(result => result.granted);

    granted =
      hasRequiredPermission ||
      (requiredChecks.length === 0 && hasOptionalPermission);

    if (!granted) {
      missingPermissions = checks;
    }
  }

  return {
    granted,
    reason: granted ? undefined : `Missing required permissions`,
    missingPermissions: granted ? undefined : missingPermissions,
  };
};

/**
 * 권한 기반 작업 실행 래퍼
 */
export const executeWithPermission = async <T>(
  hasPermissionFn: (
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ) => boolean,
  check: PermissionCheck,
  operation: () => Promise<T>,
  onUnauthorized?: (result: PermissionValidationResult) => void
): Promise<T> => {
  const validation = validatePermission(hasPermissionFn, check);

  if (!validation.granted) {
    if (onUnauthorized) {
      onUnauthorized(validation);
    } else {
      throw new Error(validation.reason || 'Permission denied');
    }
    throw new Error('Operation aborted due to insufficient permissions');
  }

  return await operation();
};

/**
 * 권한 체크 결과를 캐시하는 클래스
 */
export class PermissionCache {
  private cache = new Map<string, { result: boolean; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5분 TTL

  private getCacheKey(
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ): string {
    return `${resourceType}:${resourceId}:${action}`;
  }

  get(
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ): boolean | null {
    const key = this.getCacheKey(resourceType, resourceId, action);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // TTL 체크
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  set(
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction,
    result: boolean
  ): void {
    const key = this.getCacheKey(resourceType, resourceId, action);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  invalidate(resourceType?: ResourceType, resourceId?: string): void {
    if (!resourceType) {
      // 전체 캐시 무효화
      this.cache.clear();
      return;
    }

    // 특정 리소스 타입 또는 리소스 ID와 관련된 캐시만 무효화
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (resourceId) {
        if (key.startsWith(`${resourceType}:${resourceId}:`)) {
          keysToDelete.push(key);
        }
      } else {
        if (key.startsWith(`${resourceType}:`)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}

// 전역 권한 캐시 인스턴스
export const globalPermissionCache = new PermissionCache();

/**
 * 캐시를 사용하는 권한 검증 함수
 */
export const validatePermissionWithCache = (
  hasPermissionFn: (
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ) => boolean,
  check: PermissionCheck,
  useCache: boolean = true
): PermissionValidationResult => {
  if (!useCache) {
    return validatePermission(hasPermissionFn, check);
  }

  // 캐시에서 확인
  const cachedResult = globalPermissionCache.get(
    check.resourceType,
    check.resourceId,
    check.action
  );

  if (cachedResult !== null) {
    return {
      granted: cachedResult,
      reason: cachedResult ? undefined : 'Cached permission denied',
    };
  }

  // 캐시에 없으면 실제 검증 수행
  const result = validatePermission(hasPermissionFn, check);

  // 결과를 캐시에 저장
  globalPermissionCache.set(
    check.resourceType,
    check.resourceId,
    check.action,
    result.granted
  );

  return result;
};

/**
 * 권한 검증 데코레이터 (클래스 메서드용)
 */
export const requirePermission = (
  _resourceType: ResourceType,
  _action: PermissionAction
) => {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      // 실제 구현에서는 현재 사용자의 권한 확인 로직이 필요
      // 여기서는 인터페이스만 제공
      // Permission check would be implemented here in a real application

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};
