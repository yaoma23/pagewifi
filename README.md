# PageWiFi - AirLock Configuration

ESP32 WiFi configuration web interface for AirLock devices.

## Quick Start - Running config.html

### 1. Clone the Repository

```bash
git clone https://github.com/yaoma23/pagewifi.git
cd pagewifi
git checkout connect-everything
```

### 2. Run the Web Server

Choose one of these options:

#### Option A: Python (recommended - works on Mac/Linux/Windows)
```bash
python3 -m http.server 8000
```
Then open in your browser: **http://localhost:8000/config.html**

#### Option B: Node.js
```bash
npx http-server -p 8000
```
Then open: **http://localhost:8000/config.html**

#### Option C: PHP
```bash
php -S localhost:8000
```
Then open: **http://localhost:8000/config.html**

### That's it! 

The config page will load with:
- Dark theme UI
- AirLock logo
- WiFi network scanning (uses mock networks if ESP32 not connected)
- Network selection and password configuration

## Features

- Dark theme UI
- AirLock logo
- WiFi network scanning
- Network selection and password configuration

## Troubleshooting

- **Port already in use**: Change port number (e.g., `python3 -m http.server 8001`)
- **Python not found**: Try `python` instead of `python3` on Windows
- **Page not loading**: Make sure you're accessing via `http://localhost:8000/config.html` (not `file://`)

## Notes

- WiFi scanning will show mock networks if ESP32 backend is not connected
- For production use, ESP32 must implement the `/scan` endpoint

