import React from 'react';
import { Link2, CheckSquare, Square } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onNavigateToNote: (title: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onNavigateToNote
}) => {
  if (!content) return null;

  // Split into paragraphs / blocks
  const blocks = content.split(/\n\n+/);

  const renderInline = (text: string): React.ReactNode[] => {
    // Split by [[Wiki Link]] first
    const parts = text.split(/(\[\[.*?\]\])/g);

    return parts.map((part, i) => {
      // Check [[Wiki Link]]
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const title = part.slice(2, -2).trim();
        return (
          <button
            key={`wiki-${i}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigateToNote(title);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-medium mx-1 transition-colors group align-baseline"
          >
            <Link2 className="w-3 h-3 text-indigo-400 group-hover:rotate-45 transition-transform" />
            <span>{title}</span>
          </button>
        );
      }

      // Format bold, italics, inline code inside standard text
      // Simple parser for **bold** and *italic* and `code`
      const inlineParts = part.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

      return (
        <span key={`text-${i}`}>
          {inlineParts.map((sub, j) => {
            if (sub.startsWith('**') && sub.endsWith('**')) {
              return <strong key={j} className="font-bold text-zinc-100">{sub.slice(2, -2)}</strong>;
            }
            if (sub.startsWith('*') && sub.endsWith('*')) {
              return <em key={j} className="italic text-zinc-300">{sub.slice(1, -1)}</em>;
            }
            if (sub.startsWith('`') && sub.endsWith('`')) {
              return (
                <code key={j} className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-xs border border-zinc-700/50">
                  {sub.slice(1, -1)}
                </code>
              );
            }
            return sub;
          })}
        </span>
      );
    });
  };

  return (
    <div className="space-y-4 text-zinc-200 leading-relaxed text-sm select-text">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();

        // 1. Heading 1: # Title
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-bold text-zinc-100 pb-2 border-b border-zinc-800/80 mt-6 first:mt-0 tracking-tight">
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }

        // 2. Heading 2: ## Subtitle
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-semibold text-zinc-100 mt-5 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full" />
              <span>{renderInline(trimmed.slice(3))}</span>
            </h2>
          );
        }

        // 3. Heading 3: ### Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-semibold text-zinc-200 mt-4 mb-1">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }

        // 4. Blockquote: > text
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-2 border-indigo-400/80 pl-4 py-1.5 my-3 italic text-zinc-400 bg-zinc-900/40 rounded-r-lg">
              {renderInline(trimmed.replace(/^>\s*/, ''))}
            </blockquote>
          );
        }

        // 5. Checklist or Bullet list
        const lines = trimmed.split('\n');
        const isList = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* ') || /^\d+\.\s/.test(l.trim()));

        if (isList) {
          return (
            <ul key={idx} className="space-y-1.5 my-2 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim();

                // Checklist item: - [x] or - [ ]
                if (cleanLine.startsWith('- [x]') || cleanLine.startsWith('* [x]')) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2 text-zinc-400 line-through">
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{renderInline(cleanLine.slice(5))}</span>
                    </li>
                  );
                }
                if (cleanLine.startsWith('- [ ]') || cleanLine.startsWith('* [ ]')) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2 text-zinc-300">
                      <Square className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      <span>{renderInline(cleanLine.slice(5))}</span>
                    </li>
                  );
                }

                // Standard Bullet
                const text = cleanLine.replace(/^[-*]\s+|\d+\.\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" />
                    <span>{renderInline(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // 6. Regular paragraph
        return (
          <p key={idx} className="leading-relaxed text-zinc-300">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
};
