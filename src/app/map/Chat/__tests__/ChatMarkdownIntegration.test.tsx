import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '../ChatProvider';
import { ChatPanel } from '../ChatPanel';
import { EventBus } from '../../Services/event-bus';

// Create mock EventBus
const mockEventBus = new EventBus();

describe('Chat Markdown Integration', () => {
  it('should render markdown when user sends formatted messages', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider eventBus={mockEventBus}>
        <ChatPanel />
      </ChatProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    // Send a message with markdown formatting
    await user.type(input, 'Hello **world**! This is *italic* text');
    await user.keyboard('{Enter}');
    
    // Check that markdown is rendered correctly
    const boldElement = screen.getByText('world');
    expect(boldElement.tagName).toBe('STRONG');
    
    const italicElement = screen.getByText('italic');
    expect(italicElement.tagName).toBe('EM');
    
    // Send another message with a link
    await user.clear(input);
    await user.click(input);
    await user.paste('Check out [this link](https://example.com)');
    await user.keyboard('{Enter}');
    
    const link = screen.getByRole('link', { name: 'this link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
  
  it('should handle code blocks from user input', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider eventBus={mockEventBus}>
        <ChatPanel />
      </ChatProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    // Send a message with a code block using Shift+Enter for line breaks
    await user.type(input, 'Here is my code:');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, '```javascript');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, 'const greeting = "Hello";');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, '```');
    await user.keyboard('{Enter}');
    
    // Check that the code is rendered
    expect(screen.getByText('Here is my code:')).toBeInTheDocument();
    expect(screen.getByText('const greeting = "Hello";')).toBeInTheDocument();
  });
  
  it('should render multiple markdown elements in one message', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider eventBus={mockEventBus}>
        <ChatPanel />
      </ChatProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    // Send a complex markdown message
    // Send a message with heading
    await user.type(input, '# Heading');
    await user.keyboard('{Enter}');
    
    // Send a message with bold and italic
    await user.type(input, '**Bold text** and *italic text*');
    await user.keyboard('{Enter}');
    
    // Send a message with list
    await user.type(input, '- List item 1{Shift>}{Enter}{/Shift}- List item 2');
    await user.keyboard('{Enter}');
    
    // Send a message with link
    await user.clear(input);
    await user.click(input);
    await user.paste('[Example link](https://example.com)');
    await user.keyboard('{Enter}');
    
    // Verify rendering
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading');
    expect(screen.getByText('Bold text').tagName).toBe('STRONG');
    expect(screen.getByText('italic text').tagName).toBe('EM');
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('List item 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Example link' })).toBeInTheDocument();
  });
});