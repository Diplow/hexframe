import { Clock } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface PendingStatusProps {
  jobId?: string;
  elapsedTime: number;
}

export function PendingStatus({ jobId, elapsedTime }: PendingStatusProps) {
  return (
    <BaseWidget variant="primary" className="w-full">
      <WidgetHeader
        icon={<Clock className="w-5 h-5 text-muted-foreground animate-pulse" />}
        title="HexFrame"
        subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      />
      <WidgetContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Request Queued</div>
            <div className="text-sm text-muted-foreground">
              Your request has been queued and will be processed shortly...
            </div>
            {jobId && <div className="text-xs text-muted-foreground mt-1">Job ID: {jobId}</div>}
          </div>
          <div className="text-sm text-muted-foreground">{elapsedTime}s</div>
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
