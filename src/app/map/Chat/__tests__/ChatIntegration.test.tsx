import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '../ChatProvider';
import { ChatPanel } from '../ChatPanel';
import { EventBus } from '../../Services/event-bus';

// Create mock EventBus
const mockEventBus = new EventBus();

describe('Chat Integration', () => {
  it('should display sent messages in the chat', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider eventBus={mockEventBus}>
        <ChatPanel />
      </ChatProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByTestId('send-button');
    
    // Send first message
    await user.type(input, 'Hello, this is my first message');
    await user.click(sendButton);
    
    // Check that the message appears in the chat
    expect(screen.getByText('You:')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is my first message')).toBeInTheDocument();
    
    // Send second message
    await user.type(input, 'This is another message');
    await user.keyboard('{Enter}');
    
    // Check that both messages are displayed
    expect(screen.getAllByText('You:')).toHaveLength(2);
    expect(screen.getByText('This is another message')).toBeInTheDocument();
  });
  
  it('should maintain message order', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider eventBus={mockEventBus}>
        <ChatPanel />
      </ChatProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    // Send multiple messages
    await user.type(input, 'First message');
    await user.keyboard('{Enter}');
    
    await user.type(input, 'Second message');
    await user.keyboard('{Enter}');
    
    await user.type(input, 'Third message');
    await user.keyboard('{Enter}');
    
    const messages = screen.getAllByTestId(/^chat-message-/);
    
    // Should have 3 messages (excluding the welcome message)
    expect(messages).toHaveLength(3);
    
    // Verify order
    expect(messages[0]).toHaveTextContent('First message');
    expect(messages[1]).toHaveTextContent('Second message');
    expect(messages[2]).toHaveTextContent('Third message');
  });
  
  it('should show welcome message initially', () => {
    render(
      <ChatProvider eventBus={mockEventBus}>
        <ChatPanel />
      </ChatProvider>
    );
    
    expect(screen.getByText('Hexframe:')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Hexframe! Select a tile to explore its content./)).toBeInTheDocument();
  });
});