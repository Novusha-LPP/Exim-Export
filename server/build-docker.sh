#!/bin/bash
set -e

IMAGE_NAME="punit084/export-main:latest"

echo "=================================================="
echo "🧹 [1/3] Clearing Docker build cache & unused images..."
echo "=================================================="
docker system prune -a --volumes -f || true

echo ""
echo "=================================================="
echo "🔨 [2/3] Building fresh Docker image (${IMAGE_NAME}) with --no-cache..."
echo "=================================================="
docker build --no-cache -t ${IMAGE_NAME} .

echo ""
echo "=================================================="
echo "🚀 [3/3] Pushing image to Docker Hub (${IMAGE_NAME})..."
echo "=================================================="
docker push ${IMAGE_NAME}

echo ""
echo "=================================================="
echo "✅ Docker build and push completed successfully!"
echo "=================================================="
