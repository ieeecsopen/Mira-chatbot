import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2, 
  Code, 
  FileText, 
  Table, 
  Image as ImageIcon,
  Edit3,
  Save,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { 
  type CanvasItem, 
  type CanvasType,
  getFileExtension 
} from '../../lib/canvas';

interface CanvasProps {
  isOpen: boolean;
  onClose: () => void;
  items: CanvasItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onUpdateItem: (id: string, content: string) => void;
  onDeleteItem: (id: string) => void;
}

// Icon mapping for canvas types
const typeIcons: Record<CanvasType, React.ReactNode> = {
  code: <Code size={16} />,
  document: <FileText size={16} />,
  table: <Table size={16} />,
  diagram: <FileText size={16} />,
  image: <ImageIcon size={16} />,
  html: <ExternalLink size={16} />,
};

// Syntax highlighting colors (simple version)
function highlightCode(code: string, language: string): string {
  // Simple keyword highlighting for display
  const keywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'implements', 'extends'],
    python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'try', 'except', 'raise', 'with', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'async', 'await'],
  };

  const langKeywords = keywords[language] || keywords.javascript || [];
  
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight strings
  highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-green-400">$&</span>');
  
  // Highlight comments
  highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, '<span class="text-gray-500">$&</span>');
  
  // Highlight keywords
  const keywordPattern = new RegExp(`\\b(${langKeywords.join('|')})\\b`, 'g');
  highlighted = highlighted.replace(keywordPattern, '<span class="text-orange-400">$1</span>');
  
  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');

  return highlighted;
}

export function Canvas({ 
  isOpen, 
  onClose, 
  items, 
  activeItemId, 
  onSelectItem, 
  onUpdateItem,
  onDeleteItem 
}: CanvasProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const activeItem = items.find(item => item.id === activeItemId);
  const activeIndex = items.findIndex(item => item.id === activeItemId);

  // Reset edit state when switching items
  useEffect(() => {
    if (activeItem) {
      setEditContent(activeItem.content);
      setIsEditing(false);
    }
  }, [activeItem?.id]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!activeItem) return;
    try {
      await navigator.clipboard.writeText(activeItem.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [activeItem]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!activeItem) return;
    
    const extension = getFileExtension(activeItem.language || 'txt');
    const filename = `${activeItem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
    
    const blob = new Blob([activeItem.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeItem]);

  // Handle save edit
  const handleSave = useCallback(() => {
    if (!activeItem) return;
    onUpdateItem(activeItem.id, editContent);
    setIsEditing(false);
  }, [activeItem, editContent, onUpdateItem]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    if (activeItem) {
      setEditContent(activeItem.content);
    }
    setIsEditing(false);
  }, [activeItem]);

  // Navigate between items
  const handlePrevious = useCallback(() => {
    if (activeIndex > 0) {
      onSelectItem(items[activeIndex - 1].id);
    }
  }, [activeIndex, items, onSelectItem]);

  const handleNext = useCallback(() => {
    if (activeIndex < items.length - 1) {
      onSelectItem(items[activeIndex + 1].id);
    }
  }, [activeIndex, items, onSelectItem]);

  // Run HTML preview
  const handleRunPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed right-0 top-0 h-full bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col",
          isFullscreen ? "w-full" : "w-[600px] max-w-[90vw]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50">
          <div className="flex items-center gap-3">
            {activeItem && (
              <>
                <div className="flex items-center gap-2 text-gray-400">
                  {typeIcons[activeItem.type]}
                  <span className="text-sm font-medium text-white">{activeItem.title}</span>
                </div>
                {activeItem.language && (
                  <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-gray-400 font-mono">
                    {activeItem.language}
                  </span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Navigation */}
            {items.length > 1 && (
              <div className="flex items-center gap-1 mr-2 pr-2 border-r border-white/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={activeIndex <= 0}
                  className="w-7 h-7 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-xs text-gray-500 font-mono">
                  {activeIndex + 1}/{items.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={activeIndex >= items.length - 1}
                  className="w-7 h-7 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}

            {/* Actions */}
            {activeItem?.type === 'html' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRunPreview}
                className="w-8 h-8 text-gray-400 hover:text-green-400"
                title="Run preview"
              >
                <Play size={16} />
              </Button>
            )}
            
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  className="w-8 h-8 text-gray-400 hover:text-green-400"
                  title="Save"
                >
                  <Save size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelEdit}
                  className="w-8 h-8 text-gray-400 hover:text-red-400"
                  title="Cancel"
                >
                  <RotateCcw size={16} />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 text-gray-400 hover:text-white"
                title="Edit"
              >
                <Edit3 size={16} />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="w-8 h-8 text-gray-400 hover:text-white"
              title="Copy"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="w-8 h-8 text-gray-400 hover:text-white"
              title="Download"
            >
              <Download size={16} />
            </Button>
            
            {activeItem && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteItem(activeItem.id)}
                className="w-8 h-8 text-gray-400 hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={16} />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 text-gray-400 hover:text-white"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 text-gray-400 hover:text-white"
              title="Close"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Item list sidebar (when multiple items) */}
          {items.length > 1 && !isFullscreen && (
            <div className="w-48 border-r border-white/10 overflow-y-auto bg-black/30">
              <div className="p-2 space-y-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors text-sm",
                      item.id === activeItemId
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {typeIcons[item.type]}
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 overflow-auto">
            {activeItem ? (
              showPreview && activeItem.type === 'html' ? (
                // HTML Preview
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/30">
                    <span className="text-sm text-gray-400">Preview</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      Back to Code
                    </Button>
                  </div>
                  <iframe
                    srcDoc={activeItem.content}
                    className="flex-1 w-full bg-white"
                    sandbox="allow-scripts"
                    title="HTML Preview"
                  />
                </div>
              ) : isEditing ? (
                // Edit mode
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-gray-100 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              ) : (
                // View mode
                <div className="p-4">
                  {activeItem.type === 'code' || activeItem.type === 'html' ? (
                    <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                      <code
                        dangerouslySetInnerHTML={{
                          __html: highlightCode(activeItem.content, activeItem.language || 'plaintext')
                        }}
                      />
                    </pre>
                  ) : activeItem.type === 'table' ? (
                    <div className="overflow-x-auto">
                      <div 
                        className="prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownTable(activeItem.content) }}
                      />
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                      {activeItem.content}
                    </div>
                  )}
                </div>
              )
            ) : (
              // Empty state
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No canvas item selected</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with metadata */}
        {activeItem && (
          <div className="px-4 py-2 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-gray-500">
            <span>
              {activeItem.content.split('\n').length} lines • {activeItem.content.length} characters
            </span>
            <span>
              Updated {new Date(activeItem.updatedAt).toLocaleString()}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper to render markdown tables as HTML
function renderMarkdownTable(markdown: string): string {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return `<pre>${markdown}</pre>`;
  
  let html = '<table class="w-full border-collapse">';
  
  lines.forEach((line, index) => {
    // Skip separator line
    if (/^\|[-:| ]+\|$/.test(line)) return;
    
    const cells = line.split('|').filter(cell => cell.trim());
    const tag = index === 0 ? 'th' : 'td';
    const cellClass = index === 0 
      ? 'border border-white/20 px-3 py-2 bg-white/5 font-medium' 
      : 'border border-white/20 px-3 py-2';
    
    html += '<tr>';
    cells.forEach(cell => {
      html += `<${tag} class="${cellClass}">${cell.trim()}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
}

export default Canvas;
