'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Send, LogOut, Sparkles, User as UserIcon, Menu, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FitbitWidget from '@/components/FitbitWidget';
import EmergencyContactWidget from '@/components/EmergencyContactWidget';
import ThemeToggle from '@/components/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

function DashboardContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Check for Fitbit connection status
    const fitbitConnected = searchParams.get('fitbit_connected');
    const fitbitError = searchParams.get('fitbit_error');

    if (fitbitConnected === 'true') {
      const successMessage: Message = {
        id: Date.now().toString(),
        content: "Great! Your Fitbit has been connected successfully. I can now provide better insights based on your health data.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([successMessage]);
    } else if (fitbitError) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `There was an issue connecting your Fitbit: ${fitbitError}. Please try again or contact support if the problem persists.`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([errorMessage]);
    }
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || chatDisabled) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the chat API with RAG integration
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationHistory: messages.slice(-2).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to get response';
        console.error('API Error:', errorMsg);
        throw new Error(errorMsg);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Check if chat should be disabled due to severe crisis
      if (data.chatDisabled) {
        setChatDisabled(true);
        console.log('🚨 CHAT DISABLED: Severe crisis detected');
      }
      
      // Log if RAG context was used
      if (data.contextUsed && data.sources?.length > 0) {
        console.log('📚 Used context from:', data.sources.map((s: any) => s.filename).join(', '));
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorContent = "I apologize, but I'm having trouble responding right now.";
      
      if (error.message?.includes('API key')) {
        errorContent = "⚠️ The AI service is not properly configured. Please contact support or check the console for details.";
      } else if (error.message?.includes('rate limit')) {
        errorContent = "⚠️ I'm receiving too many requests right now. Please wait a moment and try again.";
      } else if (error.message?.includes('configured')) {
        errorContent = error.message;
      } else {
        errorContent += " Please try again in a moment.";
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const suggestedPrompts = [
    "I'm feeling stressed about exams",
    "Help me with anxiety",
    "I need someone to talk to",
    "Tips for better sleep"
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for Widgets - Desktop */}
      <aside className="hidden lg:flex w-80 border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Your Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Health & Support</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <FitbitWidget />
          <EmergencyContactWidget />
        </div>
      </aside>

      {/* Mobile Sidebar - Slide-out */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 glass shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 space-y-4 h-full overflow-y-auto">
              <button
                onClick={() => setSidebarOpen(false)}
                className="mb-4 p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <FitbitWidget />
              <EmergencyContactWidget />
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Header - Glassmorphic */}
        <header className="glass border-b border-border/50 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-linear-to-br from-primary via-secondary to-accent",
              "shadow-lg shadow-primary/25"
            )}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Mental Health Compass</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm",
                  "hover:bg-muted rounded-xl transition-colors"
                )}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto">
              <div className={cn(
                "w-24 h-24 rounded-3xl flex items-center justify-center mb-8",
                "bg-linear-to-br from-primary via-secondary to-accent",
                "shadow-xl shadow-primary/25"
              )}>
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight mb-3">
                Hello, {user?.user_metadata?.username || 'there'}
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-12">
                I'm here to support your mental health journey
              </p>
              
              {/* Suggested Prompts - Bento Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(prompt)}
                    className={cn(
                      "group p-6 text-left glass",
                      "border-2 border-border hover:border-primary/50",
                      "rounded-2xl transition-all duration-300",
                      "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
                    )}
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Avatar */}
                  {message.role === 'assistant' && (
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                      "bg-linear-to-br from-primary via-secondary to-accent",
                      "shadow-lg shadow-primary/25"
                    )}>
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="w-10 h-10 glass rounded-2xl flex items-center justify-center shrink-0 border-2 border-border">
                      <UserIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "p-6 rounded-3xl",
                      message.role === 'user' 
                        ? "glass border-2 border-border ml-8" 
                        : ""
                    )}>
                      <div className={cn(
                        "prose prose-slate dark:prose-invert max-w-none",
                        "prose-p:leading-relaxed prose-p:text-[15px]",
                        "prose-headings:font-semibold prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3",
                        "prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-li:text-[15px]",
                        "prose-strong:text-foreground prose-strong:font-semibold",
                        "prose-blockquote:border-l-4 prose-blockquote:border-primary",
                        "prose-blockquote:glass prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:my-4",
                        "prose-code:text-primary prose-code:bg-muted",
                        "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm",
                        "prose-pre:glass prose-pre:border-2 prose-pre:border-border"
                      )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 ml-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                    "bg-linear-to-br from-primary via-secondary to-accent",
                    "shadow-lg shadow-primary/25"
                  )}>
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="glass rounded-3xl px-6 py-5 inline-block border-2 border-border">
                      <div className="flex gap-1.5 typing-indicator">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Floating Premium Design */}
        <div className="p-4 border-t border-border/50">
          {chatDisabled ? (
            <div className="max-w-3xl mx-auto">
              <div className={cn(
                "glass border-2 border-red-500 rounded-3xl p-6",
                "bg-linear-to-br from-red-500/10 to-orange-500/10"
              )}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shrink-0">
                    <span className="text-white text-2xl">🚨</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">Chat Temporarily Disabled</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please contact emergency services or a mental health professional immediately.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For your safety, this chat has been disabled. Please use the emergency resources provided.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
              <div className={cn(
                "flex gap-3 items-center glass rounded-3xl px-6 py-4",
                "border-2 border-border focus-within:border-primary",
                "transition-all duration-300 shadow-lg",
                "focus-within:shadow-xl focus-within:shadow-primary/10"
              )}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="flex-1 bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-300",
                    "bg-linear-to-r from-primary to-secondary",
                    "text-white shadow-lg shadow-primary/25",
                    "hover:shadow-xl hover:shadow-primary/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "disabled:hover:shadow-lg"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Powered by Gemini AI • Your conversations are private and secure
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background aurora-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center",
            "bg-linear-to-br from-primary via-secondary to-accent",
            "shadow-xl shadow-primary/25 animate-pulse"
          )}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}