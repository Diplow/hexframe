// Tests to ensure parser doesn't get confused by imports/exports in comments and strings

/**
 * Block comment with fake import:
 * import { fake } from 'fake';
 *
 * And fake export:
 * export const fake = 'fake';
 */

// Single line comment with import { fake } from 'fake';

export function stringWithImports() {
  // String literals that look like imports
  const fakeImport = "import { Component } from 'react';";
  const anotherFake = 'import React from "react";';

  // Template literals with imports
  const codeBlock = `
    import { useState } from 'react';
    export default function App() {
      return <div>App</div>;
    }
  `;

  // Regex pattern that includes import-like syntax
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;

  // JSX with string props that contain import-like text
  return (
    <div>
      <pre>{`import { example } from 'example';`}</pre>
      <code>export const value = 'test';</code>
    </div>
  );
}

/*
Multi-line comment with:
import { another } from 'another';
export const commented = 'out';
*/

// This IS a real import and should be detected
import { realUtil } from './real-utils';

// This IS a real export and should be detected
export const realValue = 'real';

export function commentsTest() {
  const jsxWithComments = (
    <div>
      {/* Comment with import { jsx } from 'jsx'; */}
      <span>Content</span>
    </div>
  );

  return jsxWithComments;
}