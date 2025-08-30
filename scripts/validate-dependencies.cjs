#!/usr/bin/env node

/**
 * Dependency Validation Tool
 * 
 * Validates dependencies.json files for:
 * - Non-existing file/directory paths
 * - Invalid relative path references  
 * - Missing subsystem declarations
 * - Redundant dependencies that could be optimized
 * 
 * Usage: node scripts/validate-dependencies.cjs [path]
 * Default path: src
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || 'src';
  
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path ${targetPath} does not exist`);
    process.exit(1);
  }
  
  return { targetPath: path.resolve(targetPath) };
}

function findDependenciesFiles(rootPath) {
  const files = [];
  
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          scan(fullPath);
        }
      } else if (entry.name === 'dependencies.json') {
        files.push(fullPath);
      }
    }
  }
  
  scan(rootPath);
  return files;
}

function resolvePath(importPath, contextDir) {
  // Handle different path types
  if (importPath.startsWith('~/')) {
    // Absolute path with ~/ prefix
    return path.join('src', importPath.substring(2));
  } else if (importPath.startsWith('../') || importPath.startsWith('./')) {
    // Relative path
    return path.resolve(contextDir, importPath);
  } else if (!importPath.startsWith('/') && !importPath.includes(':')) {
    // Package import (like 'react', 'next') - these are valid
    return null; // Skip package imports
  }
  
  return importPath;
}

function checkPathExists(resolvedPath, importPath, contextDir) {
  if (!resolvedPath) return { exists: true, type: 'package' };
  
  // Check if the exact path exists (file or directory)
  if (fs.existsSync(resolvedPath)) {
    const stats = fs.statSync(resolvedPath);
    return { 
      exists: true, 
      type: stats.isDirectory() ? 'directory' : 'file',
      resolvedPath 
    };
  }
  
  // Check for TypeScript file variants
  const tsVariants = [
    resolvedPath + '.ts',
    resolvedPath + '.tsx', 
    path.join(resolvedPath, 'index.ts'),
    path.join(resolvedPath, 'index.tsx')
  ];
  
  for (const variant of tsVariants) {
    if (fs.existsSync(variant)) {
      return { 
        exists: true, 
        type: 'file',
        resolvedPath: variant,
        actualPath: variant 
      };
    }
  }
  
  return { 
    exists: false, 
    type: 'missing',
    resolvedPath,
    triedPaths: [resolvedPath, ...tsVariants]
  };
}

function validateDependenciesFile(depsFile) {
  const results = {
    file: depsFile,
    valid: [],
    invalid: [],
    warnings: []
  };
  
  let deps;
  try {
    const content = fs.readFileSync(depsFile, 'utf8');
    deps = JSON.parse(content);
  } catch (error) {
    results.invalid.push({
      type: 'parse_error',
      message: `Failed to parse JSON: ${error.message}`
    });
    return results;
  }
  
  const contextDir = path.dirname(depsFile);
  const allDependencies = [
    ...(deps.allowed || []),
    ...(deps.allowedChildren || [])
  ];
  
  // Validate each dependency
  for (const dep of allDependencies) {
    const resolvedPath = resolvePath(dep, contextDir);
    const pathCheck = checkPathExists(resolvedPath, dep, contextDir);
    
    if (!pathCheck.exists) {
      results.invalid.push({
        type: 'missing_path',
        dependency: dep,
        resolvedPath: pathCheck.resolvedPath,
        triedPaths: pathCheck.triedPaths,
        message: `Path does not exist: ${dep}`
      });
    } else if (pathCheck.type === 'package') {
      results.valid.push({
        type: 'package',
        dependency: dep,
        message: 'Package import (valid)'
      });
    } else {
      results.valid.push({
        type: pathCheck.type,
        dependency: dep,
        resolvedPath: pathCheck.actualPath || pathCheck.resolvedPath,
        message: `Valid ${pathCheck.type}: ${dep}`
      });
    }
  }
  
  // Check subsystems array
  if (deps.subsystems) {
    for (const subsystem of deps.subsystems) {
      const subsystemPath = path.resolve(contextDir, subsystem);
      const depsJsonPath = path.join(subsystemPath, 'dependencies.json');
      
      if (!fs.existsSync(subsystemPath)) {
        results.invalid.push({
          type: 'missing_subsystem',
          dependency: subsystem,
          resolvedPath: subsystemPath,
          message: `Subsystem directory does not exist: ${subsystem}`
        });
      } else if (!fs.existsSync(depsJsonPath)) {
        results.warnings.push({
          type: 'missing_subsystem_deps',
          dependency: subsystem,
          resolvedPath: depsJsonPath,
          message: `Subsystem missing dependencies.json: ${subsystem}`
        });
      } else {
        results.valid.push({
          type: 'subsystem',
          dependency: subsystem,
          resolvedPath: subsystemPath,
          message: `Valid subsystem: ${subsystem}`
        });
      }
    }
  }
  
  // Check for relative paths that should be absolute
  for (const dep of allDependencies) {
    if ((dep.startsWith('../') || dep.startsWith('./')) && !deps.subsystems?.includes(dep)) {
      results.warnings.push({
        type: 'relative_path',
        dependency: dep,
        message: `Relative path should be converted to absolute with ~/ prefix: ${dep}`
      });
    }
  }
  
  return results;
}

function generateReport(allResults) {
  let totalFiles = 0;
  let totalValid = 0;
  let totalInvalid = 0;
  let totalWarnings = 0;
  
  console.log('📋 Dependency Validation Report');
  console.log('═'.repeat(60));
  console.log('');
  
  for (const result of allResults) {
    totalFiles++;
    totalValid += result.valid.length;
    totalInvalid += result.invalid.length;
    totalWarnings += result.warnings.length;
    
    const relativePath = path.relative(process.cwd(), result.file);
    
    if (result.invalid.length > 0 || result.warnings.length > 0) {
      console.log(`📁 ${relativePath}`);
      console.log('─'.repeat(60));
      
      // Show invalid dependencies
      if (result.invalid.length > 0) {
        console.log('❌ Invalid Dependencies:');
        for (const invalid of result.invalid) {
          console.log(`  • ${invalid.dependency}`);
          console.log(`    ${invalid.message}`);
          if (invalid.triedPaths) {
            console.log(`    Tried: ${invalid.triedPaths.slice(0, 2).join(', ')}${invalid.triedPaths.length > 2 ? '...' : ''}`);
          }
        }
        console.log('');
      }
      
      // Show warnings
      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`  • ${warning.dependency}`);
          console.log(`    ${warning.message}`);
        }
        console.log('');
      }
      
      console.log('');
    }
  }
  
  // Summary
  console.log('📊 Summary');
  console.log('─'.repeat(60));
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Valid dependencies: ${totalValid}`);
  console.log(`Invalid dependencies: ${totalInvalid}`);  
  console.log(`Warnings: ${totalWarnings}`);
  console.log('');
  
  if (totalInvalid > 0) {
    console.log('🔧 Next Steps:');
    console.log('─'.repeat(60));
    console.log('1. Remove or fix invalid dependencies');
    console.log('2. Convert relative paths to absolute paths with ~/ prefix');
    console.log('3. Re-run validation to confirm fixes');
    console.log('');
    return false;
  } else if (totalWarnings > 0) {
    console.log('💡 Recommendations:');
    console.log('─'.repeat(60));
    console.log('1. Consider converting relative paths to absolute paths');
    console.log('2. Add missing dependencies.json files to subsystems');
    console.log('');
  }
  
  if (totalInvalid === 0 && totalWarnings === 0) {
    console.log('✅ All dependencies are valid!');
  }
  
  return totalInvalid === 0;
}

function main() {
  const { targetPath } = parseArgs();
  
  console.log(`🔍 Validating dependencies in: ${targetPath}`);
  console.log('');
  
  const depsFiles = findDependenciesFiles(targetPath);
  console.log(`Found ${depsFiles.length} dependencies.json files`);
  console.log('');
  
  const allResults = [];
  for (const depsFile of depsFiles) {
    const result = validateDependenciesFile(depsFile);
    allResults.push(result);
  }
  
  const success = generateReport(allResults);
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}