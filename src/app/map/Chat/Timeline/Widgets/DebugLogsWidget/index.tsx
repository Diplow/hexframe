'use client';

import { useState } from 'react';
import { Bug } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useDebugLogsState } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_hooks/useDebugLogsState';
import { InteractiveLogs } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_components/InteractiveLogs';
import { LegacyContentRenderer } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_components/LegacyContentRenderer';

interface DebugLogsWidgetProps {
  title: string;
  content: string;
  onClose?: () => void;
}

export function DebugLogsWidget({ title, content, onClose }: DebugLogsWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    mode,
    setMode,
    showAll,
    setShowAll,
    filters,
    filterInput,
    setFilterInput,
    getCurrentLogs,
    handleAddFilter,
    handleRemoveFilter,
  } = useDebugLogsState();

  // Check if this is an interactive debug widget (has INTERACTIVE_CONTROLS)
  const isInteractive = content.includes('{{INTERACTIVE_CONTROLS:');

  // Handle copy to clipboard - avoid logging copy operations to prevent infinite loops
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentLogs());
      // Intentionally not logging copy success to avoid infinite loops
    } catch (e) {
      // Using console.error instead of debugLogger to avoid loops
      console.error('DebugLogsWidget copy failed:', e);
    }
  };

  const renderContent = () => {
    if (isInteractive) {
      return (
        <InteractiveLogs
          logs={getCurrentLogs()}
          mode={mode}
          showAll={showAll}
          filters={filters}
          filterInput={filterInput}
          onModeChange={setMode}
          onShowAllChange={setShowAll}
          onFilterInputChange={setFilterInput}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          onCopy={handleCopy}
        />
      );
    }

    return <LegacyContentRenderer content={content} />;
  };

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Bug className="h-4 w-4 text-destructive" />}
        title={title}
        onClose={onClose}
        collapsible={true}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
      />

      <WidgetContent isCollapsed={isCollapsed}>
        <div className="text-sm leading-tight">
          {renderContent()}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
