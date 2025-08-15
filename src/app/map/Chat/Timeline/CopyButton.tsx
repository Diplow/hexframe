import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  base64Content: string;
}

export function CopyButton({ base64Content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      // Decode the base64 content
      const logContent = atob(base64Content);
      
      // Copy to clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(logContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      } else {
        // Fallback: show content in a prompt (not ideal but works)
        prompt('Copy the content below:', logContent);
      }
    } catch (_error) {
      console.warn('Failed to copy to clipboard:', _error);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy to clipboard
        </>
      )}
    </button>
  );
}