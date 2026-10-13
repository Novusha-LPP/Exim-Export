$IMAGE_NAME = "punit084/export-main:latest"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[1/2] Building fresh Docker image ($IMAGE_NAME) with --no-cache..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
docker build --no-cache -t $IMAGE_NAME .

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "[2/2] Pushing image to Docker Hub ($IMAGE_NAME)..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
docker push $IMAGE_NAME

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "[SUCCESS] Docker build and push completed successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
