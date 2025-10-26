import { ArrowLeft, X } from "lucide-react";

// Version Detail Header
export function VersionDetailHeader({
  versionNumber,
  onBack,
  onClose,
}: {
  versionNumber: number;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[color:var(--bg-color-100)] rounded"
          aria-label="Back to version list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold">Version {versionNumber}</h3>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-[color:var(--bg-color-100)] rounded"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// Version Field Display
export function VersionField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
        {label}
      </label>
      <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)] whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

// Version Link Field
export function VersionLinkField({ link }: { link: string | null }) {
  if (!link) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
        Link
      </label>
      <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[color:var(--primary-color-600)] hover:underline"
        >
          {link}
        </a>
      </div>
    </div>
  );
}

// Version List Header
export function VersionListHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold">Version History</h3>
      <button
        onClick={onClose}
        className="p-2 hover:bg-[color:var(--bg-color-100)] rounded"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
