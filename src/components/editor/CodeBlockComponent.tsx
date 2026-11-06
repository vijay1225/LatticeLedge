import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Copy, Check, Terminal } from 'lucide-react';

const COMMON_LANGUAGES = [
  'plaintext',
  'python',
  'javascript',
  'typescript',
  'sql',
  'markdown',
  'html',
  'css',
  'json',
  'bash',
  'rust',
  'go',
  'java',
  'cpp'
];

export const CodeBlockComponent: React.FC<any> = ({ node, updateAttributes }) => {
  const [copied, setCopied] = useState(false);
  const currentLang = node.attrs.language || 'plaintext';

  const handleCopy = () => {
    const code = node.textContent;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <NodeViewWrapper className="code-block my-5 rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-lg overflow-hidden text-xs">
      {/* Code Header Bar with Language Picker and Copy Button */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 text-[11px] select-none">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            contentEditable={false}
            value={currentLang}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            className="bg-transparent text-zinc-300 font-mono text-[11px] focus:outline-none cursor-pointer border-0 hover:text-white transition-colors"
          >
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang} value={lang} className="bg-zinc-900 text-zinc-200">
                {lang}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-[11px] font-medium"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-zinc-200 font-mono text-xs leading-relaxed m-0 selection:bg-indigo-600/40">
        <NodeViewContent className={`language-${currentLang}`} />
      </pre>
    </NodeViewWrapper>
  );
};
