import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { LandingPage } from './components/LandingPage';
import { Menu, Plus, Settings, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import { streamMessage } from './lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      let assistantMessage: Message = {
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
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  if (!hasStarted) {
    return <LandingPage onStartChat={handleSend} />;
  }

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden font-sans selection:bg-orange-500/30">
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <div className="hidden md:flex flex-col w-[280px] border-r border-white/5 p-4 bg-[#09090b] relative z-20">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" strokeWidth={1.5} />
            <div className="font-bold text-xl tracking-tight">MIRA</div>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-white/5 text-gray-400 hover:text-white rounded-full">
            <Settings size={20} />
          </Button>
        </div>

        <Button
          onClick={() => {
            setMessages([]);
            setHasStarted(false);
          }}
          className="flex items-center justify-start gap-3 w-full px-4 py-6 mb-6 bg-orange-600/90 hover:bg-orange-600 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:shadow-[0_0_25px_rgba(234,88,12,0.4)] font-medium text-base"
        >
          <Plus size={20} />
          New Chat
        </Button>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          <div className="text-xs font-medium text-gray-500 mb-3 px-2 uppercase tracking-wider">Recent</div>
          {/* History items */}
          {['Project Planning', 'Code Review', 'Marketing Copy', 'React Components'].map((item, i) => (
            <Button
              key={i}
              variant="ghost"
              className="w-full justify-start text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all truncate text-sm font-normal"
            >
              {item}
            </Button>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <Button variant="ghost" className="w-full flex items-center justify-start gap-3 px-2 py-3 hover:bg-white/5 rounded-xl transition-colors h-auto">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs">
              U
            </div>
            <div className="text-sm font-medium text-left">
              <div className="text-white">User Account</div>
              <div className="text-xs text-gray-500">Free Plan</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-background">
        {/* Subtle Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none opacity-20" />

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="-ml-2 hover:bg-white/5 text-white">
            <Menu size={20} />
          </Button>
          <div className="font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            MIRA
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMessages([]);
              setHasStarted(false);
            }}
            className="-mr-2 hover:bg-white/5 text-white"
          >
            <Plus size={20} />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative z-0">
          <div className="max-w-4xl mx-auto pt-4 md:pt-10 pb-4">
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
        <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent relative z-10">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}

export default App;
