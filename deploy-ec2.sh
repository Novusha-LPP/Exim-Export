#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 EXIM-EXPORT PLATFORM — EC2 DOCKER DEPLOYMENT"
echo "=========================================================="

# Check Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Ensure server/.env exists
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.example" ]; then
        echo "⚠️  Warning: server/.env not found. Creating from server/.env.example..."
        cp server/.env.example server/.env
        echo "👉 Please update server/.env with your production credentials!"
    else
        echo "❌ Error: server/.env is missing."
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p server/logs

echo ""
echo "📦 [1/3] Building Frontend and Backend Docker images..."
docker compose build

echo ""
echo "🚀 [2/3] Starting Containers (Detached Mode)..."
docker compose up -d

echo ""
echo "🩺 [3/3] Checking Running Containers..."
docker compose ps

echo ""
echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "🌐 Frontend available at: http://<EC2-PUBLIC-IP> (Port 80)"
echo "🔌 Backend API available at: http://<EC2-PUBLIC-IP>:9002 (or via /api on Port 80)"
echo "=========================================================="
