$IMAGE_NAME = "punit084/export-main:latest"

Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "🧹 [1/3] Clearing Docker build cache & unused images..." -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
docker system prune -a --volumes -f

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🔨 [2/3] Building fresh Docker image ($IMAGE_NAME) with --no-cache..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
docker build --no-cache -t $IMAGE_NAME .

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "🚀 [3/3] Pushing image to Docker Hub ($IMAGE_NAME)..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
docker push $IMAGE_NAME

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ Docker build and push completed successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
