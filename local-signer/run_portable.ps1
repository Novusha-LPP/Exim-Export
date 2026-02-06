$ErrorActionPreference = "Stop"
$jdkUrl = "https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip"
$baseDir = $PSScriptRoot
$localJavaDir = "$baseDir\java_runtime"
$zipFile = "$baseDir\jdk.zip"
$tempDir = "$baseDir\temp_jdk"

# Check if we already have a working Java
if (-not (Test-Path "$localJavaDir\bin\java.exe")) {
    Write-Host "Java 11+ is required but not found. Setting up portable Java 17..."
    
    # Download
    Write-Host "Downloading OpenJDK 17 (Microsoft Build)..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $jdkUrl -OutFile $zipFile -UseBasicParsing
    } catch {
        Write-Error "Failed to download JDK: $_"
        exit 1
    }

    # Extract
    Write-Host "Extracting JDK..."
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
    
    # Move
    $extractedRoot = Get-ChildItem $tempDir | Where-Object { $_.PSIsContainer } | Select-Object -First 1
    if ($null -eq $extractedRoot) {
        Write-Error "Could not find unzipped JDK folder."
        exit 1
    }
    
    Move-Item -Path $extractedRoot.FullName -Destination $localJavaDir
    
    # Cleanup
    Remove-Item $zipFile -Force
    Remove-Item $tempDir -Recurse -Force
    
    Write-Host "Java setup complete."
}

# Run
Write-Host "Launching Local Signer..."
$javaPath = "$localJavaDir\bin\java.exe"
$jarPath = "$baseDir\target\local-signer-1.0-SNAPSHOT.jar"

if (-not (Test-Path $jarPath)) {
    Write-Error "JAR file not found at $jarPath. Did you build the project?"
    exit 1
}

& $javaPath -jar $jarPath
