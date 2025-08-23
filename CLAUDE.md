# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Build for production (outputs to `public/build/`)
- `npm run dev` - Start development server with live reload
- `npm start` - Serve built application locally

### Dependencies
- `npm install` - Install all dependencies after adding new packages

## Architecture Overview

This is a **Trading Contest Dashboard** - a full-screen, minimal Svelte web application that visualizes stock performance for multiple contest entrants with long/short positions.

### Core Architecture

**Frontend Stack:**
- **Svelte 3** - Component framework with minimal runtime
- **Chart.js 4** with zoom plugin - Interactive charting with pan/zoom
- **Rollup** - Build system with live reload in development

**Data Flow:**
1. Configuration loaded from `public/config.json` (contest entrants with positions)
2. Stock data fetched in parallel from Yahoo Finance via CORS proxies
3. Performance calculated with position adjustments (short positions inverted)
4. Real-time chart rendered with distinct colors per entrant

### Key Components

**`src/stockService.js`** - Core data service handling:
- Parallel Yahoo Finance API requests through multiple CORS proxy fallbacks
- Long/short position performance calculations (shorts show inverted gains)
- Error handling with graceful degradation per symbol

**`src/StockChart.svelte`** - Main visualization component:
- Full-screen chart (100vw x 100vh) with no UI clutter
- 12 distinct high-contrast colors for easy differentiation
- Interactive zoom/pan on time axis only
- Hourly data intervals for detailed performance tracking

**`public/config.json`** - Contest configuration with structure:
```json
{
  "entrants": [
    {"name": "Trader", "symbol": "STOCK", "position": "long|short"}
  ],
  "startDate": "YYYY-MM-DD"
}
```

### Data Processing Pipeline

**Stock Data Fetching:**
- Extracts unique symbols from entrants to minimize API calls
- Uses 3 CORS proxy fallbacks: allorigins.win, corsproxy.io, cors-anywhere.herokuapp.com
- Yahoo Finance v8 chart API with 1-hour intervals
- Parallel requests for all symbols with 200ms delays

**Performance Calculation:**
- Standard percentage change for long positions: `((current - start) / start) * 100`
- Inverted for short positions: `-(((current - start) / start) * 100)`
- Results in positive performance when shorts profit from stock declines

### Chart Configuration

**Visual Design:**
- Full viewport coverage with `position: fixed`
- Legend format: `{name} ({position} {symbol})`
- 12 pre-selected colors optimized for distinction
- No titles, controls, or informational text - pure data visualization

**Interactions:**
- Mouse wheel zoom on time axis
- Click-drag panning
- Hover tooltips showing exact performance percentages
- Chart.js zoom plugin with x-axis only mode

### Configuration Management

The contest can be reconfigured by editing `public/config.json`:
- Add/remove entrants
- Change start date for performance baseline
- Modify symbols or positions
- No code changes required - data-driven configuration

### API Integration Notes

**Yahoo Finance Integration:**
- Uses v8/finance/chart endpoint (not the deprecated download API)
- Requires CORS proxy due to browser restrictions
- Fallback proxy system ensures reliability
- Hourly data provides granular performance tracking

**Error Handling:**
- Per-symbol error isolation (one failure doesn't break others)
- Graceful degradation shows chart with available data
- Console logging for debugging API issues
- No mock data fallbacks - shows real errors to user