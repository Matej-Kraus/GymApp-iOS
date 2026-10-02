#!/usr/bin/env bash
# Release build pro iPhone + instalace přes kabel / Wi-Fi.
# Free účet: podpis platí 7 dní, pak stačí pustit znovu (data v appce zůstanou).
set -euo pipefail
cd "$(dirname "$0")/../ios"

TEAM=5WVQ93537F
APP=build/dd/Build/Products/Release-iphoneos/Workout.app

[ -d Pods ] && [ -d build/generated/ios ] || pod install

xcodebuild -workspace Workout.xcworkspace -scheme Workout -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build/dd \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=$TEAM build | tail -3

UDID=$(xcrun devicectl list devices 2>/dev/null | awk '/iPhone/ && /available|connected/ && !/unavailable/ {print $3; exit}')
if [ -z "$UDID" ]; then
  echo "iPhone není dostupný — připoj ho kabelem, odemkni a spusť znovu."
  exit 1
fi
xcrun devicectl device install app --device "$UDID" "$APP"
echo "Nainstalováno. Podpis vyprší za 7 dní."
