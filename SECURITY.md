# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub issue.**

Instead, email us at: **security@fiziyo.com**

Please include:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We will acknowledge receipt within **48 hours** and aim to provide a fix within **7 days** for critical issues.

## Security Practices

- All dependencies are monitored via Dependabot
- Secrets are never committed to the repository
- Authentication is handled through Clerk with token exchange
- All API communication uses HTTPS
- GraphQL queries are type-safe with generated types
