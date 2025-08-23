# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trading Contest Dashboard** - A full-screen stock performance visualization for contest participants with long/short positions.

For detailed project information, architecture, and configuration, see [README.md](./README.md).

## Development Commands

### Building and Development
- `npm run build` - Build for production (outputs to `public/build/`)
- `npm run dev` - Start development server with live reload
- `npm start` - Serve built application locally

### Infrastructure (from `/infrastructure` directory)
- `npm run build` - Compile TypeScript CDK code
- `npx cdk deploy` - Deploy AWS infrastructure
- `npx cdk deploy --require-approval never` - Deploy without approval prompt

### Dependencies
- `npm install` - Install all dependencies after adding new packages

## Key Implementation Details

### AWS Lambda Proxy
The application uses a **dedicated AWS Lambda proxy** (`infrastructure/lambda/yahoo-proxy.js`) instead of public CORS proxies:
- Direct connection to Yahoo Finance API
- Built-in CORS support and error handling
- 30-second timeout with proper resource cleanup
- Deployed via API Gateway at: `https://a3nigzzk33.execute-api.us-east-1.amazonaws.com/prod/yahoo`

### Data Processing
- **Performance Calculation**: See [README.md#performance-calculation](./README.md#performance-calculation)
- **Parallel Fetching**: All unique symbols fetched simultaneously
- **Error Isolation**: Single symbol failures don't break the entire chart

### Chart Configuration
- **Full viewport coverage**: `position: fixed`, 100vw x 100vh
- **12 distinct colors**: Pre-selected for maximum contrast
- **Interactive controls**: Zoom/pan on time axis only
- **Legend format**: `{name} ({position} {symbol})`

### Critical Files

**Frontend Core:**
- `src/stockService.js` - Yahoo Finance data fetching via AWS proxy
- `src/StockChart.svelte` - Main visualization component
- `public/config.json` - Contest configuration (see [README.md#configuration](./README.md#configuration))

**Infrastructure:**
- `infrastructure/lib/infrastructure-stack.ts` - CDK stack with Lambda, API Gateway, S3, CloudFront
- `infrastructure/lambda/yahoo-proxy.js` - Lambda function for Yahoo Finance API

## Important Conventions

1. **No Mock Data**: Always show real errors to users, never use fallback mock data
2. **Minimal UI**: Focus on data visualization, avoid unnecessary controls or text
3. **Error Handling**: Per-symbol error isolation with console logging for debugging
4. **Date/Time**: Market hours in Central Time (UTC-5), hourly intervals
5. **CORS**: All CORS handling done via AWS API Gateway configuration

## Testing the Proxy

```bash
# Test the Lambda proxy directly
curl "https://a3nigzzk33.execute-api.us-east-1.amazonaws.com/prod/yahoo?symbol=AAPL&period1=1755307321&period2=1755912124&interval=1h"
```

## Deployment Notes

1. **Build order**: Always build frontend (`npm run build`) before deploying infrastructure
2. **CloudFront invalidation**: Automatic on deployment via CDK
3. **Domain**: Configured for `tw-ff-draft-game-viz.aaronmamparo.com` with existing ACM certificate

## Common Tasks

### Add New Trader
Edit `public/config.json` and add to the `entrants` array. No code changes required.

### Change Time Range
Modify `startDate` in `public/config.json` (format: YYYY-MM-DD).

### Update Proxy URL
Edit `getProxyUrl()` function in `src/stockService.js:115`.

### Deploy Updates
```bash
npm run build && cd infrastructure && npx cdk deploy --require-approval never
```