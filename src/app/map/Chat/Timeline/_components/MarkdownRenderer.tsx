import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { _createMarkdownComponents } from '~/app/map/Chat/Timeline/_components/_renderers/_markdown-components';

interface MarkdownRendererProps {
  content: string;
  isSystemMessage: boolean;
}

export function MarkdownRenderer({ content, isSystemMessage }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none prose-li:my-0 prose-li:marker:text-current [&_li>p]:inline [&_li>p]:m-0 ${isSystemMessage ? 'text-muted-foreground' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={_createMarkdownComponents(isSystemMessage)}
      >
        {content.replace(/\{\{COPY_BUTTON:[^}]+\}\}/g, '') ?? ''}
      </ReactMarkdown>
    </div>
  );
}