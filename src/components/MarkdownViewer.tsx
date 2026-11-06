import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  Info, 
  Lightbulb, 
  AlertTriangle, 
  AlertCircle, 
  Terminal,
  X
} from 'lucide-react';
import { isVideoEmbedUrl, getYoutubeEmbedUrl, isYoutubeShort } from '../services/assetService';

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

const CodeBlockItem: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden text-xs shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800/80 text-[10px] text-zinc-400 font-mono">
        <div className="flex items-center gap-1.5 uppercase font-medium tracking-wider">
          <Terminal className="w-3 h-3 text-indigo-400" />
          <span>{lang || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 m-0 overflow-x-auto text-zinc-200 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  onLinkClick,
  className = ''
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Handle Code Block Fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <CodeBlockItem 
            key={`code-${i}`} 
            code={codeBlockLines.join('\n')} 
            lang={codeBlockLang} 
          />
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
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

    // 2. Empty Line
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // 3. Horizontal Rule (--- or ***)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-t border-zinc-800/80" />);
      continue;
    }

    // 4. Image Markdown: ![alt](src "title") or ![alt](src)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      const title = imgMatch[3];

      // Auto-detect if image src is actually a video or video embed URL
      if (isVideoEmbedUrl(src)) {
        const embedUrl = getYoutubeEmbedUrl(src);
        const isShort = isYoutubeShort(src);
        elements.push(
          <div key={`embed-${i}`} className={`my-4 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg ${
            isShort ? 'aspect-[9/16] max-w-[340px] mx-auto w-full' : 'aspect-video w-full'
          }`}>
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
        continue;
      }

      if (src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov')) {
        elements.push(
          <div key={`vid-${i}`} className="my-4 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg text-center">
            <video controls src={src} className="max-h-[460px] w-full object-contain bg-black">
              Your browser does not support the video tag.
            </video>
          </div>
        );
        continue;
      }

      elements.push(
        <div key={`img-${i}`} className="my-4 text-center">
          <img
            src={src}
            alt={alt}
            title={title || alt}
            onClick={() => setZoomedImage(src)}
            className="rounded-xl border border-zinc-800/80 shadow-md max-h-[460px] max-w-full mx-auto object-contain cursor-zoom-in hover:brightness-105 transition-all"
            loading="lazy"
          />
          {title && (
            <p className="text-[11px] text-zinc-500 mt-1.5 italic text-center">
              {title}
            </p>
          )}
        </div>
      );
      continue;
    }

    // 5. Standalone Video / YouTube URL on its own line
    if (isVideoEmbedUrl(trimmed)) {
      const embedUrl = getYoutubeEmbedUrl(trimmed);
      const isShort = isYoutubeShort(trimmed);
      elements.push(
        <div key={`auto-embed-${i}`} className={`my-4 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg ${
          isShort ? 'aspect-[9/16] max-w-[340px] mx-auto w-full' : 'aspect-video w-full'
        }`}>
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
      continue;
    }

    // 6. HTML Video Tag: <video src="..." ...></video>
    if (trimmed.startsWith('<video') && trimmed.includes('src=')) {
      const srcMatch = trimmed.match(/src=["'](.*?)["']/);
      if (srcMatch) {
        elements.push(
          <div key={`vid-${i}`} className="my-4 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg text-center">
            <video controls src={srcMatch[1]} className="max-h-[460px] w-full object-contain bg-black">
              Your browser does not support the video tag.
            </video>
          </div>
        );
        continue;
      }
    }

    // 7. HTML Iframe / YouTube embed: <iframe src="..." ...></iframe>
    if (trimmed.startsWith('<iframe') && trimmed.includes('src=')) {
      const srcMatch = trimmed.match(/src=["'](.*?)["']/);
      if (srcMatch) {
        const rawSrc = srcMatch[1];
        const embedUrl = isVideoEmbedUrl(rawSrc) ? getYoutubeEmbedUrl(rawSrc) : rawSrc;
        const isShort = isYoutubeShort(rawSrc) || trimmed.includes('data-is-short="true"');
        elements.push(
          <div key={`iframe-${i}`} className={`my-4 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg ${
            isShort ? 'aspect-[9/16] max-w-[340px] mx-auto w-full' : 'aspect-video w-full'
          }`}>
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
        continue;
      }
    }

    // 7. Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-base font-bold text-zinc-100 mt-4 mb-2 pb-1 border-b border-zinc-800 flex items-center gap-1.5">
          {renderInlineContent(trimmed.replace(/^#\s+/, ''), onLinkClick)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-semibold text-zinc-200 mt-3 mb-1.5 pb-0.5 border-b border-zinc-800/60">
          {renderInlineContent(trimmed.replace(/^##\s+/, ''), onLinkClick)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-semibold text-zinc-300 mt-2.5 mb-1">
          {renderInlineContent(trimmed.replace(/^###\s+/, ''), onLinkClick)}
        </h4>
      );
      continue;
    }

    // 8. Authentic Note App Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
    if (trimmed.startsWith('>')) {
      const rawText = trimmed.replace(/^>\s*/, '');
      let calloutType: 'note' | 'tip' | 'warning' | 'important' | null = null;
      let calloutBody = rawText;

      if (rawText.startsWith('[!NOTE]')) {
        calloutType = 'note';
        calloutBody = rawText.replace(/^\[!NOTE\]\s*/, '');
      } else if (rawText.startsWith('[!TIP]')) {
        calloutType = 'tip';
        calloutBody = rawText.replace(/^\[!TIP\]\s*/, '');
      } else if (rawText.startsWith('[!WARNING]')) {
        calloutType = 'warning';
        calloutBody = rawText.replace(/^\[!WARNING\]\s*/, '');
      } else if (rawText.startsWith('[!IMPORTANT]') || rawText.startsWith('[!CAUTION]')) {
        calloutType = 'important';
        calloutBody = rawText.replace(/^\[!(IMPORTANT|CAUTION)\]\s*/, '');
      }

      if (calloutType === 'note') {
        elements.push(
          <div key={`co-${i}`} className="my-2.5 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200 flex items-start gap-2.5 shadow-sm">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderInlineContent(calloutBody, onLinkClick)}</div>
          </div>
        );
        continue;
      }
      if (calloutType === 'tip') {
        elements.push(
          <div key={`co-${i}`} className="my-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-200 flex items-start gap-2.5 shadow-sm">
            <Lightbulb className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderInlineContent(calloutBody, onLinkClick)}</div>
          </div>
        );
        continue;
      }
      if (calloutType === 'warning') {
        elements.push(
          <div key={`co-${i}`} className="my-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 flex items-start gap-2.5 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderInlineContent(calloutBody, onLinkClick)}</div>
          </div>
        );
        continue;
      }
      if (calloutType === 'important') {
        elements.push(
          <div key={`co-${i}`} className="my-2.5 p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs text-purple-200 flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderInlineContent(calloutBody, onLinkClick)}</div>
          </div>
        );
        continue;
      }

      // Standard Blockquote
      elements.push(
        <blockquote key={`bq-${i}`} className="my-2 pl-3 py-1.5 border-l-2 border-indigo-500/70 bg-zinc-950/40 rounded-r text-zinc-300 italic text-xs leading-relaxed">
          {renderInlineContent(rawText, onLinkClick)}
        </blockquote>
      );
      continue;
    }

    // 9. Bullet List Item (- or * ...)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-xs text-zinc-300 leading-relaxed pl-1">
          <span className="text-indigo-400 mt-0.5 shrink-0 select-none">•</span>
          <div className="flex-1">{renderInlineContent(trimmed.replace(/^[-*]\s+/, ''), onLinkClick)}</div>
        </div>
      );
      continue;
    }

    // 10. Numbered list item (1. ...)
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

    // 11. Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-zinc-300 leading-relaxed my-1">
        {renderInlineContent(line, onLinkClick)}
      </p>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {elements}

      {/* Lightbox / Zoom Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImage}
            alt="Fullscreen view"
            className="max-h-[92vh] max-w-[92vw] rounded-xl shadow-2xl object-contain border border-zinc-800"
          />
        </div>
      )}
    </div>
  );
};
