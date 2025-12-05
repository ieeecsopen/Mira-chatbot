import { useRef, useEffect, useCallback, memo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { MessageBubble } from '../MessageBubble';
import { SearchResultsCard } from './SearchResultsCard';
import { ImageGeneratingCard, ImageDisplay } from './ImageGenerator';
import type { SearchResult } from '../../lib/webSearch';
import type { GeneratedImage } from '../../lib/imageGeneration';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    searchResults?: SearchResult[];
    generatedImage?: GeneratedImage;
    isGeneratingImage?: boolean;
    imagePrompt?: string;
}

interface VirtualizedMessageListProps {
    messages: Message[];
    isStreaming: boolean;
    isWaiting: boolean;
    isSearchingWeb: boolean;
    onRegenerate?: () => void;
    onOpenInCanvas?: (code: string, language?: string) => void;
    onSend: (text: string) => void;
}

// Estimate row heights - actual height will be measured
const estimateRowHeight = (message: Message): number => {
    const baseHeight = message.role === 'user' ? 80 : 120;
    const contentLength = message.content.length;
    const lineEstimate = Math.ceil(contentLength / 80);

    let height = baseHeight + lineEstimate * 24;

    // Add extra height for special content
    if (message.searchResults && message.searchResults.length > 0) {
        height += 200;
    }
    if (message.generatedImage) {
        height += 350;
    }
    if (message.isGeneratingImage) {
        height += 250;
    }

    return Math.max(height, 100);
};

// Individual message row component
const MessageRow = memo(({
    message,
    index,
    messages,
    isStreaming,
    isWaiting,
    isSearchingWeb,
    onRegenerate,
    onOpenInCanvas,
    onSend,
    style,
    setRowHeight
}: {
    message: Message;
    index: number;
    messages: Message[];
    isStreaming: boolean;
    isWaiting: boolean;
    isSearchingWeb: boolean;
    onRegenerate?: () => void;
    onOpenInCanvas?: (code: string, language?: string) => void;
    onSend: (text: string) => void;
    style: React.CSSProperties;
    setRowHeight: (index: number, height: number) => void;
}) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const isLastMessage = index === messages.length - 1;

    // Measure actual row height after render
    useEffect(() => {
        if (rowRef.current) {
            const height = rowRef.current.getBoundingClientRect().height;
            setRowHeight(index, height);
        }
    }, [message.content, index, setRowHeight]);

    return (
        <div style={style}>
            <div ref={rowRef} className="py-2">
                {/* Show search results before assistant message */}
                {message.role === 'assistant' && message.searchResults && message.searchResults.length > 0 && (
                    <SearchResultsCard
                        results={message.searchResults}
                        query={messages[index - 1]?.content || ''}
                    />
                )}

                {/* Show searching indicator */}
                {message.role === 'assistant' && isSearchingWeb && isLastMessage && (
                    <SearchResultsCard
                        results={[]}
                        query={messages[index - 1]?.content || ''}
                        isSearching={true}
                    />
                )}

                {/* Show image generating indicator */}
                {message.role === 'assistant' && message.isGeneratingImage && message.imagePrompt && (
                    <ImageGeneratingCard prompt={message.imagePrompt} />
                )}

                {/* Show generated image */}
                {message.role === 'assistant' && message.generatedImage && (
                    <ImageDisplay
                        image={message.generatedImage}
                        onRegenerate={(prompt) => onSend(`/imagine ${prompt}`)}
                    />
                )}

                {/* Show message bubble (skip if only showing image generating state) */}
                {!(message.role === 'assistant' && message.isGeneratingImage && !message.content) && (
                    <MessageBubble
                        role={message.role}
                        content={message.content}
                        isStreaming={isStreaming && isLastMessage && message.role === 'assistant'}
                        isWaiting={isWaiting && isLastMessage && message.role === 'assistant'}
                        onRegenerate={
                            !isStreaming && message.role === 'assistant' && isLastMessage && !message.generatedImage
                                ? onRegenerate
                                : undefined
                        }
                        onOpenInCanvas={
                            !isStreaming && message.role === 'assistant'
                                ? onOpenInCanvas
                                : undefined
                        }
                    />
                )}
            </div>
        </div>
    );
});

MessageRow.displayName = 'MessageRow';

export function VirtualizedMessageList({
    messages,
    isStreaming,
    isWaiting,
    isSearchingWeb,
    onRegenerate,
    onOpenInCanvas,
    onSend,
}: VirtualizedMessageListProps) {
    const listRef = useRef<List>(null);
    const rowHeights = useRef<{ [key: number]: number }>({});

    // Get row height for a specific index
    const getRowHeight = useCallback((index: number) => {
        return rowHeights.current[index] || estimateRowHeight(messages[index]);
    }, [messages]);

    // Set row height after measurement
    const setRowHeight = useCallback((index: number, height: number) => {
        if (rowHeights.current[index] !== height) {
            rowHeights.current[index] = height;
            listRef.current?.resetAfterIndex(index);
        }
    }, []);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            listRef.current?.scrollToItem(messages.length - 1, 'end');
        }
    }, [messages.length, messages[messages.length - 1]?.content]);

    // If no messages, return null
    if (messages.length === 0) {
        return null;
    }

    return (
        <List
            ref={listRef}
            height={window.innerHeight - 300} // Adjust based on your layout
            width="100%"
            itemCount={messages.length}
            itemSize={getRowHeight}
            overscanCount={3}
            className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        >
            {({ index, style }) => (
                <MessageRow
                    message={messages[index]}
                    index={index}
                    messages={messages}
                    isStreaming={isStreaming}
                    isWaiting={isWaiting}
                    isSearchingWeb={isSearchingWeb}
                    onRegenerate={onRegenerate}
                    onOpenInCanvas={onOpenInCanvas}
                    onSend={onSend}
                    style={style}
                    setRowHeight={setRowHeight}
                />
            )}
        </List>
    );
}
