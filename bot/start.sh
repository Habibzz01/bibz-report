#!/bin/sh
set -e

echo "Starting bibz-report-bot..."

# Run database initialization if needed
echo "Running build..."
npm run build

echo "Starting bot..."
exec node dist/index.js
