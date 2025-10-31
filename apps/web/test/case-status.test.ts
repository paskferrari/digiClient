import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition, type Role, type CaseStatus } from '../lib/rbac';

describe('case status transitions by role', () => {
  const T = (role: Role, from: CaseStatus, to: CaseStatus) => canTransition(role, from, to);

  it('viewer is read-only', () => {
    expect(T('VIEWER', 'NEW', 'SCREENING')).toBe(false);
    expect(() => assertTransition('VIEWER', 'DOCS_REQUESTED', 'IN_PROGRESS')).toThrow();
  });

  it('operator can toggle docs workflow and start from ASSIGNED', () => {
    expect(T('OPERATOR', 'ASSIGNED', 'DOCS_REQUESTED')).toBe(true);
    expect(T('OPERATOR', 'ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(T('OPERATOR', 'DOCS_REQUESTED', 'IN_PROGRESS')).toBe(true);
    expect(T('OPERATOR', 'IN_PROGRESS', 'DOCS_REQUESTED')).toBe(true);
  });

  it('operator cannot approve, assign, submit or finalize', () => {
    expect(T('OPERATOR', 'SCREENING', 'APPROVED')).toBe(false);
    expect(T('OPERATOR', 'SCREENING', 'REJECTED')).toBe(false);
    expect(T('OPERATOR', 'APPROVED', 'ASSIGNED')).toBe(false);
    expect(T('OPERATOR', 'IN_PROGRESS', 'SUBMITTED')).toBe(false);
    expect(T('OPERATOR', 'SUBMITTED', 'FUNDED')).toBe(false);
    expect(T('OPERATOR', 'SUBMITTED', 'CLOSED_LOST')).toBe(false);
  });

  it('manager can approve, assign, submit and finalize', () => {
    expect(T('MANAGER', 'NEW', 'SCREENING')).toBe(true);
    expect(T('MANAGER', 'SCREENING', 'APPROVED')).toBe(true);
    expect(T('MANAGER', 'APPROVED', 'ASSIGNED')).toBe(true);
    expect(T('MANAGER', 'DOCS_REQUESTED', 'IN_PROGRESS')).toBe(true);
    expect(T('MANAGER', 'IN_PROGRESS', 'SUBMITTED')).toBe(true);
    expect(T('MANAGER', 'SUBMITTED', 'FUNDED')).toBe(true);
    expect(T('MANAGER', 'SUBMITTED', 'CLOSED_LOST')).toBe(true);
  });

  it('admin can do all allowed adjacency transitions', () => {
    expect(T('ADMIN', 'NEW', 'SCREENING')).toBe(true);
    expect(T('ADMIN', 'SCREENING', 'REJECTED')).toBe(true);
    expect(T('ADMIN', 'SCREENING', 'APPROVED')).toBe(true);
    expect(T('ADMIN', 'APPROVED', 'ASSIGNED')).toBe(true);
    expect(T('ADMIN', 'ASSIGNED', 'DOCS_REQUESTED')).toBe(true);
    expect(T('ADMIN', 'ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(T('ADMIN', 'DOCS_REQUESTED', 'IN_PROGRESS')).toBe(true);
    expect(T('ADMIN', 'IN_PROGRESS', 'DOCS_REQUESTED')).toBe(true);
    expect(T('ADMIN', 'IN_PROGRESS', 'SUBMITTED')).toBe(true);
    expect(T('ADMIN', 'SUBMITTED', 'FUNDED')).toBe(true);
    expect(T('ADMIN', 'SUBMITTED', 'CLOSED_LOST')).toBe(true);
  });

  it('invalid adjacency is not allowed for any role', () => {
    expect(T('ADMIN', 'NEW', 'APPROVED')).toBe(false); // skip SCREENING
    expect(T('MANAGER', 'DOCS_REQUESTED', 'SUBMITTED')).toBe(false); // must pass via IN_PROGRESS
  });
});