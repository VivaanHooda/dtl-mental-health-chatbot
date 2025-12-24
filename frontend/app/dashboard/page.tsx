'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Send, LogOut, Sparkles, User as UserIcon, Menu, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FitbitWidget from '@/components/FitbitWidget';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [chatDisabled, setChatDisabled] = useState(false); // Track if chat is disabled
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
          conversationHistory: messages.slice(-6).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show specific error from API
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
      
      // Provide more specific error messages based on the error
      let errorContent = "I apologize, but I'm having trouble responding right now.";
      
      if (error.message?.includes('API key')) {
        errorContent = "⚠️ The AI service is not properly configured. Please contact support or check the console for details.";
      } else if (error.message?.includes('rate limit')) {
        errorContent = "⚠️ I'm receiving too many requests right now. Please wait a moment and try again.";
      } else if (error.message?.includes('configured')) {
        errorContent = error.message; // Show the specific configuration error
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
    <div className="flex h-screen bg-white dark:bg-slate-900">
      {/* Sidebar for Fitbit Widget - Desktop */}
      <aside className="hidden lg:block w-80 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
        <div className="p-4">
          <FitbitWidget />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 overflow-y-auto shadow-xl">
            <div className="p-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="mb-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <FitbitWidget />
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-linear-to-br from-cyan-500 via-sky-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-medium text-slate-800 dark:text-slate-100">Mental Health Companion</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto">
              <div className="w-20 h-20 bg-linear-to-br from-cyan-500 via-sky-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-medium text-slate-800 dark:text-slate-100 mb-3">
                Hello, {user?.user_metadata?.username || 'there'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
                How can I help you today?
              </p>
              
              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(prompt)}
                    className="p-4 text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-200">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-4">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-linear-to-br from-cyan-500 via-sky-500 to-purple-500 rounded-full flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                      <UserIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-3 prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-h3:text-lg prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:my-3 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold prose-em:text-slate-700 dark:prose-em:text-slate-300 prose-code:text-cyan-600 dark:prose-code:text-cyan-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-800 prose-pre:text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-linear-to-br from-cyan-500 via-sky-500 to-purple-500 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          {chatDisabled ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-3xl px-6 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xl">🚨</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Chat Temporarily Disabled</h3>
                    <p className="text-sm text-red-800 dark:text-red-200">Please contact emergency services or a mental health professional immediately.</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-700">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    For your safety, this chat has been disabled. Please use the emergency resources provided above.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-end bg-slate-50 dark:bg-slate-800 rounded-3xl px-4 py-2 border border-slate-200 dark:border-slate-700 focus-within:border-cyan-500 dark:focus-within:border-cyan-500 transition-colors">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about mental health..."
                  className="flex-1 bg-transparent px-2 py-2 focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                AI companion powered by Gemini • Not a replacement for professional care
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}