import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const config = parse(fs.readFileSync(path.resolve('.github/workflows/e2e-trigger.yml'), 'utf8')) as {
  jobs: Record<string, { steps: { with: { script: string } }[] }>;
};
const script = config.jobs['trigger-e2e'].steps[0].with.script;

async function run(overrides: Record<string, string> = {}, observedSha = 'b'.repeat(40), apiSha = 'a'.repeat(40)) {
  const dispatches: { event_type: string; client_payload: Record<string, string> }[] = [];
  const errors: string[] = [];
  const requests: string[] = [];
  const context = {
    repo: { owner: 'Prezentytu', repo: 'fiziyo-admin-portal' },
    payload: { deployment: { sha: 'b'.repeat(40), ref: 'dev' }, deployment_status: { state: 'success', environment: 'Development', target_url: 'https://devportal.fiziyo.pl', ...overrides } },
  };
  const prod = context.payload.deployment_status.environment === 'Production';
  await vm.runInNewContext(`(async () => {${script}})()`, {
    context, process: { env: {} }, AbortSignal,
    core: { notice: () => undefined, setFailed: (message: string) => errors.push(message) },
    fetch: async (url: string, options: RequestInit) => {
      requests.push(url);
      expect(options.redirect).toBe('error');
      expect(options.headers).toBeUndefined();
      expect(options.cache).toBe('no-store');
      return { ok: true, headers: new Headers({ 'x-fiziyo-release-schema': '1', 'x-fiziyo-admin-sha': observedSha, 'x-fiziyo-deployment-id': 'dpl_abcdefgh12345678', 'x-fiziyo-api-origin': prod ? 'https://fiziyo-prod.azurewebsites.net' : 'https://fizjo-app-api.azurewebsites.net' }), json: async () => ({ version: apiSha }) };
    },
    github: { rest: { repos: { createDispatchEvent: async (value: typeof dispatches[number]) => dispatches.push(value) } } },
  });
  return { dispatches, errors, requests };
}

describe('deployment dispatch identity', () => {
  it('dispatches DEV with observed API and admin coordinates', async () => {
    expect(script).not.toContain('${{');
    const result = await run();
    expect(result.errors).toEqual([]);
    expect(result.dispatches).toEqual([{ owner: 'Prezentytu', repo: 'fiziyo-tests', event_type: 'e2e-dev-run', client_payload: { base_url: 'https://devportal.fiziyo.pl', project: 'all', sha: 'b'.repeat(40), api_sha: 'a'.repeat(40), admin_owner: 'Prezentytu', admin_repo: 'fiziyo-admin-portal' } }]);
  });
  it('uses only prod-safe on production', async () => {
    const result = await run({ environment: 'Production', target_url: 'https://deployment.vercel.app' });
    expect(result.errors).toEqual([]);
    expect(result.dispatches[0].client_payload.project).toBe('prod-safe');
    expect(result.dispatches[0].client_payload.api_sha).toBeUndefined();
    expect(result.requests).toEqual(['https://portal.fiziyo.pl/sign-in']);
  });
  it('does not redirect a generic Preview to shared DEV even when ref is dev', async () => {
    const result = await run({ environment: 'Preview', target_url: 'https://preview.vercel.app' });
    expect(result.dispatches).toEqual([]);
    expect(result.requests).toEqual([]);
  });
  it.each([
    ['d'.repeat(40), 'a'.repeat(40)], ['', 'a'.repeat(40)], ['b'.repeat(40), 'main'],
  ])('fails closed on missing or mismatched live identities', async (adminSha, apiSha) => {
    const result = await run({}, adminSha, apiSha);
    expect(result.dispatches).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
  it('rejects contradictory production and DEV routing', async () => {
    const result = await run({ environment: 'Production', target_url: 'https://devportal.fiziyo.pl' });
    expect(result.dispatches).toEqual([]);
    expect(result.requests).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});