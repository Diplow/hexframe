export const VERSION = '1.0.0';

export function helper(input: string): string {
    return input.toUpperCase();
}

export interface User {
    name: string;
    email: string;
}

export type Status = 'active' | 'inactive';

export default function Component() {
    return <div>Component</div>;
}