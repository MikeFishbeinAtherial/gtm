#!/bin/bash

# Stop local test campaign script

echo "🛑 Stopping local campaign script..."

# Find and kill the process
pkill -f "test-campaign-10.js"

if [ $? -eq 0 ]; then
    echo "✅ Local script stopped"
else
    echo "⚠️  No running process found (may have already stopped)"
fi

# Also check for campaign-worker.js
pkill -f "campaign-worker.js"

echo "✅ Done"

