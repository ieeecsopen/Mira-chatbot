import { useState, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, 
    Upload, 
    X, 
    Trash2, 
    ChevronDown, 
    ChevronUp,
    File,
    FileType,
    Loader2,
    CheckCircle,
    AlertCircle,
    BookOpen
} from 'lucide-react';
import { parseDocument, SUPPORTED_EXTENSIONS, type ParsedDocument } from '../../lib/documentParser';
import { getDocumentStore, persistDocuments } from '../../lib/documentStore';

interface DocumentUploadBarProps {
    onDocumentsChange?: () => void;
}

interface UploadingFile {
    file: File;
    progress: number;
    status: 'uploading' | 'parsing' | 'done' | 'error';
    error?: string;
}

// File type icons
function getFileIcon(type: ParsedDocument['type']) {
    switch (type) {
        case 'pdf':
            return <FileText size={14} className="text-red-400" />;
        case 'docx':
            return <FileType size={14} className="text-blue-400" />;
        case 'md':
            return <BookOpen size={14} className="text-purple-400" />;
        default:
            return <File size={14} className="text-gray-400" />;
    }
}

// Format file size
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentUploadBarComponent({ onDocumentsChange }: DocumentUploadBarProps) {
    const [documents, setDocuments] = useState<ParsedDocument[]>(() => getDocumentStore().getAll());
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const store = getDocumentStore();

    // Notify parent and refresh documents
    const notifyChange = useCallback(() => {
        setDocuments(store.getAll());
        onDocumentsChange?.();
    }, [store, onDocumentsChange]);

    const handleFileSelect = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        
        // Filter supported files
        const supportedFiles = fileArray.filter(file => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            return SUPPORTED_EXTENSIONS.includes(ext);
        });

        if (supportedFiles.length === 0) {
            return;
        }

        // Add to uploading state
        const newUploading: UploadingFile[] = supportedFiles.map(file => ({
            file,
            progress: 0,
            status: 'uploading' as const,
        }));
        setUploadingFiles(prev => [...prev, ...newUploading]);

        // Parse each file
        for (const file of supportedFiles) {
            try {
                setUploadingFiles(prev => 
                    prev.map(u => u.file === file ? { ...u, status: 'parsing' as const, progress: 50 } : u)
                );

                const doc = await parseDocument(file);
                store.add(doc);
                
                setUploadingFiles(prev => 
                    prev.map(u => u.file === file ? { ...u, status: 'done' as const, progress: 100 } : u)
                );

                notifyChange();
                persistDocuments(store);

                setTimeout(() => {
                    setUploadingFiles(prev => prev.filter(u => u.file !== file));
                }, 1500);

            } catch (error) {
                console.error(`Failed to parse ${file.name}:`, error);
                setUploadingFiles(prev => 
                    prev.map(u => u.file === file ? { 
                        ...u, 
                        status: 'error' as const, 
                        error: (error as Error).message 
                    } : u)
                );
            }
        }
    }, [store, notifyChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleRemoveDocument = useCallback((docId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        store.remove(docId);
        notifyChange();
        persistDocuments(store);
    }, [store, notifyChange]);

    const handleClearAll = useCallback(() => {
        store.clear();
        notifyChange();
        persistDocuments(store);
    }, [store, notifyChange]);

    // If no documents and not uploading, show just the upload button
    if (documents.length === 0 && uploadingFiles.length === 0) {
        return (
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`transition-all ${isDragging ? 'ring-2 ring-[#58a6ff] ring-offset-2 ring-offset-[#0d1117]' : ''}`}
            >
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded-lg transition-colors text-sm"
                    title="Upload documents (PDF, DOCX, TXT, MD)"
                >
                    <BookOpen size={16} />
                    <span className="hidden sm:inline">Docs</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                />
            </div>
        );
    }

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`transition-all ${isDragging ? 'ring-2 ring-[#58a6ff]' : ''}`}
        >
            {/* Compact bar showing document count */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg cursor-pointer hover:border-[#484f58] transition-colors"
            >
                <BookOpen size={16} className="text-[#58a6ff]" />
                <span className="text-sm text-[#c9d1d9]">
                    {documents.length} document{documents.length !== 1 ? 's' : ''} loaded
                </span>
                
                {/* Uploading indicator */}
                {uploadingFiles.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[#8b949e]">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">Processing...</span>
                    </div>
                )}
                
                <div className="flex items-center gap-1 ml-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                        className="p-1 hover:bg-[#30363d] rounded transition-colors"
                        title="Add more documents"
                    >
                        <Upload size={14} className="text-[#8b949e]" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClearAll();
                        }}
                        className="p-1 hover:bg-[#30363d] rounded transition-colors"
                        title="Remove all documents"
                    >
                        <X size={14} className="text-[#8b949e] hover:text-red-400" />
                    </button>
                    {isExpanded ? (
                        <ChevronUp size={14} className="text-[#8b949e]" />
                    ) : (
                        <ChevronDown size={14} className="text-[#8b949e]" />
                    )}
                </div>
            </div>

            {/* Expanded document list */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 p-2 bg-[#161b22] border border-[#30363d] rounded-lg max-h-40 overflow-y-auto space-y-1">
                            {/* Uploading files */}
                            {uploadingFiles.map((uf, index) => (
                                <div 
                                    key={`uploading-${index}`}
                                    className="flex items-center gap-2 px-2 py-1.5 bg-[#21262d] rounded"
                                >
                                    {uf.status === 'error' ? (
                                        <AlertCircle size={14} className="text-red-400" />
                                    ) : uf.status === 'done' ? (
                                        <CheckCircle size={14} className="text-green-400" />
                                    ) : (
                                        <Loader2 size={14} className="text-[#58a6ff] animate-spin" />
                                    )}
                                    <span className="text-xs text-[#c9d1d9] truncate flex-1">
                                        {uf.file.name}
                                    </span>
                                    {uf.status === 'error' && (
                                        <span className="text-xs text-red-400 truncate max-w-[100px]">
                                            {uf.error}
                                        </span>
                                    )}
                                </div>
                            ))}
                            
                            {/* Loaded documents */}
                            {documents.map((doc) => (
                                <div 
                                    key={doc.id}
                                    className="flex items-center gap-2 px-2 py-1.5 bg-[#0d1117] hover:bg-[#21262d] rounded transition-colors group"
                                >
                                    {getFileIcon(doc.type)}
                                    <span className="text-xs text-[#c9d1d9] truncate flex-1" title={doc.name}>
                                        {doc.name}
                                    </span>
                                    <span className="text-xs text-[#8b949e]">
                                        {formatSize(doc.metadata.size)}
                                    </span>
                                    <button
                                        onClick={(e) => handleRemoveDocument(doc.id, e)}
                                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[#30363d] rounded transition-all"
                                    >
                                        <Trash2 size={12} className="text-[#8b949e] hover:text-red-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-[#484f58] mt-1.5 text-center">
                            Ask questions about your documents in the chat
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
            />
        </div>
    );
}

export const DocumentUploadBar = memo(DocumentUploadBarComponent);
