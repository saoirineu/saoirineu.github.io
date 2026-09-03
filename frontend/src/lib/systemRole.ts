export type SystemRole = 'user' | 'useradmin' | 'eventadmin' | 'admin' | 'superadmin' | 'custodian';
export type PrivilegedSystemRole = Exclude<SystemRole, 'user'>;
export type SystemRoleSet = SystemRole[];

export const privilegedSystemRoleOptions: PrivilegedSystemRole[] = ['useradmin', 'custodian', 'eventadmin', 'admin', 'superadmin'];

export function normalizeSystemRole(value: unknown): SystemRole {
  if (value === 'superadmin') return 'superadmin';
  if (value === 'admin') return 'admin';
  if (value === 'custodian') return 'custodian';
  if (value === 'eventadmin') return 'eventadmin';
  if (value === 'useradmin') return 'useradmin';
  return 'user';
}

export function normalizeSystemRoles(value: unknown, legacyRole?: unknown): SystemRoleSet {
  const roles = new Set<SystemRole>();
  const values = Array.isArray(value) ? value : [];

  values.forEach(item => {
    const role = normalizeSystemRole(item);
    if (role !== 'user') roles.add(role);
  });

  const legacy = normalizeSystemRole(legacyRole);
  if (legacy !== 'user') roles.add(legacy);

  return roles.size ? Array.from(roles) : ['user'];
}

export function primarySystemRole(roles: readonly SystemRole[]): SystemRole {
  if (roles.includes('superadmin')) return 'superadmin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('eventadmin')) return 'eventadmin';
  if (roles.includes('custodian')) return 'custodian';
  if (roles.includes('useradmin')) return 'useradmin';
  return 'user';
}

export function getEffectiveSystemRole(args: { storedRole?: unknown }): SystemRole {
  return primarySystemRole(getEffectiveSystemRoles({ ...args, storedRoles: undefined }));
}

// Roles come from the user document only. There is deliberately no email-based
// bootstrap: an address is not a credential, and the rules no longer honour one.
export function getEffectiveSystemRoles(args: { storedRole?: unknown; storedRoles?: unknown }): SystemRoleSet {
  return normalizeSystemRoles(args.storedRoles, args.storedRole);
}

export function hasRequiredRole(
  role: SystemRole | readonly SystemRole[],
  requiredRole: PrivilegedSystemRole
) {
  const roles = Array.isArray(role) ? role : [role];

  if (roles.includes('superadmin')) {
    return true;
  }

  if (requiredRole === 'superadmin') return false;
  if (requiredRole === 'admin') return roles.includes('admin');
  if (requiredRole === 'eventadmin') return roles.includes('eventadmin') || roles.includes('admin');
  if (requiredRole === 'custodian') return roles.includes('custodian') || roles.includes('admin');
  if (requiredRole === 'useradmin') return roles.includes('useradmin');
  return false;
}
