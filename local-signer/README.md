# Exim Local DSC Signer

This is a local Java application that bridges the gap between the Cloud (Exim Export App) and your local USB Digital Signature Token.

## Logic

1. It polls the Cloud API (`GET /api/signer/jobs`) for jobs marked as "Ready To Sign".
2. It prompts you for your USB Token PIN.
3. It signs the job data using the key on your USB token.
4. It uploads the signed file back to the Cloud (`POST /api/signer/upload`).

## Prerequisites

- **Java 11** or higher installed.
- **Maven** installed (for building).
- **USB Token Drivers** installed (e.g., ePass2003, WatchData, etc.).
  - Ensure you know the path to the driver DLL (e.g., `C:\Windows\System32\eps2003csp11.dll`).

## Building

Open a terminal in this directory and run:

```bash
mvn clean package
```

This will create a runnable JAR file in the `target/` folder: `local-signer-1.0-SNAPSHOT.jar`.

## Running

Run the application using Java:

```bash
java -jar target/local-signer-1.0-SNAPSHOT.jar
```

## Usage

1. **Server URL**: Enter the URL of your backend (default: `http://localhost:9002`).
2. **DLL Path**: Enter the absolute path to your USB Token's PKCS#11 DLL.
   - **HyperPKI (ePass)**: `C:\Windows\System32\eps2003csp11.dll`
   - **ProxKey (WatchData)**: `C:\Windows\System32\wdpkcs.dll`
   - **SafeNet**: `C:\Windows\System32\eTPKCS11.dll`
3. Click **Start Service**.
4. Enter your **Token PIN** when prompted.
5. Watch the logs. The app will automatically sign any job you "Send to Signer" from the Web Dashboard.

## Troubleshooting

- **"No certificate found"**: Ensure your token is plugged in and the driver is installed. Try re-plugging it.
- **"DLL not found"**: Verify the path to the DLL file.
- **"Connection Refused"**: Ensure the Node.js backend is running.
