import { Loader2 } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

export function LoadingState() {
  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        title="HexFrame"
        subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      />
      <WidgetContent>
        <span className="text-muted-foreground">Loading...</span>
      </WidgetContent>
    </BaseWidget>
  );
}
