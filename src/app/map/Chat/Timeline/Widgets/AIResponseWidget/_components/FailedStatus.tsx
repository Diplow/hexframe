import { XCircle } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface FailedStatusProps {
  error: string | null;
  jobId?: string;
}

export function FailedStatus({ error, jobId }: FailedStatusProps) {
  return (
    <BaseWidget variant="destructive" className="w-full">
      <WidgetHeader
        icon={<XCircle className="w-5 h-5 text-destructive" />}
        title="HexFrame"
        subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      />
      <WidgetContent>
        <div>
          <div className="font-medium text-destructive">Request Failed</div>
          <div className="text-sm text-muted-foreground">
            {error ?? 'An error occurred while processing your request'}
          </div>
          {jobId && <div className="text-xs text-muted-foreground mt-1">Job ID: {jobId}</div>}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
