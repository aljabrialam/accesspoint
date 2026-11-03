#!/usr/bin/env bash
# Records each demo clip from the iOS Simulator: a prep flow lands on the first screen,
# then simctl records while a paced Maestro flow taps through the scenario.
# Needs Metro running (cd mobile && npx expo start) and the app open in Expo Go.
set -euo pipefail

cd "$(dirname "$0")"
DEVICE="${DEVICE:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"
MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"
CLIPS="${*:-airport checkout ticket mismatch glare}"
mkdir -p clips/raw
mae() { "$MAESTRO" --device "$DEVICE" test "$1" >/dev/null 2>&1 || { echo "flow failed: $1"; exit 1; }; }

xcrun simctl status_bar "$DEVICE" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularMode active --cellularBars 4 --wifiBars 3

for name in $CLIPS; do
  echo "== $name"
  mae "flows/prep-$name.yaml"
  xcrun simctl io "$DEVICE" recordVideo --codec h264 --force "clips/raw/$name.mp4" >/dev/null 2>&1 &
  rec=$!
  sleep 1.5
  mae "flows/rec-$name.yaml"
  sleep 1
  kill -INT "$rec"
  wait "$rec" || true
done

xcrun simctl status_bar "$DEVICE" clear
echo "Raw clips in demo/clips/raw"
