#!/bin/bash

# Run tests with AI-friendly JSON output
# This script runs tests with minimal output and generates JSON results

# Enable AI parsing mode
export AI_PARSING=true

# Create test-results directory if it doesn't exist
mkdir -p test-results

# Clean previous results
rm -f test-results/*.json

# Run main test suite with JSON output
echo "Running tests with AI-friendly output..."

# Run all Vitest tests with JSON reporter
pnpm vitest run --config vitest.config.ts

VITEST_EXIT_CODE=$?

# Check if JSON output was created
if [ -f "test-results/vitest-results.json" ]; then
  echo "Test results written to test-results/vitest-results.json"
else
  echo "Error: No test results file generated"
  exit 1
fi

exit $VITEST_EXIT_CODE