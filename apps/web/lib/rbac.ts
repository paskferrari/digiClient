export type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
export type Resource =
  | 'organizations'
  | 'memberships'
  | 'companies'
  | 'cases'
  | 'documents'
  | 'tasks'
  | 'settings'
  | 'audit';

export type Crud = { read: boolean; create: boolean; update: boolean; delete: boolean };
export type CasePrivileges = Crud & { approve: boolean; assign: boolean };
export type DocumentPrivileges = Crud & { approve: boolean; reject: boolean; upload: boolean };

export type ResourcePrivileges = {
  organizations: Crud;
  memberships: Crud;
  companies: Crud;
  cases: CasePrivileges;
  documents: DocumentPrivileges;
  tasks: Crud;
  settings: Crud;
  audit: Crud;
};

export const RBAC: Record<Role, ResourcePrivileges> = {
  ADMIN: {
    organizations: { read: true, create: true, update: true, delete: true },
    memberships: { read: true, create: true, update: true, delete: true },
    companies: { read: true, create: true, update: true, delete: true },
    cases: { read: true, create: true, update: true, delete: true, approve: true, assign: true },
    documents: { read: true, create: true, update: true, delete: true, approve: true, reject: true, upload: true },
    tasks: { read: true, create: true, update: true, delete: true },
    settings: { read: true, create: true, update: true, delete: true },
    audit: { read: true, create: false, update: false, delete: false },
  },
  MANAGER: {
    organizations: { read: true, create: false, update: false, delete: false },
    memberships: { read: true, create: false, update: false, delete: false },
    companies: { read: true, create: true, update: true, delete: true },
    cases: { read: true, create: true, update: true, delete: true, approve: true, assign: true },
    documents: { read: true, create: true, update: true, delete: true, approve: true, reject: true, upload: true },
    tasks: { read: true, create: true, update: true, delete: true },
    settings: { read: true, create: false, update: false, delete: false },
    audit: { read: true, create: false, update: false, delete: false },
  },
  OPERATOR: {
    organizations: { read: true, create: false, update: false, delete: false },
    memberships: { read: true, create: false, update: false, delete: false },
    companies: { read: true, create: true, update: true, delete: true },
    cases: { read: true, create: true, update: true, delete: true, approve: false, assign: false },
    documents: { read: true, create: true, update: true, delete: true, approve: false, reject: false, upload: true },
    tasks: { read: true, create: true, update: true, delete: true },
    settings: { read: true, create: false, update: false, delete: false },
    audit: { read: false, create: false, update: false, delete: false },
  },
  VIEWER: {
    organizations: { read: true, create: false, update: false, delete: false },
    memberships: { read: true, create: false, update: false, delete: false },
    companies: { read: true, create: false, update: false, delete: false },
    cases: { read: true, create: false, update: false, delete: false, approve: false, assign: false },
    documents: { read: true, create: false, update: false, delete: false, approve: false, reject: false, upload: false },
    tasks: { read: true, create: false, update: false, delete: false },
    settings: { read: true, create: false, update: false, delete: false },
    audit: { read: false, create: false, update: false, delete: false },
  },
};

export type CaseStatus =
  | 'NEW'
  | 'SCREENING'
  | 'REJECTED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'DOCS_REQUESTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'FUNDED'
  | 'CLOSED_LOST';

const ADJ: Record<CaseStatus, CaseStatus[]> = {
  NEW: ['SCREENING'],
  SCREENING: ['APPROVED', 'REJECTED'],
  APPROVED: ['ASSIGNED'],
  ASSIGNED: ['DOCS_REQUESTED', 'IN_PROGRESS'],
  DOCS_REQUESTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['DOCS_REQUESTED', 'SUBMITTED'],
  SUBMITTED: ['FUNDED', 'CLOSED_LOST'],
  REJECTED: [],
  FUNDED: [],
  CLOSED_LOST: [],
};

function isManagerPlus(role: Role) {
  return role === 'MANAGER' || role === 'ADMIN';
}

function requiresManagerPlus(from: CaseStatus, to: CaseStatus) {
  return (
    (from === 'NEW' && to === 'SCREENING') ||
    (from === 'SCREENING' && (to === 'APPROVED' || to === 'REJECTED')) ||
    (from === 'APPROVED' && to === 'ASSIGNED') ||
    (from === 'IN_PROGRESS' && to === 'SUBMITTED') ||
    (from === 'SUBMITTED' && (to === 'FUNDED' || to === 'CLOSED_LOST'))
  );
}

function allowsOperator(from: CaseStatus, to: CaseStatus) {
  return (
    (from === 'ASSIGNED' && (to === 'DOCS_REQUESTED' || to === 'IN_PROGRESS')) ||
    (from === 'DOCS_REQUESTED' && to === 'IN_PROGRESS') ||
    (from === 'IN_PROGRESS' && to === 'DOCS_REQUESTED')
  );
}

export function canTransition(role: Role, from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return false;
  const nexts = ADJ[from] ?? [];
  if (!nexts.includes(to)) return false;
  if (role === 'ADMIN') return true;
  if (role === 'VIEWER') return false;
  if (requiresManagerPlus(from, to)) return isManagerPlus(role);
  return allowsOperator(from, to) && (role === 'OPERATOR' || isManagerPlus(role));
}

export function assertTransition(role: Role, from: CaseStatus, to: CaseStatus): void {
  if (!canTransition(role, from, to)) {
    throw new Error(`Transition not allowed: role=${role} ${from} -> ${to}`);
  }
}