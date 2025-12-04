import { useState, useCallback, useRef, memo, useEffect } from 'react';
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
    Search,
    BookOpen
} from 'lucide-react';
import { parseDocument, SUPPORTED_EXTENSIONS, type ParsedDocument } from '../../lib/documentParser';
import { getDocumentStore, persistDocuments } from '../../lib/documentStore';

interface DocumentPanelProps {
    isOpen: boolean;
    onClose: () => void;
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
            return <FileText size={16} className="text-red-400" />;
        case 'docx':
            return <FileType size={16} className="text-blue-400" />;
        case 'md':
            return <BookOpen size={16} className="text-purple-400" />;
        default:
            return <File size={16} className="text-gray-400" />;
    }
}

// Format file size
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentPanelComponent({ isOpen, onClose, onDocumentsChange }: DocumentPanelProps) {
    const [documents, setDocuments] = useState<ParsedDocument[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const store = getDocumentStore();

    // Load documents from store on mount and when panel opens
    useEffect(() => {
        if (isOpen) {
            setDocuments(store.getAll());
        }
    }, [isOpen, store]);

    // Notify parent when documents change
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
            alert('No supported files selected. Supported formats: PDF, DOCX, TXT, MD');
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
        for (let i = 0; i < supportedFiles.length; i++) {
            const file = supportedFiles[i];
            
            try {
                // Update to parsing status
                setUploadingFiles(prev => 
                    prev.map(u => u.file === file ? { ...u, status: 'parsing' as const, progress: 50 } : u)
                );

                const doc = await parseDocument(file);
                store.add(doc);
                
                // Update to done
                setUploadingFiles(prev => 
                    prev.map(u => u.file === file ? { ...u, status: 'done' as const, progress: 100 } : u)
                );

                // Update documents list
                notifyChange();
                persistDocuments(store);

                // Remove from uploading after delay
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

    const handleRemoveDocument = useCallback((docId: string) => {
        store.remove(docId);
        notifyChange();
        persistDocuments(store);
    }, [store, notifyChange]);

    const handleClearAll = useCallback(() => {
        if (confirm('Are you sure you want to remove all documents?')) {
            store.clear();
            notifyChange();
            persistDocuments(store);
        }
    }, [store, notifyChange]);

    // Filter documents by search
    const filteredDocs = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0d1117] border-l border-[#30363d] z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                            <div className="flex items-center gap-2">
                                <BookOpen size={20} className="text-[#58a6ff]" />
                                <h2 className="text-lg font-semibold text-white">Document Chat</h2>
                                {documents.length > 0 && (
                                    <span className="px-2 py-0.5 text-xs bg-[#58a6ff]/20 text-[#58a6ff] rounded-full">
                                        {documents.length}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-[#21262d] rounded-md transition-colors"
                            >
                                <X size={18} className="text-[#8b949e]" />
                            </button>
                        </div>

                        {/* Upload Area */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`m-4 p-6 border-2 border-dashed rounded-xl transition-all ${
                                isDragging 
                                    ? 'border-[#58a6ff] bg-[#58a6ff]/10' 
                                    : 'border-[#30363d] hover:border-[#484f58]'
                            }`}
                        >
                            <div className="text-center">
                                <Upload size={32} className={`mx-auto mb-3 ${isDragging ? 'text-[#58a6ff]' : 'text-[#484f58]'}`} />
                                <p className="text-sm text-[#c9d1d9] mb-1">
                                    Drag & drop documents here
                                </p>
                                <p className="text-xs text-[#8b949e] mb-3">
                                    PDF, DOCX, TXT, MD supported
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-sm rounded-lg transition-colors"
                                >
                                    Browse Files
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
                        </div>

                        {/* Uploading Files */}
                        {uploadingFiles.length > 0 && (
                            <div className="px-4 space-y-2">
                                {uploadingFiles.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-[#161b22] rounded-lg"
                                    >
                                        {item.status === 'uploading' || item.status === 'parsing' ? (
                                            <Loader2 size={16} className="text-[#58a6ff] animate-spin" />
                                        ) : item.status === 'done' ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <AlertCircle size={16} className="text-red-400" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#c9d1d9] truncate">{item.file.name}</p>
                                            <p className="text-xs text-[#8b949e]">
                                                {item.status === 'parsing' ? 'Parsing document...' : 
                                                 item.status === 'done' ? 'Added successfully' :
                                                 item.status === 'error' ? item.error : 'Uploading...'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search */}
                        {documents.length > 0 && (
                            <div className="px-4 py-2">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search documents..."
                                        className="w-full pl-9 pr-4 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Documents List */}
                        <div className="flex-1 overflow-y-auto px-4 py-2">
                            {filteredDocs.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText size={48} className="mx-auto mb-4 text-[#30363d]" />
                                    <p className="text-[#8b949e]">
                                        {documents.length === 0 
                                            ? 'No documents uploaded yet' 
                                            : 'No documents match your search'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredDocs.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden"
                                        >
                                            {/* Document Header */}
                                            <div
                                                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#21262d] transition-colors"
                                            >
                                                {getFileIcon(doc.type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-[#c9d1d9] truncate font-medium">
                                                        {doc.name}
                                                    </p>
                                                    <p className="text-xs text-[#8b949e]">
                                                        {formatSize(doc.metadata.size)} • {doc.metadata.wordCount.toLocaleString()} words
                                                        {doc.pages && ` • ${doc.pages} pages`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveDocument(doc.id);
                                                    }}
                                                    className="p-1.5 hover:bg-[#30363d] rounded transition-colors"
                                                >
                                                    <Trash2 size={14} className="text-[#8b949e] hover:text-red-400" />
                                                </button>
                                                {expandedDoc === doc.id ? (
                                                    <ChevronUp size={16} className="text-[#8b949e]" />
                                                ) : (
                                                    <ChevronDown size={16} className="text-[#8b949e]" />
                                                )}
                                            </div>

                                            {/* Expanded Content Preview */}
                                            <AnimatePresence>
                                                {expandedDoc === doc.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-[#30363d]"
                                                    >
                                                        <div className="p-3 max-h-48 overflow-y-auto">
                                                            <p className="text-xs text-[#8b949e] whitespace-pre-wrap line-clamp-[12]">
                                                                {doc.content.slice(0, 1000)}
                                                                {doc.content.length > 1000 && '...'}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {documents.length > 0 && (
                            <div className="px-4 py-3 border-t border-[#30363d] flex items-center justify-between">
                                <p className="text-xs text-[#8b949e]">
                                    {documents.length} document{documents.length !== 1 ? 's' : ''} • {' '}
                                    {documents.reduce((acc, doc) => acc + doc.metadata.wordCount, 0).toLocaleString()} total words
                                </p>
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export const DocumentPanel = memo(DocumentPanelComponent);

// Compact document indicator for chat input
interface DocumentIndicatorProps {
    documents: ParsedDocument[];
    onClick: () => void;
}

export function DocumentIndicator({ documents, onClick }: DocumentIndicatorProps) {
    if (documents.length === 0) return null;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 border border-[#58a6ff]/20 rounded-lg transition-colors"
        >
            <BookOpen size={14} className="text-[#58a6ff]" />
            <span className="text-xs text-[#58a6ff] font-medium">
                {documents.length} doc{documents.length !== 1 ? 's' : ''}
            </span>
        </button>
    );
}
