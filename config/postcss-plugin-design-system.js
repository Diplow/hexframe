// @ts-nocheck
/**
 * PostCSS plugin to warn about design system violations
 * This provides visual feedback during development
 */

module.exports = (opts = {}) => {
  const { warn = true } = opts;

  // Direct color patterns that should be avoided
  const DIRECT_COLOR_REGEX = /\b(text|bg|border|ring|fill)-(slate|gray|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
  
  // Allowed exceptions
  const EXCEPTIONS = [
    // Toolbox specific exceptions
    /^(dark:)?(text|hover:text)-(cyan|indigo|purple|green|amber|rose)-(300|400|700)$/,
    /^(dark:)?(bg|hover:bg)-(cyan|indigo|purple|green|amber|rose)-(100|900\/20)$/,
    /^ring-(cyan|indigo|purple|green|amber|rose)-500$/,
    /^focus-visible:ring-(cyan|indigo|purple|green|amber|rose)-500$/,
    // Theme toggle
    /^(group-hover:)?text-violet-500$/,
  ];

  const colorMappings = {
    'violet': 'primary',
    'amber': 'secondary or nw',
    'green': 'success or ne',
    'cyan': 'link or e',
    'rose': 'destructive or w',
    'indigo': 'se',
    'purple': 'sw',
    'slate': 'neutral',
    'gray': 'neutral',
    'zinc': 'neutral',
  };

  return {
    postcssPlugin: 'postcss-design-system',
    Once(root, { result }) {
      if (!warn) return;

      root.walkRules((rule) => {
        rule.selector.split(/[\s,]+/).forEach((selector) => {
          // Check each class in the selector
          const classes = selector.match(/\.[a-zA-Z0-9_-]+/g) || [];
          
          classes.forEach((className) => {
            const cleanClass = className.slice(1); // Remove the dot
            
            // Check if it's an exception
            if (EXCEPTIONS.some(pattern => pattern.test(cleanClass))) {
              return;
            }
            
            // Check for direct color usage
            const matches = cleanClass.match(DIRECT_COLOR_REGEX);
            if (matches) {
              matches.forEach((match) => {
                // Find which color was used
                for (const [direct, semantic] of Object.entries(colorMappings)) {
                  if (match.includes(`-${direct}-`)) {
                    const suggestion = match.replace(`-${direct}-`, `-${semantic.split(' or ')[0]}-`);
                    
                    console.warn(`
⚠️  Design System Warning in ${rule.source?.input.file || 'unknown file'}
   Found: .${cleanClass}
   Direct color usage: ${match}
   Suggestion: Use semantic color '${semantic}'
   Example: .${suggestion}
`);
                    break;
                  }
                }
              });
            }
          });
        });
      });
    }
  };
};

module.exports.postcss = true;