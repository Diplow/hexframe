#!/usr/bin/env node

/**
 * Script to validate color usage across the codebase
 * This can be run as a pre-commit hook or in CI
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy validation logic from ESLint rule (since we can't easily import it)
const ALLOWED_COLOR_PATTERNS = [
  // Semantic colors with opacity modifiers (PREFERRED)
  /^(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral|info)(\/(10|20|25|50|75))?$/,
  /^(hover:)?(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral|info)(\/(10|20|25|50|75))?$/,
  /^(dark:)?(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral|info)(\/(10|20|25|50|75))?$/,
  /^(dark:hover:)?(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral|info)(\/(10|20|25|50|75))?$/,
  
  // Spatial colors
  /^(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  /^(hover:)?(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  /^(dark:)?(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  /^(dark:hover:)?(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  
  // Depth variants
  /^fill-(center|nw|ne|e|se|sw|w)-depth-[0-8]$/,
  
  // Standard UI colors
  /^(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  /^(hover:)?(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  /^(dark:)?(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  /^(dark:hover:)?(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  
  // Chart colors
  /^(text|bg|fill)-chart-[1-5]$/,
  
  // Special cases
  /^(text|bg)-transparent$/,
  /^(text|bg|border)-current$/,
  /^(text|bg|border)-inherit$/,
  /^(text|bg)-white$/,
  /^(text|bg)-black$/,
  /^(text|bg)-black\/(10|20|25|50|75|80|90)$/,
  /^(text|bg)-white\/(10|20|25|50|75|80|90)$/,
  
  // Focus and group variants
  /^(focus-visible:|focus:|group-hover:|group-focus-visible:)(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  /^(dark:focus-visible:|dark:focus:|dark:group-hover:|dark:group-focus-visible:)(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  
  // Ring offsets
  /^ring-offset-(background|white)$/,
  /^dark:ring-offset-(background|neutral-900)$/,
  
  // Hex-specific
  /^(text|bg|border|fill)-hex-(border|fill)(-hover|-selected)?$/,
  
  // Stroke colors
  /^stroke-(color-\d+|neutral-\d+)$/,
];

const DIRECT_COLOR_PATTERNS = [
  /^(text|bg|border|ring|fill|from|via|to)-(slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$/,
  /^(hover:|focus:|active:|dark:|group-hover:|group-focus:)*(text|bg|border|ring|fill|from|via|to)-(slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$/,
];

// Invalid tint usage patterns (semantic colors with tint suffixes that don't work)
const INVALID_TINT_PATTERNS = [
  /^(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral|info)-\d{2,3}$/,
  /^(hover:|focus:|active:|dark:|group-hover:|group-focus:)+(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral|info)-\d{2,3}$/,
];

const EXCEPTIONS = [
  // Toolbox exceptions
  /^(dark:)?(text|hover:text)-(cyan|indigo|purple|green|amber|rose)-(300|400|700)$/,
  /^(dark:)?(bg|hover:bg)-(cyan|indigo|purple|green|amber|rose)-(100|900\/20)$/,
  /^ring-(cyan|indigo|purple|green|amber|rose)-500$/,
  /^focus-visible:ring-(cyan|indigo|purple|green|amber|rose)-500$/,
  
  // Drop shadow effects
  /^(group-hover:|group-focus-visible:)?drop-shadow-\[.*\]$/,
  /^filter$/,
  
  // Theme toggle
  /^(group-hover:)?text-violet-500$/,
];

function isAllowedClass(className) {
  const cleanClass = className.replace(/^(sm:|md:|lg:|xl:|2xl:)/, '');
  
  if (ALLOWED_COLOR_PATTERNS.some(pattern => pattern.test(cleanClass))) {
    return true;
  }
  
  if (EXCEPTIONS.some(pattern => pattern.test(cleanClass))) {
    return true;
  }
  
  if (DIRECT_COLOR_PATTERNS.some(pattern => pattern.test(cleanClass))) {
    return false;
  }
  
  return true;
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// File patterns to check
const FILE_PATTERNS = [
  'src/**/*.{tsx,ts,jsx,js}',
  'app/**/*.{tsx,ts,jsx,js}',
  'components/**/*.{tsx,ts,jsx,js}',
];

