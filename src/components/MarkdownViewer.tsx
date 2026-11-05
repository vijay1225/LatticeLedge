import React from 'react';
import { Link2 } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  onLinkClick?: (noteTitle: string) => void;
  className?: string;
}

/**
 * Parses and renders inline markdown formatting:
 * - Bold: **text**
 * - Italic: *text*
 * - Inline code: `code`
 * - Wiki links: [[Page Name]]
 */
function renderInlineContent(
  text: string,
  onLinkClick?: (noteTitle: string) => void
): React.ReactNode[] {
  // Regex pattern matching:
  // 1. [[Wiki Links]]
  // 2. `code`
  // 3. **bold**
  // 4. *italic*
  const tokenRegex = /(\[\[.*?\]\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. [[Wiki Link]]
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const pageTitle = part.slice(2, -2).trim();
      return (
        <button
          key={index}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick?.(pageTitle);
          }}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-[11px] font-medium transition-colors cursor-pointer"
          title={`Open page: ${pageTitle}`}
        >
          <Link2 className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
          <span>{pageTitle}</span>
        </button>
      );
    }

    // 2. `inline code`
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="mx-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-[11px] border border-zinc-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // 3. **bold**
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // 4. *italic*
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  onLinkClick,
  className = ''
}) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code block fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`code-${i}`} className="my-2.5 rounded-lg bg-zinc-950 border border-zinc-800 p-3 overflow-x-auto text-xs font-mono text-zinc-300">
            {codeBlockLang && (
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-sans">
                {codeBlockLang}
              </div>
            )}
            <pre className="m-0 leading-relaxed">{codeBlockLines.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '');
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line -> spacing
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Heading 1 (# ...)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-base font-bold text-zinc-100 mt-3 mb-1.5 pb-1 border-b border-zinc-800 flex items-center gap-1.5">
          {renderInlineContent(trimmed.replace(/^#\s+/, ''), onLinkClick)}
        </h2>
      );
      continue;
    }

    // Heading 2 (## ...)
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-semibold text-zinc-200 mt-2.5 mb-1 pb-0.5 border-b border-zinc-800/60">
          {renderInlineContent(trimmed.replace(/^##\s+/, ''), onLinkClick)}
        </h3>
      );
      continue;
    }

    // Heading 3 (### ...)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-semibold text-zinc-300 mt-2 mb-1">
          {renderInlineContent(trimmed.replace(/^###\s+/, ''), onLinkClick)}
        </h4>
      );
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      elements.push(
        <blockquote key={`bq-${i}`} className="my-2 pl-3 py-1 border-l-2 border-indigo-500/70 bg-zinc-950/40 rounded-r text-zinc-300 italic text-xs leading-relaxed">
          {renderInlineContent(trimmed.replace(/^>\s*/, ''), onLinkClick)}
        </blockquote>
      );
      continue;
    }

    // Bullet List Item (- or * ...)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-xs text-zinc-300 leading-relaxed pl-1">
          <span className="text-indigo-400 mt-0.5 shrink-0 select-none">•</span>
          <div className="flex-1">{renderInlineContent(trimmed.replace(/^[-*]\s+/, ''), onLinkClick)}</div>
        </div>
      );
      continue;
    }

    // Numbered list item (1. ...)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 text-xs text-zinc-300 leading-relaxed pl-1">
          <span className="text-indigo-400 font-mono text-[11px] shrink-0 select-none">{numMatch[1]}.</span>
          <div className="flex-1">{renderInlineContent(numMatch[2], onLinkClick)}</div>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-zinc-300 leading-relaxed my-1">
        {renderInlineContent(line, onLinkClick)}
      </p>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {elements}
    </div>
  );
};
