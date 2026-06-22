#!/bin/sh
set -e

BASE="${1:-http://localhost:3001}"

echo "Checking Tack at $BASE"

code=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE/login")
if [ "$code" != "200" ]; then
  echo "FAIL: /login returned $code"
  exit 1
fi
echo "OK: /login ($code)"

code=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE/tack-widget.js")
if [ "$code" != "200" ]; then
  echo "FAIL: /tack-widget.js returned $code"
  exit 1
fi
echo "OK: /tack-widget.js ($code)"

echo "All smoke checks passed"
