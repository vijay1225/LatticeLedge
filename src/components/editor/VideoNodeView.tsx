import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { resolveAssetUrl, isVideoEmbedUrl, getYoutubeEmbedUrl } from '../../services/assetService';
import { Trash2 } from 'lucide-react';

export const VideoNodeView: React.FC<any> = ({ node, deleteNode }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(node.attrs.src || '');
  const isEmbed = isVideoEmbedUrl(node.attrs.src || '');

  useEffect(() => {
    let active = true;
    if (node.attrs.src && !isEmbed) {
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
  }, [node.attrs.src, isEmbed]);

  const embedUrl = isEmbed ? getYoutubeEmbedUrl(node.attrs.src) : '';

  return (
    <NodeViewWrapper className="video-node my-6 text-center select-none group relative">
      <div className="relative max-w-4xl mx-auto rounded-xl border border-zinc-800 bg-black shadow-xl overflow-hidden">
        {/* Floating action pill on hover */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-md">
          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Remove Video"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {isEmbed ? (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full bg-zinc-950 flex flex-col items-center">
            <video
              controls
              src={resolvedSrc}
              className="w-full max-h-[500px] object-contain bg-black"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
