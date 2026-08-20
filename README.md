# AI Test Playwright Automation

Automated UI, API, and end-to-end (E2E) test suite built with **Playwright** and **TypeScript**,
developed with the assistance of Claude Code. The project follows a strict layered architecture
separating reusable code (`src/`) from test scenarios (`tests/`).

## Tech Stack

- [Playwright Test](https://playwright.dev/)
- TypeScript (strict mode)
- Node.js
- [dotenv](https://github.com/motdotla/dotenv) — environment variable management
- [@faker-js/faker](https://fakerjs.dev/) — dynamic test data generation
- [chalk](https://github.com/chalk/chalk) — structured console output
- [zod](https://zod.dev/) — runtime schema validation for API tests

## Project Structure

```
src/
  api/
    consts/       # API endpoint paths and HTTP status code constants
    models/       # TypeScript interfaces for API request/response shapes
    factories/    # Payload builders using faker
    requests/     # Shared API request helpers (raw APIRequestContext calls)
    steps/        # Multi-step API operations combining multiple requests
  ui/
    pages/        # Page Object classes — one file per page (*.page.ts)
    components/   # Reusable component objects (e.g., modal, table row)
    models/       # TypeScript interfaces for UI form data
    factories/    # UI form data builders using faker
  fixtures/       # Playwright fixture extensions (*.fixture.ts)
  data/           # Static constants, enums, shared seed values
  utils/          # Generic helpers (formatting, logging, etc.)
tests/
  ui/             # UI spec files
  api/            # API spec files
  e2e/            # End-to-end flow specs
docs/
  openapi/        # OpenAPI/Swagger specification(s)
  scenarios/       # Automation-ready scenario docs (ui, api, e2e)
```

Rules:
- `src/` contains reusable code only — no test scenarios.
- `tests/` contains only spec files and scenario-level assertions.
- Selectors stay out of tests when a Page Object already exists.

### Path Aliases (`tsconfig.json`)

| Alias | Path |
|---|---|
| `@api/consts/*` | `src/api/consts/*` |
| `@api/requests/*` | `src/api/requests/*` |
| `@api/factories/*` | `src/api/factories/*` |
| `@api/models/*` | `src/api/models/*` |
| `@api/steps/*` | `src/api/steps/*` |
| `@ui/pages/*` | `src/ui/pages/*` |
| `@ui/components/*` | `src/ui/components/*` |
| `@ui/models/*` | `src/ui/models/*` |
| `@ui/factories/*` | `src/ui/factories/*` |
| `@data/*` | `src/data/*` |
| `@utils/*` | `src/utils/*` |
| `@fixtures/*` | `src/fixtures/*` |

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
npm install
npx playwright install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `UI_URL` | Base URL for UI tests |
| `API_URL` | Base URL for API tests |
| `LOGGER` | Enable/disable structured console logging (`true`/`false`) |
| `OPENAPI_SPEC` | Path to the OpenAPI/Swagger spec used for contract validation |

Never commit `.env`. Keep `.env.example` up to date when adding new variables.

## Running Tests

Prefer the npm scripts below over raw `playwright test` commands.

| Script | Purpose |
|---|---|
| `npm test` | Run all tests |
| `npm run test:list` | List discovered tests |
| `npm run test:ui` | Run UI tests only |
| `npm run test:api` | Run API tests only |
| `npm run test:e2e` | Run E2E tests only |
| `npm run test:all` | Run all projects (api, ui, e2e) |
| `npm run test:headed` | Run in headed mode |
| `npm run test:debug` | Run in Playwright Inspector (debug) mode |
| `npm run test:report` | Open the HTML report |

Test projects (`api`, `ui`, `e2e`) are defined in [playwright.config.ts](playwright.config.ts), each
with its own `testDir` and `baseURL`.

## Testing Conventions

### UI

- Page Object Model for all page-level interactions; assertions stay in tests, not in Page Objects.
- Locator priority: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` →
  CSS (last resort).
- No `waitForTimeout` — use auto-retrying locators and web-first assertions instead.
- Tests never reference the raw `page` fixture directly — all interactions and checks go through a
  Page Object or Component method.

### API

- No Page Objects for API tests.
- Reuse shared request helpers from `src/api/requests/`.
- Validate at minimum: status code, key response body fields, critical headers.
- Runtime schema validation via `zod`.

### E2E

- Focused on critical business flows only.
- Test data prepared via API where faster/more reliable than UI setup.
- Each test is fully independent — no shared mutable state between tests.
- Related scenarios grouped with `test.describe()` and tagged (`@smoke`, `@regression`, etc.) where
  applicable.

## Documentation

- `docs/openapi/` — OpenAPI/Swagger specification used for API contract validation.
- `docs/scenarios/` — automation-ready scenario descriptions (`ui/`, `api/`, `e2e/`) that precede
  test implementation.
- `Claude.md` — repository instructions for AI-assisted test development.
- `memory.md` — project-specific conventions and reviewer feedback that override default behavior.
