'use client';

import { useState } from 'react';
import { Bug } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface DebugLogsWidgetProps {
  title: string;
  content: string;
  onClose?: () => void;
}

export function DebugLogsWidget({ title, content, onClose }: DebugLogsWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract and enhance the copy button functionality
  const enhancedContent = content
    .replace(/```\n([\s\S]*?)\n```/g, '<pre class="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto"><code>$1</code></pre>')
    .replace(/\{\{COPY_BUTTON:([^}]+)\}\}/g, '<div class="flex justify-end mt-4"><button class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary" onclick="navigator.clipboard.writeText(atob(\'$1\'))">Copy Logs</button></div>');

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Bug className="h-4 w-4 text-destructive" />}
        title={title}
        onClose={onClose}
        collapsible={true}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <WidgetContent isCollapsed={isCollapsed}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: enhancedContent }} />
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}