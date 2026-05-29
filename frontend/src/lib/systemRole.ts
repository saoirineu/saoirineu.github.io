export type SystemRole = 'user' | 'admin' | 'superadmin' | 'custodian';

export const bootstrapSuperadminEmail = 'renato.fabbri@gmail.com';

export function normalizeSystemRole(value: unknown): SystemRole {
  if (value === 'superadmin') return 'superadmin';
  if (value === 'admin') return 'admin';
  if (value === 'custodian') return 'custodian';
  return 'user';
}

export function isBootstrapSuperadminEmail(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase() === bootstrapSuperadminEmail;
}

export function getEffectiveSystemRole(args: { email?: string | null; storedRole?: unknown }): SystemRole {
  if (isBootstrapSuperadminEmail(args.email)) {
    return 'superadmin';
  }

  return normalizeSystemRole(args.storedRole);
}

export function hasRequiredRole(role: SystemRole, requiredRole: Extract<SystemRole, 'admin' | 'superadmin' | 'custodian'>) {
  if (role === 'superadmin') {
    return true;
  }

  if (requiredRole === 'superadmin') return false;
  if (requiredRole === 'admin') return role === 'admin';
  if (requiredRole === 'custodian') return role === 'custodian' || role === 'admin';
  return false;
}
