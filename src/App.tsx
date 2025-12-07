import { useState, useRef, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput, type SlashCommand } from './components/ChatInput';
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
import { ModelComparisonPanel, type ComparisonRunState, type ComparisonResultState } from './components/ui/ModelComparisonPanel';
import { showInfo } from './lib/toast';
import { AuthModal } from './components/ui/AuthModal';
import { PluginPanel } from './components/ui/PluginPanel';
import { SettingsModal } from './components/ui/SettingsModal';
import { pluginManager, isPluginCommand } from './lib/plugins';
import { registerBuiltInPlugins } from './lib/builtInPlugins';

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
  thinkingContent?: string;
  isThinking?: boolean;
}

interface ComparisonContext {
  prompt: string;
  userMessageId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  suggestedModels: string[];
}

// Maximum number of messages to include for context
const MAX_CONTEXT_MESSAGES = 10;

// Streaming buffer for performance optimization
const STREAM_BUFFER_INTERVAL = 30; // ms between UI updates

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasStarted, setHasStarted] = useState(true);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('mira-default-model') || 'auto';
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isEvaluationPanelOpen, setIsEvaluationPanelOpen] = useState(false);

  // Progressive loading state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  const [isPluginPanelOpen, setIsPluginPanelOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  const [sharedChatId, setSharedChatId] = useState<string | null>(() => getShareIdFromUrl());
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed'>('concise');
  const [comparisonContext, setComparisonContext] = useState<ComparisonContext | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [comparisonRun, setComparisonRun] = useState<ComparisonRunState | null>(null);
  const userId = 'local-user';

  // Web search state
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => {
    return localStorage.getItem('mira-web-search') === 'true';
  });
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  // DeepThink state
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(() => {
    return localStorage.getItem('mira-deep-think') === 'true';
  });

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

      // Initial load: Get only the last 20 messages
      const initialMessages = chatStorage.getMessages(currentSession.id, 20, 0);
      setMessages(initialMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        rating: getRecord(m.id)?.rating,
        feedback: getRecord(m.id)?.feedback
      })));

      setHasMoreMessages(currentSession.messages.length > 20);
      setHasStarted(true);
    }
  }, [getRecord]);

  // Initialize plugins on mount
  useEffect(() => {
    registerBuiltInPlugins(pluginManager);
    pluginManager.initializeEnabledPlugins();
  }, []);

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

  // Smart scroll to bottom - only if streaming or new message added at the bottom
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id;

    // Check if we should scroll:
    // 1. We are streaming (always follow stream)
    // 2. The last message ID changed (new message arrived)
    // 3. We haven't loaded any messages yet (initial load)
    const shouldScroll = isStreaming || (lastMessageId !== lastMessageIdRef.current) || !lastMessageIdRef.current;

    if (shouldScroll) {
      scrollToBottom();
      lastMessageIdRef.current = lastMessageId || null;
    }
  }, [messages, isStreaming, scrollToBottom]);

  // Handle loading older messages
  const loadMoreMessages = useCallback(() => {
    if (!currentSessionId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    const scrollContainer = scrollContainerRef.current;
    const prevScrollHeight = scrollContainer?.scrollHeight || 0;

    // Fetch next batch of 20 messages
    const olderMessages = chatStorage.getMessages(currentSessionId, 20, messages.length);

    if (olderMessages.length > 0) {
      const olderMapped = olderMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        rating: getRecord(m.id)?.rating,
        feedback: getRecord(m.id)?.feedback
      }));

      setMessages(prev => [...olderMapped, ...prev]);

      // Check if there are more
      const session = chatStorage.getCurrentSession();
      if (session) {
        setHasMoreMessages(session.messages.length > messages.length + olderMessages.length);
      }

      // Maintain scroll position
      // We use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          scrollContainer.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    } else {
      setHasMoreMessages(false);
    }

    setIsLoadingMore(false);
  }, [currentSessionId, isLoadingMore, hasMoreMessages, messages.length, getRecord]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    // Trigger when close to top (e.g., 20px)
    if (scrollTop < 20 && hasMoreMessages && !isLoadingMore) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

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

  const handleSend = useCallback(async (text: string, options?: { enableWebSearch?: boolean; responseStyle?: 'concise' | 'detailed'; deepThink?: boolean }) => {
    if (!text.trim()) return;

    const autoSearch = shouldSearchWeb(text);
    const useWebSearch =
      options?.enableWebSearch !== undefined
        ? options.enableWebSearch
        : (webSearchEnabled || autoSearch);
    const style = options?.responseStyle || responseStyle;
    const useDeepThink = options?.deepThink !== undefined
      ? options.deepThink
      : deepThinkEnabled;

    if (!hasStarted) {
      setHasStarted(true);
      // Create a new session if starting fresh
      const newSessionId = chatStorage.createSession(selectedModel);
      setCurrentSessionId(newSessionId);
    }

    // Check if this is a plugin slash command
    const pluginCmd = isPluginCommand(text);
    if (pluginCmd) {
      // Try to execute as plugin command
      const result = await pluginManager.executeCommand(
        pluginCmd.command,
        pluginCmd.args,
        {
          userId,
          sessionId: currentSessionId || undefined,
          currentMessage: text,
          conversationHistory: messages
            .filter(m => m.content.length > 0)
            .slice(-MAX_CONTEXT_MESSAGES)
            .map(m => ({ role: m.role, content: m.content })),
        }
      );

      if (result) {
        // Plugin handled the command
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: text
        };
        setMessages(prev => [...prev, userMessage]);
        chatStorage.addMessage('user', text);

        // Add plugin response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.content || result.message || (result.error ? `❌ Error: ${result.error}` : 'Command executed.')
        };
        setMessages(prev => [...prev, assistantMessage]);
        chatStorage.addMessage('assistant', assistantMessage.content);
        chatStorage.saveCurrentSession();
        setChatSessions(chatStorage.getRecentSessions(20));

        // If shouldContinue is true, also send to AI
        if (result.shouldContinue) {
          // Continue with the original text processing
        } else {
          return; // Plugin fully handled the command
        }
      }
      // If no plugin handled it, continue with normal processing
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

    chatStorage.addMessage('user', text);
    const sessionAfterUser = chatStorage.getCurrentSession();
    const storedUserMessage = sessionAfterUser?.messages[sessionAfterUser.messages.length - 1];
    const userMessage: Message = {
      id: storedUserMessage?.id || Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);

    setIsWaiting(true);
    setIsStreaming(true);

    chatStorage.addMessage('assistant', '');
    const sessionAfterAssistant = chatStorage.getCurrentSession();
    const storedAssistantMessage = sessionAfterAssistant?.messages[sessionAfterAssistant.messages.length - 1];
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
        currentSessionId || undefined,
        {
          enableWebSearch: useWebSearch,
          responseStyle: style,
          deepThink: useDeepThink,
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
          },
          onThinkingChunk: (thinking) => {
            setMessages(prev => {
              const lastIndex = prev.length - 1;
              if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                return [
                  ...prev.slice(0, lastIndex),
                  {
                    ...prev[lastIndex],
                    isThinking: true,
                    thinkingContent: (prev[lastIndex].thinkingContent || '') + thinking
                  }
                ];
              }
              return prev;
            });
          },
          onThinkingDone: () => {
            // Keep thinking indicator visible for a moment before transitioning
            setTimeout(() => {
              setMessages(prev => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                  return [
                    ...prev.slice(0, lastIndex),
                    {
                      ...prev[lastIndex],
                      isThinking: false
                    }
                  ];
                }
                return prev;
              });
            }, 500); // Keep indicator visible for half a second after thinking completes
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
    setCurrentSessionId(session.id);

    // Reset pagination for new session
    const initialMessages = chatStorage.getMessages(session.id, 20, 0);
    setMessages(initialMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      rating: getRecord(m.id)?.rating,
      feedback: getRecord(m.id)?.feedback
    })));
    setHasMoreMessages(session.messages.length > 20);
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
    // Save current session before starting a new one
    if (currentSessionId && messages.length > 0) {
      chatStorage.saveCurrentSession();
    }
    
    // Clear UI state for new chat
    setMessages([]);
    setCurrentSessionId(null);
    setAttachedFiles([]);
    setHasStarted(false);
    
    // Refresh sessions list to show the saved session
    setChatSessions(chatStorage.getRecentSessions(20));
  }, [currentSessionId, messages.length]);

  // Handle clearing current chat (keeps session but clears messages)
  const handleClearChat = useCallback(() => {
    // Save current session before clearing if it has messages
    if (currentSessionId && messages.length > 0) {
      chatStorage.saveCurrentSession();
    }
    
    // Clear UI state
    setMessages([]);
    setCurrentSessionId(null);
    setAttachedFiles([]);
    setHasStarted(false);
    setHasMoreMessages(false);
    
    // Refresh sessions list
    setChatSessions(chatStorage.getRecentSessions(20));
  }, [currentSessionId, messages.length]);

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

    // Resend the last user message
    // Get history up to the last user message
    const currentHistory = messages
      .slice(0, lastUserMessageIndex)
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    setIsWaiting(true);
    setIsStreaming(true);

    try {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      streamBufferRef.current = '';
      lastUpdateRef.current = Date.now();

      await new Promise(resolve => setTimeout(resolve, 100));
      setIsWaiting(false);

      await streamMessage(
        'user',
        lastUserMessage.content,
        handleStreamChunk,
        () => {
          flushStreamBuffer();
        },
        (error: string) => {
          console.error('Stream error:', error);
          flushStreamBuffer();
        },
        selectedModel,
        currentHistory,
        currentSessionId || undefined,
        {
          responseStyle,
        }
      );
    } catch (error) {
      console.error('Error regenerating:', error);
      flushStreamBuffer();
    } finally {
      setIsStreaming(false);
      setIsWaiting(false);
    }
  }, [messages, selectedModel, handleStreamChunk, flushStreamBuffer, responseStyle]);

  // Handle editing a message and regenerating from that point
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    if (messages[messageIndex].role !== 'user') return;

    if (comparisonContext) {
      setComparisonContext(null);
      setComparisonRun(null);
    }

    const precedingMessages = messages.slice(0, messageIndex);
    const historyForReplay = precedingMessages
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    const editApplied = chatStorage.editMessageAndTruncate(messageId, newContent);
    if (!editApplied) {
      console.warn('Failed to edit stored message, continuing with in-memory state only.');
    }
    setChatSessions(chatStorage.getRecentSessions(20));

    setMessages(prev => {
      const trimmed = prev.slice(0, messageIndex + 1);
      trimmed[messageIndex] = {
        ...trimmed[messageIndex],
        content: newContent
      };
      return trimmed;
    });

    setIsWaiting(true);
    setIsStreaming(true);

    chatStorage.addMessage('assistant', '');
    const sessionAfterAssistant = chatStorage.getCurrentSession();
    const storedAssistant = sessionAfterAssistant?.messages[sessionAfterAssistant.messages.length - 1];
    const assistantMessage: Message = {
      id: storedAssistant?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'assistant',
      content: '',
      isThinking: deepThinkEnabled
    };

    setMessages(prev => [...prev, assistantMessage]);

    streamBufferRef.current = '';
    lastUpdateRef.current = Date.now();

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsWaiting(false);

      await streamMessage(
        userId,
        newContent,
        handleStreamChunk,
        () => {
          flushStreamBuffer();
          setIsStreaming(false);
        },
        (error: string) => {
          console.error('Stream error:', error);
          flushStreamBuffer();
          setIsStreaming(false);
        },
        selectedModel,
        historyForReplay,
        currentSessionId || undefined,
        {
          responseStyle,
          enableWebSearch: webSearchEnabled,
          deepThink: deepThinkEnabled,
          onThinkingChunk: (thinking) => {
            setMessages(prev => {
              const lastIndex = prev.length - 1;
              if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                return [
                  ...prev.slice(0, lastIndex),
                  {
                    ...prev[lastIndex],
                    isThinking: true,
                    thinkingContent: (prev[lastIndex].thinkingContent || '') + thinking
                  }
                ];
              }
              return prev;
            });
          },
          onThinkingDone: () => {
            setTimeout(() => {
              setMessages(prev => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                  return [
                    ...prev.slice(0, lastIndex),
                    {
                      ...prev[lastIndex],
                      isThinking: false
                    }
                  ];
                }
                return prev;
              });
            }, 500);
          }
        }
      );
    } catch (error) {
      console.error('Edit regeneration failed:', error);
      setIsWaiting(false);
      setIsStreaming(false);
    }
  }, [messages, selectedModel, handleStreamChunk, flushStreamBuffer, responseStyle, deepThinkEnabled, userId, webSearchEnabled, comparisonContext]);

  const handleOpenComparisonPanel = useCallback((assistantMessageId: string) => {
    const assistantIndex = messages.findIndex(m => m.id === assistantMessageId);
    if (assistantIndex === -1) return;

    let userIndex = -1;
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userIndex = i;
        break;
      }
    }

    if (userIndex === -1) {
      showInfo('Cannot compare this response', 'I need the user prompt that created it.');
      return;
    }

    const prompt = messages[userIndex].content;
    if (!prompt.trim()) {
      showInfo('Cannot compare empty prompts');
      return;
    }

    const history = messages
      .slice(0, userIndex)
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    const primaryModel = selectedModel;
    const fallbackModel = MIRA_MODELS.find(model => model.id !== primaryModel)?.id;
    const suggested = fallbackModel ? [primaryModel, fallbackModel] : [primaryModel];

    setComparisonContext({
      prompt,
      userMessageId: messages[userIndex].id,
      history,
      suggestedModels: suggested,
    });
    setComparisonRun(null);
  }, [messages, selectedModel]);

  const handleCloseComparisonPanel = useCallback(() => {
    setComparisonContext(null);
    setComparisonRun(null);
  }, []);

  const handleStartComparison = useCallback((modelIds: string[]) => {
    if (!comparisonContext || modelIds.length < 2) {
      showInfo('Pick two models to compare');
      return;
    }

    const uniqueModels = Array.from(new Set(modelIds));
    if (uniqueModels.length < 2) {
      showInfo('Select two different models');
      return;
    }

    const runId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const labelLookup = Object.fromEntries(MIRA_MODELS.map(model => [model.id, model.displayName]));

    const results = uniqueModels.reduce<Record<string, ComparisonResultState>>((acc, modelId) => {
      acc[modelId] = {
        modelId,
        label: labelLookup[modelId] || modelId,
        status: 'loading',
        content: ''
      };
      return acc;
    }, {});

    setComparisonRun({
      id: runId,
      prompt: comparisonContext.prompt,
      results,
    });

    const updateResult = (modelId: string, updater: (prev: ComparisonResultState) => ComparisonResultState) => {
      setComparisonRun(prev => {
        if (!prev || prev.id !== runId || !prev.results[modelId]) return prev;
        return {
          ...prev,
          results: {
            ...prev.results,
            [modelId]: updater(prev.results[modelId])
          }
        };
      });
    };

    uniqueModels.forEach(modelId => {
      const runStream = async () => {
        let aggregate = '';

        await streamMessage(
          userId,
          comparisonContext.prompt,
          (chunk: string) => {
            aggregate += chunk;
            updateResult(modelId, prev => ({
              ...prev,
              status: 'loading',
              content: aggregate
            }));
          },
          () => {
            updateResult(modelId, prev => ({
              ...prev,
              status: 'success',
              content: aggregate
            }));
          },
          (error: string) => {
            updateResult(modelId, prev => ({
              ...prev,
              status: 'error',
              error,
              content: aggregate
            }));
          },
          modelId,
          comparisonContext.history,
          currentSessionId || undefined,
          {
            responseStyle,
            enableWebSearch: webSearchEnabled,
            deepThink: deepThinkEnabled,
          }
        );
      };

      runStream().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        updateResult(modelId, prev => ({
          ...prev,
          status: 'error',
          error: message
        }));
      });
    });
  }, [comparisonContext, deepThinkEnabled, responseStyle, userId, webSearchEnabled]);

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
      <Routes>
        <Route path="*" element={
          <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-white/20 relative">
            {/* Main Chat Interface */}
            <div className="flex flex-col h-screen">
              {/* Navbar */}
              <div>
                <Navbar
                  onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  onNewChat={handleNewChat}
                  onSearchClick={() => setIsSearchOpen(true)}
                  onShareClick={() => setIsShareModalOpen(true)}
                  onMemoryClick={() => setIsMemoryPanelOpen(true)}
                  onWorkspaceClick={() => setIsWorkspacePanelOpen(true)}
                  onAnalyticsClick={() => setIsEvaluationPanelOpen(true)}
                  onPluginsClick={() => setIsPluginPanelOpen(true)}
                  onSettingsClick={() => setIsSettingsModalOpen(true)}
                  chatTitle={currentSessionTitle}
                  onSignIn={() => {
                    setAuthMode('signin');
                    setIsAuthModalOpen(true);
                  }}
                  onSignUp={() => {
                    setAuthMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                />
              </div>

              {/* Search Modal */}
              <SearchMessages
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelectSession={handleSelectSessionFromSearch}
                currentSessionId={currentSessionId || undefined}
              />

              <div className="flex flex-1 pt-16 overflow-hidden">
                {/* Sidebar */}
                <Sidebar
                  chatSessions={chatSessions}
                  currentSessionId={currentSessionId}
                  onNewChat={handleNewChat}
                  onSelectSession={handleSelectSession}
                  onDeleteSession={handleDeleteSession}
                />

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full relative bg-background">
                  {/* Messages */}
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 md:px-6 scroll-smooth relative z-0"
                  >
                    <div className="max-w-5xl mx-auto pt-4 md:pt-10 pb-4">
                      {/* Loading indicator for older messages */}
                      {isLoadingMore && (
                        <div className="flex justify-center py-4">
                          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
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
                              onCompare={
                                !isStreaming && msg.role === 'assistant'
                                  ? handleOpenComparisonPanel
                                  : undefined
                              }
                              onOpenInCanvas={
                                !isStreaming && msg.role === 'assistant'
                                  ? (code, language) => {
                                    const lang = language || 'plaintext';
                                    const isRunnable = ['html', 'javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx'].includes(lang.toLowerCase());
                                    canvas.addItem(code, undefined, 'code', lang, isRunnable ? 'preview' : 'code');
                                  }
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
                              thinkingContent={msg.thinkingContent}
                              isThinking={msg.isThinking}
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
                      <div className="max-w-5xl mx-auto">
                        <FilePreview files={attachedFiles} onRemove={handleFileRemove} compact />
                      </div>
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="p-4 md:p-6 bg-background relative z-10">
                    <div className="max-w-5xl mx-auto">
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

                      {/* Hidden FileUpload to support ChatInput's file picker */}
                      <div className="hidden">
                        <FileUpload
                          onFilesSelected={handleFilesSelected}
                          onFileRemove={handleFileRemove}
                          files={attachedFiles}
                          disabled={isStreaming}
                        />
                      </div>

                      <ChatInput
                        onSend={handleSend}
                        disabled={isStreaming}
                        onSlashCommand={handleSlashCommand}
                        webSearchEnabled={webSearchEnabled}
                        onToggleWebSearch={() => setWebSearchEnabled(prev => !prev)}
                        deepThinkEnabled={deepThinkEnabled}
                        onToggleDeepThink={() => setDeepThinkEnabled(prev => !prev)}
                        responseStyle={responseStyle}
                        onChangeResponseStyle={setResponseStyle}
                        attachedFiles={attachedFiles}
                        onFileRemove={handleFileRemove}
                        onVoiceTranscript={handleVoiceTranscript}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ModelComparisonPanel
              isOpen={!!comparisonContext}
              prompt={comparisonContext?.prompt || ''}
              suggestedModels={comparisonContext?.suggestedModels || [selectedModel]}
              availableModels={MIRA_MODELS}
              onClose={handleCloseComparisonPanel}
              onCompare={handleStartComparison}
              comparisonRun={comparisonRun}
            />

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

            {/* Plugin Panel */}
            <PluginPanel
              isOpen={isPluginPanelOpen}
              onClose={() => setIsPluginPanelOpen(false)}
            />

            {/* Settings Modal */}
            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              currentModel={selectedModel}
              onModelChange={setSelectedModel}
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
              viewMode={canvas.viewMode}
              onViewModeChange={canvas.setViewMode}
            />

            {/* Auth Modal */}
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              initialMode={authMode}
            />
          </div>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
