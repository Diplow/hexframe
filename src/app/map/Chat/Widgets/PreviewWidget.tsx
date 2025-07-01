'use client';

import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
}

export function PreviewWidget({ title, content }: PreviewWidgetProps) {
  return (
    <Card data-testid="preview-widget" className="max-w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown 
            components={{
              // Ensure links open in new tab for security
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}