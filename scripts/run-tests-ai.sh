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
echo "========================================="

# Run all Vitest tests with JSON reporter (suppress stderr warnings)
pnpm vitest run --config vitest.config.ts 2>/dev/null

VITEST_EXIT_CODE=$?

# Check if JSON output was created and parse it
if [ -f "test-results/vitest-results.json" ]; then
  echo ""
  echo "Test Results Summary:"
  echo "========================================="
  
  # Parse and display the results using Python
  python3 -c "
import json
import sys

with open('test-results/vitest-results.json', 'r') as f:
    data = json.load(f)

# Calculate pass rate
pass_rate = (data['numPassedTests'] / data['numTotalTests'] * 100) if data['numTotalTests'] > 0 else 0

# Print summary
print(f\"📊 Test Statistics:\")
print(f\"  Total Tests:  {data['numTotalTests']}\")
print(f\"  ✅ Passed:     {data['numPassedTests']}\")
print(f\"  ❌ Failed:     {data['numFailedTests']}\")
print(f\"  ⏭️  Skipped:    {data['numPendingTests']}\")
print(f\"  📈 Pass Rate:  {pass_rate:.1f}%\")
print()

# Show failed test details if any
if data['numFailedTests'] > 0:
    print(f\"Failed Tests Details:\")
    print(\"=\"*40)
    failed_count = 0
    for test_file in data.get('testResults', []):
        if test_file['status'] == 'failed':
            file_name = test_file['name'].replace('/home/ulysse/Documents/hexframe/', '')
            print(f\"\\n📁 {file_name}\")
            for assertion in test_file.get('assertionResults', []):
                if assertion['status'] == 'failed':
                    failed_count += 1
                    print(f\"  ❌ {assertion['title']}\")
                    if failed_count >= 10:
                        remaining = data['numFailedTests'] - failed_count
                        if remaining > 0:
                            print(f\"\\n  ... and {remaining} more failures\")
                        break
            if failed_count >= 10:
                break

# Print JSON file location
print()
print(\"📄 Full JSON results: test-results/vitest-results.json\")
print(\"🔍 Parse with: python3 scripts/parse-test-results.py\")
"
  
  echo ""
  echo "========================================="
  
  # Also run the full parser if it exists
  if [ -f "scripts/parse-test-results.py" ]; then
    echo ""
    echo "Detailed AI-Friendly JSON Output:"
    echo "========================================="
    python3 scripts/parse-test-results.py 2>/dev/null | head -50
    echo ""
    echo "(Output truncated to first 50 lines)"
  fi
else
  echo "Error: No test results file generated"
  exit 1
fi

exit $VITEST_EXIT_CODE