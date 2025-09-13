// Central role -> scopes mapping.
// System roles aggregate fine-grained permission codes (already stored as Permission entities) AND
// provide a legacy fallback for users without Role entities yet.
// NOTE: Keep keys lowercase. Scopes should be stable, kebab or dot separated.
export const ROLE_SCOPE_MAPPING: Record<string, string[]> = {
  admin: [
    'users:read',
    'users:write',
    'roles:read',
    'roles:write',
    'permissions:read',
    'permissions:write',
  ],
  user: ['users:read'],
};

export function scopesForLegacyRole(role?: string | null): string[] {
  if (!role) return [];
  return ROLE_SCOPE_MAPPING[role] ? [...ROLE_SCOPE_MAPPING[role]] : [];
}
