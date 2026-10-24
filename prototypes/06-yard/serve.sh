#!/usr/bin/env bash
# Serve Yard at http://127.0.0.1:8766/
cd "$(dirname "$0")"
exec python3 -m http.server 8766 --bind 0.0.0.0
