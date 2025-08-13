import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Architecture Rules', () => {
  it('should not import server code in client components', () => {
    const violations: string[] = [];
    
    // Define server-only imports that should not be used in client code
    const serverImports = [
      '~/server/',
      '~/lib/domains/iam/actions',
      // Add more server-only paths as needed
    ];
    
    // Define client code patterns
    const clientPatterns = [
      "'use client'",
      '"use client"',
    ];
    
    function scanDirectory(dir: string): void {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip node_modules and other non-source directories
            if (!item.startsWith('.') && item !== 'node_modules') {
              scanDirectory(fullPath);
            }
          } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
            // Skip test files and server files
            if (item.includes('.test.') || item.includes('.spec.') || fullPath.includes('/server/')) {
              continue;
            }
            
            try {
              const content = readFileSync(fullPath, 'utf-8');
              
              // Check if this is a client component
              const isClientComponent = clientPatterns.some(pattern => content.includes(pattern));
              
              if (isClientComponent) {
                // Check for server imports (excluding type-only imports)
                for (const serverImport of serverImports) {
                  const typeOnlyImportPattern = new RegExp(`import\\s+\\{\\s*type\\s+[^}]*\\}\\s+from\\s+['"]${serverImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
                  const regularImportPattern = new RegExp(`from ['"]${serverImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
                  
                  if (regularImportPattern.test(content) && !typeOnlyImportPattern.test(content)) {
                    violations.push(`${fullPath}: Client component imports server code (${serverImport})`);
                  }
                }
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    // Scan the src directory
    scanDirectory(join(process.cwd(), 'src'));
    
    if (violations.length > 0) {
      const message = `Found server imports in client components:\n${violations.join('\n')}`;
      expect.fail(message);
    }
  });
  
  it('should not access server environment variables in client code', () => {
    const violations: string[] = [];
    
    function scanDirectory(dir: string): void {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!item.startsWith('.') && item !== 'node_modules') {
              scanDirectory(fullPath);
            }
          } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
            if (item.includes('.test.') || item.includes('.spec.') || fullPath.includes('/server/')) {
              continue;
            }
            
            try {
              const content = readFileSync(fullPath, 'utf-8');
              
              // Check if this is a client component
              const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
              
              if (isClientComponent) {
                // Check for env imports (server-side environment access)
                if (content.includes('from \'~/env\'') || content.includes('from "~/env"')) {
                  violations.push(`${fullPath}: Client component imports server environment variables`);
                }
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    scanDirectory(join(process.cwd(), 'src'));
    
    if (violations.length > 0) {
      const message = `Found server environment imports in client components:\n${violations.join('\n')}`;
      expect.fail(message);
    }
  });
});