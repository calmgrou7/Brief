import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'test' }) }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error('REDIRECT:' + url); } }));
vi.mock('./session', () => ({ verify: async () => true, COOKIE: 'test' }));
import { demoDataset } from './demo';
import { DATA_SOURCES, type Dataset } from './schema';
import { revalidatePath } from 'next/cache';
import { logContact, retryContactSummary, saveCompany } from '../app/actions';
const store = (globalThis as unknown as { __chaeum: { data: Dataset; at: number } }).__chaeum;
const form = (values: Record<string, string>) => {
  const f = new FormData(); Object.entries(values).forEach(([k, v]) => f.set(k, v)); return f;
};
beforeEach(() => {
  vi.stubEnv('NOTION_TOKEN', 'mock-token'); vi.clearAllMocks();
  store.data = demoDataset(); store.at = Date.now();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('keeps a committed contact, invalidates cache, and retries only its summary after PATCH failure', async () => {
  const companyId = store.data.companies[0].id;
  store.data.companies[0].lastContactDate = '2026-10-01';
  let creates = 0; let patches = 0;
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (url.endsWith('/pages')) {
      creates++;
      expect(body.properties['후속조치'].rich_text[0].text.content).toBe('send documents');
      expect(body.properties['후속기한'].date.start).toBe('2026-11-03');
      return Response.json({ id: 'saved-contact' });
    }
    if (init.method === 'PATCH') {
      patches++;
      // Both the first summary update and its first retry fail; neither may recreate the contact.
      if (patches <= 2) return Response.json({ message: 'PATCH failed' }, { status: 500 });
      expect(body.properties['최근 접촉일'].date.start).toBe('2026-11-01T12:00:00+09:00');
      return Response.json({ id: companyId });
    }
    const results = url.includes(DATA_SOURCES.companies) ? [{ id: companyId, properties: {} }]
      : url.includes(DATA_SOURCES.contacts) ? [{ id: 'newer-contact', properties: {
        기업: { relation: [{ id: companyId }] }, 일시: { date: { start: '2026-11-01T12:00:00+09:00' } }, 방법: { select: { name: '방문' } },
      } }] : [];
    return Response.json({ results, has_more: false });
  });
  vi.stubGlobal('fetch', fetcher);
  const result = await logContact({}, form({ companyId, method: '전화', date: '2026-10-31T12:00', content: 'test', followUp: 'send documents', followUpDue: '2026-11-03' }));
  expect(result.ok).toBeTruthy(); expect(result.error).toBeUndefined(); expect(result.warning).toContain('후속조치는 저장');
  expect(store.at).toBe(0); expect(revalidatePath).toHaveBeenCalled();
  expect((await retryContactSummary({}, form({ companyId }))).error).toContain('PATCH failed');
  expect((await retryContactSummary({}, form({ companyId }))).ok).toBeTruthy();
  expect(creates).toBe(1); expect(patches).toBe(3);
});
it('reports creation failure without claiming saved contact or follow-up fields', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'create failed' }, { status: 500 })));
  const result = await logContact({}, form({ companyId: store.data.companies[0].id, method: '전화', date: '2026-10-31', content: 'test' }));
  expect(result.error).toContain('create failed'); expect(result.ok).toBeUndefined(); expect(result.warning).toBeUndefined();
  expect(revalidatePath).not.toHaveBeenCalled();
});
it.each(['1234567890', '123 45 67890', '123-45-67890'])('rejects existing business number %s without writing', async (bizNo) => {
  store.data.companies[0].bizNo = bizNo;
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await saveCompany({}, form({ name: 'duplicate', bizNo: '123-45-67890' }))).error).toContain('이미 등록');
  expect(fetcher).not.toHaveBeenCalled();
});
it('allows editing the same company with its own normalized number', async () => {
  const c = store.data.companies[0]; c.bizNo = '1234567890';
  const fetcher = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ id: c.id })); vi.stubGlobal('fetch', fetcher);
  await expect(saveCompany({}, form({ id: c.id, name: c.name, bizNo: '123-45-67890' }))).rejects.toThrow('REDIRECT:');
  expect(fetcher).toHaveBeenCalledOnce(); expect(fetcher.mock.calls[0][1].method).toBe('PATCH');
});
it('reports full success without warning when contact and summary both save', async () => {
  const companyId = store.data.companies[0].id;
  store.data.companies[0].lastContactDate = '2026-10-01';
  const fetcher = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ id: 'saved' }));
  vi.stubGlobal('fetch', fetcher);
  const result = await logContact({}, form({ companyId, method: '전화', date: '2026-10-31T12:00', content: 'test' }));
  expect(result.ok).toBeTruthy(); expect(result.warning).toBeUndefined();
  expect(fetcher.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'PATCH']);
  expect(store.at).toBe(0);
});
it('does not overwrite a newer company summary when adding an older contact', async () => {
  const companyId = store.data.companies[0].id;
  store.data.companies[0].lastContactDate = '2026-11-01T12:00:00+09:00';
  const fetcher = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ id: 'saved' }));
  vi.stubGlobal('fetch', fetcher);
  expect((await logContact({}, form({ companyId, method: '전화', date: '2026-10-31T12:00', content: 'old contact' }))).warning).toBeUndefined();
  expect(fetcher).toHaveBeenCalledOnce(); expect(fetcher.mock.calls[0][1].method).toBe('POST');
});
