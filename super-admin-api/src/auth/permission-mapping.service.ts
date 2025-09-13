import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { scopesForLegacyRole } from './role-scope-mapping';

/**
 * Centralized strategy for mapping user roles/permissions to scopes.
 * - Primary: aggregate explicit role->permissions relations.
 * - Fallback: legacy single role -> scopes mapping (role-scope-mapping.ts)
 */
@Injectable()
export class PermissionMappingService {
  deriveScopes(user: User): string[] {
    const scopes = new Set<string>();
    if (user.roles) {
      for (const r of user.roles as Array<{
        permissions?: Array<{ code: string }>;
      }>) {
        if (r.permissions) {
          for (const p of r.permissions) scopes.add(p.code);
        }
      }
    }
    if (scopes.size === 0 && user.role) {
      for (const legacy of scopesForLegacyRole(user.role)) scopes.add(legacy);
    }
    return Array.from(scopes).sort();
  }
}
