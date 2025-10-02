// This file tests template literal patterns that might confuse regex parsing

export const dynamicImports = {
  // These should NOT be parsed as real imports
  codeInTemplate: `import { fake } from 'fake';`,
  dynamicImportCall: `const module = await import("./dynamic");`,
  templateWithVars: `import { ${varName} } from '${moduleName}';`,
};

// This IS a real import and should be detected
import { realFunction } from './real-module';

export function useTemplateImports() {
  // More template literals that look like imports
  const exampleCode = `
    import React from 'react';
    export default function Component() {
      return <div>Hello</div>;
    }
  `;

  const dynamicImportPattern = `import("${moduleName}")`;

  return {
    exampleCode,
    dynamicImportPattern,
    realFunction
  };
}