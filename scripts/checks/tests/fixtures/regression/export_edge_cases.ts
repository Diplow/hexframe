// Edge cases in export patterns that might confuse regex parsing

// Re-exports with complex patterns
export { default as DefaultComponent } from './Component';
export { foo as bar, baz as qux } from './utils';
export * as helpers from './helpers';
export type { User, type Status } from './types';

// Conditional exports
export const config = process.env.NODE_ENV === 'production'
  ? productionConfig
  : developmentConfig;

// Export with computed property names
export const handlers = {
  ['handle' + 'Click']: () => {},
  [`handle${eventType}`]: () => {},
};

// Export inside template literal (should NOT be detected)
const codeTemplate = `
export function generatedFunction() {
  return 'generated';
}
`;

// Multiple exports on same line
export const a = 1, b = 2, c = 3;

// Export with destructuring
export const { x, y, z } = coordinates;
export const [first, second, ...rest] = items;

// Complex arrow function exports
export const complexArrow = (
  param1: string,
  param2: number,
  param3: {
    nested: boolean;
    values: string[];
  }
) => {
  return param1 + param2;
};

// Export with generic constraints
export function genericFunction<
  T extends Record<string, any>,
  K extends keyof T
>(items: T[], key: K): T[K][] {
  return items.map(item => item[key]);
}

// Export class with complex inheritance
export class ComplexClass extends BaseClass implements InterfaceA, InterfaceB {
  private _value: string = '';

  public get value(): string {
    return this._value;
  }

  public set value(newValue: string) {
    this._value = newValue;
  }
}

// Default export variations
const ComponentImpl = () => <div>Component</div>;
export default ComponentImpl;

// Anonymous default export
export default function() {
  return 'anonymous';
}