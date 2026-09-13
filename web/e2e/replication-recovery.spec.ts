import { test, expect } from '@playwright/test';
import type { ReplicationPlan } from '../src/lib/execution-plan';

test('ambiguous launch retry is idempotent, deliberate rerun is new, and rotated pairing preserves the mounted task', async ({ page, request, baseURL }) => {
  // Read the selected source identity only. All chat/planning/action mutations are fixtures.
  const capture = await (await request.get('/api/local/capture')).json();
  expect(capture.status).toBe('done');
  const goal = 'Create one local fixture page and report the actual checks.';
  const plan: ReplicationPlan = { version: 1, analysisId: capture.id, sourceUrl: capture.sourceUrl, title: 'Recovery fixture task', goal, mode: 'build', summary: 'A controlled task lifecycle fixture.', prerequisites: [], steps: [{ id: 'step1', instruction: 'Create the fixture page', evidenceIds: ['frame1'], kind: 'observed', verification: 'Read its visible heading' }], evidence: [{ id: 'frame1', kind: 'frame', text: 'Controlled fixture evidence', timestampSec: 1 }], warnings: [], successCriteria: ['The fixture heading is visible'] };
  const origin = new URL(baseURL!).origin;
  const rotatedToken = 'fixture-rotated-companion-token-not-a-real-credential';
  let firstToken = '';
  let rotate = false;
  let replacements = 0;
  let planningCalls = 0;
  const keys: string[] = [];
  const healthTokens: string[] = [];
  const readTokens: string[] = [];
  const errors: string[] = [];
  const unexpected: string[] = [];
  const runs = new Map<string, Record<string, unknown>>();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(); const url = new URL(req.url());
    if (url.port === '43187') {
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const authorization = req.headers().authorization ?? '';
      if (!firstToken) firstToken = authorization.slice(7);
      if (url.pathname === '/health') {
        healthTokens.push(authorization.slice(7));
        return route.fulfill({ headers, json: { status: 'ready', platform: 'darwin', version: 1, execution: 'streaming-terminal', capabilities: { terminal: true, harnesses: { codex: true, claude: false }, browser: { configured: false } } } });
      }
      if (url.pathname === '/runs' && req.method() === 'GET') return route.fulfill({ headers, json: { runs: [...runs.values()] } });
      if (url.pathname === '/runs' && req.method() === 'POST') {
        const key = req.headers()['idempotency-key'];
        expect(key).toMatch(/^[a-f0-9-]{36}$/); keys.push(key);
        expect(req.postDataJSON().harness).toBe('codex');
        if (!runs.has(key)) runs.set(key, { id: crypto.randomUUID(), title: plan.title, goal, executor: 'terminal', terminalMode: 'exec', harness: 'codex', analysisId: capture.id, sourceUrl: capture.sourceUrl, workspace: '/tmp/contextdrop-lifecycle-fixture/project', createdAt: new Date().toISOString(), status: 'finished_unverified', canStop: false, canResume: false });
        // The first side effect happened, but its HTTP response was lost.
        if (keys.length === 1) return route.abort('failed');
        return route.fulfill({ headers, status: keys.length === 2 ? 200 : 201, json: runs.get(key) });
      }
      const run = [...runs.values()].find(value => url.pathname.startsWith(`/runs/${value.id}`));
      if (run && req.method() === 'GET') {
        readTokens.push(authorization.slice(7));
        return route.fulfill({ headers, json: url.pathname.endsWith('/output') ? { id: run.id, mode: 'streaming', log: { text: 'Fixture task output', truncated: false, updatedAt: null }, result: { text: 'Fixture report; review required.', path: null, source: 'last_message', verification: 'unverified', truncated: false } } : run });
      }
      unexpected.push(`${req.method()} ${url.pathname}`); return route.fulfill({ status: 409, headers, json: { error: 'Unexpected fixture operation' } });
    }
    if (url.pathname === '/api/local/chat') return route.fulfill({ json: { version: 1, analysisId: capture.id, messages: [{ id: 'fixture-answer', role: 'assistant', text: 'A controlled proposed task.', createdAt: new Date().toISOString(), reply: { answer: 'A controlled proposed task.', suggestions: [], evidence: [], allowedUrls: [], actions: [{ id: 'fixture-action', kind: 'prepare_task', label: 'Prepare fixture task', detail: 'Inspect the lifecycle fixture.', url: null, goal, mode: 'build', executor: 'terminal', harness: 'codex' }] } }] } });
    if (url.pathname === '/api/local/replicate' && req.method() === 'POST') { planningCalls++; return route.fulfill({ json: { plan: { ...plan, goal: req.postDataJSON().goal } } }); }
    if (url.pathname === '/api/local/library') {
      if (req.method() === 'POST') return route.fulfill({ json: { selected: 'fixture-refresh-source' } });
      return route.fulfill({ json: { items: [{ analysisId: 'fixture-refresh-source', title: 'Refresh fixture source', platform: 'article', sourceUrl: 'https://example.com/fixture' }] } });
    }
    if (url.pathname === '/replicate/local' && req.headers().rsc === '1' && rotate) {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes(firstToken)) replacements++;
      return route.fulfill({ response, body: body.replaceAll(firstToken, rotatedToken) });
    }
    if (url.pathname.startsWith('/api/local/') && req.method() !== 'GET') { unexpected.push(`${req.method()} ${url.pathname}`); return route.fulfill({ status: 409, json: { error: 'No live mutation in this fixture' } }); }
    return route.continue();
  });
  await page.goto('/replicate/local');
  await page.getByRole('button', { name: /Prepare fixture task/ }).click();
  const panel = page.getByRole('region', { name: 'Review your task' });
  const launch = panel.getByRole('button', { name: /Approve.*run on my Mac/i });
  await expect(launch).toBeEnabled();
  await launch.click();
  await expect(panel.getByRole('alert')).toContainText(/Failed to fetch|NetworkError|Load failed/i);
  await launch.click();
  const workroom = page.getByRole('dialog', { name: plan.title, exact: true });
  await expect(workroom).toBeVisible();
  expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]); expect(runs.size).toBe(1);
  await workroom.getByRole('button', { name: `Close ${plan.title.toLowerCase()}` }).click();
  await expect(launch).toBeEnabled(); await launch.click();
  await expect(workroom).toBeVisible();
  expect(keys).toHaveLength(3); expect(keys[2]).not.toBe(keys[1]); expect(runs.size).toBe(2);
  await workroom.getByRole('button', { name: `Close ${plan.title.toLowerCase()}` }).click();
  await panel.getByText('Adjust the request', { exact: true }).click();
  const editedGoal = 'This unsent request survives token rotation without replacing the task.';
  await panel.getByRole('textbox', { name: 'Your task outcome' }).fill(editedGoal);
  rotate = true;
  // A fixture library selection requests router.refresh without mutating the actual source.
  await page.getByRole('navigation', { name: 'Recent sources' }).getByRole('button', { name: /Refresh fixture source/ }).click();
  await expect.poll(() => replacements).toBeGreaterThan(0);
  await expect.poll(() => healthTokens.includes(rotatedToken)).toBe(true);
  await expect(panel.getByRole('textbox', { name: 'Your task outcome' })).toHaveValue(editedGoal);
  expect(planningCalls).toBe(1);
  await panel.getByRole('button', { name: 'Watch task', exact: true }).click();
  await expect(workroom).toBeVisible();
  await expect.poll(() => readTokens.includes(rotatedToken)).toBe(true);
  expect(keys).toHaveLength(3); expect(errors).toEqual([]); expect(unexpected).toEqual([]);
});
