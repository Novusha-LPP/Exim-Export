@echo off
echo ==========================================
echo      Running Exim Local Signer
echo ==========================================

if not exist target\local-signer-1.0-SNAPSHOT.jar (
    echo [ERROR] JAR file not found. Please run 'build.bat' first.
    pause
    exit /b 1
)

java -jar target\local-signer-1.0-SNAPSHOT.jar

pause
