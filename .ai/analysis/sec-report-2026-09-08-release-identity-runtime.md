# Security review: admin identity and runtime updates

## Scope

Approved local metadata/CI changes plus separately approved Clerk/Next patching.
No changes to proxy policy, tenant/data queries, token exchange, secrets or deploy.

## Findings and mitigation

- Critical dependency advisory GHSA-vqx2-fgx2-5wq9 in Clerk 6.38.3. Actual proxy
  uses !isPublicRoute then protect; advisory explicitly says this pattern blocks
  the described bypass. No exploit or patient data exposure established.
  Updated to 6.39.6 (patched current major), real matcher/proxy regression tests.
- High GHSA-w24r-5266-9c3c: combined authorization predicates. Current proxy
  calls protect without such parameters; update still required and applied.
- High Next 16.1.6 advisory ranges and ws: Next 16.3.4, matching build/lint tooling,
  ws updated within existing ranges. Runtime audit after updates: 0 vulnerabilities.
- High dispatch used generic Preview to certify shared DEV and smoke-tests on
  PROD. Now only dedicated DEV or explicit environment after live identity check;
  generic Preview returns notice, no dispatch/status certificate. PROD=prod-safe.
- Medium identity headers are app-reported build facts, not provider signatures.
  Only SHA, deployment ID, API origin, schema version; no secrets/PII. Fixed HEAD
  targets, no redirects or credentials. Header values validated before build.
- Medium missing system vars, CDN/header behavior and token scopes unverified
  live. Missing metadata fails evidence, never fabricates success. No auth route
  allowlist changes; existing public sign-in receives headers.

## Validation and residual risks

16 proxy/adminAccess tests passed before/after dependency update. Full unit run
109 files/563 tests, TypeScript and Next production build passed. Compiled routes
manifest verified synthetic SHA and deployment ID from build input.
Full validate remains blocked by 40 unexpected missing testids in untouched UI;
lint has 8 warnings (including new Next rules on existing hard navigations).
Dev-tool audit still has 10 advisories (1 low, 1 moderate, 8 high); not resolved.
Runtime clean audit is not proof that all auth/tenant flows are safe. Live sign-in,
logout, account switch, unauthorized API access and prod-safe checks remain unverified.

## Next steps - go deeper

Restore required quality baseline without suppressing testids, live authenticated QA,
provider deployment provenance, full client/SDL compatibility and least-privilege CI.

## Similar hotspots

API route downstream auth, backend tenant guards, Expo Clerk dependency line,
Vercel alias movement, Preview routing, stored tokens, E2E report artifacts.

## References

- https://github.com/advisories/GHSA-vqx2-fgx2-5wq9
- https://github.com/advisories/GHSA-w24r-5266-9c3c
- https://vercel.com/docs/environment-variables/system-environment-variables