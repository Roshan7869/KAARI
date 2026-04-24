#!/bin/bash
# -------------------------------------------------
# Deployment script for Kaari Marketplace
# Usage: ./scripts/deploy.sh [environment]
# Environments: production (default), staging
# -------------------------------------------------

set -euo pipefail

ENV="${1:-production}"
VALID_ENVS="production staging"

if ! echo "$VALID_ENVS" | grep -wq "$ENV"; then
  echo "Error: Invalid environment '$ENV'. Must be one of: $VALID_ENVS"
  exit 1
fi

echo "=== Kaari Marketplace Deployment ==="
echo "Environment: $ENV"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
echo "======================================"

# Pre-flight checks
echo "Running pre-flight checks..."

# TypeScript
if ! npx tsc --noEmit; then
  echo "TypeScript check failed. Aborting."
  exit 1
fi

# ESLint
if ! npx next lint; then
  echo "ESLint check failed. Aborting."
  exit 1
fi

# Unit tests
if ! npm run test; then
  echo "Unit tests failed. Aborting."
  exit 1
fi

echo "All checks passed."

# Build Docker image
IMAGE_TAG="kaari-marketplace:${ENV}-$(git rev-parse --short HEAD)"
echo "Building Docker image: $IMAGE_TAG..."
docker build -t "$IMAGE_TAG" .

echo ""
echo "=== Deployment Ready ==="
echo "Image: $IMAGE_TAG"
echo ""
echo "To deploy, run:"
echo "  docker run -p 3000:3000 --env-file .env $IMAGE_TAG"
echo ""
echo "Or push to registry and deploy to your orchestrator."
