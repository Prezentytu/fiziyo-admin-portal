# Contributing to FiziYo Admin

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone <repo-url>
cd fiziyo-admin
npm install
cp .env.example .env.local   # configure your environment
npm run dev                   # starts dev server with HTTPS
```

## Branching Model

```
main          production-ready, protected
  └── dev     integration branch
       └── feat/<name>     new features
       └── fix/<name>      bug fixes
       └── chore/<name>    maintenance tasks
```

### Branch naming

- `feat/short-description` - new features
- `fix/short-description` - bug fixes
- `chore/short-description` - tooling, deps, refactoring

### Workflow

1. Create a branch from `dev`
2. Make your changes (follow the code style in `AGENTS.md`)
3. Run `npm run validate` to check lint, types, and build
4. Commit using [Conventional Commits](#commit-messages)
5. Open a PR against `dev`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation only          |
| `style`    | Formatting, no logic change |
| `refactor` | Code change, no feature/fix |
| `test`     | Adding or updating tests    |
| `chore`    | Build, CI, tooling changes  |
| `perf`     | Performance improvement     |

### Scopes

Use the module name: `exercises`, `patients`, `sets`, `org`, `settings`, `auth`, `ci`, `ui`.

### Examples

```
feat(exercises): add tag autocomplete to exercise form
fix(patients): prevent duplicate assignment creation
chore(ci): add test step to GitHub Actions pipeline
```

## Code Style

See `AGENTS.md` for the full style guide. Key points:

- TypeScript strict mode, no `any`
- Functional components (not `React.FC`)
- `useQuery` with `skip` (never `useLazyQuery`)
- `react-hook-form` + `zod` for forms
- `data-testid` on every interactive element
- Organize imports: externals, UI, internal, GraphQL, utils

## Running Checks

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run type-check    # TypeScript compiler check
npm run format        # Prettier formatting
npm run format:check  # Prettier check
npm run test          # Vitest unit tests
npm run validate      # lint + type-check + build
```

## Pull Requests

- Fill out the PR template
- Ensure CI passes
- Keep PRs focused and small
- Update specs in `.ai/specs/` if architecture changes
