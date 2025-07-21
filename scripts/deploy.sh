#!/bin/bash

# Sportea Production Deployment Script
# Usage: ./scripts/deploy.sh [platform]
# Platforms: vercel, netlify, aws

set -e  # Exit on any error

PLATFORM=${1:-vercel}
PROJECT_NAME="sportea"

echo "🚀 Starting Sportea deployment to $PLATFORM..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Run linting
print_status "Running linter..."
npm run lint

# Run tests
print_status "Running tests..."
npm run test:all

# Build the application
print_status "Building application for production..."
npm run build:prod

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_status "Build completed successfully"

# Deploy Supabase functions first
print_status "Deploying Supabase Edge Functions..."
npx supabase functions deploy --no-verify-jwt

# Deploy based on platform
case $PLATFORM in
    "vercel")
        print_status "Deploying to Vercel..."
        npx vercel --prod --yes
        ;;
    "netlify")
        print_status "Deploying to Netlify..."
        npx netlify deploy --prod --dir=dist
        ;;
    "aws")
        print_status "Deploying to AWS Amplify..."
        # Add AWS Amplify deployment commands here
        echo "AWS deployment not implemented yet"
        ;;
    *)
        print_error "Unknown platform: $PLATFORM"
        echo "Supported platforms: vercel, netlify, aws"
        exit 1
        ;;
esac

print_status "Deployment completed successfully! 🎉"
print_warning "Don't forget to run post-deployment verification tests"
