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
  RotateCcw,
  Clock,
  Share2,
  SplitSquareHorizontal,
  Eye,
  Terminal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import {
  type CanvasItem,
  type CanvasType,
  getFileExtension
} from '../../lib/canvas';
import { SplitPane } from './SplitPane';
import { CodeEditor } from './CodeEditor';
import { PreviewPanel } from './PreviewPanel';
import { ConsolePanel, createConsoleEntry, type ConsoleEntry } from './ConsolePanel';
import { VersionHistory } from './VersionHistory';
import {
  createVersion,
  shouldAutoSave
} from '../../lib/canvasVersioning';
import {
  copyShareLink,
} from '../../lib/canvasCollaboration';
import { ErrorBoundary } from './ErrorBoundary';

interface CanvasProps {
  isOpen: boolean;
  onClose: () => void;
  items: CanvasItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onUpdateItem: (id: string, content: string) => void;
  onDeleteItem: (id: string) => void;
  onAddItem?: (item: CanvasItem) => void;
  viewMode: 'code' | 'preview' | 'split';
  onViewModeChange: (mode: 'code' | 'preview' | 'split') => void;
}

// ViewMode type removed as it is now defined in CanvasProps or unused locally

// Icon mapping for canvas types
const typeIcons: Record<CanvasType, React.ReactNode> = {
  code: <Code size={16} />,
  document: <FileText size={16} />,
  table: <Table size={16} />,
  diagram: <FileText size={16} />,
  image: <ImageIcon size={16} />,
  html: <ExternalLink size={16} />,
};

export function Canvas({
  isOpen,
  onClose,
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  viewMode,
  onViewModeChange,
}: CanvasProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItem = items.find(item => item.id === activeItemId);
  const activeIndex = items.findIndex(item => item.id === activeItemId);

  // Reset edit state when switching items
  useEffect(() => {
    if (activeItem) {
      setEditContent(activeItem.content);
      setLastSavedContent(activeItem.content);
      setIsEditing(false);
      setConsoleLogs([]);
    }
  }, [activeItem?.id]);

  // Auto-save version when content changes significantly
  useEffect(() => {
    if (!activeItem || !isEditing) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (shouldAutoSave(editContent, lastSavedContent)) {
        createVersion(activeItem, undefined, true);
        setLastSavedContent(editContent);
      }
    }, 5000); // Auto-save after 5 seconds of no changes

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editContent, activeItem, isEditing, lastSavedContent]);

  // Handle console logs from preview
  const handleConsoleLog = useCallback((message: string, type: 'log' | 'error' | 'warn' | 'info') => {
    setConsoleLogs(prev => [...prev, createConsoleEntry(message, type)]);
    setShowConsole(true);
  }, []);

  // Clear console
  const handleClearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

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

    // Create version before saving
    createVersion(activeItem, 'Manual save');

    onUpdateItem(activeItem.id, editContent);
    setLastSavedContent(editContent);
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

  // Handle share
  const handleShare = useCallback(async () => {
    if (!activeItem) return;
    const success = await copyShareLink(activeItem);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activeItem]);

  // Handle version restore
  const handleRestoreVersion = useCallback((content: string) => {
    setEditContent(content);
    setIsEditing(true);
    setShowVersionHistory(false);
  }, []);

  // Determine if preview is available
  const canPreview = activeItem && ['html', 'css', 'javascript', 'js', 'markdown', 'md'].includes(
    (activeItem.language || activeItem.type).toLowerCase()
  );

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
          isFullscreen ? "w-full" : "w-[800px] max-w-[95vw]"
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

            {/* View Mode Toggle */}
            {canPreview && (
              <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-white/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewModeChange('code')}
                  className={cn(
                    "w-7 h-7",
                    viewMode === 'code' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white'
                  )}
                  title="Code view"
                >
                  <Code size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewModeChange('split')}
                  className={cn(
                    "w-7 h-7",
                    viewMode === 'split' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white'
                  )}
                  title="Split view"
                >
                  <SplitSquareHorizontal size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewModeChange('preview')}
                  className={cn(
                    "w-7 h-7",
                    viewMode === 'preview' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white'
                  )}
                  title="Preview only"
                >
                  <Eye size={14} />
                </Button>
              </div>
            )}

            {/* Actions */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className={cn(
                "w-8 h-8",
                showVersionHistory ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              )}
              title="Version history"
            >
              <Clock size={16} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConsole(!showConsole)}
              className={cn(
                "w-8 h-8",
                showConsole ? 'text-blue-400' : 'text-gray-400 hover:text-white',
                consoleLogs.length > 0 && !showConsole && 'animate-pulse'
              )}
              title="Toggle console"
            >
              <Terminal size={16} />
            </Button>

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
              onClick={handleShare}
              className="w-8 h-8 text-gray-400 hover:text-white"
              title="Share"
            >
              <Share2 size={16} />
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
        <div className="flex-1 overflow-hidden flex relative">
          {/* Item list sidebar (when multiple items) */}
          {items.length > 1 && !isFullscreen && (
            <div className="w-48 border-r border-white/10 overflow-y-auto bg-black/30 flex-shrink-0">
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
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeItem ? (
              <>
                {/* Editor/Preview area */}
                <div className="flex-1 overflow-hidden">
                  {viewMode === 'split' && canPreview ? (
                    <SplitPane
                      ratio={splitRatio}
                      onRatioChange={setSplitRatio}
                      direction="horizontal"
                    >
                      <CodeEditor
                        content={isEditing ? editContent : activeItem.content}
                        language={activeItem.language || 'plaintext'}
                        onChange={setEditContent}
                        onSave={handleSave}
                        readOnly={!isEditing}
                      />
                      <ErrorBoundary>
                        <PreviewPanel
                          content={isEditing ? editContent : activeItem.content}
                          language={activeItem.language || 'html'}
                          onConsoleLog={handleConsoleLog}
                        />
                      </ErrorBoundary>
                    </SplitPane>
                  ) : viewMode === 'preview' && canPreview ? (
                    <ErrorBoundary>
                      <PreviewPanel
                        content={isEditing ? editContent : activeItem.content}
                        language={activeItem.language || 'html'}
                        onConsoleLog={handleConsoleLog}
                      />
                    </ErrorBoundary>
                  ) : (
                    <CodeEditor
                      content={isEditing ? editContent : activeItem.content}
                      language={activeItem.language || 'plaintext'}
                      onChange={setEditContent}
                      onSave={handleSave}
                      readOnly={!isEditing}
                    />
                  )}
                </div>

                {/* Console Panel */}
                {showConsole && (
                  <ConsolePanel
                    logs={consoleLogs}
                    onClear={handleClearConsole}
                  />
                )}
              </>
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

          {/* Version History Sidebar */}
          <AnimatePresence>
            {showVersionHistory && activeItem && (
              <VersionHistory
                itemId={activeItem.id}
                currentContent={isEditing ? editContent : activeItem.content}
                onRestore={handleRestoreVersion}
                onClose={() => setShowVersionHistory(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer with metadata */}
        {activeItem && (
          <div className="px-4 py-2 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-gray-500">
            <span>
              {activeItem.content.split('\n').length} lines • {activeItem.content.length} characters
              {isEditing && editContent !== activeItem.content && (
                <span className="ml-2 text-yellow-500">• Unsaved changes</span>
              )}
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

export default Canvas;
