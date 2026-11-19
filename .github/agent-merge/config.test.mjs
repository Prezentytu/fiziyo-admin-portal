// Konfiguracja tego repo na prawdziwym config.json: lista zakazów; w `src/app` tylko grupa `(dashboard)`, bo nowa trasa poza nią zmienia, kto ją widzi. Krytyczne ścieżki zostają u człowieka.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pasuje, wzorce } from './reguly.mjs';

const cfg = JSON.parse(readFileSync(new URL('./config.json', import.meta.url)));
const zakazane = wzorce(cfg.zakazane.join('\n'));
const dozwolone = wzorce(cfg.dozwolone.join('\n'), { poddrzewo: false });
const dlaSedziego = (p) => !pasuje(p, zakazane) && pasuje(p, dozwolone);

test('ścieżki krytyczne nie trafiają do sędziego', () => {
  for (const p of [
    '.github/workflows/ci.yml',
    'package.json',
    'AGENTS.md',
    'src/proxy.ts',
    'src/app/api/x/route.ts',
    'src/app/(dashboard)/layout.tsx',
    'src/app/(auth)/register/page.tsx',
    'src/graphql/providers/BackendAuthTokenProvider.ts',
    'src/graphql/links/wsLink.ts',
    'src/lib/apollo/provider.tsx',
    'src/lib/auth/x.ts',
    'src/contexts/OrganizationContext.tsx',
    'src/components/organization/Members.tsx',
    'src/components/finances/Billing.tsx',
    'src/features/verification/x.tsx',
    'src/graphql/mutations/crossOrgVerification.ts',
    'schema.graphql',
    'public/robots.txt',
    'AGENTS.md',
    'src/features/exercises/AGENTS.md',
    'src/graphql/CLAUDE.md',
    'src/app/(blocked)/page.tsx',
    'src/app/robots.ts',
    'src/app/nowa-publiczna/page.tsx',
    'src/stores/x.ts',
    'src/hooks/useUserRole.ts',
    'vitest.setup.ts',
    'src/services/aiService.ts',
    '.npmrc',
  ]) {
    assert.equal(dlaSedziego(p), false, p);
  }
});

test('zwykła praca przechodzi', () => {
  for (const p of [
    'docs/a.md',
    'src/components/layout/UserProfileFooter.tsx',
    'src/features/exercise-sets/a.tsx',
    'src/graphql/queries/referrals.queries.ts',
    'src/lib/meFeatures.ts',
    'src/types/ai.types.ts',
    'src/utils/x.ts',
    'src/hooks/useX.ts',
    'src/app/(dashboard)/sets/page.tsx',
  ]) {
    assert.equal(dlaSedziego(p), true, p);
  }
});
