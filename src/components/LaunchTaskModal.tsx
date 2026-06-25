import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, ClipboardList, Tag, AlertTriangle, Check, Mail, Bell, Loader2 } from 'lucide-react';
import { tasksService } from '../lib/tasksService';
import { Task } from '../types';

interface LaunchTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LaunchTaskModal({ isOpen, onClose }: LaunchTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState<Task['category']>('work');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Google Workspace Integration States
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [workspaceMessage, setWorkspaceMessage] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile email and reset on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPriority('medium');
      setCategory('work');
      setShowSuccess(false);
      setSyncCalendar(true);
      setSendNotification(true);
      setWorkspaceMessage('');
      
      // Fetch profile
      fetch('/api/user/profile')
        .then((r) => r.json())
        .then((data) => {
          if (data.email) {
            setRecipientEmail(data.email);
          }
        })
        .catch((err) => console.error('Failed to fetch user email', err));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setWorkspaceMessage('');

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: title.trim(),
      status: 'todo',
      priority,
      category,
      date,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save task to Firestore via central tasksService (handles local cache and server API proxy)
    await tasksService.saveTask(newTask);

    // 3. Sync to Google Calendar & Gmail via Backend API proxy
    let syncMsg = '';
    if (syncCalendar || sendNotification) {
      try {
        const syncResponse = await fetch('/api/tasks/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: newTask,
            syncCalendar,
            sendNotification,
            recipientEmail: recipientEmail.trim(),
          }),
        });

        const syncData = await syncResponse.json();
        if (syncResponse.ok) {
          const calStatus = syncCalendar ? (syncData.calendarResult?.success ? '📅 Calendar synced' : '⚠️ Calendar sync failed') : '';
          const mailStatus = sendNotification ? (syncData.gmailResult?.success ? '📧 Email notification sent' : '⚠️ Email send failed') : '';
          syncMsg = [calStatus, mailStatus].filter(Boolean).join(' and ');
        } else {
          syncMsg = `⚠️ ${syncData.error || 'Workspace sync failed'}`;
        }
      } catch (err) {
        console.error('Workspace sync error:', err);
        syncMsg = '⚠️ Connection error syncing with Google Workspace';
      }
    }

    setWorkspaceMessage(syncMsg);
    setIsSubmitting(false);
    setShowSuccess(true);

    // Auto-close after showing success
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[8px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <motion.div
            id="launch-task-modal-container"
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="glass-panel-heavy w-full max-w-md rounded-2xl shadow-2xl overflow-hidden font-sans"
          >
            {/* Success state */}
            {showSuccess ? (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#37352f] dark:text-[#ebebea]">Task Launched!</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 mb-3">
                    "{title.trim()}" has been successfully added to your task dashboard.
                  </p>
                  {workspaceMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900/40 rounded-lg text-[11px] font-medium inline-flex items-center gap-2 max-w-sm mt-2 text-left"
                    >
                      <span className="shrink-0 text-xs">⚡</span>
                      <span>{workspaceMessage}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-white/10 bg-transparent">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-[#37352f] dark:text-[#ebebea]">Launch New Task</span>
                  </div>
                  <button
                    id="launch-task-close-btn"
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-md text-[#787774] dark:text-[#9b9a97] hover:bg-zinc-100 dark:hover:bg-[#2f2f2f] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="p-5 space-y-4">
                  {/* Task title input */}
                  <div className="space-y-1.5">
                    <label htmlFor="modal-task-title" className="text-[11px] font-bold text-[#91918e] uppercase tracking-wider">
                      Objective Title
                    </label>
                    <input
                      id="modal-task-title"
                      ref={inputRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What is the task/objective?"
                      className="w-full px-3 py-2 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-sm text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                      maxLength={120}
                      required
                    />
                  </div>

                  {/* Priority and Category side-by-side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="modal-task-priority" className="text-[11px] font-bold text-[#91918e] uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Priority
                      </label>
                      <select
                        id="modal-task-priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Task['priority'])}
                        className="w-full px-2.5 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="modal-task-category" className="text-[11px] font-bold text-[#91918e] uppercase tracking-wider flex items-center gap-1">
                        <Tag className="w-3 h-3 text-sky-500" />
                        Category
                      </label>
                      <select
                        id="modal-task-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Task['category'])}
                        className="w-full px-2.5 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors capitalize"
                      >
                        <option value="work">work</option>
                        <option value="personal">personal</option>
                        <option value="health">health</option>
                        <option value="finance">finance</option>
                        <option value="learning">learning</option>
                        <option value="other">other</option>
                      </select>
                    </div>
                  </div>

                  {/* Due date input */}
                  <div className="space-y-1.5">
                    <label htmlFor="modal-task-date" className="text-[11px] font-bold text-[#91918e] uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      Target Date
                    </label>
                    <input
                      id="modal-task-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Google Workspace Integration options */}
                  <div className="border-t border-zinc-100 dark:border-[#2c2c2c] pt-4 space-y-3.5">
                    <span className="text-[10px] font-extrabold text-[#787774] dark:text-[#91918e] uppercase tracking-wider block">
                      Google Workspace Integration
                    </span>
                    
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={syncCalendar}
                          onChange={(e) => setSyncCalendar(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-zinc-300 dark:border-white/10 focus:ring-emerald-500 bg-white/50 dark:bg-black/25"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#37352f] dark:text-[#ebebea] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            Add to Google Calendar
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            Creates an all-day event for the target date
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={sendNotification}
                          onChange={(e) => setSendNotification(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-zinc-300 dark:border-white/10 focus:ring-emerald-500 bg-white/50 dark:bg-black/25"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#37352f] dark:text-[#ebebea] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-sky-500" />
                            Send Email Notification
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            Receive a beautifully formatted confirmation email
                          </span>
                        </div>
                      </label>
                    </div>

                    <AnimatePresence>
                      {sendNotification && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-1.5 pl-7 overflow-hidden"
                        >
                          <label htmlFor="modal-task-email" className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider flex items-center gap-1">
                            <Bell className="w-3 h-3 text-amber-500" />
                            Notification Recipient Email
                          </label>
                          <input
                            id="modal-task-email"
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="your-email@gmail.com"
                            className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                            required={sendNotification}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="px-5 py-3 border-t border-zinc-200/80 dark:border-white/10 bg-transparent flex justify-end gap-2">
                  <button
                    id="launch-task-cancel"
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-xs font-semibold text-[#5f5e5b] dark:text-[#9b9a97] rounded-lg transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    id="launch-task-submit"
                    type="submit"
                    disabled={isSubmitting || !title.trim() || (sendNotification && !recipientEmail.trim())}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      'Launch Task'
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
