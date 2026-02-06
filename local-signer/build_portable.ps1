$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$baseDir = $PSScriptRoot
$javaDir = "$baseDir\java_runtime"
$mavenDir = "$baseDir\maven_runtime"
$mavenVersion = "3.9.6"
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
$mavenZip = "$baseDir\maven.zip"

Write-Host "=========================================="
Write-Host "     Building Exim Local Signer"
Write-Host "=========================================="

# Step 1: Ensure Java is available
if (-not (Test-Path "$javaDir\bin\java.exe")) {
    Write-Host "[ERROR] Java runtime not found. Please run run.bat first to set up Java."
    exit 1
}

# Step 2: Download Maven if not present
if (-not (Test-Path "$mavenDir\bin\mvn.cmd")) {
    Write-Host "Maven not found. Downloading Apache Maven $mavenVersion..."
    
    try {
        Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip -UseBasicParsing
    } catch {
        Write-Error "Failed to download Maven: $_"
        exit 1
    }
    
    Write-Host "Extracting Maven..."
    if (Test-Path "$baseDir\temp_maven") { Remove-Item "$baseDir\temp_maven" -Recurse -Force }
    Expand-Archive -Path $mavenZip -DestinationPath "$baseDir\temp_maven" -Force
    
    $extractedRoot = Get-ChildItem "$baseDir\temp_maven" | Where-Object { $_.PSIsContainer } | Select-Object -First 1
    if ($null -eq $extractedRoot) {
        Write-Error "Could not find extracted Maven folder."
        exit 1
    }
    Move-Item -Path $extractedRoot.FullName -Destination $mavenDir
    
    Remove-Item $mavenZip -Force -ErrorAction SilentlyContinue
    Remove-Item "$baseDir\temp_maven" -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "Maven setup complete."
}

# Step 3: Set environment and build
$env:JAVA_HOME = $javaDir
$env:M2_HOME = $mavenDir
$env:PATH = "$javaDir\bin;$mavenDir\bin;$env:PATH"

Write-Host "Using Java: $env:JAVA_HOME"
Write-Host "Using Maven: $env:M2_HOME"
Write-Host ""

Set-Location $baseDir

# Run Maven build
Write-Host "Building project..."
& "$mavenDir\bin\mvn.cmd" clean package -DskipTests -q

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Build complete!"
    Write-Host "Run .\run.bat to start the application."
} else {
    Write-Host ""
    Write-Host "[ERROR] Build failed. Check errors above."
    exit 1
}
