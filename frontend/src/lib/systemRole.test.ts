import { describe, expect, it } from 'vitest';

import {
  bootstrapSuperadminEmail,
  getEffectiveSystemRole,
  hasRequiredRole,
  isBootstrapSuperadminEmail,
  normalizeSystemRole
} from './systemRole';

describe('systemRole helpers', () => {
  it('normalizes unknown values to user', () => {
    expect(normalizeSystemRole('admin')).toBe('admin');
    expect(normalizeSystemRole('superadmin')).toBe('superadmin');
    expect(normalizeSystemRole('anything-else')).toBe('user');
    expect(normalizeSystemRole(undefined)).toBe('user');
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
  });

  it('checks required role access', () => {
    expect(hasRequiredRole('admin', 'admin')).toBe(true);
    expect(hasRequiredRole('user', 'admin')).toBe(false);
    expect(hasRequiredRole('superadmin', 'admin')).toBe(true);
    expect(hasRequiredRole('superadmin', 'superadmin')).toBe(true);
    expect(hasRequiredRole('admin', 'superadmin')).toBe(false);
  });
});
