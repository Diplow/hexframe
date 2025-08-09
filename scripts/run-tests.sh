#!/bin/bash

# Run tests with proper isolation for React component tests - AI version
# This replicates run-tests-isolated.sh but with AI-friendly JSON output

# Exit on error and ensure pipeline failures are detected
set -e
set -o pipefail

# Enable AI parsing mode
export AI_PARSING=true

# Create test-results directory if it doesn't exist
mkdir -p test-results

# Clean previous results
rm -f test-results/*.json
rm -f test-results/*.tmp.json
rm -f test-results/*.log

echo "Running tests with AI-friendly output (with isolation)..."
echo "========================================="

# Check if we're running in CI environment
if [ "$CI" = "true" ]; then
  STORYBOOK_EXCLUDE="--exclude '**/not-found.stories.tsx' --exclude '**/loading-states.stories.tsx'"
else
  STORYBOOK_EXCLUDE=""
fi

# First, run all tests except the problematic ones
echo "Phase 1: Main test suite (excluding React component and drag-and-drop tests)..."
pnpm vitest run --config vitest.config.ts \
  --exclude "**/base.test.tsx" \
  --exclude "**/auth-tile.test.tsx" \
  --exclude "**/auth.test.tsx" \
  --exclude "**/page.test.tsx" \
  --exclude "**/useDragAndDrop.test.ts" \
  --exclude "**/enhanced-drag-drop.test.ts" \
  --exclude "**/TileActionsContext.test.tsx" \
  --exclude "**/Toolbox.integration.test.tsx" \
  --exclude "**/useKeyboardShortcuts.test.tsx" \
  --exclude "**/ToolStateManager.test.tsx" \
  --exclude "**/Toolbox.test.tsx" \
  --exclude "**/item-tile-content.test.tsx" \
  --exclude "**/BaseComponents.test.tsx" \
  --exclude "**/content.test.tsx" \
  --exclude "**/multi-line-title.test.tsx" \
  --exclude "**/use-item-state.test.tsx" \
  --exclude "**/ChatPanel.test.tsx" \
  --exclude "**/ChatPanel.fixed.test.tsx" \
  --exclude "**/ChatPanel.send-message.test.tsx" \
  --exclude "**/ChatPanel.debug-message.test.tsx" \
  --exclude "**/ChatPanel.render-debug.test.tsx" \
  --exclude "**/useChatState.test.tsx" \
  $STORYBOOK_EXCLUDE 2>test-results/main-suite.log

MAIN_EXIT_CODE=$?
mv test-results/vitest-results.json test-results/main.tmp.json 2>>test-results/main-suite.log || true

# Then run the React component tests in isolation with single thread
echo "Phase 2: React component tests (isolated, single thread)..."
REACT_TEST_FILES=""
for file in \
  src/app/static/map/Tile/Base/base.test.tsx \
  src/app/map/Tile/Auth/__tests__/auth-tile.test.tsx \
  src/app/map/Tile/Auth/__tests__/auth.test.tsx \
  src/app/auth/logout/__tests__/page.test.tsx \
  src/app/map/Canvas/TileActionsContext.test.tsx \
  src/app/map/Controls/Toolbox/Toolbox.integration.test.tsx \
  src/app/map/hooks/useKeyboardShortcuts.test.tsx \
  src/app/map/Controls/Toolbox/ToolStateManager.test.tsx \
  src/app/map/Controls/Toolbox/Toolbox.test.tsx \
  src/app/map/Tile/Item/_components/__tests__/item-tile-content.test.tsx \
  src/app/map/components/__tests__/BaseComponents.test.tsx \
  src/app/map/Tile/Item/__tests__/content.test.tsx \
  src/app/map/Tile/Item/__tests__/multi-line-title.test.tsx \
  src/app/map/Tile/Item/_hooks/__tests__/use-item-state.test.tsx \
  src/app/map/Chat/__tests__/ChatPanel.test.tsx \
  src/app/map/Chat/__tests__/ChatPanel.send-message.test.tsx \
  src/app/map/Chat/__tests__/ChatPanel.debug-message.test.tsx \
  src/app/map/Chat/__tests__/ChatPanel.render-debug.test.tsx \
  src/app/map/Chat/__tests__/useChatState.test.tsx
do
  if [ -f "$file" ]; then
    REACT_TEST_FILES="$REACT_TEST_FILES $file"
  fi
done

if [ -n "$REACT_TEST_FILES" ]; then
  pnpm vitest run --config vitest.config.ts --pool=forks --poolOptions.forks.singleFork $REACT_TEST_FILES 2>test-results/react-components.log
  REACT_EXIT_CODE=$?
  mv test-results/vitest-results.json test-results/react.tmp.json 2>>test-results/react-components.log || true
else
  REACT_EXIT_CODE=0
fi

# Then run the drag-and-drop tests in isolation
echo "Phase 3: Drag-and-drop tests (isolated)..."
pnpm vitest run --config vitest.config.ts \
  src/app/map/Canvas/hooks/__tests__/useDragAndDrop.test.ts \
  src/app/map/Canvas/hooks/__tests__/enhanced-drag-drop.test.ts 2>test-results/drag-drop.log

