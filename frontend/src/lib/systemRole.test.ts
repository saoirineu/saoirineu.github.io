import { describe, expect, it } from 'vitest';

import {
  bootstrapSuperadminEmail,
  getEffectiveSystemRole,
  getEffectiveSystemRoles,
  hasRequiredRole,
  isBootstrapSuperadminEmail,
  normalizeSystemRole,
  normalizeSystemRoles,
  primarySystemRole
} from './systemRole';

describe('systemRole helpers', () => {
  it('normalizes unknown values to user', () => {
    expect(normalizeSystemRole('admin')).toBe('admin');
    expect(normalizeSystemRole('superadmin')).toBe('superadmin');
    expect(normalizeSystemRole('useradmin')).toBe('useradmin');
    expect(normalizeSystemRole('anything-else')).toBe('user');
    expect(normalizeSystemRole(undefined)).toBe('user');
  });

  it('normalizes multi-role values with legacy role fallback', () => {
    expect(normalizeSystemRoles(['custodian', 'useradmin'], 'user')).toEqual(['custodian', 'useradmin']);
    expect(normalizeSystemRoles(['anything-else'], 'admin')).toEqual(['admin']);
    expect(normalizeSystemRoles(undefined, undefined)).toEqual(['user']);
  });

  it('computes primary role from a role set', () => {
    expect(primarySystemRole(['useradmin', 'custodian'])).toBe('custodian');
    expect(primarySystemRole(['useradmin', 'superadmin'])).toBe('superadmin');
    expect(primarySystemRole(['user'])).toBe('user');
  });

  it('detects bootstrap superadmin email', () => {
    expect(isBootstrapSuperadminEmail(bootstrapSuperadminEmail)).toBe(true);
    expect(isBootstrapSuperadminEmail('Renato.Fabbri@gmail.com')).toBe(true);
    expect(isBootstrapSuperadminEmail('other@example.com')).toBe(false);
  });

  it('computes effective roles', () => {
    expect(getEffectiveSystemRole({ email: bootstrapSuperadminEmail, storedRole: 'user' })).toBe('superadmin');
    expect(getEffectiveSystemRole({ email: 'other@example.com', storedRole: 'admin' })).toBe('admin');
    expect(getEffectiveSystemRole({ email: 'other@example.com', storedRole: undefined })).toBe('user');
    expect(getEffectiveSystemRoles({ email: 'other@example.com', storedRoles: ['useradmin', 'custodian'] })).toEqual(['useradmin', 'custodian']);
  });

  it('checks required role access', () => {
    expect(hasRequiredRole('admin', 'admin')).toBe(true);
    expect(hasRequiredRole('user', 'admin')).toBe(false);
    expect(hasRequiredRole('superadmin', 'admin')).toBe(true);
    expect(hasRequiredRole('superadmin', 'superadmin')).toBe(true);
    expect(hasRequiredRole('admin', 'superadmin')).toBe(false);
    expect(hasRequiredRole(['useradmin', 'custodian'], 'useradmin')).toBe(true);
    expect(hasRequiredRole(['useradmin', 'custodian'], 'custodian')).toBe(true);
    expect(hasRequiredRole(['useradmin', 'custodian'], 'admin')).toBe(false);
  });
});
