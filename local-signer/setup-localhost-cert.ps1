# Run this script as Administrator to generate and trust the localhost SSL certificate
$KeystorePath = "localhost.jks"
$CertPath = "localhost.crt"

# Check if keytool is available
$keytoolPath = "keytool"
if (-not (Get-Command $keytoolPath -ErrorAction SilentlyContinue)) {
    # Try looking in java_runtime inside local-signer directory
    if (Test-Path "java_runtime\bin\keytool.exe") {
        $keytoolPath = "java_runtime\bin\keytool.exe"
    } else {
        Write-Error "keytool command not found. Please install Java or run this script from the local-signer directory."
        exit 1
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Setting up Localhost SSL Certificate" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Generate JKS keystore if it doesn't exist
if (-not (Test-Path $KeystorePath)) {
    Write-Host "🔄 Generating JKS keystore for localhost..." -ForegroundColor Yellow
    & $keytoolPath -genkeypair -alias localhost -keyalg RSA -keysize 2048 -validity 3650 -keystore $KeystorePath -storepass changeit -keypass changeit -dname "CN=localhost, O=Local, C=IN"
    Write-Host "✓ Keystore generated successfully!" -ForegroundColor Green
} else {
    Write-Host "✓ Keystore already exists." -ForegroundColor Green
}

# Export certificate if it doesn't exist
if (-not (Test-Path $CertPath)) {
    Write-Host "🔄 Exporting localhost certificate..." -ForegroundColor Yellow
    & $keytoolPath -exportcert -alias localhost -keystore $KeystorePath -storepass changeit -file $CertPath
    Write-Host "✓ Certificate exported successfully!" -ForegroundColor Green
} else {
    Write-Host "✓ Certificate already exported." -ForegroundColor Green
}

# Import certificate into Trusted Root Store
Write-Host "🔄 Installing localhost certificate into Windows Trusted Root Store..." -ForegroundColor Yellow
$certFullPath = Resolve-Path $CertPath
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"Import-Certificate -FilePath '$certFullPath' -CertStoreLocation Cert:\LocalMachine\Root`"" -Verb RunAs -Wait

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ Setup Completed successfully!" -ForegroundColor Green
Write-Host "✓ localhost.jks is created and trusted." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
