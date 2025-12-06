import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput, type SlashCommand } from './components/ChatInput';
import { LandingPage } from './components/LandingPage';
import { ModelSelector, MIRA_MODELS } from './components/ModelSelector';
import { PanelRightOpen } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sidebar } from './components/ui/Sidebar';
import { streamMessage } from './lib/api';
import { shouldSearchWeb } from './lib/webSearch';
import { chatStorage, type ChatSession } from './lib/chatStorage';
import { Canvas } from './components/ui/Canvas';
import { useCanvas } from './hooks/useCanvas';
import { Navbar } from './components/ui/Navbar';
import { SearchMessages } from './components/ui/SearchMessages';
import { VoiceInput } from './components/ui/VoiceInput';
import { FileUpload, FilePreview, type UploadedFile } from './components/ui/FileUpload';
import { SearchResultsCard } from './components/ui/SearchResultsCard';
import { DocumentUploadBar } from './components/ui/DocumentUploadBar';
import { ImageGeneratingCard, ImageDisplay } from './components/ui/ImageGenerator';
import { getDocumentStore } from './lib/documentStore';
import { parseImageCommand, generateImage, type GeneratedImage } from './lib/imageGeneration';
import type { SearchResult } from './lib/webSearch';
import { AuthProvider } from './contexts/AuthContext';
import { CommandPalette } from './components/ui/CommandPalette';
import { ShareModal } from './components/ui/ShareModal';
import { SharedChatView } from './components/ui/SharedChatView';
import { getShareIdFromUrl, cleanupExpiredChats } from './lib/shareChat';
import { MemoryPanel } from './components/ui/MemoryPanel';
import { WorkspacePanel } from './components/ui/WorkspacePanel';
import { notificationManager } from './lib/notifications';
import { TemplatePanel } from './components/ui/TemplatePanel';
import { useMetrics } from './contexts/MetricsContext';
import { EvaluationPanel } from './components/ui/EvaluationPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  searchResults?: SearchResult[];
  generatedImage?: GeneratedImage;
  isGeneratingImage?: boolean;
  imagePrompt?: string;
  rating?: 'up' | 'down';
  feedback?: string;
}

// Maximum number of messages to include for context
const MAX_CONTEXT_MESSAGES = 10;

