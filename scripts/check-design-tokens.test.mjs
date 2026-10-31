import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWithBaseline, countViolations } from './check-design-tokens.mjs';

test('counts arbitrary hex, raw palettes and inline hex colors', () => {
  const source = [
    '<div className="bg-[#1a1a1a] text-zinc-400 border-emerald-500/20" />',
    "<span style={{ color: '#ff0000' }} />",
  ].join('\n');
  assert.equal(countViolations(source), 4);
});

test('ignores DS tokens and semantic classes', () => {
  const source =
    '<div className="bg-grouped text-label-secondary border-separator bg-tint-fill text-on-tint bg-status-danger-muted" />';
  assert.equal(countViolations(source), 0);
});

test('flags only files that grew past the baseline', () => {
  const regressions = compareWithBaseline({ 'a.tsx': 3, 'b.tsx': 1, 'c.tsx': 2 }, { 'a.tsx': 3, 'b.tsx': 2 });
  assert.deepEqual(regressions, [{ filePath: 'c.tsx', count: 2, allowed: 0 }]);
});

test('flags fixed white or black text on a translucent muted status background', () => {
  const source = [
    '<Badge className="bg-status-warning-muted text-white" />',
    "cn('text-black border-x bg-status-info-muted')",
  ].join('\n');
  assert.equal(countViolations(source), 2);
});

test('allows muted status backgrounds with their theme-aware text color', () => {
  assert.equal(countViolations("cn('bg-status-warning-muted text-status-warning', 'text-white')"), 0);
});
