import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { resolveAssetUrl } from '../../services/assetService';
import { Maximize2, X, Trash2, Image as ImageIcon } from 'lucide-react';

export const ImageNodeView: React.FC<any> = ({ node, deleteNode }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(node.attrs.src || '');
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    if (node.attrs.src) {
      resolveAssetUrl(node.attrs.src)
        .then((url) => {
          if (active) setResolvedSrc(url);
        })
        .catch(() => {
          if (active) setResolvedSrc(node.attrs.src);
        });
    }
    return () => {
      active = false;
    };
  }, [node.attrs.src]);

  return (
    <NodeViewWrapper className="image-node my-6 text-center select-none group relative">
      <div className="relative inline-block max-w-full">
        {/* Floating action pill on hover */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-md">
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Expand Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Remove Image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {hasError ? (
          <div className="py-12 px-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
            <span className="text-xs">Failed to load image: {node.attrs.src}</span>
          </div>
        ) : (
          <img
            src={resolvedSrc}
            alt={node.attrs.alt || ''}
            title={node.attrs.title || ''}
            onError={() => setHasError(true)}
            onClick={() => setIsZoomed(!isZoomed)}
            className="rounded-xl border border-zinc-800/80 shadow-md max-h-[520px] max-w-full object-contain mx-auto cursor-zoom-in hover:brightness-105 transition-all"
            loading="lazy"
          />
        )}

        {/* Caption */}
        {node.attrs.title && (
          <p className="text-[11px] text-zinc-500 mt-2 italic text-center font-sans tracking-wide">
            {node.attrs.title}
          </p>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomed && (
        <div 
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={resolvedSrc}
            alt={node.attrs.alt || ''}
            className="max-h-[92vh] max-w-[92vw] rounded-xl shadow-2xl object-contain border border-zinc-800"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};
