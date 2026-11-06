import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Film, 
  Sparkles, 
  Check, 
  Loader2,
  FolderOpen,
  ClipboardPaste,
  Play,
  Smartphone,
  Tv
} from 'lucide-react';
import { 
  saveAsset, 
  isVideoEmbedUrl, 
  isYoutubeShort, 
  getYoutubeEmbedUrl, 
  extractYoutubeVideoId
} from '../../services/assetService';

interface InsertMediaModalProps {
  isOpen: boolean;
  mediaType: 'image' | 'video';
  onClose: () => void;
  onInsertImage: (src: string, alt?: string, title?: string) => void;
  onInsertVideo: (src: string, isEmbed?: boolean) => void;
}

export const InsertMediaModal: React.FC<InsertMediaModalProps> = ({
  isOpen,
  mediaType,
  onClose,
  onInsertImage,
  onInsertVideo
}) => {
  const isVideo = mediaType === 'video';

  // For video, default to 'url' because pasting YouTube/Shorts links is the most common use case.
  // For image, default to 'upload'.
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isVideo ? 'url' : 'upload');
      setUrlInput('');
      setCaptionInput('');
      setAltInput('');
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [isOpen, isVideo]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!captionInput) {
      setCaptionInput(file.name.replace(/\.[^/.]+$/, ''));
    }
    if (!altInput) {
      setAltInput(file.name);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const { assetPath } = await saveAsset(selectedFile, selectedFile.name);

      if (mediaType === 'image') {
        onInsertImage(assetPath, altInput || selectedFile.name, captionInput);
      } else {
        onInsertVideo(assetPath, false);
      }
      onClose();
    } catch (err) {
      console.error('[InsertMedia] Upload failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = () => {
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    if (mediaType === 'image') {
      onInsertImage(cleanUrl, altInput || 'Image', captionInput);
    } else {
      const isEmbed = isVideoEmbedUrl(cleanUrl);
      onInsertVideo(cleanUrl, isEmbed);
    }
    onClose();
  };

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text.trim());
        }
      }
    } catch (err) {
      console.warn('[InsertMedia] Clipboard read error:', err);
    }
  };

  // Inspect entered URL for video
  const cleanUrl = urlInput.trim();
  const isShort = isVideo && isYoutubeShort(cleanUrl);
  const isEmbed = isVideo && isVideoEmbedUrl(cleanUrl);
  const isDirectVideo = isVideo && !isEmbed && (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.includes('.mp4?'));
  const embedUrl = isEmbed ? getYoutubeEmbedUrl(cleanUrl) : '';
  const ytVideoId = isEmbed ? extractYoutubeVideoId(cleanUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isVideo 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}>
              {isVideo ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <span>{isVideo ? 'Embed Video or YouTube' : 'Insert Image'}</span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                {isVideo 
                  ? 'Supports YouTube Shorts, standard YouTube, Vimeo, and local MP4/WebM'
                  : 'Save directly to vault assets/ or link online image'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher - Both Video Link & File Upload prominently displayed */}
        <div className="flex border-b border-zinc-800 px-5 pt-2.5 bg-zinc-950/40 gap-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'url'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{isVideo ? '🔗 Video Link (YouTube, Shorts, MP4)' : '🔗 Image URL'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isVideo ? '📁 Upload Video File (assets/)' : '📁 Upload Image File'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'url' ? (
            <div className="space-y-4">
              {/* URL Input with 1-Tap Paste Button */}
              <div>
                <label className="block text-[11px] text-zinc-300 mb-1.5 font-medium flex items-center justify-between">
                  <span>{isVideo ? 'Paste Video URL (YouTube Shorts, YouTube, Vimeo, MP4)' : 'Direct Image URL'}</span>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={
                      isVideo 
                        ? 'e.g. https://www.youtube.com/shorts/vxmv3snAkig or https://.../video.mp4' 
                        : 'e.g. https://images.unsplash.com/... or https://.../photo.png'
                    }
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    autoFocus
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Preset Chips for Easy Testing */}
              {isVideo && !urlInput && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-zinc-500">Try demo links:</span>
                  <button
                    type="button"
                    onClick={() => setUrlInput('https://www.youtube.com/shorts/vxmv3snAkig')}
                    className="px-2 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-[11px] text-amber-300 border border-zinc-700/60 flex items-center gap-1 transition-colors"
                  >
                    <Smartphone className="w-3 h-3 text-amber-400" />
                    <span>⚡ YouTube Short</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrlInput('https://www.youtube.com/watch?v=0kLwNq47sZ0')}
                    className="px-2 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-[11px] text-indigo-300 border border-zinc-700/60 flex items-center gap-1 transition-colors"
                  >
                    <Tv className="w-3 h-3 text-indigo-400" />
                    <span>🎬 YouTube Landscape</span>
                  </button>
                </div>
              )}

              {/* Live Video Preview Box */}
              {isVideo && cleanUrl && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">Live Video Preview:</span>
                    {isShort ? (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px] font-semibold">
                        <Smartphone className="w-3 h-3" />
                        <span>YouTube Short (9:16 Portrait){ytVideoId ? ` • ${ytVideoId}` : ''}</span>
                      </span>
                    ) : isEmbed ? (
                      <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 text-[10px] font-semibold">
                        <Tv className="w-3 h-3" />
                        <span>YouTube Video (16:9 Landscape){ytVideoId ? ` • ${ytVideoId}` : ''}</span>
                      </span>
                    ) : isDirectVideo ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px] font-semibold">
                        <Play className="w-3 h-3" />
                        <span>Direct Video Stream</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[10px]">URL Detected</span>
                    )}
                  </div>

                  <div className="relative rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-inner flex items-center justify-center p-2">
                    {isEmbed && embedUrl ? (
                      <div className={`w-full flex justify-center ${isShort ? 'max-h-[290px]' : ''}`}>
                        <div className={isShort ? 'aspect-[9/16] w-[180px] max-h-[280px] rounded-lg overflow-hidden' : 'aspect-video w-full rounded-lg overflow-hidden'}>
                          <iframe
                            src={embedUrl}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : isDirectVideo ? (
                      <video src={cleanUrl} controls className="max-h-52 w-full object-contain" />
                    ) : (
                      <div className="p-6 text-center text-zinc-500 space-y-1">
                        <Play className="w-6 h-6 mx-auto text-zinc-600" />
                        <p className="text-[11px]">Ready to embed as media player</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Preview for image URL */}
              {!isVideo && cleanUrl && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] text-zinc-400 font-medium">Image Preview:</span>
                  <div className="relative rounded-xl border border-zinc-800 bg-black max-h-52 overflow-hidden flex items-center justify-center p-2">
                    <img src={cleanUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Caption / Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder={isVideo ? 'e.g. YouTube Shorts Demo Clip' : 'e.g. Hogwarts Castle at Sunset'}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={isVideo ? 'video/*' : 'image/*'}
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-zinc-950/40 hover:bg-zinc-900/60 flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-indigo-600/20 text-zinc-400 group-hover:text-indigo-300 transition-colors">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="text-zinc-300 font-medium">
                    Click to select {isVideo ? 'video file (MP4, WebM, MOV)' : 'image file'} from device
                  </div>
                  <p className="text-[11px] text-zinc-500 max-w-xs">
                    File will be automatically copied into your vault's <code className="text-indigo-400 font-mono">assets/</code> directory for 100% offline access.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-zinc-800 overflow-hidden bg-black max-h-52 flex items-center justify-center">
                    {isVideo ? (
                      <video src={previewUrl} controls className="max-h-52 w-full object-contain" />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="max-h-52 w-full object-contain" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedFile(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-md bg-zinc-900/80 text-zinc-300 hover:text-white"
                      title="Choose another file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                    <span className="truncate max-w-[240px] font-mono text-zinc-300">
                      {selectedFile?.name}
                    </span>
                    <span>
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Captions & Alt */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Caption / Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder="e.g. Local Recording Clip"
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-950/60">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Markdown PKM compliant</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing || (activeTab === 'upload' && !selectedFile) || (activeTab === 'url' && !cleanUrl)}
              onClick={activeTab === 'upload' ? handleUploadSubmit : handleUrlSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Assets...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Insert into Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