// Patterns to ignore
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/*.stories.{ts,tsx,js,jsx}',
];

// Regular expressions to find class names in code
const CLASS_NAME_PATTERNS = [
  /className\s*=\s*["'`]([^"'`]+)["'`]/g,
  /class\s*=\s*["'`]([^"'`]+)["'`]/g,
  /\bclsx?\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /\bcn\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /\btw\s*\(\s*["'`]([^"'`]+)["'`]/g,
];

// Color mappings for suggestions
const COLOR_MAPPINGS = {
  'violet': 'primary',
  'amber': 'secondary',
  'green': 'success',
  'cyan': 'link',
  'rose': 'destructive',
  'slate': 'neutral',
  'gray': 'neutral',
  'zinc': 'neutral',
};

function extractClassNames(content) {
  const classes = new Set();
  
  CLASS_NAME_PATTERNS.forEach(pattern => {
    let match;
    // Reset the regex for each use
    pattern.lastIndex = 0;
    const contentCopy = content;
    while ((match = pattern.exec(contentCopy)) !== null) {
      const classString = match[1];
      if (classString) {
        classString.split(/\s+/).forEach(cls => {
          if (cls) classes.add(cls);
        });
      }
    }
  });
  
  return Array.from(classes);
}

function getSuggestion(className) {
  for (const [direct, semantic] of Object.entries(COLOR_MAPPINGS)) {
    if (className.includes(`-${direct}-`)) {
      return className.replace(`-${direct}-`, `-${semantic}-`);
    }
  }
  return null;
}

function getOpacitySuggestion(className) {
  // Convert tint suffixes to opacity modifiers
  const tintToOpacity = {
    '50': '10',
    '100': '20',
    '200': '25',
    '300': '25',
    '400': '50',
    '500': '50',
    '600': '75',
    '700': '75',
    '800': '90',
    '900': '90',
  };
  
  // Extract the tint number
  const match = className.match(/^(.+)-(\d{2,3})$/);
  if (match) {
    const [, baseClass, tintNumber] = match;
    const opacityValue = tintToOpacity[tintNumber] || '50';
    return `${baseClass}/${opacityValue}`;
  }
  
  return className.replace(/-\d{2,3}$/, '/50'); // fallback
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const classes = extractClassNames(content);
  const violations = [];
  
  classes.forEach(className => {
    // Check for invalid tint usage (semantic colors with tint suffixes)
    const isInvalidTint = INVALID_TINT_PATTERNS.some(pattern => pattern.test(className));
    if (isInvalidTint) {
      const suggestion = getOpacitySuggestion(className);
      violations.push({
        className,
        suggestion,
        line: findLineNumber(content, className),
        type: 'invalid-tint'
      });
      return; // Don't check other patterns for this class
    }
    
    // Check if it's a direct color that should be avoided
    const isDirectColor = DIRECT_COLOR_PATTERNS.some(pattern => pattern.test(className));
    if (isDirectColor && !isAllowedClass(className)) {
      const suggestion = getSuggestion(className);
      violations.push({
        className,
        suggestion,
        line: findLineNumber(content, className),
        type: 'direct-color'
      });
    }
  });
  
  return violations;
}

function findLineNumber(content, searchString) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1;
    }
  }
  return 0;
}

async function main() {
  console.log(`${colors.blue}🎨 Validating color usage against design system...${colors.reset}\n`);
  
  // Find all files to check
  const files = [];
  for (const pattern of FILE_PATTERNS) {
    const matches = await glob(pattern, { ignore: IGNORE_PATTERNS });
    files.push(...matches);
  }
  
  console.log(`${colors.gray}Checking ${files.length} files...${colors.reset}\n`);
  
  let totalViolations = 0;
  const fileViolations = {};
  
  files.forEach(file => {
    const violations = validateFile(file);
    if (violations.length > 0) {
      fileViolations[file] = violations;
      totalViolations += violations.length;
    }
  });
  
  if (totalViolations === 0) {
    console.log(`${colors.green}✅ All color usage follows the design system!${colors.reset}\n`);
    process.exit(0);
  }
  
  // Report violations
  console.log(`${colors.red}❌ Found ${totalViolations} design system violations:${colors.reset}\n`);
  
  Object.entries(fileViolations).forEach(([file, violations]) => {
    console.log(`${colors.yellow}${file}:${colors.reset}`);
    violations.forEach(({ className, suggestion, line, type }) => {
      const lineInfo = line ? `Line ${line}` : 'Unknown line';
      const errorType = type === 'invalid-tint' ? 
        '⚠️  Invalid tint usage (use opacity modifier instead):' : 
        '❌ Direct color usage:';
      console.log(`  ${colors.gray}${lineInfo}:${colors.reset} ${errorType} ${colors.red}${className}${colors.reset}`);
      if (suggestion) {
        console.log(`    ${colors.green}→ Suggestion: ${suggestion}${colors.reset}`);
      }
    });
    console.log('');
  });
  
  console.log(`${colors.gray}To fix these issues:${colors.reset}`);
  console.log(`1. Replace direct color classes with semantic alternatives`);
  console.log(`2. Use the design system colors defined in globals.css`);
  console.log(`3. Refer to config/design-system-colors.json for allowed classes`);
  console.log(`\n${colors.gray}To temporarily disable validation, set SKIP_COLOR_VALIDATION=true${colors.reset}\n`);
  
  process.exit(1);
}

main().catch(console.error);