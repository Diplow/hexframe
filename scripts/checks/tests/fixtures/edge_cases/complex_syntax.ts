// Optional stubs for stricter compilers
const moduleName = 'feature';
const defaultProcessor = () => true;
declare const productionConfig: unknown;
declare const developmentConfig: unknown;
declare const process: { env: { NODE_ENV?: string } };

// Ambient stubs (no emit) to keep the fixture standalone
declare function Component(opts: { selector: string; template: string }): ClassDecorator;
declare function Input(): PropertyDecorator;
declare function Output(): PropertyDecorator;
declare function HostListener(eventName: string, args?: readonly string[]): MethodDecorator;
declare class EventEmitter<T> { emit(value: T): void; }

// Template literals and dynamic imports
const dynamicImport = `import("./${moduleName}")`;
// Real dynamic import variant (keep the string as-is if you're testing false positives):
const dynamicModule = import(`./${moduleName}`);

// Generic functions with complex constraints
export function processItems<
    T extends Record<string, unknown>,
    K extends keyof T
>(
    items: T[],
    key: K,
    processor: (item: T[K]) => boolean = defaultProcessor
): T[K][] {
    return items.map(item => item[key]).filter(processor);
}

// Conditional exports
export const config = process.env.NODE_ENV === 'production'
    ? productionConfig
    : developmentConfig;

// Re-exports with complex patterns
export {
    originalName as renamedExport,
    AnotherClass,
    type TypeOnlyExport
} from './other-module';

// Class with decorators
@Component({
    selector: 'app-test',
    template: '<div>{{value}}</div>'
})
export class TestComponent {
    @Input() value: string = '';
    @Output() changed = new EventEmitter<string>();

    @HostListener('click', ['$event'])
    onClick(event: MouseEvent) {
        this.changed.emit(this.value);
    }
}

// Arrow function with complex generics
export const complexArrow = <
    T extends { id: string },
    U extends keyof T
>(
    items: T[],
    key: U
): T[U][] => items.map(item => item[key]);

// Union and intersection types
export type ComplexType =
    | { type: 'A'; valueA: string }
    | { type: 'B'; valueB: number }
    & { common: boolean };

// Mapped types and conditional types
export type MappedType<T> = {
    [K in keyof T]: T[K] extends string ? string : never;
};

// Module augmentation patterns
declare module 'existing-module' {
    interface ExistingInterface {
        newProperty: string;
    }
}