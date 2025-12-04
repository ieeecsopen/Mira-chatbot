import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Maximize2 } from 'lucide-react';

interface CodeBlockProps {
    children: string;
    language?: string;
    onOpenInCanvas?: (code: string, language: string) => void;
}

// Language display names mapping
const languageNames: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    tsx: 'TypeScript React',
    jsx: 'JavaScript React',
    py: 'Python',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    rb: 'Ruby',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    md: 'Markdown',
    markdown: 'Markdown',
    bash: 'Bash',
    sh: 'Shell',
    shell: 'Shell',
    powershell: 'PowerShell',
    ps1: 'PowerShell',
    dockerfile: 'Dockerfile',
    docker: 'Docker',
    graphql: 'GraphQL',
    vue: 'Vue',
    svelte: 'Svelte',
    dart: 'Dart',
    r: 'R',
    scala: 'Scala',
    lua: 'Lua',
    perl: 'Perl',
    haskell: 'Haskell',
    elixir: 'Elixir',
    clojure: 'Clojure',
    plaintext: 'Plain Text',
    text: 'Plain Text',
};

// Custom high-contrast theme based on One Dark with enhanced colors
const customTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
        ...oneDark['pre[class*="language-"]'],
        background: '#0d1117',
        margin: 0,
        padding: '1rem',
        borderRadius: '0 0 0.5rem 0.5rem',
        fontSize: '0.875rem',
        lineHeight: '1.6',
    },
    'code[class*="language-"]': {
        ...oneDark['code[class*="language-"]'],
        background: 'transparent',
        fontSize: '0.875rem',
        lineHeight: '1.6',
    },
    // Enhanced token colors for better contrast
    comment: { color: '#8b949e', fontStyle: 'italic' },
    prolog: { color: '#8b949e' },
    doctype: { color: '#8b949e' },
    cdata: { color: '#8b949e' },
    punctuation: { color: '#c9d1d9' },
    property: { color: '#79c0ff' },
    tag: { color: '#7ee787' },
    boolean: { color: '#ff7b72' },
    number: { color: '#f0883e' },
    constant: { color: '#79c0ff' },
    symbol: { color: '#79c0ff' },
    selector: { color: '#7ee787' },
    'attr-name': { color: '#79c0ff' },
    string: { color: '#a5d6ff' },
    char: { color: '#a5d6ff' },
    builtin: { color: '#ffa657' },
    inserted: { color: '#7ee787' },
    operator: { color: '#ff7b72' },
    entity: { color: '#ffa657' },
    url: { color: '#a5d6ff' },
    variable: { color: '#ffa657' },
    atrule: { color: '#79c0ff' },
    'attr-value': { color: '#a5d6ff' },
    function: { color: '#d2a8ff' },
    'class-name': { color: '#ffa657' },
    keyword: { color: '#ff7b72' },
    regex: { color: '#a5d6ff' },
    important: { color: '#ff7b72', fontWeight: 'bold' },
    deleted: { color: '#ff7b72' },
};

export function CodeBlock({ children, language = 'plaintext', onOpenInCanvas }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [children]);

    const handleOpenInCanvas = useCallback(() => {
        onOpenInCanvas?.(children, language);
    }, [children, language, onOpenInCanvas]);

    const displayLanguage = languageNames[language.toLowerCase()] || language.toUpperCase();

    return (
        <div className="my-4 rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117] shadow-lg">
            {/* Header with language label and actions */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    {displayLanguage}
                </span>
                <div className="flex items-center gap-1">
                    {onOpenInCanvas && (
                        <button
                            onClick={handleOpenInCanvas}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded-md transition-all duration-200"
                            title="Open in Canvas"
                        >
                            <Maximize2 size={14} />
                        </button>
                    )}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded-md transition-all duration-200"
                        title="Copy code"
                    >
                        {copied ? (
                            <>
                                <Check size={14} className="text-green-400" />
                                <span className="text-green-400">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy size={14} />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Code content */}
            <div className="overflow-x-auto">
                <SyntaxHighlighter
                    language={language.toLowerCase()}
                    style={customTheme}
                    showLineNumbers={children.split('\n').length > 3}
                    lineNumberStyle={{
                        minWidth: '2.5em',
                        paddingRight: '1em',
                        color: '#484f58',
                        userSelect: 'none',
                    }}
                    wrapLines={true}
                    customStyle={{
                        margin: 0,
                        background: '#0d1117',
                    }}
                >
                    {children}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}

// Inline code component for short code snippets
export function InlineCode({ children }: { children: React.ReactNode }) {
    return (
        <code className="px-1.5 py-0.5 mx-0.5 rounded-md text-sm font-mono bg-[#1f2937] text-[#f0883e] border border-[#374151]">
            {children}
        </code>
    );
}
