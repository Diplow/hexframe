#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src');
const FILE_PATTERNS = ['**/*.ts', '**/*.tsx'];
const EXCLUDE_PATTERNS = ['**/node_modules/**', '**/dist/**', '**/.next/**'];

function convertImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(SRC_DIR, filePath);
  const currentDir = path.dirname(relativePath);
  
  let modified = false;
  const lines = content.split('\n');
  
  const newLines = lines.map(line => {
    // Match import/export statements with relative paths
    const importMatch = line.match(/^(\s*(?:import|export).*?from\s+['"])(\.\/.+|\.\.\/.*?)(['"])(.*)$/);
    
    if (importMatch) {
      const [, prefix, relativePath, quote, suffix] = importMatch;
      
      // Resolve the absolute path from src
      const resolvedPath = path.resolve(path.join(SRC_DIR, currentDir), relativePath);
      const absolutePath = path.relative(SRC_DIR, resolvedPath);
      
      // Convert to ~/ format and normalize separators
      const absoluteImport = '~/' + absolutePath.replace(/\\/g, '/');
      
      modified = true;
      return `${prefix}${absoluteImport}${quote}${suffix}`;
    }
    
    return line;
  });
  
  if (modified) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✅ Updated: ${relativePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔄 Converting relative imports to absolute imports...\n');
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  FILE_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern, {
      cwd: SRC_DIR,
      absolute: true,
      ignore: EXCLUDE_PATTERNS
    });
    
    files.forEach(filePath => {
      totalFiles++;
      if (convertImportsInFile(filePath)) {
        modifiedFiles++;
      }
    });
  });
  
  console.log(`\n📊 Results:`);
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Modified: ${modifiedFiles}`);
  console.log(`   Unchanged: ${totalFiles - modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log('\n✨ Import conversion complete! Run the following to verify:');
    console.log('   pnpm typecheck');
    console.log('   pnpm lint');
  } else {
    console.log('\n✅ All imports are already absolute!');
  }
}

main();