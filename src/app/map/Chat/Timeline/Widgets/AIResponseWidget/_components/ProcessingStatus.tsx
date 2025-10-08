import { Cpu } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface ProcessingStatusProps {
  model?: string;
  elapsedTime: number;
}

export function ProcessingStatus({ model, elapsedTime }: ProcessingStatusProps) {
  return (
    <BaseWidget variant="primary" className="w-full">
      <WidgetHeader
        icon={<Cpu className="w-5 h-5 text-primary animate-spin" />}
        title="HexFrame"
        subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      />
      <WidgetContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-primary">Processing with AI</div>
            <div className="text-sm text-muted-foreground">{model ?? 'AI model'} is thinking...</div>
            <div className="mt-2">
              <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress" />
              </div>
            </div>
          </div>
          <div className="text-sm text-primary">{elapsedTime}s</div>
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
