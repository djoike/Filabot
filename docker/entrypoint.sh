#!/bin/sh
set -eu

INTERVAL="${CHECK_INTERVAL_SECONDS:-300}"

echo "Filabot container started. Interval: ${INTERVAL}s"

while true; do
  echo "Running stock check at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if node dist/index.js; then
    echo "Stock check completed successfully"
  else
    echo "Stock check failed; retrying after sleep" >&2
  fi

  sleep "${INTERVAL}"
done
