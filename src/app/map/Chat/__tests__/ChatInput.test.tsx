import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';
import { ChatProvider } from '../ChatProvider';
import type { ReactNode } from 'react';

const mockEventBus = {
  emit: vi.fn(),
  on: vi.fn().mockReturnValue(() => undefined),
  off: vi.fn(),
};

function TestWrapper({ children }: { children: ReactNode }) {
  return <ChatProvider eventBus={mockEventBus as unknown as Parameters<typeof ChatProvider>[0]['eventBus']}>{children}</ChatProvider>;
}

describe('ChatInput', () => {
  it('should render input field and send button', () => {
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });
  
  it('should disable send button when input is empty', () => {
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).toBeDisabled();
  });
  
  it('should enable send button when input has text', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByTestId('send-button');
    
    await user.type(input, 'Hello world');
    
    expect(sendButton).not.toBeDisabled();
  });
  
  it('should send message on button click', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByTestId('send-button');
    
    await user.type(input, 'Test message');
    await user.click(sendButton);
    
    // Input should be cleared after sending
    expect(input).toHaveValue('');
    expect(sendButton).toBeDisabled();
  });
  
  it('should send message on Enter key press', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');
    
    // Input should be cleared after sending
    expect(input).toHaveValue('');
  });
  
  it('should allow line breaks with Shift+Enter', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    await user.type(input, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, 'Line 2');
    
    expect(input).toHaveValue('Line 1\nLine 2');
  });
  
  it('should not send empty or whitespace-only messages', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ChatInput />
      </TestWrapper>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByTestId('send-button');
    
    // Try to send whitespace only
    await user.type(input, '   ');
    expect(sendButton).toBeDisabled();
    
    await user.keyboard('{Enter}');
    // Input should not be cleared if message was not sent
    expect(input).toHaveValue('   ');
  });
});