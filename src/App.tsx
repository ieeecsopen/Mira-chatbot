import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { Menu, Plus, Settings, User } from 'lucide-react';
import { cn } from './lib/utils';
import { streamMessage } from './lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'ආයුබෝවන්! මම මීරා. අද ඔබට මට කෙසේ උදව් කළ හැකිද? 🙏'
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSend = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const responseId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: responseId, role: 'assistant', content: '' }]);

    const userId = "user123";

    try {
      await streamMessage(
        userId,
        text,
        (chunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === responseId ? { ...msg, content: msg.content + chunk } : msg
          ));
        },
        () => {
          setIsStreaming(false);
        },
        (error) => {
          console.error("Streaming error:", error);
          setMessages(prev => prev.map(msg =>
            msg.id === responseId ? { ...msg, content: msg.content + "\n\n[Error: Something went wrong. Please try again.]" } : msg
          ));
          setIsStreaming(false);
        }
      );
    } catch (error) {
      console.error("Request error:", error);
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <div className="hidden md:flex flex-col w-[260px] border-r border-border p-4 bg-black">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="font-bold text-xl tracking-tighter">MIRA</div>
          <button className="p-2 hover:bg-muted rounded-md transition-colors">
            <Settings size={20} className="text-muted-foreground" />
          </button>
        </div>

        <button className="flex items-center gap-3 w-full px-3 py-2 mb-4 bg-white text-black rounded-md hover:bg-gray-200 transition-colors font-medium text-sm">
          <Plus size={18} />
          නව සංවාදය
        </button>

        <div className="flex-1 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-3 px-2">මෑත සංවාද</div>
          {/* History items would go here */}
          <div className="px-2 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md cursor-pointer truncate">
            ව්‍යාපෘති සැලසුම්
          </div>
          <div className="px-2 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md cursor-pointer truncate">
            කේත සමාලෝචනය
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 hover:bg-muted rounded-md cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="text-sm font-medium">පරිශීලකයා</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <button className="p-2 -ml-2 hover:bg-muted rounded-md">
            <Menu size={20} />
          </button>
          <div className="font-bold">MIRA</div>
          <button className="p-2 -mr-2 hover:bg-muted rounded-md">
            <Plus size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
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
        <div className="p-4 md:p-6 bg-background/80 backdrop-blur-sm">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}

export default App;