DRAG_EXIT_CODE=$?
mv test-results/vitest-results.json test-results/drag.tmp.json 2>>test-results/drag-drop.log || true

# Merge all JSON results
echo ""
echo "Merging test results..."
# Pass exit codes as environment variables to Python
MAIN_EXIT_CODE=$MAIN_EXIT_CODE REACT_EXIT_CODE=$REACT_EXIT_CODE DRAG_EXIT_CODE=$DRAG_EXIT_CODE python3 -c "
import json
import os

def load_json_safe(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return json.load(f)
    return None

# Get exit codes from environment
main_exit_code = int(os.environ.get('MAIN_EXIT_CODE', '0'))
react_exit_code = int(os.environ.get('REACT_EXIT_CODE', '0'))
drag_exit_code = int(os.environ.get('DRAG_EXIT_CODE', '0'))

# Load individual results
main_data = load_json_safe('test-results/main.tmp.json')
react_data = load_json_safe('test-results/react.tmp.json')
drag_data = load_json_safe('test-results/drag.tmp.json')

# Initialize combined results
combined = {
    'success': True,
    'startTime': 0,
    'endTime': 0,
    'duration': 0,
    'numTotalTests': 0,
    'numPassedTests': 0,
    'numFailedTests': 0,
    'numPendingTests': 0,
    'numTodoTests': 0,
    'testResults': []
}

# Merge data from each phase and check exit codes
phases = [
    (main_data, main_exit_code, 'main'),
    (react_data, react_exit_code, 'react'),
    (drag_data, drag_exit_code, 'drag')
]

for data, exit_code, phase_name in phases:
    # Check if phase succeeded based on both JSON and exit code
    phase_success = exit_code == 0
    if data:
        # If we have JSON data, combine with its success flag
        phase_success = phase_success and data.get('success', False)
        combined['numTotalTests'] += data.get('numTotalTests', 0)
        combined['numPassedTests'] += data.get('numPassedTests', 0)
        combined['numFailedTests'] += data.get('numFailedTests', 0)
        combined['numPendingTests'] += data.get('numPendingTests', 0)
        combined['numTodoTests'] += data.get('numTodoTests', 0)
        combined['testResults'].extend(data.get('testResults', []))
        
        # Update time bounds
        if data.get('startTime'):
            if combined['startTime'] == 0 or data['startTime'] < combined['startTime']:
                combined['startTime'] = data['startTime']
        if data.get('endTime'):
            if data['endTime'] > combined['endTime']:
                combined['endTime'] = data['endTime']
    elif exit_code != 0:
        # Phase failed but no JSON was written (likely crashed)
        print(f'Warning: {phase_name} phase failed with exit code {exit_code} but no JSON output was generated')
        phase_success = False
    
    # Update overall success status
    combined['success'] = combined['success'] and phase_success

# Calculate duration
if combined['endTime'] and combined['startTime']:
    combined['duration'] = combined['endTime'] - combined['startTime']

# Write combined results
with open('test-results/vitest-results.json', 'w') as f:
    json.dump(combined, f, indent=2)

# Clean up temp files
for temp_file in ['main.tmp.json', 'react.tmp.json', 'drag.tmp.json']:
    filepath = f'test-results/{temp_file}'
    if os.path.exists(filepath):
        os.remove(filepath)

print('Test results merged successfully')
"

# Display summary
echo ""
echo "Test Results Summary:"
echo "========================================="

python3 -c "
import json

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

# Show status
if data['success']:
    print(\"✅ All tests passed!\")
else:
    print(f\"❌ {data['numFailedTests']} tests failed\")
    print()
    print(\"Failed Tests Details:\")
    print(\"=\"*40)
    failed_count = 0
    for test_file in data.get('testResults', []):
        if test_file.get('status') == 'failed':
            file_name = test_file['name'].replace('/home/ulysse/Documents/hexframe/', '')
            print(f\"\\n📁 {file_name}\")
            for assertion in test_file.get('assertionResults', []):
                if assertion.get('status') == 'failed':
                    failed_count += 1
                    print(f\"  ❌ {assertion.get('title', 'Unknown test')}\")
                    if failed_count >= 10:
                        remaining = data['numFailedTests'] - failed_count
                        if remaining > 0:
                            print(f\"\\n  ... and {remaining} more failures\")
                        break
            if failed_count >= 10:
                break

print()
print(\"📄 Full JSON results: test-results/vitest-results.json\")
"

echo "========================================="

# Calculate final exit code
OVERALL_EXIT_CODE=0
if [ $MAIN_EXIT_CODE -ne 0 ] || [ $REACT_EXIT_CODE -ne 0 ] || [ $DRAG_EXIT_CODE -ne 0 ]; then
  OVERALL_EXIT_CODE=1
  echo ""
  echo "📋 Error logs available in:"
  [ -f test-results/main-suite.log ] && [ -s test-results/main-suite.log ] && echo "  - test-results/main-suite.log"
  [ -f test-results/react-components.log ] && [ -s test-results/react-components.log ] && echo "  - test-results/react-components.log"
  [ -f test-results/drag-drop.log ] && [ -s test-results/drag-drop.log ] && echo "  - test-results/drag-drop.log"
fi

exit $OVERALL_EXIT_CODE