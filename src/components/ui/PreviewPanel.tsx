import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RefreshCw, Smartphone, Tablet, Monitor, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface PreviewPanelProps {
    content: string;
    language: string;
    onConsoleLog?: (message: string, type: 'log' | 'error' | 'warn' | 'info') => void;
    className?: string;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const DEVICE_SIZES: Record<DeviceSize, { width: string; label: string }> = {
    mobile: { width: '375px', label: 'Mobile' },
    tablet: { width: '768px', label: 'Tablet' },
    desktop: { width: '100%', label: 'Desktop' },
};

/**
 * Wrap HTML content with console capture script
 */
function wrapWithConsole(html: string): string {
    // Create a unique identifier for this preview
    const previewId = `preview_${Date.now()}`;

    // Script to capture console output
    const consoleScript = `
    <script>
      (function() {
        const originalConsole = window.console;
        const methods = ['log', 'error', 'warn', 'info'];
        
        methods.forEach(method => {
          window.console[method] = function(...args) {
            const message = args.map(arg => {
              if (typeof arg === 'object') {
                try { return JSON.stringify(arg, null, 2); } 
                catch { return String(arg); }
              }
              return String(arg);
            }).join(' ');
            
            window.parent.postMessage({
              type: '${previewId}',
              method: method,
              message: message
            }, '*');
            
            originalConsole[method].apply(originalConsole, args);
          };
        });
        
        // Capture errors
        window.onerror = function(message, source, lineno, colno, error) {
          window.parent.postMessage({
            type: '${previewId}',
            method: 'error',
            message: message + (lineno ? ' (line ' + lineno + ')' : '')
          }, '*');
        };
      })();
    </script>
  `;

    // If HTML already has <head>, inject script there
    if (html.includes('<head>')) {
        return html.replace('<head>', '<head>' + consoleScript);
    }

    // If HTML has <html>, inject before content
    if (html.includes('<html>')) {
        return html.replace('<html>', '<html><head>' + consoleScript + '</head>');
    }

    // Otherwise, wrap the entire content
    return `
    <!DOCTYPE html>
    <html>
    <head>
      ${consoleScript}
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 16px;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
}

/**
 * Generate preview content based on language
 */
function generatePreviewContent(content: string, language: string): string {
    const lang = language.toLowerCase();

    switch (lang) {
        case 'html':
            return content;

        case 'css':
            return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>${content}</style>
        </head>
        <body>
          <div class="preview-container">
            <h1>CSS Preview</h1>
            <p>This is a paragraph with some text.</p>
            <button>Sample Button</button>
            <div class="box">Sample Box</div>
          </div>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            .box { width: 100px; height: 100px; background: #ddd; margin: 10px 0; }
          </style>
        </body>
        </html>
      `;

        case 'javascript':
        case 'js':
            return `
        <!DOCTYPE html>
        <html>
        <head><title>JS Preview</title></head>
        <body>
          <div id="root"><p>JavaScript output will appear in console</p></div>
          <script>${content}</script>
        </body>
        </html>
      `;

        case 'markdown':
        case 'md':
            // Simple markdown to HTML conversion
            const htmlContent = content
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/`([^`]+)`/gim, '<code>$1</code>')
                .replace(/\n/gim, '<br>');
            return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.6; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
            h1, h2, h3 { margin-top: 1em; }
          </style>
        </head>
        <body>${htmlContent}</body>
        </html>
      `;

        default:
            return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: monospace; 
              padding: 20px; 
              background: #1a1a1a; 
              color: #fff;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
        </html>
      `;
    }
}

export function PreviewPanel({
    content,
    language,
    onConsoleLog,
    className,
}: PreviewPanelProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
    const [error, setError] = useState<string | null>(null);
    const [key, setKey] = useState(0);

    // Handle console messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type?.startsWith('preview_')) {
                onConsoleLog?.(event.data.message, event.data.method);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onConsoleLog]);

    // Generate preview content
    const previewHtml = useMemo(() => {
        try {
            setError(null);
            const raw = generatePreviewContent(content, language);
            return wrapWithConsole(raw);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Preview error');
            return '';
        }
    }, [content, language]);

    // Force refresh
    const handleRefresh = useCallback(() => {
        setKey(k => k + 1);
    }, []);

    return (
        <div className={cn('flex h-full flex-col bg-white', className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-500 mr-2">Preview</span>

                    {/* Device size buttons */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeviceSize('mobile')}
                        className={cn(
                            'h-7 w-7',
                            deviceSize === 'mobile' ? 'bg-gray-200 text-gray-900' : 'text-gray-500'
                        )}
                        title="Mobile view"
                    >
                        <Smartphone size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeviceSize('tablet')}
                        className={cn(
                            'h-7 w-7',
                            deviceSize === 'tablet' ? 'bg-gray-200 text-gray-900' : 'text-gray-500'
                        )}
                        title="Tablet view"
                    >
                        <Tablet size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeviceSize('desktop')}
                        className={cn(
                            'h-7 w-7',
                            deviceSize === 'desktop' ? 'bg-gray-200 text-gray-900' : 'text-gray-500'
                        )}
                        title="Desktop view"
                    >
                        <Monitor size={14} />
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    className="h-7 w-7 text-gray-500 hover:text-gray-900"
                    title="Refresh preview"
                >
                    <RefreshCw size={14} />
                </Button>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
                {error ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="mx-auto bg-white shadow-lg transition-all duration-200"
                        style={{
                            width: DEVICE_SIZES[deviceSize].width,
                            maxWidth: '100%',
                            minHeight: '300px',
                        }}
                    >
                        <iframe
                            key={key}
                            ref={iframeRef}
                            srcDoc={previewHtml}
                            className="h-full w-full border-0"
                            sandbox="allow-scripts allow-modals"
                            title="Live Preview"
                            style={{ minHeight: '400px' }}
                        />
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-1">
                <span className="text-xs text-gray-400">
                    {DEVICE_SIZES[deviceSize].label} • {language}
                </span>
            </div>
        </div>
    );
}

export default PreviewPanel;
