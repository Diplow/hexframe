import { CheckCircle } from 'lucide-react';
import { MarkdownRenderer } from '~/app/map/Chat/Timeline/_components/MarkdownRenderer';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface CompletedStatusProps {
  response: string;
  model?: string;
  elapsedTime: number;
}

export function CompletedStatus({ response, model, elapsedTime }: CompletedStatusProps) {
  return (
    <BaseWidget variant="success" className="w-full">
      <WidgetHeader
        icon={<CheckCircle className="w-5 h-5 text-success" />}
        title="HexFrame"
        subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      />
      <WidgetContent>
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer content={response || 'No response content'} isSystemMessage={false} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Completed</span>
          {model && <span>Model: {model}</span>}
          {elapsedTime > 0 && <span>Time: {elapsedTime}s</span>}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
