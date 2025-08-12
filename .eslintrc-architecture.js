// ESLint configuration for architectural boundaries
// Reads dependencies.json files to enforce import rules

const fs = require('fs');
const path = require('path');

// Find all dependencies.json files and generate rules
function generateImportRules() {
  const rules = [];
  const srcPath = path.join(__dirname, 'src');
  
  // Recursively find dependencies.json files
  function findDependencyFiles(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.')) {
        findDependencyFiles(fullPath);
      } else if (file === 'dependencies.json') {
        const subsystemPath = path.relative(__dirname, dir);
        const deps = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        if (deps.allowed) {
          // Convert allowed patterns to actual paths
          const allowedFrom = deps.allowed.map(pattern => {
            // "./" means internal to this subsystem
            if (pattern === './') return `./${subsystemPath}/**`;
            // External packages stay as-is
            if (!pattern.startsWith('~') && !pattern.startsWith('.')) return pattern;
            // Project paths get converted
            return pattern.replace('~/', './');
          });
          
          // Create restrictive rule: ONLY allowed imports are permitted
          rules.push({
            target: `./${subsystemPath}/**`,
            from: '*',
            except: allowedFrom,
            message: `Import not in ${subsystemPath}/dependencies.json allowed list.`
          });
        }
      }
    }
  }
  
  if (fs.existsSync(srcPath)) {
    findDependencyFiles(srcPath);
  }
  
  return rules;
}

module.exports = {
  plugins: ['import'],
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: generateImportRules()
    }]
  },
  
  overrides: [
    {
      // Interface files should only export types/interfaces
      files: ['**/interface.ts'],
      rules: {
        'import/no-default-export': 'error'
      }
    },
    {
      // Test files can import from anywhere (for testing internals)
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'import/no-restricted-paths': 'off'
      }
    }
  ]
}