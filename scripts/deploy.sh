#!/bin/bash

# Deployment script for Firebase
# This script builds and deploys both dashboard and functions

set -e  # Exit on error

echo "🚀 Starting deployment process..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed.${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Firebase. Logging in...${NC}"
    firebase login
fi

echo -e "${GREEN}✅ Firebase CLI ready${NC}"
echo ""

# Build dashboard
echo "📦 Building dashboard..."
cd dashboard
if [ ! -d "node_modules" ]; then
    echo "Installing dashboard dependencies..."
    npm install
fi
npm run build
cd ..

# Build functions
echo "📦 Building functions..."
cd functions
if [ ! -d "node_modules" ]; then
    echo "Installing functions dependencies..."
    npm install
fi
npm run build
cd ..

# Deploy
echo ""
echo "🚀 Deploying to Firebase..."
firebase deploy

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Dashboard: https://$(firebase use | grep 'Using' | awk '{print $2}').web.app"
echo "Functions: https://us-central1-$(firebase use | grep 'Using' | awk '{print $2}').cloudfunctions.net/api"

