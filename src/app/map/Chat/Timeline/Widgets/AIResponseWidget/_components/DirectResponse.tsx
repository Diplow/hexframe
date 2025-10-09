import { MarkdownRenderer } from '~/app/map/Chat/Timeline/_components/MarkdownRenderer';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface DirectResponseProps {
  response: string;
  model?: string;
  timestamp?: number | Date;
}

export function DirectResponse({ response, model, timestamp }: DirectResponseProps) {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  return (
    <BaseWidget variant="primary" className="w-full">
      <WidgetHeader
        title="HexFrame"
        subtitle={formattedTime}
      />
      <WidgetContent>
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer content={response || 'Processing...'} isSystemMessage={false} />
        </div>
        {model && <div className="text-xs text-muted-foreground">Model: {model}</div>}
      </WidgetContent>
    </BaseWidget>
  );
}
