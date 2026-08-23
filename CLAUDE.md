# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trading Contest Dashboard** — a full-screen Svelte 3 visualization of a fantasy-football-style stock draft: each entrant picks one ticker (long or short) and the app charts percentage performance since a common start date. The repo name and package.json description use the fantasy-football framing; the content is stock market data from Yahoo Finance.

See [README.md](./README.md) for the configuration schema, performance-calculation formulas, API reference, and data-flow details — reference it rather than duplicating it here.

## Development Commands

### Frontend (repo root)
- `npm run build` — production build via Rollup to `public/build/` (gitignored; must exist before any deploy because the CDK `BucketDeployment` ships `../public`)
- `npm run dev` — watch mode with livereload
- `npm start` — serve `public/` with `sirv --no-cors --single`

### Infrastructure (from `/infrastructure`; run `npm install` there first — no committed node_modules)
- `npm run build` — `tsc` compile (cdk.json runs the app via ts-node, so this is optional for deploys)
- `npm test` — jest via ts-jest; the only test is CDK init boilerplate with its body commented out, so a green run proves nothing
- `npx cdk deploy --require-approval never` / `npx cdk diff` / `npx cdk synth`

### Testing the proxy
```bash
curl "https://a3nigzzk33.execute-api.us-east-1.amazonaws.com/prod/yahoo?symbol=AAPL&period1=<epoch>&period2=<epoch>&interval=1h"
```

## Architecture

Data flow (all frontend, no backend state):
1. `src/main.js` mounts `App.svelte`; the theme singleton `src/themeManager.js` initializes itself on import.
2. `App.svelte` onMount loads `public/config.json` at runtime (not bundled — config edits need no rebuild): `entrants` array of `{name, symbol, position}` plus `startDate` (YYYY-MM-DD).
3. `src/stockService.js` dedupes symbols and fetches all of them in parallel (`Promise.all`) from the Lambda proxy: `GET {proxy}/yahoo?symbol=&period1=&period2=&interval=1h`, 15s AbortController timeout per request. The start timestamp is anchored at `T08:00:00-05:00` on `startDate`; `period2` is always now (no caching — every page load refetches).
4. `parseYahooChartData` converts UTC timestamps to Central time and emits `[{date: "YYYY-MM-DDTHH:MM", price}]` per symbol.
5. `calculatePerformance` computes per-point percentage vs the first close: longs get the raw value, shorts the negation.
6. `App.svelte` shows a Leaderboard/Chart toggle (persisted in localStorage `tw-ff-view`); both views receive the same precomputed props — no refetch on toggle.

**Load-bearing string contract:** `calculatePerformance` keys its output by the exact string `` `${name} (${position} ${symbol})` ``. `StockChart.svelte` and `Leaderboard.svelte` both look entries up by rebuilding that string. Change it in one place and the others silently render empty. The *visible* chart legend is a different format: `{name} ({symbol} 📈|📉)`.

Infrastructure (`infrastructure/lib/infrastructure-stack.ts`, CDK v2, region hardcoded `us-east-1`): Yahoo-proxy Lambda (Node 18, 30s, 256MB) behind API Gateway (`GET /yahoo`, CORS preflight allows all), S3 + CloudFront static hosting at `tw-ff-draft-game-viz.aaronmamparo.com` (imported ACM cert by ARN, Route53 A record), `BucketDeployment` invalidates `/*` on deploy.

## Critical Gotchas

1. **The Lambda source is missing from the repo.** The stack references `Code.fromAsset('lambda')` with handler `yahoo-proxy.handler`, but `infrastructure/lambda/yahoo-proxy.js` does not exist on disk and was never committed (`infrastructure/.gitignore`'s `*.js` rule overrides the root `.gitignore`'s `!infrastructure/lambda/*.js` carve-out). `cdk synth`/`deploy` fail from a fresh clone. The only copy of the handler is the deployed Lambda — recover it from AWS (`aws lambda get-function`) and fix the nested .gitignore before any redeploy.
2. **Root `.gitignore` ignores `*.js` globally.** Existing `src/*.js` files are tracked (tracked files ignore the rule), but any *new* `.js` file is silently invisible to git unless force-added or excepted.
3. **`deploy.sh` uses the wrong flag** `--context requireApproval=never` (sets a context key, does not suppress prompts). The correct form is `--require-approval never`. It also runs `cdk bootstrap` every time.
4. **`loadConfig()` violates the no-mock-data rule:** on config fetch failure it returns a hardcoded fallback (`stockSymbols: ['AAPL',...]`) whose shape doesn't even match what the app consumes. Known wart — do not add more fallbacks like it.
5. **Timezone is a fixed UTC-5 offset (CDT).** Labels are an hour off during Central Standard Time. The chart x-axis is a *category* axis using the first symbol's date strings, so all symbols are assumed to share identical hourly timestamps.
6. **Mobile tuning is frozen at chart creation** (reads `window.innerWidth` once; no resize listener). Breakpoints: 480/768/1024.
7. **The theme system is dormant:** `themeManager.js` runs and sets ~13 CSS custom properties (localStorage `ff-theme-preference`), but `ThemeToggle.svelte` is never mounted and no stylesheet consumes the variables — components hard-code dark-theme colors. `src/app.css` (Tailwind directives) is dead: never imported, no Tailwind plugin.
8. **Toolchain is old:** Svelte 3 + Rollup 2 + terser 7, plain JS, no transpiler. Keep syntax conservative and no Svelte 5 idioms.

## Important Conventions

1. **No Mock Data**: Show real errors to users; never add fallback mock data (see gotcha 4 for the one legacy exception).
2. **Error Isolation**: Per-symbol try/catch with console logging; the app errors out only if *all* symbols fail.
3. **Minimal UI**: Focus on the data; avoid extra controls or text.
4. **CORS**: Handled by API Gateway config (plus headers set inside the Lambda) — no frontend workarounds.
5. **Code simplification pass**: A vendored copy of the official code-simplifier agent lives at `.claude/agents/code-simplifier.md`. A `Stop` hook (`.claude/hooks/simplify-check.sh`, wired in `.claude/settings.json`) blocks task completion once per change-set when source files (`src/`, `infrastructure/lib|bin`, `rollup.config.js`) changed, instructing Claude to run that agent on the changed files. Run it at most once per task; if it reports nothing to simplify, finish. The hook stamps handled states in `.claude/.simplify-stamp` (gitignored) to avoid loops.

## Deployment Notes

**IMPORTANT**: Do NOT deploy automatically. Build locally only; the human deploys unless the prompt explicitly asks.

1. Build order: frontend `npm run build` first, then `cd infrastructure && npx cdk deploy --require-approval never` (currently blocked by gotcha 1).
2. CloudFront invalidation is automatic via the CDK `BucketDeployment`.
3. AWS credentials are needed even for synth (`HostedZone.fromLookup`; lookup cached in `infrastructure/cdk.context.json`). Lambda runtime `NODEJS_18_X` is past AWS end-of-support — expect to bump it on the next redeploy.

## Common Tasks

- **Add a trader**: append to `entrants` in `public/config.json`. No code changes.
- **Change time range**: edit `startDate` in `public/config.json`.
- **Update proxy URL**: `getProxyUrl()` in `src/stockService.js` (overridable at runtime via `window.YAHOO_PROXY_URL`; the app appends `/yahoo`).
