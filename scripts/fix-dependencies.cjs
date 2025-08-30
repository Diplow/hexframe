#!/usr/bin/env node

/**
 * Dependency Cleanup Tool
 * 
 * Automatically fixes common dependency issues:
 * - Removes non-existing paths
 * - Converts relative paths to absolute paths
 * - Updates interface.ts references to index.ts
 * - Removes duplicate entries
 * 
 * Usage: node scripts/fix-dependencies.cjs [path] [--dry-run]
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const targetPath = args.find(arg => !arg.startsWith('--')) || 'src';
  const dryRun = args.includes('--dry-run');
  
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path ${targetPath} does not exist`);
    process.exit(1);
  }
  
  return { targetPath: path.resolve(targetPath), dryRun };
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
  if (importPath.startsWith('~/')) {
    return path.join('src', importPath.substring(2));
  } else if (importPath.startsWith('../') || importPath.startsWith('./')) {
    return path.resolve(contextDir, importPath);
  } else if (!importPath.startsWith('/') && !importPath.includes(':')) {
    return null; // Package import
  }
  return importPath;
}

function pathExists(resolvedPath) {
  if (!resolvedPath) return true; // Package imports are valid
  
  if (fs.existsSync(resolvedPath)) return true;
  
  // Check TypeScript variants
  const variants = [
    resolvedPath + '.ts',
    resolvedPath + '.tsx',
    path.join(resolvedPath, 'index.ts'),
    path.join(resolvedPath, 'index.tsx')
  ];
  
  return variants.some(variant => fs.existsSync(variant));
}

function convertRelativeToAbsolute(relativePath, contextDir) {
  if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
    return relativePath; // Already absolute or package
  }
  
  // Get the context relative to src/
  const srcIndex = contextDir.indexOf('/src/');
  if (srcIndex === -1) return relativePath;
  
  const contextFromSrc = contextDir.substring(srcIndex + 5);
  const resolved = path.resolve(path.join('/tmp/src', contextFromSrc), relativePath);
  return '~/' + resolved.replace('/tmp/src/', '');
}

function fixInterfaceReferences(dep) {
  // Convert interface.ts references to index.ts
  if (dep.endsWith('/interface')) {
    return dep.replace('/interface', '/index');
  }
  if (dep.endsWith('/interface.client')) {
    return dep.replace('/interface.client', '/index');  
  }
  return dep;
}

function fixCommonIssues(deps, contextDir) {
  return deps
    .map(dep => {
      // Fix interface references
      let fixed = fixInterfaceReferences(dep);
      
      // Convert relative to absolute
      if (fixed.startsWith('../') || fixed.startsWith('./')) {
        fixed = convertRelativeToAbsolute(fixed, contextDir);
      }
      
      return fixed;
    })
    .filter((dep, index, arr) => {
      // Remove duplicates
      return arr.indexOf(dep) === index;
    })
    .filter(dep => {
      // Remove invalid paths (but keep packages)
      const resolvedPath = resolvePath(dep, contextDir);
      return pathExists(resolvedPath);
    })
    .sort(); // Sort for consistency
}

function cleanupDependenciesFile(depsFile, dryRun = false) {
  const results = {
    file: depsFile,
    changes: [],
    errors: []
  };
  
  let deps;
  try {
    const content = fs.readFileSync(depsFile, 'utf8');
    deps = JSON.parse(content);
  } catch (error) {
    results.errors.push(`Failed to parse JSON: ${error.message}`);
    return results;
  }
  
  const contextDir = path.dirname(depsFile);
  let hasChanges = false;
  
  // Clean up allowed dependencies
  if (deps.allowed && Array.isArray(deps.allowed)) {
    const originalCount = deps.allowed.length;
    deps.allowed = fixCommonIssues(deps.allowed, contextDir);
    
    if (deps.allowed.length !== originalCount) {
      hasChanges = true;
      results.changes.push(`allowed: ${originalCount} → ${deps.allowed.length} dependencies`);
    }
  }
  
  // Clean up allowedChildren dependencies  
  if (deps.allowedChildren && Array.isArray(deps.allowedChildren)) {
    const originalCount = deps.allowedChildren.length;
    deps.allowedChildren = fixCommonIssues(deps.allowedChildren, contextDir);
    
    if (deps.allowedChildren.length !== originalCount) {
      hasChanges = true;
      results.changes.push(`allowedChildren: ${originalCount} → ${deps.allowedChildren.length} dependencies`);
    }
  }
  
  // Clean up empty arrays
  if (deps.allowed && deps.allowed.length === 0) {
    delete deps.allowed;
    hasChanges = true;
    results.changes.push('Removed empty allowed array');
  }
  
  if (deps.allowedChildren && deps.allowedChildren.length === 0) {
    delete deps.allowedChildren;
    hasChanges = true;
    results.changes.push('Removed empty allowedChildren array');
  }
  
  // Validate subsystems
  if (deps.subsystems && Array.isArray(deps.subsystems)) {
    const validSubsystems = deps.subsystems.filter(subsystem => {
      const subsystemPath = path.resolve(contextDir, subsystem);
      return fs.existsSync(subsystemPath);
    });
    
    if (validSubsystems.length !== deps.subsystems.length) {
      deps.subsystems = validSubsystems;
      hasChanges = true;
      results.changes.push(`subsystems: ${deps.subsystems.length} → ${validSubsystems.length} valid`);
    }
    
    if (deps.subsystems.length === 0) {
      delete deps.subsystems;
      hasChanges = true;
      results.changes.push('Removed empty subsystems array');
    }
  }
  
  // Write back if changes were made
  if (hasChanges && !dryRun) {
    try {
      const newContent = JSON.stringify(deps, null, 2) + '\n';
      fs.writeFileSync(depsFile, newContent, 'utf8');
      results.changes.push('File updated successfully');
    } catch (error) {
      results.errors.push(`Failed to write file: ${error.message}`);
    }
  } else if (hasChanges && dryRun) {
    results.changes.push('DRY RUN: Changes not applied');
  }
  
  return results;
}

function main() {
  const { targetPath, dryRun } = parseArgs();
  
  console.log(`🔧 ${dryRun ? 'Analyzing' : 'Cleaning up'} dependencies in: ${targetPath}`);
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  console.log('');
  
  const depsFiles = findDependenciesFiles(targetPath);
  console.log(`Found ${depsFiles.length} dependencies.json files`);
  console.log('');
  
  let totalFixed = 0;
  let totalErrors = 0;
  
  for (const depsFile of depsFiles) {
    const result = cleanupDependenciesFile(depsFile, dryRun);
    
    if (result.changes.length > 0 || result.errors.length > 0) {
      const relativePath = path.relative(process.cwd(), result.file);
      console.log(`📁 ${relativePath}`);
      console.log('─'.repeat(60));
      
      if (result.changes.length > 0) {
        console.log('✅ Changes:');
        for (const change of result.changes) {
          console.log(`  • ${change}`);
        }
        totalFixed++;
      }
      
      if (result.errors.length > 0) {
        console.log('❌ Errors:');
        for (const error of result.errors) {
          console.log(`  • ${error}`);
        }
        totalErrors++;
      }
      
      console.log('');
    }
  }
  
  console.log('📊 Summary');
  console.log('─'.repeat(60));
  console.log(`Files processed: ${depsFiles.length}`);
  console.log(`Files ${dryRun ? 'needing fixes' : 'fixed'}: ${totalFixed}`);
  console.log(`Files with errors: ${totalErrors}`);
  
  if (dryRun && totalFixed > 0) {
    console.log('');
    console.log('💡 Run without --dry-run to apply these changes');
  }
  
  console.log('');
  if (totalErrors === 0) {
    console.log('✅ Cleanup completed successfully!');
  }
}

if (require.main === module) {
  main();
}