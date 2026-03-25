export type SystemRole = 'user' | 'admin' | 'superadmin';

export const bootstrapSuperadminEmail = 'renato.fabbri@gmail.com';

export function normalizeSystemRole(value: unknown): SystemRole {
  if (value === 'superadmin') return 'superadmin';
  if (value === 'admin') return 'admin';
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

export function hasRequiredRole(role: SystemRole, requiredRole: Extract<SystemRole, 'admin' | 'superadmin'>) {
  if (role === 'superadmin') {
    return true;
  }

  return requiredRole === 'admin' && role === 'admin';
}
