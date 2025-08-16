#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a Mermaid diagram showing subsystem dependencies
 * Usage: node generate-dependency-diagram.mjs <path-to-folder>
 */

function findSubsystems(dir, basePath = '') {
  const subsystems = [];
  
  // Check if current directory is a subsystem (has dependencies.json or interface.ts)
  const hasDependencies = fs.existsSync(path.join(dir, 'dependencies.json'));
  const hasInterface = fs.existsSync(path.join(dir, 'interface.ts'));
  const hasArchitecture = fs.existsSync(path.join(dir, 'ARCHITECTURE.md'));
  
  if (hasDependencies || hasInterface || hasArchitecture) {
    subsystems.push({
      path: dir,
      name: basePath || 'root',
      relativePath: basePath
    });
  }
  
  // Recursively find subsystems in subdirectories
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    // Skip non-directories, hidden directories, node_modules, and test directories
    if (!stat.isDirectory() || item.startsWith('.') || item === 'node_modules' || item.startsWith('__')) {
      continue;
    }
    
    // Skip _components, _hooks, types folders as they're typically not subsystems
    if (item.startsWith('_') && !['_state', '_settings'].includes(item)) {
      continue;
    }
    
    const childPath = basePath ? `${basePath}/${item}` : item;
    const childSubsystems = findSubsystems(itemPath, childPath);
    subsystems.push(...childSubsystems);
  }
  
  return subsystems;
}

function parseDependencies(subsystemPath) {
  const depsFile = path.join(subsystemPath, 'dependencies.json');
  if (!fs.existsSync(depsFile)) {
    return { allowed: [], exceptions: {} };
  }
  
  try {
    const content = fs.readFileSync(depsFile, 'utf8');
    const deps = JSON.parse(content);
    return {
      allowed: deps.allowed || [],
      exceptions: deps.exceptions || {}
    };
  } catch (error) {
    console.error(`Error parsing ${depsFile}:`, error.message);
    return { allowed: [], exceptions: {} };
  }
}

