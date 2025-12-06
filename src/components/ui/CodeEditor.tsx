import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';

interface CodeEditorProps {
    content: string;
    language: string;
    onChange: (content: string) => void;
    onSave?: () => void;
    readOnly?: boolean;
    showLineNumbers?: boolean;
    theme?: 'dark' | 'light';
    className?: string;
    placeholder?: string;
}

// Syntax highlighting colors
const SYNTAX_COLORS = {
    keyword: 'text-purple-400',
    string: 'text-green-400',
    comment: 'text-gray-500',
    number: 'text-orange-400',
    function: 'text-blue-400',
    variable: 'text-cyan-400',
    tag: 'text-red-400',
    attribute: 'text-yellow-400',
};

// Keywords by language
const KEYWORDS: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected', 'readonly'],
    python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'try', 'except', 'raise', 'with', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'async', 'await', 'pass', 'break', 'continue'],
    html: ['DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'script', 'style', 'link', 'meta', 'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'textarea', 'select', 'option'],
    css: ['color', 'background', 'border', 'margin', 'padding', 'width', 'height', 'display', 'flex', 'grid', 'position', 'top', 'left', 'right', 'bottom', 'font', 'text', 'align', 'justify', 'transform', 'transition', 'animation'],
};

/**
 * Apply syntax highlighting to code
 */
function highlightSyntax(code: string, language: string): string {
    const lang = language.toLowerCase();
    const keywords = KEYWORDS[lang] || KEYWORDS.javascript || [];

    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Highlight strings (single, double, template literals)
    highlighted = highlighted.replace(
        /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
        `<span class="${SYNTAX_COLORS.string}">$&</span>`
    );

    // Highlight comments
    highlighted = highlighted.replace(
        /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm,
        `<span class="${SYNTAX_COLORS.comment}">$&</span>`
    );

    // Highlight keywords
    if (keywords.length > 0) {
        const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        highlighted = highlighted.replace(
            keywordPattern,
            `<span class="${SYNTAX_COLORS.keyword}">$1</span>`
        );
    }

    // Highlight numbers
    highlighted = highlighted.replace(
        /\b(\d+\.?\d*)\b/g,
        `<span class="${SYNTAX_COLORS.number}">$1</span>`
    );

    // Highlight function calls
    highlighted = highlighted.replace(
        /\b([a-zA-Z_]\w*)\s*(?=\()/g,
        `<span class="${SYNTAX_COLORS.function}">$1</span>`
    );

    return highlighted;
}

export function CodeEditor({
    content,
    language,
    onChange,
    onSave,
    readOnly = false,
    showLineNumbers = true,
    theme = 'dark',
    className,
    placeholder = 'Start typing...',
}: CodeEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const [currentLine, setCurrentLine] = useState(1);
    const [isFocused, setIsFocused] = useState(false);

    const lines = content.split('\n');
    const lineCount = lines.length;

    // Sync scroll between textarea and line numbers
    const handleScroll = useCallback(() => {
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }, []);

    // Update current line on cursor position change
    const updateCurrentLine = useCallback(() => {
        if (textareaRef.current) {
            const cursorPos = textareaRef.current.selectionStart;
            const textBeforeCursor = content.substring(0, cursorPos);
            const lineNumber = textBeforeCursor.split('\n').length;
            setCurrentLine(lineNumber);
        }
    }, [content]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            onSave?.();
            return;
        }

        // Tab key handling
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            const spaces = '  '; // 2 spaces for indent
            const newContent = content.substring(0, start) + spaces + content.substring(end);

            onChange(newContent);

            // Restore cursor position
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
            }, 0);
            return;
        }

        // Enter key - auto-indent
        if (e.key === 'Enter') {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const currentLineText = content.substring(0, start).split('\n').pop() || '';

            // Get leading whitespace from current line
            const match = currentLineText.match(/^(\s*)/);
            const indent = match ? match[1] : '';

            // Check if line ends with { or : (add extra indent)
            const trimmedLine = currentLineText.trim();
            const extraIndent = trimmedLine.endsWith('{') || trimmedLine.endsWith(':') ? '  ' : '';

            e.preventDefault();
            const newContent = content.substring(0, start) + '\n' + indent + extraIndent + content.substring(start);
            onChange(newContent);

            // Move cursor to end of new indent
            setTimeout(() => {
                const newPos = start + 1 + indent.length + extraIndent.length;
                textarea.selectionStart = textarea.selectionEnd = newPos;
            }, 0);
        }
    }, [content, onChange, onSave]);

    // Update line on clicks and key events
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleSelectionChange = () => updateCurrentLine();

        textarea.addEventListener('click', handleSelectionChange);
        textarea.addEventListener('keyup', handleSelectionChange);

        return () => {
            textarea.removeEventListener('click', handleSelectionChange);
            textarea.removeEventListener('keyup', handleSelectionChange);
        };
    }, [updateCurrentLine]);

    return (
        <div
            className={cn(
                'relative flex h-full w-full overflow-hidden font-mono text-sm',
                theme === 'dark' ? 'bg-[#0d0d0d]' : 'bg-gray-100',
                className
            )}
        >
            {/* Line numbers */}
            {showLineNumbers && (
                <div
                    ref={lineNumbersRef}
                    className={cn(
                        'select-none overflow-hidden border-r py-4 pr-2 text-right',
                        theme === 'dark'
                            ? 'border-white/10 bg-black/30 text-gray-600'
                            : 'border-gray-200 bg-gray-200 text-gray-400'
                    )}
                    style={{ width: `${Math.max(3, lineCount.toString().length + 1)}ch` }}
                >
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div
                            key={i + 1}
                            className={cn(
                                'px-2 leading-6 transition-colors',
                                currentLine === i + 1 && isFocused && 'text-blue-400 font-medium'
                            )}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>
            )}

            {/* Editor container */}
            <div className="relative flex-1 overflow-hidden">
                {/* Syntax highlighted display (behind textarea) */}
                <pre
                    className={cn(
                        'pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-4 leading-6',
                        theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                    )}
                    aria-hidden="true"
                >
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightSyntax(content, language) || '&nbsp;',
                        }}
                    />
                </pre>

                {/* Actual textarea (transparent, for editing) */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    spellCheck={false}
                    className={cn(
                        'absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words p-4 leading-6',
                        'bg-transparent caret-blue-400',
                        'focus:outline-none',
                        // Make text transparent but keep caret visible
                        'text-transparent',
                        readOnly && 'cursor-default'
                    )}
                    style={{
                        caretColor: theme === 'dark' ? '#60a5fa' : '#2563eb',
                    }}
                />

                {/* Placeholder */}
                {!content && (
                    <div className={cn(
                        'pointer-events-none absolute left-4 top-4 leading-6',
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                    )}>
                        {placeholder}
                    </div>
                )}
            </div>

            {/* Current line indicator */}
            {isFocused && (
                <div
                    className={cn(
                        'pointer-events-none absolute left-0 right-0 -z-10',
                        theme === 'dark' ? 'bg-white/5' : 'bg-blue-50'
                    )}
                    style={{
                        top: `calc(1rem + ${(currentLine - 1) * 1.5}rem)`,
                        height: '1.5rem',
                    }}
                />
            )}
        </div>
    );
}

export default CodeEditor;
