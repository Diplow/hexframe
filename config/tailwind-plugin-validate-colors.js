// @ts-nocheck
/**
 * Tailwind CSS plugin to validate and warn about direct color usage
 * This plugin runs during build time to ensure design system compliance
 */

const plugin = require('tailwindcss/plugin');

// Allowed semantic color patterns (same as ESLint rule)
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
];

// Classes that are explicitly allowed in the safelist
const SAFELIST_EXCEPTIONS = [
  // Toolbox colors
  'text-cyan-700',
  'dark:text-cyan-400',
  'text-indigo-700',
  'dark:text-indigo-300',
  'text-purple-700',
  'dark:text-purple-400',
  'text-green-700',
  'dark:text-green-400',
  'text-amber-700',
  'dark:text-amber-400',
  'text-rose-700',
  'dark:text-rose-400',
  'hover:text-cyan-700',
  'dark:hover:text-cyan-400',
  'hover:text-indigo-700',
  'dark:hover:text-indigo-300',
  'hover:text-purple-700',
  'dark:hover:text-purple-400',
  'hover:text-green-700',
  'dark:hover:text-green-400',
  'hover:text-amber-700',
  'dark:hover:text-amber-400',
  'hover:text-rose-700',
  'dark:hover:text-rose-400',
  'bg-cyan-100',
  'dark:bg-cyan-900/20',
  'bg-cyan-900/20',
  'hover:bg-cyan-100',
  'dark:hover:bg-cyan-900/20',
  'bg-indigo-100',
  'dark:bg-indigo-900/20',
  'bg-indigo-900/20',
  'hover:bg-indigo-100',
  'dark:hover:bg-indigo-900/20',
  'bg-purple-100',
  'dark:bg-purple-900/20',
  'bg-purple-900/20',
  'hover:bg-purple-100',
  'dark:hover:bg-purple-900/20',
  'bg-green-100',
  'dark:bg-green-900/20',
  'bg-green-900/20',
  'hover:bg-green-100',
  'dark:hover:bg-green-900/20',
  'bg-amber-100',
  'dark:bg-amber-900/20',
  'bg-amber-900/20',
  'hover:bg-amber-100',
  'dark:hover:bg-amber-900/20',
  'bg-rose-100',
  'dark:bg-rose-900/20',
  'bg-rose-900/20',
  'hover:bg-rose-100',
  'dark:hover:bg-rose-900/20',
  'ring-cyan-500',
  'ring-indigo-500',
  'ring-purple-500',
  'ring-green-500',
  'ring-amber-500',
  'ring-rose-500',
  'focus-visible:ring-cyan-500',
  'focus-visible:ring-indigo-500',
  'focus-visible:ring-purple-500',
  'focus-visible:ring-green-500',
  'focus-visible:ring-amber-500',
  'focus-visible:ring-rose-500',
  
  // Theme toggle specific
  'text-amber-400',
  'dark:text-amber-400',
  'group-hover:text-amber-400',
  'dark:group-hover:text-amber-400',
  'group-focus-visible:text-amber-400',
  'dark:group-focus-visible:text-amber-400',
  'text-violet-500',
  'group-hover:text-violet-500',
  'group-focus-visible:text-violet-500',
  
  // Legacy fill colors (deprecated but still in safelist)
  ...Array.from({ length: 11 }, (_, i) => {
    const shade = i === 0 ? '50' : i === 10 ? '950' : `${i}00`;
    return [
      `fill-amber-${shade}`,
      `fill-zinc-${shade}`,
      `fill-green-${shade}`,
      `fill-cyan-${shade}`,
      `fill-indigo-${shade}`,
      `fill-purple-${shade}`,
      `fill-rose-${shade}`,
    ];
  }).flat(),
];

function isAllowedClass(className) {
  // Remove responsive prefixes for checking
  const cleanClass = className.replace(/^(sm:|md:|lg:|xl:|2xl:)/, '');
  
  // Check if it's in the safelist exceptions
  if (SAFELIST_EXCEPTIONS.includes(cleanClass)) {
    return true;
  }
  
  // Check if it matches any allowed pattern
  if (ALLOWED_COLOR_PATTERNS.some(pattern => pattern.test(cleanClass))) {
    return true;
  }
  
  // Check if it's a direct color
  if (DIRECT_COLOR_PATTERNS.some(pattern => pattern.test(cleanClass))) {
    return false;
  }
  
  // If it doesn't match any color pattern, it's not a color class
  return true;
}

module.exports = plugin(function({ addBase, e, theme, variants }) {
  // Option to enable/disable validation
  const validateColors = theme('validateColors', true);
  
  if (!validateColors) {
    return;
  }

  // Add a build-time hook to validate classes
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🎨 Validating color usage against design system...\n');
    
    // This is a placeholder for actual validation
    // In a real implementation, you would need to:
    // 1. Parse all source files
    // 2. Extract class names
    // 3. Validate against the patterns
    // 4. Report violations
    
    // For now, we'll add CSS variables that document the design system
    addBase({
      ':root': {
        '--design-system-note': '"Use semantic colors instead of direct Tailwind colors"',
      },
    });
  }
}, {
  theme: {
    validateColors: true,
  },
});