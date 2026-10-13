#!/bin/bash
set -e

IMAGE_NAME="punit084/export-main:latest"

echo "=================================================="
echo "[1/2] Building fresh Docker image (${IMAGE_NAME}) with --no-cache..."
echo "=================================================="
docker build --no-cache -t ${IMAGE_NAME} .

echo ""
echo "=================================================="
echo "[2/2] Pushing image to Docker Hub (${IMAGE_NAME})..."
echo "=================================================="
docker push ${IMAGE_NAME}

echo ""
echo "=================================================="
echo "✅ Docker build and push completed successfully!"
echo "=================================================="
