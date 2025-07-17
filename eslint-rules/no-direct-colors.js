// @ts-nocheck
/**
 * ESLint rule to enforce usage of semantic colors from the design system
 * instead of direct Tailwind color classes
 */

// List of allowed semantic color patterns
const ALLOWED_COLOR_PATTERNS = [
  // Semantic colors
  /^(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  /^(hover:)?(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  /^(dark:)?(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  /^(dark:hover:)?(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  
  // Spatial colors
  /^(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  /^(hover:)?(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  /^(dark:)?(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  /^(dark:hover:)?(text|bg|border|ring|fill)-(nw|ne|e|se|sw|w)(-light|-dark)?$/,
  
  // Depth variants
  /^fill-(center|nw|ne|e|se|sw|w)-depth-[0-8]$/,
  
  // Standard UI colors
  /^(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  /^(hover:)?(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  /^(dark:)?(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  /^(dark:hover:)?(text|bg|border|ring)-(background|foreground|card|popover|muted|accent|input)(-foreground)?$/,
  
  // Chart colors
  /^(text|bg|fill)-chart-[1-5]$/,
  
  // Special cases
  /^(text|bg)-transparent$/,
  /^(text|bg|border)-current$/,
  /^(text|bg|border)-inherit$/,
  /^(text|bg)-white$/,
  /^(text|bg)-black$/,
  /^(text|bg)-black\/(10|20|25|50|75|80|90)$/,
  /^(text|bg)-white\/(10|20|25|50|75|80|90)$/,
  
  // Focus and group variants
  /^(focus-visible:|focus:|group-hover:|group-focus-visible:)(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  /^(dark:focus-visible:|dark:focus:|dark:group-hover:|dark:group-focus-visible:)(text|bg|border|ring|fill)-(primary|secondary|success|link|destructive|neutral)(\/(10|20|25|50|75))?$/,
  
  // Ring offsets
  /^ring-offset-(background|white)$/,
  /^dark:ring-offset-(background|neutral-900)$/,
  
  // Hex-specific (for hexagon components)
  /^(text|bg|border|fill)-hex-(border|fill)(-hover|-selected)?$/,
  
  // Stroke colors (canvas-specific)
  /^stroke-(color-\d+|neutral-\d+)$/,
];

// Direct color patterns to warn about
const DIRECT_COLOR_PATTERNS = [
  /^(text|bg|border|ring|fill|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$/,
  /^(hover:|focus:|active:|dark:|group-hover:|group-focus:)*(text|bg|border|ring|fill|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$/,
];

// Special exceptions for legacy code or specific use cases
const EXCEPTIONS = [
  // These specific classes are in the safelist and used in the toolbox
  /^(dark:)?(text|hover:text)-(cyan|indigo|purple|green|amber|rose)-(300|400|700)$/,
  /^(dark:)?(bg|hover:bg)-(cyan|indigo|purple|green|amber|rose)-(100|900\/20)$/,
  /^ring-(cyan|indigo|purple|green|amber|rose)-500$/,
  /^focus-visible:ring-(cyan|indigo|purple|green|amber|rose)-500$/,
  
  // Drop shadow effects for theme toggle
  /^(group-hover:|group-focus-visible:)?drop-shadow-\[.*\]$/,
  /^filter$/,
  
  // Specific violet colors for theme toggle
  /^(group-hover:)?text-violet-500$/,
];

/**
 * @param {string} className
 * @returns {boolean}
 */
function isAllowedClass(className) {
  // Remove responsive prefixes for checking
  const cleanClass = className.replace(/^(sm:|md:|lg:|xl:|2xl:)/, '');
  
  // Check if it matches any allowed pattern
  if (ALLOWED_COLOR_PATTERNS.some(pattern => pattern.test(cleanClass))) {
    return true;
  }
  
  // Check if it matches any exception
  if (EXCEPTIONS.some(pattern => pattern.test(cleanClass))) {
    return true;
  }
  
  // Check if it's a direct color
  if (DIRECT_COLOR_PATTERNS.some(pattern => pattern.test(cleanClass))) {
    return false;
  }
  
  // If it doesn't match any color pattern, it's not a color class
  return true;
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function extractClassNames(value) {
  // Handle template literals and string concatenations
  if (typeof value !== 'string') return [];
  
  // Split by whitespace and filter out empty strings
  return value.split(/\s+/).filter(Boolean);
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce usage of semantic colors from the design system',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      useSemanticColor: 'Use semantic color "{{semantic}}" instead of direct color "{{direct}}"',
      useDesignSystemColor: 'Direct color "{{className}}" is not allowed. Use semantic colors from the design system.',
    },
    fixable: 'code',
    schema: [],
  },

  /**
   * @param {import('eslint').Rule.RuleContext} context
   * @returns {import('eslint').Rule.RuleListener}
   */
  create(context) {
    // Mapping of direct colors to semantic equivalents
    const colorMappings = {
      // Primary colors
      'violet-400': 'primary-light',
      'violet-600': 'primary',
      'violet-800': 'primary-dark',
      
      // Secondary/Warning
      'amber-400': 'secondary-light',
      'amber-600': 'secondary',
      'amber-800': 'secondary-dark',
      
      // Success
      'green-400': 'success-light',
      'green-600': 'success',
      'green-800': 'success-dark',
      
      // Link/Navigation
      'cyan-400': 'link-light',
      'cyan-600': 'link',
      'cyan-800': 'link-dark',
      
      // Destructive
      'rose-400': 'destructive-light',
      'rose-600': 'destructive',
      'rose-800': 'destructive-dark',
      
      // Neutral colors
      'slate-50': 'neutral-50',
      'slate-100': 'neutral-100',
      'slate-200': 'neutral-200',
      'slate-300': 'neutral-300',
      'slate-400': 'neutral-400',
      'slate-500': 'neutral-500',
      'slate-600': 'neutral-600',
      'slate-700': 'neutral-700',
      'slate-800': 'neutral-800',
      'slate-900': 'neutral-900',
      'slate-950': 'neutral-950',
    };

    /**
     * @param {import('eslint').Rule.Node} node
     * @param {string} className
     */
    function checkClassName(node, className) {
      if (!isAllowedClass(className)) {
        // Try to find a semantic equivalent
        let semanticSuggestion = null;
        
        for (const [direct, semantic] of Object.entries(colorMappings)) {
          if (className.includes(direct)) {
            semanticSuggestion = className.replace(direct, semantic);
            break;
          }
        }

        if (semanticSuggestion) {
          context.report({
            node,
            messageId: 'useSemanticColor',
            data: {
              direct: className,
              semantic: semanticSuggestion,
            },
            /**
             * @param {import('eslint').Rule.RuleFixer} fixer
             */
            fix(fixer) {
              const quote = node.raw[0];
              const newValue = node.value.replace(className, semanticSuggestion);
              return fixer.replaceText(node, quote + newValue + quote);
            },
          });
        } else {
          context.report({
            node,
            messageId: 'useDesignSystemColor',
            data: {
              className,
            },
          });
        }
      }
    }

    return {
      // Check className props
      /**
       * @param {import('eslint').Rule.Node} node
       */
      JSXAttribute(node) {
        if (node.name.name !== 'className' && node.name.name !== 'class') {
          return;
        }

        if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const classes = extractClassNames(node.value.value);
          classes.forEach(className => {
            checkClassName(node.value, className);
          });
        }
      },

      // Check clsx, cn, and other utility function calls
      /**
       * @param {import('eslint').Rule.Node} node
       */
      CallExpression(node) {
        const functionNames = ['clsx', 'cn', 'classNames', 'tw'];
        
        if (
          node.callee.type === 'Identifier' &&
          functionNames.includes(node.callee.name)
        ) {
          node.arguments.forEach(arg => {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              const classes = extractClassNames(arg.value);
              classes.forEach(className => {
                checkClassName(arg, className);
              });
            }
          });
        }
      },
    };
  },
};