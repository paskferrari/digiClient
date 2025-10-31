import { test, expect } from '@playwright/test';

const token = process.env.SUPABASE_TEST_TOKEN;
const orgId = process.env.TEST_ORG_ID;

// Main flow test guarded by env
test('VAT import → create company → create case → assign → upload doc', async ({ request }) => {
  test.skip(!token || !orgId, 'Missing SUPABASE_TEST_TOKEN/TEST_ORG_ID');

  const headers = {
    'authorization': `Bearer ${token!}`,
    'x-org-id': orgId!,
    'content-type': 'application/json',
  };

  // Fetch current user profile for assignment
  const resMe = await request.get('/api/me', { headers });
  expect(resMe.ok()).toBeTruthy();
  const me = await resMe.json();
  const assignee = me?.profile?.id;
  expect(assignee).toBeTruthy();

  // 1) VAT bulk import
  const vats = [`IT${Date.now() % 100000000}`];
  const resImport = await request.post('/api/import/vat-bulk', { headers, data: { vats, enrich: true } });
  expect(resImport.ok()).toBeTruthy();
  const imp = await resImport.json();
  expect(imp.created).toBeGreaterThanOrEqual(1);
  const companyId = imp.items[0]?.id;
  expect(companyId).toBeTruthy();

  // 2) Create case
  const resCase = await request.post('/api/cases', { headers, data: { company_id: companyId, priority: 'HIGH' } });
  expect(resCase.ok()).toBeTruthy();
  const kase = await resCase.json();
  expect(kase.status).toBe('NEW');
  const caseId = kase.id;

  // 3) Assign case (to current user)
  const resAssign = await request.patch(`/api/cases/${caseId}/assign`, { headers, data: { assigned_to: assignee } });
  expect(resAssign.ok()).toBeTruthy();

  // 4) Upload doc (signed URL + metadata)
  const resDoc = await request.post(`/api/cases/${caseId}/documents`, { headers, data: { name: 'ciao.pdf', contentType: 'application/pdf', kind: 'ID', size: 1024 } });
  expect(resDoc.ok()).toBeTruthy();
  const doc = await resDoc.json();
  expect(doc.uploadUrl).toBeTruthy();
  const documentId = doc.document?.id;
  expect(documentId).toBeTruthy();

  // 5) If MANAGER+, move to IN_PROGRESS and verify block on SUBMITTED when docs missing
  const role = me?.currentOrg?.role || me?.memberships?.find((m: any) => m.org_id === orgId)?.role;
  const managerPlus = role === 'MANAGER' || role === 'ADMIN';
  if (managerPlus) {
    const steps: string[] = ['SCREENING','APPROVED','ASSIGNED','DOCS_REQUESTED','IN_PROGRESS'];
    for (const to of steps) {
      const resStep = await request.patch(`/api/cases/${caseId}/status`, { headers, data: { to } });
      expect(resStep.ok()).toBeTruthy();
    }
    // Attempt SUBMITTED → expect 400 since doc is still PENDING
    const resSubmitBlocked = await request.patch(`/api/cases/${caseId}/status`, { headers, data: { to: 'SUBMITTED' } });
    expect(resSubmitBlocked.status()).toBe(400);
  }

  // 6) Scan document: approve
  const resScanOk = await request.post(`/api/cases/${caseId}/documents/${documentId}/scan`, { headers, data: { force: 'APPROVED' } });
  expect(resScanOk.ok()).toBeTruthy();
  const scanOk = await resScanOk.json();
  expect(scanOk.status).toBe('APPROVED');

  // 7) Scan another doc and reject (KO)
  const resDoc2 = await request.post(`/api/cases/${caseId}/documents`, { headers, data: { name: 'altro.jpg', contentType: 'image/jpeg', kind: 'ALTRO', size: 2048 } });
  expect(resDoc2.ok()).toBeTruthy();
  const doc2 = await resDoc2.json();
  const docId2 = doc2.document?.id;
  expect(docId2).toBeTruthy();
  const resScanKo = await request.post(`/api/cases/${caseId}/documents/${docId2}/scan`, { headers, data: { force: 'REJECTED' } });
  expect(resScanKo.ok()).toBeTruthy();
  const scanKo = await resScanKo.json();
  expect(scanKo.status).toBe('REJECTED');

  // 8) If MANAGER+, SUBMITTED should now be allowed
  if (managerPlus) {
    const resSubmitOk = await request.patch(`/api/cases/${caseId}/status`, { headers, data: { to: 'SUBMITTED' } });
    expect(resSubmitOk.ok()).toBeTruthy();
    const final = await resSubmitOk.json();
    expect(final.status).toBe('SUBMITTED');
  }
});

// Basic 401 check without token
test('API requires auth', async ({ request }) => {
  const res = await request.get('/api/me', { headers: { 'x-org-id': orgId || '00000000-0000-0000-0000-000000000000' } });
  const status = res.status();
  expect(status === 401 || status === 404).toBeTruthy();
});