import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Plus, Lightbulb, BookOpen, PenTool, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Page, Block } from '../types';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: Page | null;
  onImportBlocks: (blocks: Block[]) => void;
  onImportAsNewPage: (title: string, blocks: Block[]) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  blocks?: Block[];
}

export default function AIPanel({
  isOpen,
  onClose,
  currentPage,
  onImportBlocks,
  onImportAsNewPage,
}: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am Clutch AI, your high-performance workspace assistant. I can draft professional documentation, brainstorm ideas, analyze your current document, or generate structured templates. What are we building today?',
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  // Handle prompt submission
  const handleSubmitPrompt = async (promptText: string, actionType: string = 'chat') => {
    if (!promptText.trim()) return;

    // Add user message
    const userMsgId = Math.random().toString(36).substring(7);
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: promptText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          blockContent: currentPage?.blocks.map(b => b.content).join('\n') || '',
          pageTitle: currentPage?.title || '',
          action: actionType,
        }),
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const data = await response.json();
      
      const assistantMsgId = Math.random().toString(36).substring(7);
      const assistantMessage: Message = {
        id: assistantMsgId,
        sender: 'assistant',
        text: data.text,
        timestamp: Date.now(),
        blocks: data.blocks, // If structured blocks are returned (for draft-doc)
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const assistantMsgId = Math.random().toString(36).substring(7);
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: "I'm sorry, I encountered an issue connecting to my core processing nodes. Please ensure your GEMINI_API_KEY is configured correctly in the AI Studio secrets.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const PRESETS = [
    {
      title: 'Draft Product Launch Plan',
      prompt: 'Create a comprehensive product launch plan for a new collaborative app called Clutch',
      action: 'draft-doc',
      icon: PenTool,
      color: 'text-[#37352f] dark:text-[#ebebea] bg-[#fbfbfa] dark:bg-[#202020] border-[#e9e9e7] dark:border-[#2c2c2c]',
    },
    {
      title: 'Brainstorm Startup Ideas',
      prompt: 'Give me 5 highly creative startup ideas in the clean-tech space with actionable next steps',
      action: 'brainstorm',
      icon: Lightbulb,
      color: 'text-[#37352f] dark:text-[#ebebea] bg-[#fbfbfa] dark:bg-[#202020] border-[#e9e9e7] dark:border-[#2c2c2c]',
    },
    {
      title: 'Draft Project Kickoff Doc',
      prompt: 'Draft a professional engineering team project kickoff document structure',
      action: 'draft-doc',
      icon: BookOpen,
      color: 'text-[#37352f] dark:text-[#ebebea] bg-[#fbfbfa] dark:bg-[#202020] border-[#e9e9e7] dark:border-[#2c2c2c]',
    },
  ];

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-white/10 bg-white/30 dark:bg-black/25 backdrop-blur-md flex flex-col h-full animate-slide-in relative z-30 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-200/85 dark:border-white/10 bg-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-lg text-indigo-600 dark:text-indigo-450">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#37352f] dark:text-[#ebebea]">Clutch AI Assistant</h2>
            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 leading-none mt-0.5">Powered by Gemini 2.5</p>
          </div>
        </div>
        <button
          id="ai-panel-close"
          onClick={onClose}
          className="p-1 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              {/* Sender name / avatar */}
              <div className="flex items-center gap-1 mb-1 px-1 text-[9px] text-[#91918e] font-semibold uppercase tracking-wider">
                {!isUser && <Sparkles className="w-2.5 h-2.5 text-[#37352f] dark:text-[#ebebea]" />}
                <span>{isUser ? 'You' : 'Clutch AI'}</span>
              </div>

              {/* Message bubble */}
              <div
                className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-zinc-100/80 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 text-[#37352f] dark:text-[#ebebea] rounded-tr-none'
                    : 'glass-panel text-[#37352f] dark:text-[#ebebea] rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Render blocks importing interface if structured response is returned */}
                {msg.blocks && msg.blocks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/10 space-y-2">
                    <div className="text-[10px] font-bold text-[#91918e] flex items-center gap-1 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#37352f] dark:text-[#ebebea]" />
                      <span>Structured Template Generated</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        id={`ai-import-append-${msg.id}`}
                        onClick={() => onImportBlocks(msg.blocks!)}
                        className="w-full py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold rounded-lg transition-colors border border-transparent flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert into current page</span>
                      </button>
                      <button
                        id={`ai-import-newpage-${msg.id}`}
                        onClick={() => onImportAsNewPage('Clutch AI Draft', msg.blocks!)}
                        className="w-full py-1.5 px-3 bg-zinc-100/50 hover:bg-zinc-200/50 dark:bg-white/5 dark:hover:bg-white/10 text-[#37352f] dark:text-[#ebebea] text-[11px] font-bold rounded-lg transition-colors border border-zinc-200 dark:border-white/10 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create as a new page</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading shimmer */}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="flex items-center gap-1 mb-1 px-1 text-[10px] text-[#91918e] font-bold uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-[#37352f] dark:text-[#ebebea] animate-spin" />
              <span>Clutch AI is thinking...</span>
            </div>
            <div className="max-w-[75%] rounded-xl px-4 py-3 glass-panel rounded-tl-none flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#37352f] dark:bg-[#ebebea] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-[#37352f] dark:bg-[#ebebea] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-[#37352f] dark:bg-[#ebebea] rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {/* Suggestion presets when chat history is short */}
        {messages.length === 1 && !isLoading && (
          <div className="pt-4 space-y-2">
            <div className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider px-1">
              Suggestions & Commands
            </div>
            <div className="space-y-1.5">
              {PRESETS.map((preset, index) => {
                const IconComp = preset.icon;
                return (
                  <button
                    key={index}
                    id={`ai-preset-${index}`}
                    onClick={() => handleSubmitPrompt(preset.prompt, preset.action)}
                    className="w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all glass-panel hover:bg-white/60 dark:hover:bg-white/5 hover:scale-[1.01] hover:shadow-md cursor-pointer"
                  >
                    <IconComp className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                    <div>
                      <div className="text-[11px] font-bold leading-snug text-[#37352f] dark:text-[#ebebea]">{preset.title}</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{preset.prompt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        id="ai-panel-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitPrompt(inputPrompt, 'chat');
        }}
        className="p-3 border-t border-zinc-200/80 dark:border-white/10 bg-transparent flex gap-2 items-center"
      >
        <input
          id="ai-panel-input"
          type="text"
          placeholder="Ask Clutch AI..."
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#37352f] dark:text-[#ebebea] placeholder-[#91918e] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
        />
        <button
          id="ai-panel-submit"
          type="submit"
          disabled={isLoading || !inputPrompt.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-zinc-100 dark:disabled:bg-white/5 disabled:text-[#91918e] text-white rounded-lg transition-all shadow-sm shrink-0 flex items-center justify-center cursor-pointer active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
