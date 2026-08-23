#!/bin/bash

# Fantasy Football Draft Visualization Deployment Script
set -e

echo "🏈 Deploying Fantasy Football Draft Visualization..."

# Build the Svelte application
echo "📦 Building Svelte application..."
npm run build

# Deploy CDK stack
echo "☁️  Deploying AWS infrastructure..."
cd infrastructure
npm run build
npx cdk bootstrap --context requireApproval=never
npx cdk deploy --context requireApproval=never

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://draft-order-gauntlet.aaronmamparo.com"