import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, X, Image, FileText, File, Loader2 } from 'lucide-react';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document' | 'other';
  uploading: boolean;
  error?: string;
}

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  files: UploadedFile[];
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
];

export function FileUpload({
  onFilesSelected,
  onFileRemove: _onFileRemove,
  files,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  size = 'md',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const getFileType = (file: File): 'image' | 'document' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf' || file.type.startsWith('text/')) return 'document';
    return 'other';
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const remainingSlots = maxFiles - files.length;
    
    if (remainingSlots <= 0) {
      return;
    }

    const filesToProcess = filesArray.slice(0, remainingSlots);
    
    const processedFiles: UploadedFile[] = await Promise.all(
      filesToProcess.map(async (file) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const type = getFileType(file);
        const error = validateFile(file);
        
        let preview: string | undefined;
        
        // Generate preview for images
        if (type === 'image' && !error) {
          try {
            preview = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } catch {
            // Preview generation failed, continue without preview
          }
        }

        return {
          id,
          file,
          preview,
          type,
          uploading: false,
          error: error || undefined,
        };
      })
    );

    onFilesSelected(processedFiles);
  }, [files.length, maxFiles, acceptedTypes, maxSizeMB, onFilesSelected]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={handleClick}
        disabled={disabled || files.length >= maxFiles}
        className={`${sizeClasses[size]} flex items-center justify-center rounded-xl
          transition-all duration-200
          ${isDragging
            ? 'bg-orange-500/20 border-orange-500 text-orange-500'
            : 'bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
          }
          ${disabled || files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
          border border-gray-200 dark:border-white/10`}
        aria-label="Attach files"
      >
        <Paperclip size={iconSizes[size]} />
      </motion.button>

      {/* File count badge */}
      {files.length > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500
            text-white text-[10px] flex items-center justify-center font-medium"
        >
          {files.length}
        </motion.div>
      )}

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-purple-500/10 backdrop-blur-sm z-50
              flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl
              border-2 border-dashed border-orange-500">
              <div className="text-center">
                <Paperclip size={48} className="mx-auto text-orange-500 mb-4" />
                <p className="text-lg font-medium text-gray-800 dark:text-white">
                  Drop files here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Max {maxFiles} files, {maxSizeMB}MB each
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Preview component for attached files
interface FilePreviewProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
  compact?: boolean;
}

export function FilePreview({ files, onRemove, compact = false }: FilePreviewProps) {
  if (files.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 p-2">
        <AnimatePresence>
          {files.map((file) => {
            const Icon = file.type === 'image' ? Image : file.type === 'document' ? FileText : File;
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`relative group rounded-lg overflow-hidden
                  ${file.error ? 'ring-2 ring-red-500' : ''}`}
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-16 h-16 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 
                    flex items-center justify-center">
                    <Icon size={24} className="text-gray-400" />
                  </div>
                )}
                
                {file.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}

                <button
                  onClick={() => onRemove(file.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60
                    text-white flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <AnimatePresence>
        {files.map((file) => {
          const Icon = file.type === 'image' ? Image : file.type === 'document' ? FileText : File;
          
          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-center gap-3 p-2 rounded-lg
                bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                ${file.error ? 'border-red-500' : ''}`}
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-600
                  flex items-center justify-center">
                  <Icon size={20} className="text-gray-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                  {file.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.file.size)}
                  {file.error && (
                    <span className="text-red-500 ml-2">{file.error}</span>
                  )}
                </p>
              </div>

              {file.uploading ? (
                <Loader2 size={16} className="animate-spin text-gray-400" />
              ) : (
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
