/**
 * Document Parser Module
 * Handles parsing of various document formats: PDF, DOCX, TXT, MD
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker - use the bundled worker from pdfjs-dist
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ParsedDocument {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'txt' | 'md' | 'unknown';
    content: string;
    pages?: number;
    chunks: DocumentChunk[];
    metadata: {
        size: number;
        lastModified: number;
        wordCount: number;
        charCount: number;
    };
}

export interface DocumentChunk {
    id: string;
    content: string;
    pageNumber?: number;
    startIndex: number;
    endIndex: number;
}

// Chunk configuration
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Split text into overlapping chunks for better context retrieval
 */
function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize;

        // Try to break at sentence or paragraph boundary
        if (endIndex < text.length) {
            const breakPoints = ['\n\n', '\n', '. ', '? ', '! ', '; '];
            for (const breakPoint of breakPoints) {
                const lastBreak = text.lastIndexOf(breakPoint, endIndex);
                if (lastBreak > startIndex + chunkSize / 2) {
                    endIndex = lastBreak + breakPoint.length;
                    break;
                }
            }
        }

        const content = text.slice(startIndex, endIndex).trim();
        if (content.length > 0) {
            chunks.push({
                id: `chunk_${chunks.length}`,
                content,
                startIndex,
                endIndex,
            });
        }

        startIndex = endIndex - overlap;
        if (startIndex >= text.length) break;
    }

    return chunks;
}

/**
 * Parse PDF file
 */
async function parsePDF(file: File): Promise<{ content: string; pages: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += `\n--- Page ${i} ---\n${pageText}\n`;
    }

    return { content: fullText.trim(), pages: numPages };
}

/**
 * Parse DOCX file using Mammoth
 */
async function parseDOCX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * Parse plain text or markdown file
 */
async function parseTextFile(file: File): Promise<string> {
    return await file.text();
}

/**
 * Detect file type from extension and MIME type
 */
function detectFileType(file: File): ParsedDocument['type'] {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (file.type === 'application/pdf' || extension === 'pdf') {
        return 'pdf';
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
        return 'docx';
    }
    if (file.type === 'text/plain' || extension === 'txt') {
        return 'txt';
    }
    if (file.type === 'text/markdown' || extension === 'md') {
        return 'md';
    }
    
    return 'unknown';
}

/**
 * Main document parser function
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
    const type = detectFileType(file);
    let content = '';
    let pages: number | undefined;

    switch (type) {
        case 'pdf':
            const pdfResult = await parsePDF(file);
            content = pdfResult.content;
            pages = pdfResult.pages;
            break;
        case 'docx':
            content = await parseDOCX(file);
            break;
        case 'txt':
        case 'md':
            content = await parseTextFile(file);
            break;
        default:
            // Try to parse as text anyway
            try {
                content = await parseTextFile(file);
            } catch {
                throw new Error(`Unsupported file type: ${file.type || file.name}`);
            }
    }

    // Clean and normalize content
    content = content
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '  ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Create chunks for retrieval
    const chunks = chunkText(content);

    // Calculate metadata
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.length;

    return {
        id: generateId(),
        name: file.name,
        type,
        content,
        pages,
        chunks,
        metadata: {
            size: file.size,
            lastModified: file.lastModified,
            wordCount,
            charCount,
        },
    };
}

/**
 * Parse multiple documents
 */
export async function parseDocuments(files: File[]): Promise<ParsedDocument[]> {
    const results: ParsedDocument[] = [];
    
    for (const file of files) {
        try {
            const doc = await parseDocument(file);
            results.push(doc);
        } catch (error) {
            console.error(`Failed to parse ${file.name}:`, error);
        }
    }
    
    return results;
}

/**
 * Supported file types for document upload
 */
export const SUPPORTED_DOCUMENT_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
};

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