// Streaming buffer for performance optimization
const STREAM_BUFFER_INTERVAL = 30; // ms between UI updates

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MIRA_MODELS[0].id);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isEvaluationPanelOpen, setIsEvaluationPanelOpen] = useState(false);

  // Canvas state
  const canvas = useCanvas();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef<string>('');
  const lastUpdateRef = useRef<number>(0);
  const responseTimersRef = useRef<Map<string, number>>(new Map());
  const { startResponse, completeResponse, setRating: setMetricRating, getRecord } = useMetrics();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isWorkspacePanelOpen, setIsWorkspacePanelOpen] = useState(false);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  const [sharedChatId, setSharedChatId] = useState<string | null>(() => getShareIdFromUrl());
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed'>('concise');

  // Web search state
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  // Document state - track if documents are loaded for context indicator
  const [hasDocuments, setHasDocuments] = useState(() => getDocumentStore().getAll().length > 0);

  // Update document status
  const updateDocumentStatus = useCallback(() => {
    setHasDocuments(getDocumentStore().getAll().length > 0);
  }, []);

  // Load chat sessions on mount
  useEffect(() => {
    const sessions = chatStorage.getRecentSessions(20);
    setChatSessions(sessions);

    // Check if there's a current session with messages
    const currentSession = chatStorage.getCurrentSession();
    if (currentSession && currentSession.messages.length > 0) {
      setCurrentSessionId(currentSession.id);
      setMessages(currentSession.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        rating: getRecord(m.id)?.rating,
        feedback: getRecord(m.id)?.feedback
      })));
      setHasStarted(true);
    }
  }, [getRecord]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Keyboard shortcut for command palette (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Optimized chunk handler with buffering
  const handleStreamChunk = useCallback((chunk: string) => {
    streamBufferRef.current += chunk;
    const now = Date.now();

    // Only update UI at intervals to reduce re-renders
    if (now - lastUpdateRef.current >= STREAM_BUFFER_INTERVAL) {
      const bufferedContent = streamBufferRef.current;
      streamBufferRef.current = '';
      lastUpdateRef.current = now;

      setMessages(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
          const newContent = prev[lastIndex].content + bufferedContent;
          // Update storage with latest content
          chatStorage.updateLastAssistantMessage(newContent);
          return [
            ...prev.slice(0, lastIndex),
            {
              ...prev[lastIndex],
              content: newContent
            }
          ];
        }
        return prev;
      });
    }
  }, []);

  // Flush remaining buffer
  const flushStreamBuffer = useCallback(() => {
    if (streamBufferRef.current) {
      const remainingContent = streamBufferRef.current;
      streamBufferRef.current = '';

      setMessages(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
          const newContent = prev[lastIndex].content + remainingContent;
          chatStorage.updateLastAssistantMessage(newContent);
          return [
            ...prev.slice(0, lastIndex),
            {
              ...prev[lastIndex],
              content: newContent
            }
          ];
        }
        return prev;
      });
    }
    // Save the complete session
    chatStorage.saveCurrentSession();
    // Refresh sessions list
    setChatSessions(chatStorage.getRecentSessions(20));
  }, []);

  const handleSend = useCallback(async (text: string, options?: { enableWebSearch?: boolean; responseStyle?: 'concise' | 'detailed' }) => {
    if (!text.trim()) return;

    const autoSearch = shouldSearchWeb(text);
    const useWebSearch =
      options?.enableWebSearch !== undefined
        ? options.enableWebSearch
        : (webSearchEnabled || autoSearch);
    const style = options?.responseStyle || responseStyle;

    if (!hasStarted) {
      setHasStarted(true);
      // Create a new session if starting fresh
      const newSessionId = chatStorage.createSession(selectedModel);
      setCurrentSessionId(newSessionId);
    }

    // Check if this is an image generation request
    const { isImageCommand, prompt: imagePrompt } = parseImageCommand(text);

    if (isImageCommand && imagePrompt) {
      // Handle image generation
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text
      };

      setMessages(prev => [...prev, userMessage]);
      chatStorage.addMessage('user', text);

      // Create assistant message with generating state
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        isGeneratingImage: true,
        imagePrompt: imagePrompt
      };

      setMessages(prev => [...prev, assistantMessage]);

      try {
        const generatedImage = await generateImage(imagePrompt);

        // Update message with generated image
        setMessages(prev => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
            return [
              ...prev.slice(0, lastIndex),
              {
                ...prev[lastIndex],
                content: `Here's the image I generated for "${imagePrompt}":`,
                isGeneratingImage: false,
                generatedImage: generatedImage
              }
            ];
          }
          return prev;
        });

        chatStorage.updateLastAssistantMessage(`[Generated image: ${imagePrompt}]`);
        chatStorage.saveCurrentSession();
        setChatSessions(chatStorage.getRecentSessions(20));
      } catch (error) {
        console.error('Image generation failed:', error);
        setMessages(prev => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
            return [
              ...prev.slice(0, lastIndex),
              {
                ...prev[lastIndex],
                content: `Sorry, I couldn't generate that image. ${(error as Error).message}`,
                isGeneratingImage: false
              }
            ];
          }
          return prev;
        });
      }

      return;
    }

    // Normal message handling
    const currentHistory = messages
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    const storedUserMessage = chatStorage.addMessage('user', text);
    const userMessage: Message = {
      id: storedUserMessage?.id || Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);

    setIsWaiting(true);
    setIsStreaming(true);

    const storedAssistantMessage = chatStorage.addMessage('assistant', '');
    const assistantMessage: Message = {
      id: storedAssistantMessage?.id || (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      searchResults: []
    };

    setMessages(prev => [...prev, assistantMessage]);

    responseTimersRef.current.set(assistantMessage.id, performance.now());
    startResponse({
      id: assistantMessage.id,
      prompt: text,
      model: selectedModel,
      sessionId: chatStorage.getCurrentSessionId(),
      startedAt: Date.now(),
      usedWebSearch: useWebSearch,
      usedDocuments: hasDocuments,
      responseStyle: style,
      attachmentsCount: attachedFiles.length,
      userMessageChars: text.length
    });

    let completionLogged = false;

    try {
      // Reset buffer state
      streamBufferRef.current = '';
      lastUpdateRef.current = Date.now();

      // Start tracking for background notifications
      notificationManager.startTracking();

      // Small delay before starting to show typing indicator
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsWaiting(false);

      await streamMessage(
        'user',
        text,
        handleStreamChunk,
        () => {
          completionLogged = true;
          flushStreamBuffer();
          setIsSearchingWeb(false);

          const startTime = responseTimersRef.current.get(assistantMessage.id);
          const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
          completeResponse(assistantMessage.id, {
            success: true,
            latencyMs,
            model: selectedModel
          });
          responseTimersRef.current.delete(assistantMessage.id);

          const lastContent = streamBufferRef.current || 'Response complete';
          notificationManager.onResponseComplete(lastContent);
        },
        (error: string) => {
          completionLogged = true;
          console.error('Stream error:', error);
          flushStreamBuffer();
          setIsSearchingWeb(false);

          const startTime = responseTimersRef.current.get(assistantMessage.id);
          const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
          completeResponse(assistantMessage.id, {
            success: false,
            latencyMs,
            error,
            model: selectedModel
          });
          responseTimersRef.current.delete(assistantMessage.id);

          setMessages(prev => {
            const lastIndex = prev.length - 1;
            if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
              const errorContent = prev[lastIndex].content || `දෝෂයක් සිදු විය: ${error}`;
              chatStorage.updateLastAssistantMessage(errorContent);
              return [
                ...prev.slice(0, lastIndex),
                {
                  ...prev[lastIndex],
                  content: errorContent
                }
              ];
            }
            return prev;
          });
        },
        selectedModel,
        currentHistory,
        {
          enableWebSearch: useWebSearch,
          responseStyle: style,
          onSearchStart: () => {
            setIsSearchingWeb(true);
          },
          onSearchResults: (results) => {
            setIsSearchingWeb(false);
            setMessages(prev => {
              const lastIndex = prev.length - 1;
              if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                return [
                  ...prev.slice(0, lastIndex),
                  {
                    ...prev[lastIndex],
                    searchResults: results
                  }
                ];
              }
              return prev;
            });
          }
        }
      );

      if (!completionLogged) {
        const startTime = responseTimersRef.current.get(assistantMessage.id);
        const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
        completeResponse(assistantMessage.id, {
          success: true,
          latencyMs,
          model: selectedModel
        });
        responseTimersRef.current.delete(assistantMessage.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      flushStreamBuffer();
      setIsSearchingWeb(false);

      if (!completionLogged) {
        const startTime = responseTimersRef.current.get(assistantMessage.id);
        const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
        completeResponse(assistantMessage.id, {
          success: false,
          latencyMs,
          error: error instanceof Error ? error.message : String(error),
          model: selectedModel
        });
        responseTimersRef.current.delete(assistantMessage.id);
      }
    } finally {
      setIsStreaming(false);
      setIsWaiting(false);
      responseTimersRef.current.delete(assistantMessage.id);
    }
  }, [
    hasStarted,
    messages,
    selectedModel,
    webSearchEnabled,
    handleStreamChunk,
    flushStreamBuffer,
    responseStyle,
    hasDocuments,
    attachedFiles,
    startResponse,
    completeResponse
  ]);

  // Handle switching to a different chat session
  const handleSelectSession = useCallback((session: ChatSession) => {
    chatStorage.setCurrentSession(session.id);
    setCurrentSessionId(session.id);
    setMessages(session.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      rating: getRecord(m.id)?.rating,
      feedback: getRecord(m.id)?.feedback
    })));
    setHasStarted(true);
  }, [getRecord]);

  // Handle selecting session from search
  const handleSelectSessionFromSearch = useCallback((sessionId: string) => {
    const session = chatStorage.getSession(sessionId);
    if (session) {
      handleSelectSession(session);
    }
  }, [handleSelectSession]);

  // File upload handlers
  const handleFilesSelected = useCallback((files: UploadedFile[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileRemove = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Voice input handler
  const handleVoiceTranscript = useCallback((text: string) => {
    // This will be handled by ChatInput
    console.log('Voice transcript:', text);
  }, []);

  const handleRateMessage = useCallback((messageId: string, rating: 'up' | 'down' | null) => {
    let feedback: string | undefined;
    if (rating === 'down') {
      const response = window.prompt('ඔබට අවශ්‍ය නම්, මෙහි අමතර අදහස් එකතු කරන්න (විකල්පය).');
      if (response && response.trim().length > 0) {
        feedback = response.trim();
      }
    }

    const feedbackValue = rating === 'down' ? feedback : undefined;

    setMessages(prev => prev.map(message => {
      if (message.id !== messageId || message.role !== 'assistant') {
        return message;
      }
      return {
        ...message,
        rating: rating ?? undefined,
        feedback: feedbackValue
      };
    }));

    setMetricRating(messageId, rating, feedbackValue);
  }, [setMetricRating]);

  // Handle creating a new chat
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setHasStarted(false);
    setCurrentSessionId(null);
    setAttachedFiles([]);
    chatStorage.clearCurrentSession();
    setChatSessions(chatStorage.getRecentSessions(20));
  }, []);

  // Handle clearing current chat (keeps session but clears messages)
  const handleClearChat = useCallback(() => {
    setMessages([]);
    if (currentSessionId) {
      // Clear messages in storage too
      chatStorage.clearCurrentSession();
    }
  }, [currentSessionId]);

  // Handle slash commands
  const handleSlashCommand = useCallback((command: SlashCommand) => {
    switch (command.id) {
      case 'clear':
        handleClearChat();
        break;
      case 'new':
        handleNewChat();
        break;
      case 'search':
        setIsSearchOpen(true);
        break;
      case 'upload': {
        // Trigger file upload - we'll need to programmatically click the file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.click();
        break;
      }
      case 'web':
        // Toggle web search
        setWebSearchEnabled(prev => !prev);
        break;
      case 'model': {
        // Cycle through models or open model selector
        const currentIndex = MIRA_MODELS.findIndex(m => m.id === selectedModel);
        const nextIndex = (currentIndex + 1) % MIRA_MODELS.length;
        setSelectedModel(MIRA_MODELS[nextIndex].id);
        break;
      }
      case 'creative': {
        // Switch to a creative model if available
        const creativeModel = MIRA_MODELS.find(m => m.id.includes('creative') || m.id.includes('gemini-2'));
        if (creativeModel) setSelectedModel(creativeModel.id);
        break;
      }
      case 'fast': {
        // Switch to a fast model if available
        const fastModel = MIRA_MODELS.find(m => m.id.includes('flash') || m.id.includes('fast'));
        if (fastModel) setSelectedModel(fastModel.id);
        break;
      }
      case 'code':
        // Send a code-focused prompt
        handleSend('Please help me write some code. What would you like me to create?');
        break;
      case 'summarize':
        if (messages.length > 0) {
          handleSend('Please summarize our conversation so far.');
        }
        break;
      case 'image':
      case 'imagine':
        // Prompt user for image generation
        // The actual generation happens in handleSend when it detects the /imagine command
        break;
      case 'settings':
        // Could open a settings modal - for now just toggle sidebar
        setIsSidebarOpen(true);
        break;
      case 'docs':
      case 'documents':
        // Show help about document upload - the DocumentUploadBar handles the actual upload
        handleSend('You can upload documents (PDF, DOCX, TXT, MD) using the "Docs" button next to the input. Once uploaded, just ask questions about your documents in this chat!');
        break;
      case 'help':
        handleSend('What can you help me with? Please list your capabilities.');
        break;
      case 'shortcuts':
        // Show keyboard shortcuts info
        handleSend('/help - Show this help\n/clear - Clear current chat\n/new - Start new chat\n/search - Search messages\n/upload - Upload a file\n/web - Toggle web search\n/model - Change AI model\n/code - Get coding help\n/summarize - Summarize conversation');
        break;
      case 'template':
        setIsTemplatePanelOpen(true);
        break;
      default:
        console.log('Unknown command:', command.id);
    }
  }, [handleClearChat, handleNewChat, selectedModel, messages, handleSend]);

  // Handle deleting a session
  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    chatStorage.deleteSession(sessionId);
    setChatSessions(chatStorage.getRecentSessions(20));
    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  }, [currentSessionId, handleNewChat]);

  // Handle regenerating the last response
  const handleRegenerate = useCallback(async () => {
    if (messages.length < 2) return;

    // Find the last user message
    const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];

    // Remove the last assistant message
    setMessages(prev => prev.slice(0, -1));

    const session = chatStorage.getCurrentSession();
    if (session && session.messages.length > 0) {
      session.messages.pop();
      session.updatedAt = Date.now();
      chatStorage.saveCurrentSession();
    }

    // Resend the last user message
    // Get history up to the last user message
    const currentHistory = messages
      .slice(0, lastUserMessageIndex)
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    setIsWaiting(true);
    setIsStreaming(true);

    let assistantMessage: Message | null = null;

    try {
      const storedAssistant = chatStorage.addMessage('assistant', '');
      assistantMessage = {
        id: storedAssistant?.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage as Message]);

      responseTimersRef.current.set(assistantMessage.id, performance.now());
      startResponse({
        id: assistantMessage.id,
        prompt: lastUserMessage.content,
        model: selectedModel,
        sessionId: chatStorage.getCurrentSessionId(),
        startedAt: Date.now(),
        usedWebSearch: webSearchEnabled,
        usedDocuments: hasDocuments,
        responseStyle,
        attachmentsCount: attachedFiles.length,
        userMessageChars: lastUserMessage.content.length
      });

      streamBufferRef.current = '';
      lastUpdateRef.current = Date.now();

      await new Promise(resolve => setTimeout(resolve, 100));
      setIsWaiting(false);

      let completionLogged = false;

      await streamMessage(
        'user',
        lastUserMessage.content,
        handleStreamChunk,
        () => {
          completionLogged = true;
          flushStreamBuffer();
          const startTime = responseTimersRef.current.get(assistantMessage!.id);
          const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
          completeResponse(assistantMessage!.id, {
            success: true,
            latencyMs,
            model: selectedModel
          });
          responseTimersRef.current.delete(assistantMessage!.id);
        },
        (error: string) => {
          completionLogged = true;
          console.error('Stream error:', error);
          flushStreamBuffer();
          const startTime = responseTimersRef.current.get(assistantMessage!.id);
          const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
          completeResponse(assistantMessage!.id, {
            success: false,
            latencyMs,
            error,
            model: selectedModel
          });
          responseTimersRef.current.delete(assistantMessage!.id);
        },
        selectedModel,
        currentHistory,
        {
          responseStyle,
        }
      );

      if (!completionLogged && assistantMessage) {
        const startTime = responseTimersRef.current.get(assistantMessage.id);
        const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
        completeResponse(assistantMessage.id, {
          success: true,
          latencyMs,
          model: selectedModel
        });
        responseTimersRef.current.delete(assistantMessage.id);
      }
    } catch (error) {
      console.error('Error regenerating:', error);
      flushStreamBuffer();
      if (assistantMessage) {
        const startTime = responseTimersRef.current.get(assistantMessage.id);
        const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
        completeResponse(assistantMessage.id, {
          success: false,
          latencyMs,
          error: error instanceof Error ? error.message : String(error),
          model: selectedModel
        });
        responseTimersRef.current.delete(assistantMessage.id);
      }
    } finally {
      setIsStreaming(false);
      setIsWaiting(false);
    }
  }, [
    messages,
    selectedModel,
    handleStreamChunk,
    flushStreamBuffer,
    responseStyle,
    startResponse,
    completeResponse,
    webSearchEnabled,
    hasDocuments,
    attachedFiles
  ]);

  // Handle editing a message and regenerating from that point
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Only allow editing user messages
    if (messages[messageIndex].role !== 'user') return;

    // Truncate messages from this point onwards
    const truncatedMessages = messages.slice(0, messageIndex);

    // Add the edited message
    const editedMessage: Message = {
      ...messages[messageIndex],
      content: newContent
    };

    setMessages([...truncatedMessages, editedMessage]);

    const session = chatStorage.getCurrentSession();
    if (session) {
      const target = session.messages[messageIndex];
      if (target) {
        target.content = newContent;
        target.timestamp = Date.now();
      }
      session.messages = session.messages.slice(0, messageIndex + 1);
      session.updatedAt = Date.now();
      chatStorage.saveCurrentSession();
    }

    // Get history up to the edited message
    const currentHistory = truncatedMessages
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    setIsWaiting(true);
    setIsStreaming(true);

    let assistantMessage: Message | null = null;
    let completionLogged = false;

    try {
      const storedAssistant = chatStorage.addMessage('assistant', '');
      assistantMessage = {
        id: storedAssistant?.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      responseTimersRef.current.set(assistantMessage.id, performance.now());
      startResponse({
        id: assistantMessage.id,
        prompt: newContent,
        model: selectedModel,
        sessionId: chatStorage.getCurrentSessionId(),
        startedAt: Date.now(),
        usedWebSearch: webSearchEnabled,
        usedDocuments: hasDocuments,
        responseStyle,
        attachmentsCount: attachedFiles.length,
        userMessageChars: newContent.length
      });

      streamBufferRef.current = '';
      lastUpdateRef.current = Date.now();

      await new Promise(resolve => setTimeout(resolve, 100));
      setIsWaiting(false);

      await streamMessage(
        'user',
        newContent,
        handleStreamChunk,
        () => {
          completionLogged = true;
          flushStreamBuffer();
          if (assistantMessage) {
            const startTime = responseTimersRef.current.get(assistantMessage.id);
            const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
            completeResponse(assistantMessage.id, {
              success: true,
              latencyMs,
              model: selectedModel
            });
            responseTimersRef.current.delete(assistantMessage.id);
          }
        },
        (error: string) => {
          completionLogged = true;
          console.error('Stream error:', error);
          flushStreamBuffer();
          if (assistantMessage) {
            const startTime = responseTimersRef.current.get(assistantMessage.id);
            const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
            completeResponse(assistantMessage.id, {
              success: false,
              latencyMs,
              error,
              model: selectedModel
            });
            responseTimersRef.current.delete(assistantMessage.id);
          }
        },
        selectedModel,
        currentHistory,
        {
          responseStyle,
        }
      );

      if (!completionLogged && assistantMessage) {
        const startTime = responseTimersRef.current.get(assistantMessage.id);
        const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
        completeResponse(assistantMessage.id, {
          success: true,
          latencyMs,
          model: selectedModel
        });
        responseTimersRef.current.delete(assistantMessage.id);
      }
    } catch (error) {
      console.error('Edit regeneration failed:', error);
      flushStreamBuffer();
      if (!completionLogged && assistantMessage) {
        const startTime = responseTimersRef.current.get(assistantMessage.id);
        const latencyMs = typeof startTime === 'number' ? performance.now() - startTime : undefined;
        completeResponse(assistantMessage.id, {
          success: false,
          latencyMs,
          error: error instanceof Error ? error.message : String(error),
          model: selectedModel
        });
        responseTimersRef.current.delete(assistantMessage.id);
      }
    } finally {
      setIsWaiting(false);
      setIsStreaming(false);
      if (assistantMessage) {
        responseTimersRef.current.delete(assistantMessage.id);
      }
    }
  }, [
    messages,
    selectedModel,
    handleStreamChunk,
    flushStreamBuffer,
    responseStyle,
    startResponse,
    completeResponse,
    webSearchEnabled,
    hasDocuments,
    attachedFiles
  ]);

  // Get current session title
  const currentSessionTitle = currentSessionId
    ? chatSessions.find(s => s.id === currentSessionId)?.title
    : undefined;

  // Get current session for sharing
  const currentSession = currentSessionId
    ? chatStorage.getSession(currentSessionId)
    : null;

  // Clean up expired shared chats on mount
  useEffect(() => {
    cleanupExpiredChats();
  }, []);

  // If viewing a shared chat, show the shared view
  if (sharedChatId) {
    return (
      <SharedChatView
        shareId={sharedChatId}
        onBack={() => {
          setSharedChatId(null);
          // Clear the URL parameter
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-white/20 relative">
        {/* Landing Page - Animates out when chat starts */}
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{
            opacity: hasStarted ? 0 : 1,
            scale: hasStarted ? 0.95 : 1,
            pointerEvents: hasStarted ? 'none' : 'auto',
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 z-30"
        >
          <LandingPage
            onStartChat={handleSend}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </motion.div>

        {/* Main Chat Interface - Animates in when chat starts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hasStarted ? 1 : 0 }}
          transition={{ duration: 0.5, delay: hasStarted ? 0.3 : 0 }}
          className="flex flex-col h-screen"
          style={{ pointerEvents: hasStarted ? 'auto' : 'none' }}
        >
          {/* Navbar - Slides down */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{
              y: hasStarted ? 0 : -100,
              opacity: hasStarted ? 1 : 0,
            }}
            transition={{ duration: 0.6, delay: hasStarted ? 0.4 : 0, ease: "easeOut" }}
          >
            <Navbar
              onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
              onNewChat={handleNewChat}
              onSearchClick={() => setIsSearchOpen(true)}
              onShareClick={() => setIsShareModalOpen(true)}
              onMemoryClick={() => setIsMemoryPanelOpen(true)}
              onWorkspaceClick={() => setIsWorkspacePanelOpen(true)}
              onAnalyticsClick={() => setIsEvaluationPanelOpen(true)}
              chatTitle={currentSessionTitle}
            />
          </motion.div>

          {/* Search Modal */}
          <SearchMessages
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectSession={handleSelectSessionFromSearch}
            currentSessionId={currentSessionId || undefined}
          />

          <div className="flex flex-1 pt-16 overflow-hidden">
            {/* Sidebar - Slides in from left */}
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{
                x: hasStarted ? 0 : -280,
                opacity: hasStarted ? 1 : 0,
              }}
              transition={{ duration: 0.6, delay: hasStarted ? 0.5 : 0, ease: "easeOut" }}
            >
              <Sidebar
                chatSessions={chatSessions}
                currentSessionId={currentSessionId}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
              />
            </motion.div>

            {/* Main Chat Area - Fades in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: hasStarted ? 1 : 0 }}
              transition={{ duration: 0.5, delay: hasStarted ? 0.6 : 0 }}
              className="flex-1 flex flex-col h-full relative bg-background"
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 md:p-0 scroll-smooth relative z-0">
                <div className="max-w-3xl mx-auto pt-4 md:pt-10 pb-4">
                  {messages.map((msg, index) => (
                    <div key={msg.id}>
                      {/* Show search results before assistant message */}
                      {msg.role === 'assistant' && msg.searchResults && msg.searchResults.length > 0 && (
                        <SearchResultsCard
                          results={msg.searchResults}
                          query={messages[index - 1]?.content || ''}
                        />
                      )}
                      {/* Show searching indicator */}
                      {msg.role === 'assistant' && isSearchingWeb && index === messages.length - 1 && (
                        <SearchResultsCard
                          results={[]}
                          query={messages[index - 1]?.content || ''}
                          isSearching={true}
                        />
                      )}
                      {/* Show image generating indicator */}
                      {msg.role === 'assistant' && msg.isGeneratingImage && msg.imagePrompt && (
                        <ImageGeneratingCard prompt={msg.imagePrompt} />
                      )}
                      {/* Show generated image */}
                      {msg.role === 'assistant' && msg.generatedImage && (
                        <ImageDisplay
                          image={msg.generatedImage}
                          onRegenerate={(prompt) => handleSend(`/imagine ${prompt}`)}
                        />
                      )}
                      {/* Show message bubble (skip if only showing image) */}
                      {!(msg.role === 'assistant' && msg.isGeneratingImage && !msg.content) && (
                        <MessageBubble
                          role={msg.role}
                          content={msg.content}
                          messageId={msg.id}
                          isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'assistant'}
                          isWaiting={isWaiting && index === messages.length - 1 && msg.role === 'assistant'}
                          onRegenerate={
                            !isStreaming && msg.role === 'assistant' && index === messages.length - 1 && !msg.generatedImage
                              ? handleRegenerate
                              : undefined
                          }
                          onOpenInCanvas={
                            !isStreaming && msg.role === 'assistant'
                              ? (code, language) => canvas.addItem(code, undefined, 'code', language)
                              : undefined
                          }
                          onEdit={
                            !isStreaming && msg.role === 'user'
                              ? handleEditMessage
                              : undefined
                          }
                          rating={msg.rating}
                          onRate={
                            msg.role === 'assistant'
                              ? handleRateMessage
                              : undefined
                          }
                          searchResults={msg.searchResults}
                          feedback={msg.feedback}
                        />
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>

              {/* File Preview */}
              {attachedFiles.length > 0 && (
                <div className="px-4 md:px-6 bg-background">
                  <div className="max-w-3xl mx-auto">
                    <FilePreview files={attachedFiles} onRemove={handleFileRemove} compact />
                  </div>
                </div>
              )}

              {/* Input Area - Slides up */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{
                  y: hasStarted ? 0 : 100,
                  opacity: hasStarted ? 1 : 0,
                }}
                transition={{ duration: 0.6, delay: hasStarted ? 0.7 : 0, ease: "easeOut" }}
                className="p-4 md:p-6 bg-background relative z-10"
              >
                <div className="max-w-3xl mx-auto">
                  {/* Document Upload Bar - shows when documents are loaded */}
                  <div className="mb-3">
                    <DocumentUploadBar onDocumentsChange={updateDocumentStatus} />
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      disabled={isStreaming}
                    />
                    {canvas.items.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => canvas.toggleCanvas()}
                        className="text-gray-500 hover:text-white gap-2"
                      >
                        <PanelRightOpen size={16} />
                        <span className="text-xs">Canvas ({canvas.items.length})</span>
                      </Button>
                    )}
                    {hasDocuments && (
                      <span className="text-xs text-orange-400 font-medium">
                        📄 Document context active
                      </span>
                    )}
                    {isStreaming && (
                      <span className="text-xs text-gray-400 font-mono animate-pulse">
                        Generating response...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileUpload
                      onFilesSelected={handleFilesSelected}
                      onFileRemove={handleFileRemove}
                      files={attachedFiles}
                      disabled={isStreaming}
                    />
                    <VoiceInput
                      onTranscript={handleVoiceTranscript}
                      disabled={isStreaming}
                      language="si-LK"
                    />
                    <div className="flex-1">
                      <ChatInput
                        onSend={handleSend}
                        disabled={isStreaming}
                        onSlashCommand={handleSlashCommand}
                        webSearchEnabled={webSearchEnabled}
                        onToggleWebSearch={() => setWebSearchEnabled(prev => !prev)}
                        responseStyle={responseStyle}
                        onChangeResponseStyle={setResponseStyle}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelect={handleSlashCommand}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          session={currentSession}
        />

        {/* Memory Panel */}
        <MemoryPanel
          isOpen={isMemoryPanelOpen}
          onClose={() => setIsMemoryPanelOpen(false)}
        />

        {/* Workspace Panel */}
        <WorkspacePanel
          isOpen={isWorkspacePanelOpen}
          onClose={() => setIsWorkspacePanelOpen(false)}
        />

        <EvaluationPanel
          isOpen={isEvaluationPanelOpen}
          onClose={() => setIsEvaluationPanelOpen(false)}
        />

        {/* Template Panel */}
        <TemplatePanel
          isOpen={isTemplatePanelOpen}
          onClose={() => setIsTemplatePanelOpen(false)}
          onSelectTemplate={(prompt) => {
            // Insert the template prompt - user will need to complete it
            const input = document.querySelector('textarea') as HTMLTextAreaElement;
            if (input) {
              input.value = prompt;
              input.focus();
              // Trigger input event to update React state
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);
            }
          }}
        />

        {/* Canvas Panel */}
        <Canvas
          isOpen={canvas.isOpen}
          onClose={canvas.closeCanvas}
          items={canvas.items}
          activeItemId={canvas.activeItemId}
          onSelectItem={canvas.selectItem}
          onUpdateItem={canvas.updateItem}
          onDeleteItem={canvas.deleteItem}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
