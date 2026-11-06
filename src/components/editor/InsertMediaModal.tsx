import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Link, 
  Image as ImageIcon, 
  Film, 
  Sparkles, 
  Check, 
  Loader2,
  FolderOpen
} from 'lucide-react';
import { saveAsset, isVideoEmbedUrl } from '../../services/assetService';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const isVideo = mediaType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {isVideo ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {isVideo ? 'Embed Video' : 'Insert Image'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                Saved into vault <code className="text-indigo-400">assets/</code> folder
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

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 px-5 pt-2 bg-zinc-950/30 gap-4 text-xs font-medium">
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
            <span>Upload File to Assets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'url'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>{isVideo ? 'YouTube / Web URL' : 'Image URL'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'upload' ? (
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
                    Click to select {isVideo ? 'video' : 'image'} from device
                  </div>
                  <p className="text-[11px] text-zinc-500 max-w-xs">
                    File will be automatically copied into your vault's <code className="text-zinc-400 font-mono">assets/</code> directory.
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
                    placeholder="e.g. Hogwarts Castle at Sunset"
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  {isVideo ? 'Video URL (YouTube, Vimeo, or MP4 link)' : 'Direct Image URL'}
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={
                    isVideo 
                      ? 'https://www.youtube.com/watch?v=... or https://.../video.mp4' 
                      : 'https://images.unsplash.com/... or https://.../photo.png'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              {isVideo && isVideoEmbedUrl(urlInput) && (
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>YouTube / video embed detected. Will render with authentic player.</span>
                </div>
              )}

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder="Caption shown below media"
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-950/60">
          <span className="text-[11px] text-zinc-500">
            Markdown PKM compliant
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
              disabled={isProcessing || (activeTab === 'upload' && !selectedFile) || (activeTab === 'url' && !urlInput.trim())}
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
