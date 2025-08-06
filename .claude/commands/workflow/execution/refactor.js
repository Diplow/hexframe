#!/usr/bin/env node

/**
 * /refactor command implementation
 * 
 * This command instructs Claude to refactor a file for clarity
 * according to the workflow in .claude/commands/refactor-clarity.md
 */

const fs = require('fs');
const path = require('path');

// Check if refactor-clarity.md exists
const refactorGuideFile = path.join(process.cwd(), '.claude', 'commands', 'refactor-clarity.md');
if (!fs.existsSync(refactorGuideFile)) {
  console.error(`Error: Required file ".claude/commands/refactor-clarity.md" not found`);
  console.error('This file contains the refactoring workflow and principles.');
  process.exit(1);
}

// Parse command arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: /refactor <file_path>');
  process.exit(1);
}

const filePath = args[0];

// Validate file exists
if (!fs.existsSync(filePath)) {
  console.error(`Error: File "${filePath}" does not exist`);
  process.exit(1);
}

// Get file stats
const stats = fs.statSync(filePath);
if (!stats.isFile()) {
  console.error(`Error: "${filePath}" is not a file`);
  process.exit(1);
}

// Create session filename
const fileName = path.basename(filePath, path.extname(filePath));
const date = new Date().toISOString().split('T')[0];
const sessionFileName = `${date}-${fileName}-clarity.md`;

// Generate the command for Claude
const command = `
I need you to refactor the file "${filePath}" for clarity according to the workflow and principles described in @.claude/commands/refactor-clarity.md.

Please follow the complete workflow from that guide:

1. **Create Refactor Session**: Create a new file at ".workflow/cycles/[current]/${sessionFileName}" following the documentation format described in the guide

2. **Pre-Refactoring Analysis**: Follow the analysis steps in the guide (sections 284-340):
   - Discover existing domain concepts from documented domains
   - Identify new concepts that need definition
   - Check for Rule of 6 violations and clarity issues
   - Document all findings in the session file

3. **Present Findings**: Present your analysis for validation as described in the guide (section 317-336)

4. **Wait for Validation**: I'll review and approve the concepts before you proceed

5. **Execute Refactoring**: After validation, complete the refactoring following the principles in the guide:
   - Apply the Fundamental Rule (sections 5-15)
   - Follow the Rule of 6 structure (sections 17-39)
   - Apply all core principles (sections 40-73)

6. **Update Documentation**: Complete the session file with post-refactoring summary

All details about the workflow, principles, and examples are in @.claude/commands/refactor-clarity.md - please reference it directly for the complete methodology.
`;

// Output the command for Claude
console.log(command);