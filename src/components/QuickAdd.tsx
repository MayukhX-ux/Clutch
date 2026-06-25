import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, Calendar, Sparkles, X, Check } from 'lucide-react';

interface QuickAddProps {
  onAddTask: (content: string, dueDate?: string) => Promise<void>;
}

export default function QuickAdd({ onAddTask }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [addedTaskTitle, setAddedTaskTitle] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside of the quick add popover card
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // Only close if we clicked outside the card AND we didn't click the floating trigger button itself
        const triggerBtn = document.getElementById('quick-add-trigger-btn');
        if (triggerBtn && triggerBtn.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input automatically when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      await onAddTask(content, dueDate);
      setAddedTaskTitle(content);
      setContent('');
      setDueDate('');
      setIsOpen(false);
      setShowSuccessToast(true);

      // Auto-hide success toast after 3 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to quick add task:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        id="quick-add-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg cursor-pointer flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
          isOpen
            ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 scale-110 rotate-45'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 hover:scale-105'
        }`}
        title="Quick Add Task"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="quick-add-popover-card"
            ref={cardRef}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-22 right-6 z-40 w-80 sm:w-96 bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-[#2d2d2d] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-[#1a1a1a] border-b border-zinc-100 dark:border-[#2d2d2d]">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Quick Add Task</span>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded tracking-wide">GENERAL</span>
              </div>
              <button
                id="quick-add-close-btn"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Task Description */}
              <div className="space-y-1.5">
                <label htmlFor="quick-add-task-input" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
                  Task Title
                </label>
                <input
                  id="quick-add-task-input"
                  ref={inputRef}
                  type="text"
                  placeholder="e.g., Review PR, Walk the dog..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#252525] border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Deadline / Due Date */}
              <div className="space-y-1.5">
                <label htmlFor="quick-add-date-input" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Due Date (Optional)
                </label>
                <input
                  id="quick-add-date-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isLoading}
                  style={{ colorScheme: 'dark light' }}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#252525] border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-[#2d2d2d]">
                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Enter</span> to save
                </div>
                <button
                  id="quick-add-submit-btn"
                  type="submit"
                  disabled={isLoading || !content.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg shadow transition-colors flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Add Task</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            id="quick-add-success-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-6 right-26 z-50 flex items-center gap-2.5 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200 rounded-lg shadow-xl font-sans text-sm max-w-sm"
          >
            <div className="p-1 rounded-full bg-emerald-500 text-white">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="flex-1 truncate">
              <span className="font-semibold">Added task:</span>{' '}
              <span className="opacity-90 italic truncate block sm:inline">"{addedTaskTitle}"</span>
              <span className="block text-[10px] opacity-75 mt-0.5">Saved to "General Tasks" page</span>
            </div>
            <button
              id="quick-add-toast-close"
              onClick={() => setShowSuccessToast(false)}
              className="p-1 text-zinc-400 hover:text-white dark:hover:text-zinc-950 rounded transition-colors ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
