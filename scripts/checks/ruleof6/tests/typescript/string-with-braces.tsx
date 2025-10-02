// Test case: functions with strings containing braces (the original bug)
export function FunctionWithStringBraces() {
  // This should not be confused by braces inside strings
  const template = 'Hello {{name}}, welcome to {{app}}!';
  const config = {
    apiUrl: 'https://api.example.com/{{version}}/{{endpoint}}',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {{token}}'
    }
  };

  // Template literals with braces
  const templateLiteral = `
    function render() {
      return {
        component: 'div',
        props: { className: 'container' }
      };
    }
  `;

  // Escaped braces
  const escapedBraces = "\\{\\{ not a template \\}\\}";

  // Multiple string types
  const singleQuote = 'Single quote with {braces}';
  const doubleQuote = "Double quote with {braces}";
  const templateStr = `Template with {braces}`;

  return {
    template,
    config,
    templateLiteral,
    escapedBraces,
    singleQuote,
    doubleQuote,
    templateStr
  };
}