import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Download, 
    ExternalLink, 
    Loader2, 
    RefreshCw,
    X,
    Maximize2,
    Copy,
    Check,
    Sparkles
} from 'lucide-react';
import type { GeneratedImage, ImageGenerationOptions } from '../../lib/imageGeneration';
import { generateImage, getAvailableModels } from '../../lib/imageGeneration';

interface ImageGeneratorProps {
    prompt: string;
    onImageGenerated?: (image: GeneratedImage) => void;
    onClose?: () => void;
}

interface ImageDisplayProps {
    image: GeneratedImage;
    onRegenerate?: (prompt: string) => void;
    showActions?: boolean;
}

// Image generation card that shows while generating
export function ImageGeneratingCard({ prompt }: { prompt: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 p-4 bg-gradient-to-br from-[#1a1b26] to-[#24283b] border border-[#414868] rounded-xl max-w-md"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-white">Generating Image</p>
                    <p className="text-xs text-gray-400">This may take a few seconds...</p>
                </div>
            </div>
            
            <div className="relative aspect-square bg-[#0d1117] rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 size={40} className="text-orange-400 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-400 max-w-[200px] mx-auto line-clamp-2">
                            "{prompt}"
                        </p>
                    </div>
                </div>
                {/* Animated gradient border */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 opacity-20 animate-pulse" />
            </div>
        </motion.div>
    );
}

// Display a generated image with actions
export const ImageDisplay = memo(function ImageDisplay({ 
    image, 
    onRegenerate,
    showActions = true 
}: ImageDisplayProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleDownload = async () => {
        try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-${image.id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(image.url, '_blank');
        }
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(image.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-4 bg-gradient-to-br from-[#1a1b26] to-[#24283b] border border-[#414868] rounded-xl overflow-hidden max-w-md"
            >
                {/* Image */}
                <div className="relative aspect-square bg-[#0d1117]">
                    {isLoading && !imageError && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={32} className="text-orange-400 animate-spin" />
                        </div>
                    )}
                    {imageError ? (
                        <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                            <div>
                                <p className="text-red-400 mb-2">Failed to load image</p>
                                <button
                                    onClick={() => {
                                        setImageError(false);
                                        setIsLoading(true);
                                    }}
                                    className="text-sm text-orange-400 hover:text-orange-300"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : (
                        <img
                            src={image.url}
                            alt={image.prompt}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setImageError(true);
                            }}
                        />
                    )}
                    
                    {/* Fullscreen button */}
                    {!isLoading && !imageError && (
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                        >
                            <Maximize2 size={16} className="text-white" />
                        </button>
                    )}
                </div>

                {/* Info & Actions */}
                {showActions && (
                    <div className="p-3 border-t border-[#414868]">
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2" title={image.prompt}>
                            "{image.prompt}"
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-xs text-gray-300 transition-colors"
                            >
                                <Download size={14} />
                                Download
                            </button>
                            
                            <button
                                onClick={handleCopyPrompt}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-xs text-gray-300 transition-colors"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                {copied ? 'Copied!' : 'Copy Prompt'}
                            </button>
                            
                            {onRegenerate && (
                                <button
                                    onClick={() => onRegenerate(image.prompt)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg text-xs text-orange-300 transition-colors"
                                >
                                    <RefreshCw size={14} />
                                    Regenerate
                                </button>
                            )}
                            
                            <a
                                href={image.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-[#30363d] rounded-lg transition-colors ml-auto"
                            >
                                <ExternalLink size={14} className="text-gray-400" />
                            </a>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Fullscreen Modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} className="text-white" />
                        </button>
                        <img
                            src={image.url}
                            alt={image.prompt}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
});

// Full image generator with model selection
export function ImageGenerator({ prompt: initialPrompt, onImageGenerated, onClose }: ImageGeneratorProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<ImageGenerationOptions['model']>('flux');
    
    const models = getAvailableModels();

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const image = await generateImage(prompt, { model: selectedModel });
            setGeneratedImage(image);
            onImageGenerated?.(image);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 p-4 bg-gradient-to-br from-[#1a1b26] to-[#24283b] border border-[#414868] rounded-xl max-w-lg"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-orange-400" />
                    <h3 className="font-medium text-white">Image Generator</h3>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <X size={18} className="text-gray-400" />
                    </button>
                )}
            </div>
            
            {/* Prompt input */}
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white text-sm resize-none focus:outline-none focus:border-orange-500"
                rows={3}
            />
            
            {/* Model selection */}
            <div className="flex flex-wrap gap-2 mt-3">
                {models.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id as ImageGenerationOptions['model'])}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            selectedModel === model.id
                                ? 'bg-orange-500 text-white'
                                : 'bg-[#21262d] text-gray-400 hover:text-white hover:bg-[#30363d]'
                        }`}
                        title={model.description}
                    >
                        {model.name}
                    </button>
                ))}
            </div>
            
            {/* Generate button */}
            <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full mt-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles size={18} />
                        Generate Image
                    </>
                )}
            </button>
            
            {/* Error */}
            {error && (
                <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
            
            {/* Generated image */}
            {generatedImage && (
                <div className="mt-4">
                    <ImageDisplay 
                        image={generatedImage} 
                        onRegenerate={(p) => {
                            setPrompt(p);
                            handleGenerate();
                        }}
                    />
                </div>
            )}
        </motion.div>
    );
}

export default ImageGenerator;
