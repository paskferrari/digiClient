import { describe, it, expect } from 'vitest';
import { RBAC } from '../lib/rbac';

describe('RBAC matrix', () => {
  it('viewer is read-only across core resources', () => {
    expect(RBAC.VIEWER.organizations.read).toBe(true);
    expect(RBAC.VIEWER.organizations.update).toBe(false);
    expect(RBAC.VIEWER.memberships.create).toBe(false);
    expect(RBAC.VIEWER.tasks.delete).toBe(false);
    expect(RBAC.VIEWER.documents.upload).toBe(false);
  });

  it('operator can upload documents but cannot approve/reject', () => {
    expect(RBAC.OPERATOR.documents.upload).toBe(true);
    expect(RBAC.OPERATOR.documents.approve).toBe(false);
    expect(RBAC.OPERATOR.documents.reject).toBe(false);
  });

  it('manager can approve cases and manage companies/tasks', () => {
    expect(RBAC.MANAGER.cases.approve).toBe(true);
    expect(RBAC.MANAGER.cases.assign).toBe(true);
    expect(RBAC.MANAGER.companies.update).toBe(true);
    expect(RBAC.MANAGER.tasks.delete).toBe(true);
  });

  it('admin has full CRUD except audit write/delete', () => {
    expect(RBAC.ADMIN.organizations.delete).toBe(true);
    expect(RBAC.ADMIN.audit.read).toBe(true);
    expect(RBAC.ADMIN.audit.update).toBe(false);
    expect(RBAC.ADMIN.audit.delete).toBe(false);
  });
});