import React, { Component, useState, useEffect } from 'react';
import type { ReactNode, ComponentProps } from 'react';

interface ButtonProps {
    children: ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
}

export const Button = ({ children, onClick, variant = 'primary' }: ButtonProps) => (
    <button
        className={`btn btn-${variant}`}
        onClick={onClick}
    >
        {children}
    </button>
);

export function ComplexComponent<T extends Record<string, any>>({
    items,
    renderItem,
    onItemClick
}: {
    items: T[];
    renderItem: (item: T) => ReactNode;
    onItemClick: (item: T) => void;
}) {
    const [selectedItem, setSelectedItem] = useState<T | null>(null);

    useEffect(() => {
        if (items.length === 1) {
            setSelectedItem(items[0]);
        }
    }, [items]);

    return (
        <div className="complex-component">
            {items.map((item, index) => (
                <div
                    key={index}
                    onClick={() => {
                        setSelectedItem(item);
                        onItemClick(item);
                    }}
                    className={selectedItem === item ? 'selected' : ''}
                >
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}

export class ClassComponent extends Component<ComponentProps<'div'>> {
    private timerId?: NodeJS.Timeout;

    componentDidMount() {
        this.timerId = setInterval(() => {
            // Do something
        }, 1000);
    }

    componentWillUnmount() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    private handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        // Handle click
    };

    render() {
        return (
            <div {...this.props} onClick={this.handleClick}>
                <h1>Class Component</h1>
                {this.props.children}
            </div>
        );
    }
}