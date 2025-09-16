// Template literals and dynamic imports
const dynamicImport = `import("./${moduleName}")`;

// Generic functions with complex constraints
export function processItems<
    T extends Record<string, any>,
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