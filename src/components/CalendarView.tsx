import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Briefcase,
  User,
  HeartPulse,
  DollarSign,
  GraduationCap,
  Tag,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  ExternalLink,
  Filter,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import { Page, Block, Task } from '../types';
import { tasksService } from '../lib/tasksService';

interface CalendarViewProps {
  pages: Page[];
  onUpdatePage: (updatedPage: Page) => Promise<void>;
  onSelectPage: (id: string | null) => void;
  onLaunchTask?: () => void;
}

interface UnifiedTask {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed' | 'backlog';
  category?: 'work' | 'personal' | 'health' | 'finance' | 'learning' | 'other';
  isPageBlock: boolean;
  pageId?: string;
  pageTitle?: string;
  pageIcon?: string | null;
  blockType?: string;
}

export default function CalendarView({
  pages,
  onUpdatePage,
  onSelectPage,
  onLaunchTask
}: CalendarViewProps) {
  // Date states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Tasks state (from Firebase tasks collection)
  const [standaloneTasks, setStandaloneTasks] = useState<Task[]>([]);
  
  // UI filter states
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'blocks' | 'standalone'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline task creation state per day
  const [inlineAddingDay, setInlineAddingDay] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [inlineCategory, setInlineCategory] = useState<Task['category']>('work');

  // Task details modal state
  const [editingTask, setEditingTask] = useState<UnifiedTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editCategory, setEditCategory] = useState<Task['category']>('work');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<Task['status']>('todo');

  // 1. Subscribe to Firestore standalone tasks
  useEffect(() => {
    let active = true;
    tasksService.getTasks().then((fetched) => {
      if (active) {
        setStandaloneTasks(fetched);
      }
    }).catch((err) => {
      console.error('Calendar failed to load tasks from tasksService', err);
    });
    return () => {
      active = false;
    };
  }, []);

  // 2. Derive start of current week (Monday)
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when Day is Sunday
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);

  // Generate the 7 days of the week starting from Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const formatDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getWeekRangeLabel = (): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
      return `${startOfWeek.toLocaleDateString('en-US', options)}, ${startOfWeek.getFullYear()} – ${endOfWeek.toLocaleDateString('en-US', options)}, ${endOfWeek.getFullYear()}`;
    }
    return `${startOfWeek.toLocaleDateString('en-US', options)} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Navigations
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  // 3. Gather unified task objects from both Page blocks and standalone tasks
  const getUnifiedTasks = (): UnifiedTask[] => {
    const list: UnifiedTask[] = [];

    // Standalone tasks
    standaloneTasks.forEach((t) => {
      list.push({
        id: t.id,
        title: t.title,
        date: t.date,
        priority: t.priority,
        status: t.status,
        category: t.category,
        isPageBlock: false
      });
    });

    // Page block tasks with due date
    pages.filter(p => !p.isTrash).forEach((page) => {
      page.blocks.forEach((block) => {
        if (block.properties?.dueDate) {
          list.push({
            id: block.id,
            title: block.content || 'Untitled Block Task',
            date: block.properties.dueDate,
            priority: block.properties.priority || 'medium',
            status: block.properties.checked ? 'completed' : 'todo',
            isPageBlock: true,
            pageId: page.id,
            pageTitle: page.title,
            pageIcon: page.icon,
            blockType: block.type
          });
        }
      });
    });

    return list;
  };

  const allUnifiedTasks = getUnifiedTasks();

  // Apply filters
  const filteredTasks = allUnifiedTasks.filter((t) => {
    // Priority filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

    // Source filter
    if (sourceFilter === 'blocks' && !t.isPageBlock) return false;
    if (sourceFilter === 'standalone' && t.isPageBlock) return false;

    // Status filter
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    if (statusFilter === 'pending' && t.status === 'completed') return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(query);
      const matchPage = t.pageTitle?.toLowerCase().includes(query) || false;
      if (!matchTitle && !matchPage) return false;
    }

    return true;
  });

  // Toggle task/block completion
  const handleToggleCompletion = async (task: UnifiedTask) => {
    if (task.isPageBlock) {
      // Find page containing this block
      const targetPage = pages.find((p) => p.id === task.pageId);
      if (targetPage) {
        const updatedBlocks = targetPage.blocks.map((b) => {
          if (b.id === task.id) {
            return {
              ...b,
              properties: {
                ...b.properties,
                checked: !b.properties?.checked
              }
            };
          }
          return b;
        });

        await onUpdatePage({
          ...targetPage,
          blocks: updatedBlocks,
          updatedAt: Date.now()
        });
      }
    } else {
      // Update Firestore standalone task doc
      const nextStatus: Task['status'] = task.status === 'completed' ? 'todo' : 'completed';
      const existingTask = standaloneTasks.find(st => st.id === task.id);
      if (existingTask) {
        const updated = {
          ...existingTask,
          status: nextStatus,
          updatedAt: Date.now()
        };
        setStandaloneTasks(prev => prev.map(st => st.id === task.id ? updated : st));
        await tasksService.saveTask(updated);
      }
    }
  };

  // Shift task date by +/- 1 day
  const handleShiftDate = async (task: UnifiedTask, daysOffset: number) => {
    const currentTaskDate = new Date(task.date);
    currentTaskDate.setDate(currentTaskDate.getDate() + daysOffset);
    const nextDateStr = formatDateString(currentTaskDate);

    if (task.isPageBlock) {
      const targetPage = pages.find((p) => p.id === task.pageId);
      if (targetPage) {
        const updatedBlocks = targetPage.blocks.map((b) => {
          if (b.id === task.id) {
            return {
              ...b,
              properties: {
                ...b.properties,
                dueDate: nextDateStr
              }
            };
          }
          return b;
        });

        await onUpdatePage({
          ...targetPage,
          blocks: updatedBlocks,
          updatedAt: Date.now()
        });
      }
    } else {
      const existingTask = standaloneTasks.find(st => st.id === task.id);
      if (existingTask) {
        const updated = {
          ...existingTask,
          date: nextDateStr,
          updatedAt: Date.now()
        };
        setStandaloneTasks(prev => prev.map(st => st.id === task.id ? updated : st));
        await tasksService.saveTask(updated);
      }
    }
  };

  // Delete standalone task / Clear page block due date
  const handleDeleteTask = async (task: UnifiedTask) => {
    if (task.isPageBlock) {
      // Instead of deleting the actual text block, we just remove the scheduled properties
      const targetPage = pages.find((p) => p.id === task.pageId);
      if (targetPage) {
        const updatedBlocks = targetPage.blocks.map((b) => {
          if (b.id === task.id) {
            const nextProps = { ...b.properties };
            delete nextProps.dueDate;
            delete nextProps.priority;
            return {
              ...b,
              properties: nextProps
            };
          }
          return b;
        });

        await onUpdatePage({
          ...targetPage,
          blocks: updatedBlocks,
          updatedAt: Date.now()
        });
      }
    } else {
      // Permanent Firestore delete
      setStandaloneTasks(prev => prev.filter(st => st.id !== task.id));
      await tasksService.deleteTask(task.id);
    }

    if (editingTask?.id === task.id) {
      setEditingTask(null);
    }
  };

  // Inline add task
  const handleInlineAdd = async (dateStr: string) => {
    if (!inlineTitle.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: inlineTitle.trim(),
      status: 'todo',
      priority: inlinePriority,
      category: inlineCategory,
      date: dateStr,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      setStandaloneTasks(prev => [newTask, ...prev]);
      await tasksService.saveTask(newTask);
      setInlineTitle('');
      setInlineAddingDay(null);
    } catch (err) {
      console.error('Failed to create inline task', err);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (task: UnifiedTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditCategory(task.category || 'work');
    setEditDate(task.date);
    setEditStatus(task.status);
  };

  // Save Edit Dialog changes
  const handleSaveEdit = async () => {
    if (!editingTask || !editTitle.trim() || !editDate) return;

    if (editingTask.isPageBlock) {
      const targetPage = pages.find((p) => p.id === editingTask.pageId);
      if (targetPage) {
        const updatedBlocks = targetPage.blocks.map((b) => {
          if (b.id === editingTask.id) {
            return {
              ...b,
              content: editTitle.trim(),
              properties: {
                ...b.properties,
                dueDate: editDate,
                priority: editPriority,
                checked: editStatus === 'completed'
              }
            };
          }
          return b;
        });

        await onUpdatePage({
          ...targetPage,
          blocks: updatedBlocks,
          updatedAt: Date.now()
        });
      }
    } else {
      const existing = standaloneTasks.find(st => st.id === editingTask.id);
      if (existing) {
        const updated = {
          ...existing,
          title: editTitle.trim(),
          priority: editPriority,
          category: editCategory,
          date: editDate,
          status: editStatus,
          updatedAt: Date.now()
        };
        setStandaloneTasks(prev => prev.map(st => st.id === editingTask.id ? updated : st));
        await tasksService.saveTask(updated);
      }
    }

    setEditingTask(null);
  };

  // Category Icons Helper
  const getCategoryIcon = (cat?: Task['category']) => {
    switch (cat) {
      case 'work': return <Briefcase className="w-3 h-3 text-[#787774] dark:text-[#9b9a97]" />;
      case 'personal': return <User className="w-3 h-3 text-[#787774] dark:text-[#9b9a97]" />;
      case 'health': return <HeartPulse className="w-3 h-3 text-[#787774] dark:text-[#9b9a97]" />;
      case 'finance': return <DollarSign className="w-3 h-3 text-[#787774] dark:text-[#9b9a97]" />;
      case 'learning': return <GraduationCap className="w-3 h-3 text-[#787774] dark:text-[#9b9a97]" />;
      default: return <Tag className="w-3 h-3 text-[#787774] dark:text-[#9b9a97]" />;
    }
  };

  const getPriorityBadgeClass = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30';
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      default:
        return 'bg-zinc-50 dark:bg-zinc-800/30 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/50';
    }
  };

  // Check if dates are today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Calendar Sub-Header */}
      <div className="px-3 sm:px-6 lg:px-8 py-4 border-b border-zinc-200 dark:border-white/8 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white/40 dark:bg-[#0c0c10]/20 backdrop-blur-md">
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/60 dark:bg-white/5 p-1 border border-zinc-200 dark:border-white/10 rounded-lg shadow-sm shrink-0 backdrop-blur-xs">
            <button
              onClick={handlePrevWeek}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-[#333333] text-[#37352f] dark:text-[#ebebea] transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToToday}
              className="px-2.5 py-1 text-xs font-semibold text-[#37352f] dark:text-[#ebebea] hover:bg-zinc-100 dark:hover:bg-[#333333] rounded transition-all"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-[#333333] text-[#37352f] dark:text-[#ebebea] transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-sm font-bold text-[#37352f] dark:text-[#ebebea] tracking-tight">
              {getWeekRangeLabel()}
            </span>
          </div>
        </div>

        {/* Action Button & Filters Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick search input */}
          <input
            type="text"
            placeholder="Filter by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400 w-36 md:w-48 backdrop-blur-xs"
          />

          {/* Launch Task Modal trigger */}
          {onLaunchTask && (
            <button
              onClick={onLaunchTask}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-md shadow-sm transition-all flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Launch Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Ribbon */}
      <div className="px-3 sm:px-6 lg:px-8 py-2.5 border-b border-zinc-200 dark:border-white/8 flex flex-wrap items-center gap-4 shrink-0 text-xs text-[#5f5e5b] dark:text-[#9b9a97] bg-white/20 dark:bg-[#0c0c10]/10 backdrop-blur-xs">
        <div className="flex items-center gap-1 font-semibold text-[#37352f] dark:text-[#ebebea]">
          <Filter className="w-3 h-3 text-[#91918e]" />
          <span>Filters:</span>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1">
          <span>Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-[#f4f4f5] dark:bg-[#2c2c2c] text-[#37352f] dark:text-[#ebebea] text-[11px] px-2 py-0.5 rounded border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-1">
          <span>Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-[#f4f4f5] dark:bg-[#2c2c2c] text-[#37352f] dark:text-[#ebebea] text-[11px] px-2 py-0.5 rounded border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="blocks">📄 Page Block Tasks</option>
            <option value="standalone">⚡ Standalone Tasks</option>
          </select>
        </div>

        {/* Completion Filter */}
        <div className="flex items-center gap-1">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 text-[#37352f] dark:text-[#ebebea] text-[11px] px-2 py-0.5 rounded-md focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">⏳ Pending</option>
            <option value="completed">✅ Completed</option>
          </select>
        </div>

        {(priorityFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setPriorityFilter('all');
              setSourceFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="text-[10px] text-red-500 font-bold hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Weekly Board Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden select-none custom-scrollbar p-6">
        <div className="min-w-[1050px] h-full grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dateStr = formatDateString(day);
            const dayTasks = filteredTasks.filter((t) => t.date === dateStr);
            const dayIsToday = isToday(day);

            return (
              <div
                key={dateStr}
                className={`flex flex-col h-full rounded-2xl border p-3.5 transition-all backdrop-blur-md ${
                  dayIsToday
                    ? 'bg-indigo-50/25 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/30 ring-1 ring-indigo-100/50 dark:ring-indigo-950/30 shadow-md'
                    : 'bg-white/45 dark:bg-[#0c0c10]/45 border-zinc-200/80 dark:border-white/8 shadow-xs hover:shadow-sm'
                }`}
              >
                {/* Column Day Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${dayIsToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-[#787774] dark:text-[#91918e]'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-lg font-black tracking-tight ${dayIsToday ? 'text-indigo-700 dark:text-indigo-400' : 'text-[#37352f] dark:text-[#ebebea]'}`}>
                        {day.getDate()}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                        {day.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (inlineAddingDay === dateStr) {
                        setInlineAddingDay(null);
                      } else {
                        setInlineAddingDay(dateStr);
                        setInlineTitle('');
                        setInlinePriority('medium');
                        setInlineCategory('work');
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition-all ${
                      inlineAddingDay === dateStr
                        ? 'bg-zinc-200 dark:bg-white/20 border-zinc-300 dark:border-white/10 text-[#37352f] dark:text-[#ebebea]'
                        : 'bg-white/60 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-[#787774] dark:text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] hover:shadow-xs'
                    }`}
                    title="Quick Add Standalone Task"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Inline Adding Task Editor */}
                <AnimatePresence>
                  {inlineAddingDay === dateStr && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="mb-3 p-2.5 bg-white/70 dark:bg-[#121216]/60 border border-indigo-100 dark:border-indigo-900/30 rounded-xl shadow-md space-y-2.5 overflow-hidden backdrop-blur-md"
                    >
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-100 dark:border-zinc-800 text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 py-1 font-semibold placeholder:text-zinc-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineAdd(dateStr);
                          if (e.key === 'Escape') setInlineAddingDay(null);
                        }}
                      />

                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        {/* Priority Picker */}
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Pri:</span>
                          <select
                            value={inlinePriority}
                            onChange={(e) => setInlinePriority(e.target.value as any)}
                            className="bg-zinc-100 dark:bg-zinc-800 text-[#37352f] dark:text-[#ebebea] px-1.5 py-0.5 rounded cursor-pointer focus:outline-none font-semibold"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Med</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        {/* Category Picker */}
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Cat:</span>
                          <select
                            value={inlineCategory}
                            onChange={(e) => setInlineCategory(e.target.value as any)}
                            className="bg-zinc-100 dark:bg-zinc-800 text-[#37352f] dark:text-[#ebebea] px-1.5 py-0.5 rounded cursor-pointer focus:outline-none font-semibold"
                          >
                            <option value="work">Work</option>
                            <option value="personal">Personal</option>
                            <option value="health">Health</option>
                            <option value="finance">Finance</option>
                            <option value="learning">Learn</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px]">
                        <button
                          onClick={() => setInlineAddingDay(null)}
                          className="px-2 py-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleInlineAdd(dateStr)}
                          disabled={!inlineTitle.trim()}
                          className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Day Task List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar max-h-[calc(100vh-270px)]">
                  {dayTasks.length > 0 ? (
                    dayTasks.map((task) => {
                      const isCompleted = task.status === 'completed';

                      return (
                        <div
                          key={task.id}
                          className={`group/task relative p-3 border rounded-xl shadow-2xs hover:shadow-md transition-all duration-200 backdrop-blur-xs ${
                            isCompleted
                              ? 'bg-white/40 dark:bg-black/10 border-zinc-200/50 dark:border-white/5 opacity-60 shadow-xs'
                              : 'bg-white/75 dark:bg-[#121216]/55 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                          }`}
                        >
                          {/* Task Content */}
                          <div className="flex items-start gap-2.5">
                            {/* Complete toggle checkbox */}
                            <button
                              onClick={() => handleToggleCompletion(task)}
                              className="mt-0.5 text-[#91918e] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/30" />
                              ) : (
                                <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 hover:text-zinc-400" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0" onClick={() => handleOpenEdit(task)}>
                              <p className={`text-xs font-semibold text-[#37352f] dark:text-[#ebebea] break-words cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 ${isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500 font-medium' : ''}`}>
                                {task.title}
                              </p>

                              {/* Target source line */}
                              {task.isPageBlock ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (task.pageId) onSelectPage(task.pageId);
                                  }}
                                  className="mt-1 flex items-center gap-1 text-[9.5px] text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left"
                                  title="Navigate to this Page in Editor"
                                >
                                  <span>{task.pageIcon || '📄'}</span>
                                  <span className="truncate max-w-[100px]">{task.pageTitle}</span>
                                </button>
                              ) : (
                                <div className="mt-1 flex items-center gap-1 text-[9.5px] font-medium text-zinc-400 dark:text-zinc-500 select-none">
                                  {getCategoryIcon(task.category)}
                                  <span className="capitalize">{task.category}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer Action Badges & Buttons */}
                          <div className="mt-2.5 pt-2 border-t border-zinc-50 dark:border-[#2c2c2c] flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${getPriorityBadgeClass(task.priority)}`}>
                              {task.priority}
                            </span>

                            {/* Shift Dates and Trash Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleShiftDate(task, -1)}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-[#333333] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                title="Move task 1 day earlier"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleShiftDate(task, 1)}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-[#333333] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                title="Move task 1 day later"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-[#333333] text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                                title={task.isPageBlock ? "Remove scheduled properties" : "Delete standalone task"}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-2 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">No scheduled tasks</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail / Editing Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[8px] flex items-center justify-center z-[100] p-4 select-none animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md glass-panel-heavy rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-white/10 bg-transparent">
                <div className="flex items-center gap-2">
                  {editingTask.isPageBlock ? (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30">
                      Page Block Task
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
                      Standalone Task
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditingTask(null)}
                  className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-[#2c2c2c] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider">Task Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="todo">⏳ To Do</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="backlog">📦 Backlog</option>
                    </select>
                  </div>
                </div>

                {/* Target Date & Category (if Standalone) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider">Target Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    />
                  </div>

                  {!editingTask.isPageBlock && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#91918e] uppercase tracking-wider">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value="work">💼 Work</option>
                        <option value="personal">👤 Personal</option>
                        <option value="health">❤️ Health</option>
                        <option value="finance">💰 Finance</option>
                        <option value="learning">🎓 Learning</option>
                        <option value="other">🏷️ Other</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Page Navigation details (if Page Block) */}
                {editingTask.isPageBlock && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/30 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Associated Page</p>
                      <p className="text-xs font-semibold text-[#37352f] dark:text-[#ebebea] mt-0.5">
                        {editingTask.pageIcon || '📄'} {editingTask.pageTitle}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (editingTask.pageId) {
                          onSelectPage(editingTask.pageId);
                          setEditingTask(null);
                        }
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-[#252525] border border-zinc-200 dark:border-[#2c2c2c] hover:border-indigo-500 dark:hover:border-indigo-500 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Page</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-zinc-200/80 dark:border-white/10 bg-transparent flex items-center justify-between">
                <button
                  onClick={() => handleDeleteTask(editingTask)}
                  className="px-3 py-1.5 border border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 text-xs font-semibold rounded-md transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{editingTask.isPageBlock ? "Unschedule" : "Delete Task"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingTask(null)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 text-xs font-semibold rounded-md transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-md shadow-sm transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
