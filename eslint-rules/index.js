/**
 * Custom ESLint rules for Hexframe
 */

const noDirectColors = require('./no-direct-colors');

module.exports = {
  rules: {
    'no-direct-colors': noDirectColors,
  },
};