# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

n8n community node package (`@markupai/n8n-nodes-markupai`) that exposes Markup AI's agents API as a single n8n node. Published to npm; consumed by n8n installs as a community node. There is exactly one node (`Markupai`) with one operation (`runAgent`) and one credential type (`MarkupAiApi`).

## Common commands

- `npm start` — runs `n8n-node dev`: builds in watch mode and launches a bundled n8n with this node loaded at `http://localhost:5678`. Dev n8n state lives in `~/.n8n-node-cli/.n8n/` (separate from `~/.n8n/`).
- `npm run build` — `tsc` (build tsconfig) + gulp tasks that copy `*.svg`/`*.png` icons, `*.html` templates, and a stripped `package.json` into `dist/`. The `n8n` block in `package.json` points at `dist/...`, so the package is only usable after `build`.
- `npm test` — vitest run. Test file pattern: `test/**/*.{test,spec}.ts`. Coverage targets `nodes/`, `credentials/`, `utils/`. Run one file with `npx vitest run test/utils/process.item.test.ts`; one test name with `-t "<name>"`. Watch mode: `npm run test:watch`.
- `npm run lint:check` / `npm run lint:fix` — uses `eslint.config.js` (typescript-eslint **strictTypeChecked** plus `eslint-plugin-n8n-nodes-base` for `nodes/`, `credentials/`, and `package.json`).
- `npm run lint:prepublish` — stricter, narrower lint that runs on `prepublishOnly`. Uses `eslint.config.prepublish.js`. Touching `nodes/` or `credentials/` files should pass both configs.
- `npm run type-check` — `tsc --noEmit` against `tsconfig.json` (includes tests; `tsconfig.build.json` excludes them).
- `npm run setup` / `npm run cleanup` — wrappers around the `dev/setup.sh` / `dev/cleanup.sh` scripts for the manual `npm link` install path into `~/.n8n/custom`. Most dev should use `npm start` instead.

## Architecture

### Request flow (the one operation: Run Agent)

`Markupai.node.ts#execute()` is the entry point. For each input item it:

1. Calls `getStyleAgentConfig()` → `GET /style-agent/config`, then `assertStyleAgentEnabled()` — the node **fails fast** if the org's `style_agent` mode isn't in `{enabled, enabled_terminology}`. The `style_agent_numeric_scoring` flag is forwarded to the HTML report renderer.
2. Calls `listAllAgents()` → `GET /agents` once per execution; the names are looked up when building the HTML report.
3. For each item, `processMarkupaiItem()`:
   - Reads `agents` (single agent id), `domainIds`, `targetId`, `content`, and `additionalOptions` from the node params.
   - `buildRunRequest()` filters which fields are sent based on `AGENT_ADDITIONAL_OPTION_FIELDS[agentId]` (see below) — never blindly forward all options.
   - `runAgent()` → `POST /agents/{id}/run?wait=false`. If the response is already terminal, short-circuit; otherwise `pollWorkflowUntilDone(workflowId, timeoutMs)` polls `GET /agents/workflows/{id}` every 2s until a terminal status (`completed | failed | timed_out | cancelled`) or the configured timeout (default 120s).
   - Only `completed` returns success; other terminal states throw. With **Continue On Fail**, errors become `{ error: "<msg>" }` items; without it, they surface as `NodeOperationError`.
   - `createSuccessResponse()` computes `issue_counts` from `result.issues` and renders `html_report` via `renderReport()` (email-safe inline-styled HTML).

### Per-agent input coverage

`nodes/Markupai/utils/agent.input.coverage.ts` is the source of truth for which Additional Options each agent accepts. The constants `DOMAIN_IDS_AGENT_IDS` and `STYLE_OPTION_AGENT_IDS` are derived from `AGENT_ADDITIONAL_OPTION_FIELDS` and used in the node's `displayOptions.show` to conditionally render the `Domain IDs` and `Target` fields. When adding an agent or changing what it supports, update `AGENT_ADDITIONAL_OPTION_FIELDS` — the UI conditionals and `buildRunRequest` filtering both flow from it.

The hardcoded agent IDs in `AGENT_IDS` come from the live Markup AI API; they are not generated.

### Agent visibility in the UI

`loadAgents()` in `load.options.ts` currently filters to **only** `name === "style_agent"` and excludes orchestrator IDs in `ORCHESTRATOR_AGENT_IDS`. The dropdown in n8n is therefore a single-item picker today even though the underlying coverage map describes many agents. Removing the `STYLE_AGENT_NAME` filter is what exposes others.

### API client conventions

- Base URL: `getBaseUrlString()` in `utils/common.utils.ts`. Reads `MARKUP_AI_BASE_URL` env var; defaults to `https://api.markup.ai/`. The credentials test request uses this too, so dev keys can be validated against `api.dev.markup.ai`.
- All HTTP goes through `this.helpers.httpRequestWithAuthentication.call(this, "markupaiApi", ...)` with `returnFullResponse: true`. Bodies come back as string-or-object depending on `json:`; util code normalizes by `JSON.parse(JSON.stringify(...))`.
- URLs are composed via `buildApiUrl(baseUrl, path)` with a normalizing trailing slash — re-use the existing helper rather than string-concatenating paths.
- Credential auth: `Authorization: Bearer <apiKey>` + `x-integration-id: markupai-n8n-app` header. The integration ID is how Markup AI attributes traffic to this connector — don't remove it.

### Tests

`test/` mirrors source layout (`test/nodes/`, `test/credentials/`, `test/utils/`). Vitest, `environment: "node"`, no fixtures dir — tests stub `httpRequestWithAuthentication` directly. There's no integration test against the real API.

### Publishing

`prepublishOnly` runs `build` + `lint:prepublish` + `check:stable-version` (rejects prerelease versions). Only `dist/` is published (`"files": ["dist"]` in `package.json`). The published `package.json` is the dist-copy from `gulp build:package`, with `devDependencies` and `scripts` stripped.

## Things to know

- Node engine is `>=22.16`. CI and the n8n dev CLI both assume this.
- ESLint runs in strict-type-checked mode against `tsconfig.json`. Don't introduce `any`/unchecked casts; the existing code uses targeted `as` with surrounding shape assertions (see `agents.api.utils.ts`).
- The HTML report (`utils/report_template.ts`) is intentionally email-safe (table layout, inline styles, no JS) because consumers paste it into email/Slack steps downstream. Don't add `<script>`, flex/grid, or external assets.
- If `npm start` errors with `SQLite package has not been found installed`, rebuild the npx-cached sqlite3 binding (see README "First-time SQLite fix") — it's not a code bug.
