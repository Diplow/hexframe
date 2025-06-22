"use client";

import type { TileScale } from "~/app/static/map/Tile/Base/base";
import ReactMarkdown from "react-markdown";
import { getTextColorForDepth } from "~/app/map/types/theme-colors";

export interface DynamicTileContentProps {
  data: {
    title?: string;
    description?: string;
    url?: string;
  };
  scale: TileScale;
  tileId?: string;
  isHovered?: boolean;
  depth?: number; // Add depth prop for text color calculation
}

const getTextClasses = (depth = 0) => `break-words ${getTextColorForDepth(depth)}`;

export const DynamicTileContent = ({ data, scale, tileId, isHovered = false, depth = 0 }: DynamicTileContentProps) => {
  if (!data) return null;
  
  const textClasses = getTextClasses(depth);

  const marginClass =
    scale === 1 ? "my-[6px]" : scale === 2 ? "my-[18px]" : "my-[54px]";
  // Add horizontal padding that scales with tile size
  const horizontalPadding = scale === 1 ? "px-2" : scale === 2 ? "px-4" : scale === 3 ? "px-[10%]" : "px-[15%]";
  
  // For scale 2, show different content based on hover state
  if (scale === 2 && (data.title || data.description)) {
    // On hover, show unified markdown
    if (isHovered) {
      const combinedContent = data.title 
        ? `# ${data.title}\n${data.description ?? ''}`
        : data.description ?? '';
      
      return (
        <div
          className={`${marginClass} ${horizontalPadding} flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden`}
        >
          <DescriptionSection description={combinedContent} scale={scale} tileId={tileId} />
        </div>
      );
    }
    
    // Default: show title + truncated description
    const truncatedDescription = data.description 
      ? data.description.length > 200 
        ? `${data.description.substring(0, 200)}...` 
        : data.description
      : '';
    
    return (
      <div
        className={`${marginClass} ${horizontalPadding} flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden`}
      >
        {data.title && <TitleSection title={data.title} scale={scale} tileId={tileId} textClasses={textClasses} />}
        {truncatedDescription && (
          <div className={`w-full text-xs ${textClasses} prose prose-xs prose-zinc max-w-full text-center`}>
            <ReactMarkdown
              components={{
                // Simplified components for truncated view
                p: ({ children }) => <p className="mb-0.5 text-center">{children}</p>,
                h1: ({ children }) => <span className="font-bold">{children}</span>,
                h2: ({ children }) => <span className="font-bold">{children}</span>,
                h3: ({ children }) => <span className="font-semibold">{children}</span>,
                ul: ({ children }) => <span>{children}</span>,
                ol: ({ children }) => <span>{children}</span>,
                li: ({ children }) => <span>• {children} </span>,
                code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-0.5 rounded text-xs">{children}</code>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-800 dark:text-cyan-400 hover:text-cyan-950 dark:hover:text-cyan-300 underline">
                    {children}
                  </a>
                ),
              }}
            >
              {truncatedDescription}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }
  
  // For scale 3+, always show combined content
  if (scale >= 3 && (data.title || data.description)) {
    const combinedContent = data.title 
      ? `# ${data.title}\n${data.description ?? ''}`
      : data.description ?? '';
    
    return (
      <div
        className={`${marginClass} ${horizontalPadding} flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden`}
      >
        <DescriptionSection description={combinedContent} scale={scale} tileId={tileId} textClasses={textClasses} />
        {data.url && scale > 2 && <UrlSection url={data.url} scale={scale} textClasses={textClasses} />}
      </div>
    );
  }
  
  // For scale 1, keep the original layout
  return (
    <div
      className={`${marginClass} ${horizontalPadding} flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden`}
    >
      {data.title && <TitleSection title={data.title} scale={scale} tileId={tileId} textClasses={textClasses} />}
      {data.description && <DescriptionSection description={data.description} scale={scale} tileId={tileId} textClasses={textClasses} />}
      {data.url && scale > 2 && <UrlSection url={data.url} scale={scale} textClasses={textClasses} />}
    </div>
  );
};

const TitleSection = ({ title, scale, tileId, textClasses }: { title: string; scale: TileScale; tileId?: string; textClasses: string }) => {
  if (scale < 1) return null;
  const baseFontSize =
    scale === 1 ? "text-xs" : scale === 2 ? "text-md" : "text-lg";

  const fontWeight =
    scale === 1 ? "font-[8px]" : scale === 2 ? "font-medium" : "font-semibold";

  // For scale 2, don't truncate since we allow wrapping
  const maxLength = scale === 1 ? 25 : scale === 2 ? 60 : 300;
  const truncatedTitle =
    title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;

  const testId = tileId ? `tile-title-${tileId}` : "tile-title";
  
  // Make title 25% narrower with fixed height (1.5x taller)
  const heightClass = scale === 1 ? "h-12" : scale === 2 ? "h-[60px]" : "h-[72px]";
  // For scale 2, allow text wrapping with more lines
  const widthClass = scale === 2 ? "w-full" : "w-[75%]";
  const textWrapClass = scale === 2 ? "break-words" : "";
  const heightStyle = scale === 2 ? " h-auto" : heightClass;
  const displayClass = scale === 2 ? "" : "flex items-center justify-center";
  
  return (
    <div className={`${baseFontSize} ${fontWeight} ${textClasses} ${widthClass} ${heightStyle} ${textWrapClass} text-center flex-shrink-0 ${displayClass} px-2`} data-testid={testId}>
      {scale === 2 ? (
        <p className="line-clamp-4 whitespace-normal">{truncatedTitle}</p>
      ) : (
        truncatedTitle
      )}
    </div>
  );
};

const DescriptionSection = ({ description, scale, tileId, textClasses }: { description: string; scale: TileScale; tileId?: string; textClasses: string }) => {
  if (scale < 2) return null;
  
  // For scale 2 and above, show full description with scrolling
  const maxHeight = scale === 2 ? "max-h-[200px]" : "max-h-[476px]";
  const textSize = scale === 2 ? "text-xs" : "text-sm";
  const proseSize = scale === 2 ? "prose-xs" : "prose-sm";
  
    return (
      <div className={`w-full flex items-center`}>
        <div className={`w-full ${textSize} ${textClasses} ${maxHeight} overflow-y-auto prose ${proseSize} prose-zinc max-w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent relative z-30 text-center`}>
        <ReactMarkdown
          components={{
            // Override default styles to fit within tile - scale-aware sizing
            p: ({ children }) => <p className={`${scale === 2 ? 'mb-1' : 'mb-2'} text-center`}>{children}</p>,
            h1: ({ children }) => <h1 className={`${scale === 2 ? 'text-sm' : 'text-lg'} font-bold ${scale === 2 ? 'mb-1' : 'mb-2'} text-center`} data-testid={tileId ? `tile-markdown-h1-${tileId}` : "tile-markdown-h1"}>{children}</h1>,
            h2: ({ children }) => <h2 className={`${scale === 2 ? 'text-xs' : 'text-sm'} font-bold ${scale === 2 ? 'mb-1' : 'mb-2'} text-center`}>{children}</h2>,
            h3: ({ children }) => <h3 className={`${scale === 2 ? 'text-xs' : 'text-sm'} font-semibold mb-1 text-center`}>{children}</h3>,
            ul: ({ children }) => <ul className={`list-disc list-inside ${scale === 2 ? 'mb-1' : 'mb-2'} text-center`}>{children}</ul>,
            ol: ({ children }) => <ol className={`list-decimal list-inside ${scale === 2 ? 'mb-1' : 'mb-2'} text-center`}>{children}</ol>,
            li: ({ children }) => <li className={`${scale === 2 ? 'mb-0.5' : 'mb-1'} text-left`}>{children}</li>,
            code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{children}</code>,
            pre: ({ children }) => <pre className={`bg-gray-100 dark:bg-gray-800 ${scale === 2 ? 'p-1' : 'p-2'} rounded text-xs overflow-auto ${scale === 2 ? 'mb-1' : 'mb-2'}`}>{children}</pre>,
            blockquote: ({ children }) => <blockquote className={`border-l-2 border-gray-300 ${scale === 2 ? 'pl-1' : 'pl-2'} italic`}>{children}</blockquote>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-800 dark:text-cyan-400 hover:text-cyan-950 dark:hover:text-cyan-300 underline">
                {children}
              </a>
            ),
          }}
        >
          {description}
        </ReactMarkdown>
        </div>
      </div>
    );

};

const UrlSection = ({ url, scale, textClasses }: { url: string; scale: TileScale; textClasses: string }) => {
  if (scale < 2) return null;
  const maxLength = scale === 2 ? 25 : 50;
  const displayUrl =
    url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;

  // Use same height as title section
  const heightClass = scale === 1 ? "h-12" : scale === 2 ? "h-[60px]" : "h-[72px]";
  
  return (
    <div className={`${textClasses} truncate text-xs w-[75%] ${heightClass} flex items-center justify-center`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-800 dark:text-cyan-400 hover:text-cyan-950 dark:hover:text-cyan-300 hover:underline"
      >
        {displayUrl}
      </a>
    </div>
  );
};