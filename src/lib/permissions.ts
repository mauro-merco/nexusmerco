import type { User, ModuleId } from './types';

/**
 * Check if user has access to a specific module.
 * Returns true only if the module is in user.visible_modules.
 */
export function hasModuleAccess(user: User | null, moduleId: ModuleId): boolean {
  if (!user) return false;
  return user.visible_modules?.includes(moduleId) ?? false;
}

/**
 * Check if user can access a specific client.
 * - If user.allowed_client_ids is null or undefined: admin/operador can access all, client users can only access their own
 * - If user.allowed_client_ids is an empty array: no access
 * - Otherwise: client must be in the allowed list
 */
export function hasClientAccess(user: User | null, clientId: string): boolean {
  if (!user) return false;

  // If allowed_client_ids is explicitly set
  if (user.allowed_client_ids !== null && user.allowed_client_ids !== undefined) {
    return user.allowed_client_ids.includes(clientId);
  }

  // Legacy behavior (no allowed_client_ids set)
  // Admin/operador can see all clients
  if (user.role === 'admin' || user.role === 'operador') {
    return true;
  }

  // Client users can only see their own client
  return user.client_id === clientId;
}

/**
 * Get list of client IDs this user can access.
 * Returns null if user can access all clients (admin/operador with no restrictions).
 */
export function getAllowedClientIds(user: User | null): string[] | null {
  if (!user) return [];

  // If allowed_client_ids is explicitly set, use it
  if (user.allowed_client_ids !== null && user.allowed_client_ids !== undefined) {
    return user.allowed_client_ids;
  }

  // Legacy behavior (no allowed_client_ids set)
  // Admin/operador can see all clients
  if (user.role === 'admin' || user.role === 'operador') {
    return null; // null = all clients
  }

  // Client users can only see their own client
  if (user.client_id) {
    return [user.client_id];
  }

  return [];
}
