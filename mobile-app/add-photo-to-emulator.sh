#!/bin/bash
# Script to add a photo to Android emulator for testing

if [ -z "$1" ]; then
  echo "Usage: ./add-photo-to-emulator.sh <path-to-image.jpg>"
  echo "Example: ./add-photo-to-emulator.sh ~/Downloads/house.jpg"
  exit 1
fi

IMAGE_PATH="$1"
if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: File not found: $IMAGE_PATH"
  exit 1
fi

# Set up Android SDK path
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Push to emulator's Pictures directory (this is where MediaStore looks)
adb push "$IMAGE_PATH" /sdcard/Pictures/

# Trigger media scan so Android indexes the new image
adb shell "am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/$(basename "$IMAGE_PATH")"

echo "✅ Photo added to emulator and media scan triggered!"
echo "The image should now appear in the Gallery and ImagePicker."
echo ""
echo "If it still doesn't show:"
echo "1. Wait 5-10 seconds for the scan to complete"
echo "2. Try opening the Gallery app in the emulator first"
echo "3. Then try the ImagePicker in your app"
