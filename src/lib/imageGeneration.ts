/**
 * Image Generation Module
 * Uses Pollinations.ai for free image generation (no API key required)
 * Can be extended to support DALL-E, Stable Diffusion, etc.
 */

export interface GeneratedImage {
    id: string;
    prompt: string;
    url: string;
    timestamp: number;
    width: number;
    height: number;
    model: string;
}

export interface ImageGenerationOptions {
    width?: number;
    height?: number;
    model?: 'flux' | 'turbo' | 'flux-realism' | 'flux-anime' | 'flux-3d';
    seed?: number;
    enhance?: boolean;
    nologo?: boolean;
}

// Default options
const DEFAULT_OPTIONS: ImageGenerationOptions = {
    width: 1024,
    height: 1024,
    model: 'flux',
    enhance: true,
    nologo: true,
};

/**
 * Generate a unique ID for images
 */
function generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Encode prompt for URL
 */
function encodePrompt(prompt: string): string {
    return encodeURIComponent(prompt.trim());
}

/**
 * Generate image using Pollinations.ai
 * This is a free service that doesn't require an API key
 */
export async function generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
): Promise<GeneratedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Build the Pollinations URL
    const params = new URLSearchParams();
    if (opts.width) params.set('width', opts.width.toString());
    if (opts.height) params.set('height', opts.height.toString());
    if (opts.model) params.set('model', opts.model);
    if (opts.seed) params.set('seed', opts.seed.toString());
    if (opts.enhance) params.set('enhance', 'true');
    if (opts.nologo) params.set('nologo', 'true');
    
    const encodedPrompt = encodePrompt(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
    
    // Validate the image loads correctly
    await validateImageUrl(imageUrl);
    
    return {
        id: generateId(),
        prompt,
        url: imageUrl,
        timestamp: Date.now(),
        width: opts.width || 1024,
        height: opts.height || 1024,
        model: opts.model || 'flux',
    };
}

/**
 * Validate that an image URL is accessible
 */
async function validateImageUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to generate image'));
        img.src = url;
        
        // Timeout after 30 seconds
        setTimeout(() => reject(new Error('Image generation timed out')), 30000);
    });
}

/**
 * Get available image generation models
 */
export function getAvailableModels() {
    return [
        { id: 'flux', name: 'Flux', description: 'High quality, balanced' },
        { id: 'turbo', name: 'Turbo', description: 'Fast generation' },
        { id: 'flux-realism', name: 'Flux Realism', description: 'Photorealistic images' },
        { id: 'flux-anime', name: 'Flux Anime', description: 'Anime/illustration style' },
        { id: 'flux-3d', name: 'Flux 3D', description: '3D rendered style' },
    ];
}

/**
 * Parse image generation command from message
 * Supports: /imagine <prompt>, /image <prompt>, generate image of <prompt>
 */
export function parseImageCommand(message: string): { isImageCommand: boolean; prompt: string } {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for slash commands
    if (lowerMessage.startsWith('/imagine ') || lowerMessage.startsWith('/image ')) {
        const prompt = message.substring(message.indexOf(' ') + 1).trim();
        return { isImageCommand: true, prompt };
    }
    
    // Check for natural language patterns
    const patterns = [
        /^generate (?:an? )?image (?:of |showing |depicting |with )?(.+)$/i,
        /^create (?:an? )?image (?:of |showing |depicting |with )?(.+)$/i,
        /^draw (?:an? )?(?:image (?:of )?|picture (?:of )?)?(.+)$/i,
        /^make (?:an? )?image (?:of |showing |depicting |with )?(.+)$/i,
        /^show me (?:an? )?(?:image (?:of )?|picture (?:of )?)?(.+)$/i,
    ];
    
    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return { isImageCommand: true, prompt: match[1].trim() };
        }
    }
    
    return { isImageCommand: false, prompt: '' };
}

/**
 * Enhance a prompt for better image generation
 */
export function enhancePrompt(prompt: string): string {
    // Add quality modifiers if not present
    const qualityTerms = ['high quality', 'detailed', '4k', '8k', 'hd', 'professional'];
    const hasQuality = qualityTerms.some(term => prompt.toLowerCase().includes(term));
    
    if (!hasQuality) {
        return `${prompt}, high quality, detailed`;
    }
    
    return prompt;
}

/**
 * Store for generated images (in-memory, could be persisted)
 */
class ImageStore {
    private images: GeneratedImage[] = [];
    private maxImages = 50;
    
    add(image: GeneratedImage): void {
        this.images.unshift(image);
        if (this.images.length > this.maxImages) {
            this.images = this.images.slice(0, this.maxImages);
        }
    }
    
    getAll(): GeneratedImage[] {
        return [...this.images];
    }
    
    getById(id: string): GeneratedImage | undefined {
        return this.images.find(img => img.id === id);
    }
    
    remove(id: string): void {
        this.images = this.images.filter(img => img.id !== id);
    }
    
    clear(): void {
        this.images = [];
    }
}

// Singleton instance
let imageStoreInstance: ImageStore | null = null;

export function getImageStore(): ImageStore {
    if (!imageStoreInstance) {
        imageStoreInstance = new ImageStore();
    }
    return imageStoreInstance;
}
