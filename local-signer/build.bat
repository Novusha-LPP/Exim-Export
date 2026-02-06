@echo off
echo ==========================================
echo      Building Exim Local Signer
echo ==========================================

REM Try to set JAVA_HOME if not set (simple guess, might not work for all setups but harmless)
if "%JAVA_HOME%"=="" (
    echo JAVA_HOME is not set. Setting it to C:\Program Files\Java\jdk-25.0.2
    set "JAVA_HOME=C:\Program Files\Java\jdk-25.0.2"
)

REM Use the detected mvnd path
set MAVEN_CMD="C:\Program Files\Maven\bin\mvnd.cmd"

if exist %MAVEN_CMD% (
    echo Found Maven Daemon at: %MAVEN_CMD%
    %MAVEN_CMD% clean package -e
) else (
    echo [ERROR] Could not find Maven at C:\Program Files\Maven\bin\mvnd.cmd
    echo Please make sure Maven/mvnd is installed.
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build Failed!
    echo Please check the error messages above.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Build Complete! You can now run 'run.bat'
pause
