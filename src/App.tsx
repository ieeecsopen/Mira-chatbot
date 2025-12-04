import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { LandingPage } from './components/LandingPage';
import { ModelSelector, MIRA_MODELS } from './components/ModelSelector';
import { Menu, Plus, Settings, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import { streamMessage } from './lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Maximum number of messages to include for context
const MAX_CONTEXT_MESSAGES = 10;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MIRA_MODELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    // Get current history before adding new message
    const currentHistory = messages
      .filter(m => m.content.length > 0)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      await streamMessage(
        'user',
        text,
        (chunk: string) => {
          setMessages(prev => {
            const lastIndex = prev.length - 1;
            if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
              return [
                ...prev.slice(0, lastIndex),
                {
                  ...prev[lastIndex],
                  content: prev[lastIndex].content + chunk
                }
              ];
            }
            return prev;
          });
        },
        () => {
          // onDone callback
          console.log('Stream completed');
        },
        (error: string) => {
          // onError callback
          console.error('Stream error:', error);
          // Update the last message with error
          setMessages(prev => {
            const lastIndex = prev.length - 1;
            if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
              return [
                ...prev.slice(0, lastIndex),
                {
                  ...prev[lastIndex],
                  content: prev[lastIndex].content || `දෝෂයක් සිදු විය: ${error}`
                }
              ];
            }
            return prev;
          });
        },
        selectedModel,
        currentHistory // Pass conversation history for multi-turn context
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [hasStarted, messages, selectedModel]);

  if (!hasStarted) {
    return (
      <LandingPage
        onStartChat={handleSend}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden font-sans selection:bg-white/20">
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <div className="hidden md:flex flex-col w-[260px] tech-border-r p-4 bg-background relative z-20">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
            <div className="font-mono font-bold text-lg tracking-tight">MIRA</div>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-gray-400 hover:text-white rounded-md w-8 h-8">
            <Settings size={18} />
          </Button>
        </div>

        <Button
          onClick={() => {
            setMessages([]);
            setHasStarted(false);
          }}
          className="flex items-center justify-start gap-3 w-full px-4 py-2 mb-6 bg-white/5 hover:bg-white/10 text-white rounded-md transition-all border border-white/10 font-medium text-sm"
        >
          <Plus size={16} />
          New Chat
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
          <div className="text-[10px] font-mono text-gray-600 mb-3 px-2 uppercase tracking-wider">Recent</div>
          {/* History items */}
          {['Project Planning', 'Code Review', 'Marketing Copy', 'React Components'].map((item, i) => (
            <Button
              key={i}
              variant="ghost"
              className="w-full justify-start text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-all truncate text-sm font-normal"
            >
              {item}
            </Button>
          ))}
        </div>

        <div className="mt-auto pt-4 tech-border-t border-white/5">
          <Button variant="ghost" className="w-full flex items-center justify-start gap-3 px-2 py-2 hover:bg-white/5 rounded-md transition-colors h-auto">
            <div className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center text-white font-mono text-xs border border-white/10">
              U
            </div>
            <div className="text-sm font-medium text-left">
              <div className="text-white">User Account</div>
              <div className="text-xs text-gray-600 font-mono">Free Plan</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-background">

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 tech-border-b bg-background sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="-ml-2 hover:bg-white/10 text-white rounded-md">
            <Menu size={20} />
          </Button>
          <div className="font-mono font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            MIRA
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMessages([]);
              setHasStarted(false);
            }}
            className="-mr-2 hover:bg-white/10 text-white rounded-md"
          >
            <Plus size={20} />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-0 scroll-smooth relative z-0">
          <div className="max-w-3xl mx-auto pt-4 md:pt-10 pb-4">
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-background relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                disabled={isStreaming}
              />
            </div>
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
