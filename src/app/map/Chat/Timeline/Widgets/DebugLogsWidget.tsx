'use client';

import { useEffect, useRef, useState } from 'react';
import { Bug } from 'lucide-react';
// DOMPurify will be loaded dynamically to avoid SSR issues
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface DebugLogsWidgetProps {
  title: string;
  content: string;
  onClose?: () => void;
}

export function DebugLogsWidget({ title, content, onClose }: DebugLogsWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape code blocks, replace copy placeholders with data attribute (no inline JS)
  const enhancedContent = content
    .replace(/```\n([\s\S]*?)\n```/g, (_m, code) => {
      const escaped = String(code)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return `<pre class="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto"><code>${escaped}</code></pre>`;
    })
    .replace(
      /\{\{COPY_BUTTON:([^}]+)\}\}/g,
      '<div class="flex justify-end mt-4"><button type="button" class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary" data-copy-b64="$1">Copy Logs</button></div>'
    );

  // Sanitize resulting HTML; allow only safe tags/attrs (data-* preserved)
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');

  useEffect(() => {
    // Dynamically import DOMPurify only on the client side
    if (typeof window !== 'undefined') {
      import('isomorphic-dompurify').then(({ default: DOMPurify }) => {
        const sanitized = DOMPurify.sanitize(enhancedContent, {
          ALLOWED_TAGS: ['div', 'pre', 'code', 'button', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br', 'span'],
          ALLOWED_ATTR: ['class', 'href', 'rel', 'target', 'data-copy-b64', 'type'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick']
        });
        setSanitizedHtml(sanitized);
      }).catch(error => {
        console.warn('Failed to load DOMPurify, using raw content:', error);
        // Fallback: use the enhanced content without sanitization (less secure but functional)
        setSanitizedHtml(enhancedContent);
      });
    } else {
      // On server side, use the enhanced content without sanitization
      setSanitizedHtml(enhancedContent);
    }
  }, [enhancedContent]);

  // Wire copy behavior via React effect; no inline event handlers
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-copy-b64]'));
    const removers = btns.map((btn) => {
      const b64 = btn.dataset.copyB64 ?? '';
      const onClick = () => {
        void (async () => {
          try {
            await navigator.clipboard.writeText(atob(b64));
          } catch (e) {
            console.error('Copy failed', e);
          }
        })();
      };
      btn.addEventListener('click', onClick);
      return () => btn.removeEventListener('click', onClick);
    });
    return () => removers.forEach((off) => off());
  }, [sanitizedHtml]);

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
        <div ref={containerRef} className="prose prose-sm dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}