/**
 * Canvas Types and Utilities for MIRA
 * Handles different types of canvas content
 */

export type CanvasType = 'code' | 'document' | 'table' | 'diagram' | 'image' | 'html';

export interface CanvasItem {
  id: string;
  type: CanvasType;
  title: string;
  content: string;
  language?: string; // For code type
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface CanvasState {
  isOpen: boolean;
  activeItemId: string | null;
  items: CanvasItem[];
  viewMode: 'code' | 'preview' | 'split';
}

// Generate unique ID for canvas items
export function generateCanvasId(): string {
  return `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Detect content type from text
export function detectContentType(content: string): { type: CanvasType; language?: string } {
  // Check for code patterns
  const codePatterns = [
    { pattern: /^```(\w+)?\n/m, type: 'code' as const },
    { pattern: /^(import|from|export|const|let|var|function|class|def|public|private)\s/m, type: 'code' as const },
    { pattern: /<(!DOCTYPE|html|head|body|div|span|script)/i, type: 'html' as const },
  ];

  for (const { pattern, type } of codePatterns) {
    if (pattern.test(content)) {
      // Try to detect language
      const langMatch = content.match(/^```(\w+)/);
      return { type, language: langMatch?.[1] || detectLanguage(content) };
    }
  }

  // Check for table patterns (markdown tables)
  if (/^\|.+\|$/m.test(content) && /^\|[-:| ]+\|$/m.test(content)) {
    return { type: 'table' };
  }

  // Check for diagram patterns (mermaid, etc.)
  if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/m.test(content)) {
    return { type: 'diagram' };
  }

  // Default to document
  return { type: 'document' };
}

// Detect programming language
function detectLanguage(content: string): string {
  const languagePatterns: { pattern: RegExp; language: string }[] = [
    { pattern: /\b(useState|useEffect|React|jsx|tsx)\b/, language: 'typescript' },
    { pattern: /\b(def |import |from |print\(|elif |:\s*$)/m, language: 'python' },
    { pattern: /\b(func |fmt\.|package main|go\s)/m, language: 'go' },
    { pattern: /\b(fn |let mut|impl |pub fn|use std)/m, language: 'rust' },
    { pattern: /\b(public class|private|void|System\.out)/m, language: 'java' },
    { pattern: /\b(console\.|const |let |var |=>|async |await )/m, language: 'javascript' },
    { pattern: /<\/?[a-z][\s\S]*>/i, language: 'html' },
    { pattern: /^\s*[\.\#][\w-]+\s*\{/m, language: 'css' },
    { pattern: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i, language: 'sql' },
  ];

  for (const { pattern, language } of languagePatterns) {
    if (pattern.test(content)) {
      return language;
    }
  }

  return 'plaintext';
}

// Extract code blocks from markdown
export function extractCodeBlocks(content: string): Array<{ code: string; language: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ code: string; language: string }> = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'plaintext',
      code: match[2].trim(),
    });
  }

  return blocks;
}

// Generate title from content
export function generateCanvasTitle(content: string, type: CanvasType): string {
  // For code, try to extract function/class name
  if (type === 'code') {
    const functionMatch = content.match(/(?:function|def|fn|func)\s+(\w+)/);
    if (functionMatch) return `Function: ${functionMatch[1]}`;

    const classMatch = content.match(/(?:class|struct|interface)\s+(\w+)/);
    if (classMatch) return `Class: ${classMatch[1]}`;

    const componentMatch = content.match(/(?:export\s+)?(?:default\s+)?(?:function|const)\s+(\w+)/);
    if (componentMatch) return `Component: ${componentMatch[1]}`;
  }

  // For documents, use first line
  const firstLine = content.split('\n')[0].replace(/^#*\s*/, '').trim();
  if (firstLine.length > 0 && firstLine.length <= 50) {
    return firstLine;
  }

  // Default titles based on type
  const defaultTitles: Record<CanvasType, string> = {
    code: 'Code Snippet',
    document: 'Document',
    table: 'Data Table',
    diagram: 'Diagram',
    image: 'Image',
    html: 'HTML Preview',
  };

  return defaultTitles[type] || 'Canvas Item';
}

// Format file extension based on language
export function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    go: 'go',
    rust: 'rs',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    markdown: 'md',
    plaintext: 'txt',
  };

  return extensions[language] || 'txt';
}

// Storage key for canvas items
const CANVAS_STORAGE_KEY = 'mira-canvas-items';

// Save canvas items to localStorage
export function saveCanvasItems(items: CanvasItem[]): void {
  try {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save canvas items:', e);
  }
}

// Load canvas items from localStorage
export function loadCanvasItems(): CanvasItem[] {
  try {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to load canvas items:', e);
    return [];
  }
}
