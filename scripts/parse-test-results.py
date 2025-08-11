#!/usr/bin/env python3
"""
Parse test results from JSON and provide AI-friendly summary
"""

import json
import sys
from pathlib import Path

def parse_vitest_results(file_path):
    """Parse Vitest JSON results and return summary"""
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    summary = {
        'type': 'vitest',
        'success': data['success'],
        'total': data['numTotalTests'],
        'passed': data['numPassedTests'],
        'failed': data['numFailedTests'],
        'skipped': data['numPendingTests'],
        'duration': data.get('duration', 0),
        'failures': []
    }
    
    # Extract failure details
    for test_file in data.get('testResults', []):
        if test_file['status'] == 'failed':
            for assertion in test_file.get('assertionResults', []):
                if assertion['status'] == 'failed':
                    summary['failures'].append({
                        'file': test_file['name'].replace('/home/ulysse/Documents/hexframe/', ''),
                        'test': assertion['title'],
                        'error': assertion.get('failureMessages', ['Unknown error'])[0][:200]
                    })
    
    return summary

def parse_playwright_results(file_path):
    """Parse Playwright JSON results and return summary"""
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    # Playwright JSON reporter has different structure
    summary = {
        'type': 'playwright',
        'success': data.get('status') == 'passed',
        'total': len(data.get('suites', [])),
        'passed': sum(1 for s in data.get('suites', []) if s.get('status') == 'passed'),
        'failed': sum(1 for s in data.get('suites', []) if s.get('status') == 'failed'),
        'skipped': sum(1 for s in data.get('suites', []) if s.get('status') == 'skipped'),
        'duration': data.get('duration', 0),
        'failures': []
    }
    
    return summary

def main():
    """Main function to parse all test results"""
    results_dir = Path('test-results')
    
    all_results = {
        'vitest': None,
        'playwright': None,
        'combined': {
            'total_tests': 0,
            'total_passed': 0,
            'total_failed': 0,
            'all_passing': True
        }
    }
    
    # Parse Vitest results
    vitest_file = results_dir / 'vitest-results.json'
    if vitest_file.exists():
        all_results['vitest'] = parse_vitest_results(vitest_file)
        all_results['combined']['total_tests'] += all_results['vitest']['total']
        all_results['combined']['total_passed'] += all_results['vitest']['passed']
        all_results['combined']['total_failed'] += all_results['vitest']['failed']
        all_results['combined']['all_passing'] &= all_results['vitest']['success']
    
    # Parse Playwright results
    playwright_file = results_dir / 'playwright-results.json'
    if playwright_file.exists():
        all_results['playwright'] = parse_playwright_results(playwright_file)
        all_results['combined']['total_tests'] += all_results['playwright']['total']
        all_results['combined']['total_passed'] += all_results['playwright']['passed']
        all_results['combined']['total_failed'] += all_results['playwright']['failed']
        all_results['combined']['all_passing'] &= all_results['playwright']['success']
    
    # Output AI-friendly summary
    print(json.dumps(all_results, indent=2))
    
    # Return exit code based on test results
    sys.exit(0 if all_results['combined']['all_passing'] else 1)

if __name__ == '__main__':
    main()