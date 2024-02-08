#!/bin/bash

# Define a cleanup function
cleanup() {
    echo "Cleaning up..."
    pnpm test:database:down
}

# Trap EXIT signal to ensure cleanup runs
trap cleanup EXIT

# Start the test database
pnpm test:database:up
sleep 5
pnpm test:database:migrate

# Check for arguments
if [ "$1" = "-w" ]; then
    # Run vitest in watch mode
    vitest
else
    # Run vitest normally
    vitest run
fi