function generateMermaidDiagram(rootPath) {
  const subsystems = findSubsystems(rootPath);
  const rootName = path.basename(rootPath);
  
  // Build a map of subsystem paths for quick lookup
  const subsystemMap = new Map();
  subsystems.forEach(s => {
    subsystemMap.set(s.relativePath, s);
    // Also map by various path formats for matching
    subsystemMap.set(`./${s.relativePath}`, s);
    subsystemMap.set(`../${s.relativePath}`, s);
  });
  
  // Collect all dependencies
  const edges = [];
  const nodes = new Set();
  
  for (const subsystem of subsystems) {
    const nodeName = subsystem.relativePath || rootName;
    nodes.add(nodeName);
    
    // Add parent-child relationships (implicit dependencies)
    if (subsystem.relativePath && subsystem.relativePath.includes('/')) {
      const parentPath = subsystem.relativePath.substring(0, subsystem.relativePath.lastIndexOf('/'));
      const parentName = parentPath || rootName;
      edges.push({
        from: parentName,
        to: nodeName,
        type: 'parent-child',
        label: 'contains'
      });
    } else if (subsystem.relativePath && !subsystem.relativePath.includes('/')) {
      // Direct child of root
      edges.push({
        from: rootName,
        to: nodeName,
        type: 'parent-child',
        label: 'contains'
      });
    }
    
    // Parse explicit dependencies
    const deps = parseDependencies(subsystem.path);
    
    for (const dep of deps.allowed) {
      // Check if dependency is another subsystem in our map
      let targetSubsystem = null;
      
      // Check for relative paths (../, ./)
      if (dep.startsWith('../') || dep.startsWith('./')) {
        // Resolve relative path from current subsystem
        const resolvedPath = path.join(subsystem.relativePath, dep);
        const normalized = path.normalize(resolvedPath).replace(/\\/g, '/');
        
        // Look for exact match or parent subsystem
        for (const [key, value] of subsystemMap) {
          if (normalized === key || normalized.startsWith(key + '/')) {
            targetSubsystem = value;
            break;
          }
        }
      }
      
      // Check for absolute imports within the project
      if (dep.startsWith('~/app/map/')) {
        const relPath = dep.replace('~/app/map/', '');
        // Remove /interface suffix if present
        const cleanPath = relPath.replace('/interface', '');
        targetSubsystem = subsystemMap.get(cleanPath);
      }
      
      if (targetSubsystem) {
        const targetName = targetSubsystem.relativePath || rootName;
        if (targetName !== nodeName) { // Don't show self-dependencies
          edges.push({
            from: nodeName,
            to: targetName,
            type: 'dependency',
            label: 'uses'
          });
        }
      } else if (!dep.startsWith('~') && !dep.startsWith('react') && !dep.startsWith('next') && 
                 !dep.startsWith('lucide') && !dep.startsWith('vitest')) {
        // Track external dependencies that are part of the map structure
        if (dep.startsWith('../')) {
          const parts = dep.split('/');
          if (parts[1] && !parts[1].startsWith('_')) {
            edges.push({
              from: nodeName,
              to: parts[1],
              type: 'dependency',
              label: 'uses'
            });
          }
        }
      }
    }
  }
  
  // Generate Mermaid diagram
  let diagram = '```mermaid\ngraph TD\n';
  
  // Add node definitions with styling
  for (const node of nodes) {
    const displayName = node === rootName ? node : node.split('/').pop();
    const nodeId = node.replace(/[\/\-]/g, '_');
    diagram += `    ${nodeId}["${displayName}"]\n`;
  }
  
  diagram += '\n';
  
  // Add edges (remove duplicates)
  const edgeSet = new Set();
  const edgeStyles = [];
  
  for (const edge of edges) {
    const fromId = edge.from.replace(/[\/\-]/g, '_');
    const toId = edge.to.replace(/[\/\-]/g, '_');
    const edgeKey = `${fromId}->${toId}`;
    
    if (!edgeSet.has(edgeKey)) {
      edgeSet.add(edgeKey);
      
      if (edge.type === 'parent-child') {
        diagram += `    ${fromId} -.-> ${toId}\n`;
      } else {
        diagram += `    ${fromId} --> ${toId}\n`;
      }
    }
  }
  
  // Add styling
  diagram += '\n';
  diagram += '    classDef subsystem fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n';
  diagram += '    classDef root fill:#fff3e0,stroke:#e65100,stroke-width:3px\n';
  
  // Apply styles
  const rootId = rootName.replace(/[\/\-]/g, '_');
  diagram += `    class ${rootId} root\n`;
  
  for (const node of nodes) {
    if (node !== rootName) {
      const nodeId = node.replace(/[\/\-]/g, '_');
      diagram += `    class ${nodeId} subsystem\n`;
    }
  }
  
  diagram += '```\n';
  
  return diagram;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node generate-dependency-diagram.mjs <path-to-folder>');
  process.exit(1);
}

const targetPath = path.resolve(args[0]);
if (!fs.existsSync(targetPath)) {
  console.error(`Path does not exist: ${targetPath}`);
  process.exit(1);
}

console.log(`\n# Dependency Diagram for ${path.basename(targetPath)}\n`);
console.log('Legend:');
console.log('- Solid arrows (→): Explicit dependencies from dependencies.json');
console.log('- Dotted arrows (⋯>): Parent-child relationships (implicit)\n');

const diagram = generateMermaidDiagram(targetPath);
console.log(diagram);

// Also save to a file
const outputFile = path.join(process.cwd(), `${path.basename(targetPath)}-dependencies.md`);
fs.writeFileSync(outputFile, `# Dependency Diagram for ${path.basename(targetPath)}\n\n${diagram}`);
console.log(`\nDiagram saved to: ${outputFile}`);