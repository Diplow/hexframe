import React from 'react';
import { useState, useEffect } from 'react';
import type { User } from './types';
import * as utils from './utils';

export function Component() {
    const [data, setData] = useState<User[]>([]);

    useEffect(() => {
        // Fetch data
    }, []);

    return <div>Hello</div>;
}