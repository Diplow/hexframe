import ReactMarkdown from 'react-markdown';
import { BaseWidget, WidgetHeader, WidgetContent } from "~/app/map/Chat/Timeline/Widgets";
import { History, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";

interface LoadingStateProps {
  onClose: () => void;
}

export function _HistoryLoadingState({ onClose }: LoadingStateProps) {
  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<History className="h-5 w-5 text-primary" />}
        title="Version History"
        onClose={onClose}
      />
      <WidgetContent>
        <div className="p-4 text-center text-muted-foreground">
          Loading history...
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}

export function _HistoryErrorState({ onClose }: LoadingStateProps) {
  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<History className="h-5 w-5 text-primary" />}
        title="Version History"
        onClose={onClose}
      />
      <WidgetContent>
        <div className="p-4 text-center text-destructive">
          Failed to load history
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}

export function _HistoryEmptyState({ onClose }: LoadingStateProps) {
  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<History className="h-5 w-5 text-primary" />}
        title="Version History"
        onClose={onClose}
      />
      <WidgetContent>
        <div className="p-4 text-center text-muted-foreground">
          No version history available
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}

interface VersionData {
  versionNumber: number;
  title?: string | null;
  preview?: string | null;
  content?: string | null;
  link?: string | null;
  createdAt: Date | string;
}

interface VersionDetailProps {
  versionData: VersionData;
  onClose: () => void;
  onRestore?: () => void;
}

export function _VersionDetail({ versionData, onClose, onRestore }: VersionDetailProps) {
  const formattedDate = new Date(versionData.createdAt).toLocaleString();

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<History className="h-5 w-5 text-primary" />}
        title={
          <div className="flex flex-col">
            <span className="font-semibold">{versionData.title ?? "Untitled"}</span>
            <span className="text-xs text-muted-foreground font-normal">
              Version {versionData.versionNumber} • {formattedDate}
            </span>
          </div>
        }
        onClose={onClose}
      />
      <WidgetContent>
        <div className="p-3 bg-neutral-100 dark:bg-neutral-800 border-l-4 border-primary mb-3 flex items-center justify-between">
          <p className="text-sm text-secondary-900 dark:text-secondary-100">
            📜 This is a historical version (read-only)
          </p>
          {onRestore && (
            <Button
              onClick={onRestore}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </Button>
          )}
        </div>

        {versionData.preview && (
          <div className="mb-3">
            <div className="text-sm text-muted-foreground px-3">
              {versionData.preview}
            </div>
          </div>
        )}

        {versionData.content && (
          <div className="px-3">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {versionData.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {versionData.link && (
          <div className="mt-3 px-3">
            <a
              href={versionData.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-link hover:underline"
            >
              🔗 {versionData.link}
            </a>
          </div>
        )}
      </WidgetContent>
    </BaseWidget>
  );
}

interface VersionListItemData {
  versionNumber: number;
  title?: string | null;
  preview?: string | null;
  createdAt: Date | string;
}

interface VersionListItemProps {
  version: VersionListItemData;
  onClick: () => void;
  isCurrent?: boolean;
}

export function _VersionListItem({ version, onClick, isCurrent = false }: VersionListItemProps) {
  const formattedDate = new Date(version.createdAt).toLocaleString();

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isCurrent
          ? 'border-primary bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
          : 'border-transparent bg-background dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="font-medium text-secondary-900 dark:text-secondary-100 truncate">
              {version.title ?? "Untitled"}
            </h5>
            {isCurrent && (
              <span className="text-xs font-semibold text-primary bg-primary-100 dark:bg-primary-800 px-2 py-0.5 rounded flex-shrink-0">
                Current
              </span>
            )}
            <span className="text-xs text-muted-foreground bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded flex-shrink-0">
              v{version.versionNumber}
            </span>
          </div>
          {version.preview && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
              {version.preview}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formattedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
