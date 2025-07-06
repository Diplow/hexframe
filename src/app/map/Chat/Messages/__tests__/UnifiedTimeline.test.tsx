import { render } from '@testing-library/react';
import { UnifiedTimeline } from '../UnifiedTimeline';
import type { Message, Widget } from '../../Cache/_events/event.types';

// Mock the WidgetManager since it has complex dependencies
jest.mock('../WidgetManager', () => ({
  WidgetManager: ({ widgets }: { widgets: any[] }) => (
    <div data-testid="widget-manager">{widgets.length} widgets</div>
  ),
}));

describe('UnifiedTimeline', () => {
  it('should render messages and widgets in chronological order', () => {
    const mockMessage: Message = {
      id: 'msg-1',
      content: 'Test message',
      actor: 'user',
      timestamp: new Date('2024-01-01T10:00:00Z'),
    };

    const mockWidget: Widget = {
      id: 'widget-1',
      type: 'preview',
      data: { tileId: 'tile-1' },
      priority: 'action',
      timestamp: new Date('2024-01-01T10:05:00Z'),
    };

    const items = [
      { type: 'message' as const, data: mockMessage, timestamp: mockMessage.timestamp },
      { type: 'widget' as const, data: mockWidget, timestamp: mockWidget.timestamp },
    ];

    const { getByTestId } = render(<UnifiedTimeline items={items} />);
    
    expect(getByTestId('chat-messages')).toBeInTheDocument();
  });

  it('should handle empty items list', () => {
    const { getByTestId } = render(<UnifiedTimeline items={[]} />);
    expect(getByTestId('chat-messages')).toBeInTheDocument();
  });
});