#!/usr/bin/env node

/**
 * Dependency Analyzer
 * 
 * Scans a subsystem's actual imports and generates minimal dependencies.json
 * Usage: node scripts/analyze-dependencies.js <path-to-subsystem>
 * 
 * Features:
 * - Identifies all outbound imports from TypeScript files
 * - Converts relative paths to absolute paths with ~/ prefix
 * - Groups similar imports to identify common patterns
 * - Suggests allowedChildren candidates for optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/analyze-dependencies.js <path-to-subsystem>');
    process.exit(1);
  }
  
  const subsystemPath = args[0];
  if (!fs.existsSync(subsystemPath)) {
    console.error(`Error: Path ${subsystemPath} does not exist`);
    process.exit(1);
  }
  
  return { subsystemPath: path.resolve(subsystemPath) };
}

function findTypeScriptFiles(dir) {
  const files = [];
  
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip test directories and node_modules
        if (!entry.name.includes('test') && 
            !entry.name.includes('__tests__') && 
            entry.name !== 'node_modules') {
          scan(fullPath);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          // Skip test files
          if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            files.push(fullPath);
          }
        }
      }
    }
  }
  
  scan(dir);
  return files;
}

function extractImports(filePath, subsystemPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  
  // Match import statements
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Include all external imports:
    // - Relative imports (../)
    // - Absolute imports (~/)
    // - Package imports (not starting with ./ and not internal)
    if (importPath.startsWith('../') || 
        importPath.startsWith('~/') || 
        (!importPath.startsWith('.') && !importPath.startsWith('/'))) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

function isInternalImport(importPath, subsystemPath) {
  // Convert subsystem path to absolute format
  const srcIndex = subsystemPath.indexOf('/src/');
  if (srcIndex === -1) return false;
  
  const subsystemAbsPath = '~/' + subsystemPath.substring(srcIndex + 5);
  
  // Check if import is within the same subsystem
  return importPath.startsWith(subsystemAbsPath + '/') || importPath === subsystemAbsPath;
}

function convertRelativeToAbsolute(importPath, subsystemPath) {
  if (importPath.startsWith('~/')) {
    return importPath; // Already absolute
  }
  
  // Package imports (like 'react', 'next', etc.) stay as is
  if (!importPath.startsWith('../') && !importPath.startsWith('./') && !importPath.startsWith('/')) {
    return importPath;
  }
  
  // Handle relative imports
  if (importPath.startsWith('../')) {
    // Convert subsystem path to relative from src/
    const srcIndex = subsystemPath.indexOf('/src/');
    if (srcIndex === -1) {
      console.warn(`Warning: Could not find src/ in path ${subsystemPath}`);
      return importPath;
    }
    
    const subsystemRelativeToSrc = subsystemPath.substring(srcIndex + 5); // Remove "/src/"
    const resolvedPath = path.resolve(path.join('/tmp/src', subsystemRelativeToSrc), importPath);
    
    // Convert to absolute path with ~/ prefix
    const absolutePath = resolvedPath.replace('/tmp/src/', '~/');
    return absolutePath;
  }
  
  return importPath;
}

function groupImportsByPattern(imports) {
  const groups = {};
  
  for (const imp of imports) {
    // Extract the base path (everything before the last segment)
    const segments = imp.split('/');
    if (segments.length > 1) {
      const basePath = segments.slice(0, -1).join('/');
      if (!groups[basePath]) {
        groups[basePath] = [];
      }
      groups[basePath].push(imp);
    } else {
      // Single segment imports
      if (!groups['_single']) {
        groups['_single'] = [];
      }
      groups['_single'].push(imp);
    }
  }
  
  return groups;
}

function identifyCommonPatterns(groups, subsystems, uniqueImports) {
  const suggestions = {
    allowed: [],
    allowedChildren: []
  };
  
  // If there are subsystems, suggest allowedChildren for common dependencies
  if (subsystems.length > 0) {
    // Analyze which imports could be shared among subsystems
    const commonDependencies = [];
    
    // Common framework dependencies that are typically shared
    const frameworkDeps = uniqueImports.filter(imp => 
      imp === 'react' || 
      imp === 'next' ||
      imp.startsWith('next/') ||
      imp.includes('/types') ||
      imp.includes('/utils')
    );
    
    if (frameworkDeps.length > 0) {
      console.log('📋 Framework dependencies detected - good candidates for allowedChildren:');
      for (const dep of frameworkDeps) {
        console.log(`  • ${dep}`);
        suggestions.allowedChildren.push(dep);
      }
    }
    
    // Path-based suggestions
    for (const [basePath, imports] of Object.entries(groups)) {
      if (basePath === '_single') {
        // Check single imports for common patterns
        for (const imp of imports) {
          if (!suggestions.allowedChildren.includes(imp) && 
              (imp === 'react' || imp.includes('/types') || imp.includes('/utils'))) {
            suggestions.allowedChildren.push(imp);
          } else if (!suggestions.allowedChildren.includes(imp)) {
            suggestions.allowed.push(imp);
          }
        }
      } else if (imports.length >= 2) {
        // If we have 2+ imports from the same base path and there are subsystems, suggest allowedChildren
        suggestions.allowedChildren.push(basePath);
      } else {
        // Few imports, add individually
        suggestions.allowed.push(...imports);
      }
    }
  } else {
    // No subsystems - use original logic
    for (const [basePath, imports] of Object.entries(groups)) {
      if (basePath === '_single') {
        suggestions.allowed.push(...imports);
      } else if (imports.length >= 3) {
        suggestions.allowedChildren.push(basePath);
      } else {
        suggestions.allowed.push(...imports);
      }
    }
  }
  
  // Remove duplicates and items that are in both arrays
  suggestions.allowed = [...new Set(suggestions.allowed)].filter(item => 
    !suggestions.allowedChildren.includes(item) && 
    !suggestions.allowedChildren.some(base => item.startsWith(base + '/'))
  );
  suggestions.allowedChildren = [...new Set(suggestions.allowedChildren)];
  
  return suggestions;
}

function checkForSubsystems(subsystemPath) {
  const subsystems = [];
  
  try {
    const entries = fs.readdirSync(subsystemPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(subsystemPath, entry.name);
        const depsFile = path.join(subPath, 'dependencies.json');
        
        if (fs.existsSync(depsFile)) {
          subsystems.push(`./${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan for subsystems in ${subsystemPath}`);
  }
  
  return subsystems;
}

function generateDependenciesJson(suggestions, subsystems) {
  const result = {
    "$schema": "~/schemas/dependencies.schema.json"
  };
  
  if (suggestions.allowedChildren.length > 0) {
    result.allowedChildren = [...new Set(suggestions.allowedChildren)].sort();
  }
  
  if (suggestions.allowed.length > 0) {
    result.allowed = [...new Set(suggestions.allowed)].sort();
  }
  
  if (subsystems.length > 0) {
    result.subsystems = subsystems.sort();
  }
  
  return result;
}

function main() {
  const { subsystemPath } = parseArgs();
  
  console.log(`🔍 Analyzing dependencies in: ${subsystemPath}`);
  console.log('');
  
  // Find all TypeScript files
  const tsFiles = findTypeScriptFiles(subsystemPath);
  console.log(`Found ${tsFiles.length} TypeScript files`);
  
  // Extract all imports
  const allImports = [];
  for (const file of tsFiles) {
    const imports = extractImports(file, subsystemPath);
    for (const imp of imports) {
      // Convert relative paths to absolute
      const absoluteImport = convertRelativeToAbsolute(imp, subsystemPath);
      
      // Skip internal imports
      if (!isInternalImport(absoluteImport, subsystemPath)) {
        allImports.push(absoluteImport);
      }
    }
  }
  
  console.log(`Found ${allImports.length} outbound imports`);
  
  // Remove duplicates
  const uniqueImports = [...new Set(allImports)];
  console.log(`Unique imports: ${uniqueImports.length}`);
  
  if (uniqueImports.length === 0) {
    console.log('✅ No outbound dependencies found!');
    return;
  }
  
  // Group imports by pattern
  const groups = groupImportsByPattern(uniqueImports);
  
  // Check for child subsystems
  const subsystems = checkForSubsystems(subsystemPath);
  
  // Identify common patterns
  const suggestions = identifyCommonPatterns(groups, subsystems, uniqueImports);
  
  // Generate dependencies.json
  const depsJson = generateDependenciesJson(suggestions, subsystems);
  
  console.log('');
  console.log('📋 Analysis Results:');
  console.log('─'.repeat(50));
  console.log('Unique imports found:');
  for (const imp of uniqueImports.sort()) {
    console.log(`  • ${imp}`);
  }
  
  console.log('');
  console.log('💡 Suggested dependencies.json:');
  console.log('─'.repeat(50));
  console.log(JSON.stringify(depsJson, null, 2));
  
  console.log('');
  console.log('📊 Pattern Analysis:');
  console.log('─'.repeat(50));
  
  if (suggestions.allowedChildren.length > 0) {
    console.log('Suggested allowedChildren (3+ imports from same base):');
    for (const pattern of suggestions.allowedChildren) {
      const count = groups[pattern]?.length || 0;
      console.log(`  • ${pattern} (${count} imports)`);
    }
    console.log('');
  }
  
  console.log('Import frequency by base path:');
  const sortedGroups = Object.entries(groups)
    .filter(([key]) => key !== '_single')
    .sort(([,a], [,b]) => b.length - a.length);
    
  for (const [basePath, imports] of sortedGroups) {
    console.log(`  • ${basePath}: ${imports.length} imports`);
  }
  
  if (groups['_single']) {
    console.log(`  • Single imports: ${groups['_single'].length}`);
  }
  
  // Write the file if user wants
  const depsFilePath = path.join(subsystemPath, 'dependencies.json');
  console.log('');
  console.log(`💾 To apply this configuration:`);
  console.log(`   echo '${JSON.stringify(depsJson, null, 2)}' > ${depsFilePath}`);
}

if (require.main === module) {
  main();
}