# Run paxa on a physical Android phone (Windows)
# Prerequisites: USB debugging ON, phone connected, same Wi‑Fi as PC.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

$devices = adb devices | Select-String "device$"
if (-not $devices) {
  Write-Host ""
  Write-Host "No phone detected. On your Android phone:" -ForegroundColor Yellow
  Write-Host "  1. Settings -> About -> tap Build number 7x -> enable Developer options"
  Write-Host "  2. Settings -> Developer options -> USB debugging ON"
  Write-Host "  3. Connect USB cable, accept the RSA fingerprint prompt"
  Write-Host "  4. Re-run: .\mobile\scripts\run-android-phone.ps1"
  exit 1
}

Write-Host "Device(s): $devices"

# Forward Metro + API to phone via USB (works even if Wi‑Fi IP changes)
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000

Set-Location "$root\mobile"
Write-Host "Building and installing on phone..."
npx react-native run-android
