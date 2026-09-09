# Security review: Clerk sign-in CAPTCHA

## Scope

Local sign-in UI change that adds Clerk's documented CAPTCHA mount point, accessible
error reporting and stable test IDs. The review also covers the corresponding component
regression test, Playwright diagnostics and Clerk Testing Token setup in `fiziyo-tests`.

No proxy policy, session activation, token exchange or tenant authorization changed.

## Findings and mitigation

- Medium: the custom password sign-in called `signIn.create()` without
  `#clerk-captcha`. When Clerk challenged suspected bot traffic, the challenge had no
  mount point and authentication could remain on `/sign-in`. Added one unconditional,
  empty mount inside the form before the submit action.
- Low: authentication errors were only visually styled. Added `role="alert"` so
  assistive technology and semantic E2E locators can observe the same generic message.
- Low: identifier-not-found and wrong-password responses continue to share
  `Nieprawidłowy email lub hasło`; the component regression test verifies that the raw
  provider message is not rendered.
- Informational: Playwright no longer mutates the production DOM to manufacture a
  CAPTCHA mount. That workaround would hide an application defect and would not be a
  reliable bot-protection bypass.
- Medium: reliable bot bypass requires a Clerk Secret Key. The reusable workflow accepts
  environment-specific publishable/secret key pairs only from GitHub Environment
  secrets. They are injected into browser suite steps, never job-wide, and are absent
  from API, validation, report and artifact steps. Only the short-lived Testing Token is
  attached to Clerk Frontend API requests by the official SDK.

## Validation and residual risks

The focused component suite covers mount availability before authentication, successful
session activation and account-enumeration-safe errors. Portal validation passed: lint,
test-ID guard, TypeScript, 582 Vitest tests and production build. The E2E repository
passed formatting, lint, strict TypeScript, 93 workflow contract tests and `npm audit`
with zero findings. Workflow tests verify target URL/environment binding,
browser-suite isolation and project dependency ordering.

The repository changes cannot provision GitHub secrets. Runs fail closed until all four
documented Clerk keys are configured. A Clerk Secret Key can perform privileged instance
operations, so repository/environment access and rotation policy remain operational
risks. The next production run will distinguish credential, MFA and provider errors
through the semantic form-error diagnostic.

## Next steps — go deeper

- Provision and periodically rotate the four documented Clerk keys in GitHub Environments.
- Verify the test account has password authentication enabled and no unsupported MFA.
- Keep production E2E credentials isolated in GitHub Environment secrets.

## Similar hotspots

Custom Clerk calls in registration, password reset, verification and invitation flows
must render a single available CAPTCHA mount before invoking challengeable operations.

## References

- https://clerk.com/docs/guides/development/testing/overview
- https://clerk.com/docs/guides/development/testing/playwright/overview
