# Trading Contest Dashboard

A full-screen, real-time stock performance visualization dashboard for tracking trading contest participants with long/short positions. Built with Svelte and deployed on AWS.

Live demo: [https://draft-order.aaronmamparo.com](https://draft-order.aaronmamparo.com)

## Features

- **Real-time Stock Data**: Fetches live stock prices from Yahoo Finance through a dedicated AWS Lambda proxy
- **Long/Short Position Tracking**: Automatically calculates performance based on position type (shorts show inverted gains)
- **Interactive Charting**: Pan and zoom through time-series data with Chart.js
- **Full-Screen Visualization**: Minimal UI with focus on data visualization
- **Dark/Light Mode**: Toggle between themes for different viewing conditions
- **High-Performance**: Parallel data fetching with hourly granularity

## Architecture

### Frontend Stack
- **Svelte 3**: Reactive component framework with minimal runtime overhead
- **Chart.js 4**: Interactive charting with zoom/pan capabilities
- **Rollup**: Module bundler with live reload for development

### Backend Infrastructure (AWS)
- **Lambda Function**: Dedicated Yahoo Finance proxy for CORS-compliant data fetching
- **API Gateway**: RESTful API endpoint with automatic CORS configuration
- **S3 + CloudFront**: Static site hosting with global CDN distribution
- **Route53**: Custom domain management with SSL certificate

### Data Flow
1. Configuration loaded from `public/config.json`
2. Stock symbols extracted and deduplicated
3. Parallel requests to AWS Lambda proxy
4. Yahoo Finance data fetched with hourly intervals
5. Performance calculated with position adjustments
6. Real-time chart updates with distinct colors per entrant

## Configuration

Edit `public/config.json` to configure contest participants:

```json
{
  "entrants": [
    {"name": "Trader 1", "symbol": "AAPL", "position": "long"},
    {"name": "Trader 2", "symbol": "TSLA", "position": "short"},
    {"name": "Trader 3", "symbol": "MSFT", "position": "long"}
  ],
  "startDate": "2025-08-16",
  "endDate": "2025-08-22"
}
```

- **name**: Display name for the trader
- **symbol**: Stock ticker symbol
- **position**: Either "long" or "short"
- **startDate**: Baseline date for performance calculation (YYYY-MM-DD format)
- **endDate** (optional): Last day of the contest (YYYY-MM-DD, inclusive) — data stops at the end of this day (11:59 PM Central); omit to keep updating through the present

## Development

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS CDK installed (`npm install -g aws-cdk`)

### Local Development

```bash
# Install dependencies
npm install

# Start development server with live reload
npm run dev

# Build for production
npm run build

# Serve production build locally
npm start
```

### Infrastructure Deployment

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install CDK dependencies
npm install

# Build TypeScript
npm run build

# Deploy to AWS (first time)
npx cdk bootstrap
npx cdk deploy

# Deploy updates
npx cdk deploy --require-approval never
```

## Project Structure

```
.
├── public/                  # Static assets
│   ├── build/              # Compiled JavaScript bundle
│   ├── config.json         # Contest configuration
│   ├── global.css          # Global styles
│   └── index.html          # HTML entry point
├── src/                    # Source code
│   ├── App.svelte          # Main application component
│   ├── StockChart.svelte   # Chart visualization component
│   ├── ThemeToggle.svelte  # Dark/light mode toggle
│   ├── stockService.js     # Yahoo Finance data fetching
│   └── themeManager.js     # Theme persistence logic
├── infrastructure/         # AWS CDK infrastructure
│   ├── lambda/            # Lambda function code
│   │   └── yahoo-proxy.js # Yahoo Finance proxy handler
│   └── lib/               # CDK stack definitions
│       └── infrastructure-stack.ts
└── rollup.config.js       # Build configuration
```

## API Reference

### Yahoo Finance Proxy Endpoint

```
GET https://a3nigzzk33.execute-api.us-east-1.amazonaws.com/prod/yahoo
```

Query parameters:
- `symbol` (required): Stock ticker symbol
- `period1` (required): Start timestamp (Unix epoch)
- `period2` (required): End timestamp (Unix epoch)
- `interval` (optional): Data interval (default: "1h")

Example:
```bash
curl "https://a3nigzzk33.execute-api.us-east-1.amazonaws.com/prod/yahoo?symbol=AAPL&period1=1755307321&period2=1755912124&interval=1h"
```

## Performance Calculation

- **Long positions**: `((current_price - start_price) / start_price) * 100`
- **Short positions**: `-(((current_price - start_price) / start_price) * 100)`

This ensures that short positions show positive performance when the stock price decreases.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with ES6 support

## License

MIT