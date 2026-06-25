import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  PieChart as PieChartIcon,
  CheckCircle2,
  BarChart3,
  Activity,
  Sparkles,
  TrendingUp,
  Briefcase,
  User,
  HeartPulse,
  DollarSign,
  GraduationCap,
  Tag,
  RefreshCw,
  X,
  Play,
  ClipboardList
} from 'lucide-react';
import { Task } from '../types';
import { tasksService } from '../lib/tasksService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

// Radial particle-burst animation representing task completion celebration
const ConfettiBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;

  // Generate 12 radial burst particles with unique angles and distances
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 360) / 12;
    const distance = 35 + Math.random() * 25; // travel distance
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * distance;
    const y = Math.sin(radians) * distance;
    
    const colors = [
      'bg-emerald-500', 'bg-teal-400', 'bg-yellow-400', 
      'bg-pink-500', 'bg-indigo-500', 'bg-purple-500', 'bg-sky-400'
    ];
    const color = colors[i % colors.length];
    
    const sizes = ['w-1.5 h-1.5', 'w-2 h-2', 'w-1 h-1'];
    const size = sizes[i % sizes.length];

    return {
      id: i,
      x,
      y,
      color,
      size,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-visible">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className={`absolute rounded-full ${p.size} ${p.color}`}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ 
              x: p.x, 
              y: p.y, 
              scale: [1, 1.2, 0],
              opacity: [1, 1, 0] 
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.8, 
              ease: [0.1, 0.8, 0.25, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface DashboardProps {
  onSelectPage: (id: string) => void;
}

export default function Dashboard({ onSelectPage }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Track tasks currently displaying completion celebration
  const [celebratingTasks, setCelebratingTasks] = useState<Record<string, boolean>>({});

  const triggerTaskCompletedAnimation = (taskId: string) => {
    setCelebratingTasks((prev) => ({ ...prev, [taskId]: true }));
    setTimeout(() => {
      setCelebratingTasks((prev) => ({ ...prev, [taskId]: false }));
    }, 1500);
  };

  // CRUD State
  // (State handled in the Sidebar modal now)

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Task['category']>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('today');

  // AI Analyzer State
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  // AI Smart Scheduler State
  const [aiScheduleInput, setAiScheduleInput] = useState('');
  const [isAiScheduling, setIsAiScheduling] = useState(false);
  const [aiScheduleFeedback, setAiScheduleFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load / Sync Tasks from Firestore with LocalStorage cache fallback
  useEffect(() => {
    let active = true;
    tasksService.getTasks().then((fetchedTasks) => {
      if (active) {
        setTasks(fetchedTasks);
        setIsCloudSynced(true);
      }
    }).catch((err) => {
      console.error('Failed to load tasks from tasksService', err);
      if (active) {
        setIsCloudSynced(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Sync state helper to handle Firestore + LocalStorage
  const handleUpdateTasksList = async (updatedTasks: Task[], singleUpdatedTask?: Task, isDeleteId?: string) => {
    setTasks(updatedTasks);
    try {
      if (isDeleteId) {
        await tasksService.deleteTask(isDeleteId);
      } else if (singleUpdatedTask) {
        await tasksService.saveTask(singleUpdatedTask);
      }
    } catch (err) {
      console.error('Failed to sync task change via tasksService', err);
    }
  };

  // Toggle Completion Status (Update)
  const handleToggleTaskComplete = async (taskId: string) => {
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus: Task['status'] = t.status === 'completed' ? 'todo' : 'completed';
        if (nextStatus === 'completed') {
          triggerTaskCompletedAnimation(taskId);
        }
        const updated = { ...t, status: nextStatus, updatedAt: Date.now() };
        handleUpdateTasksList(tasks.map(item => item.id === taskId ? updated : item), updated);
        return updated;
      }
      return t;
    });
  };

  // Cycle Status (Update)
  const handleCycleStatus = (taskId: string, currentStatus: Task['status']) => {
    const statuses: Task['status'][] = ['todo', 'in_progress', 'completed', 'backlog'];
    const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    if (nextStatus === 'completed') {
      triggerTaskCompletedAnimation(taskId);
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const updated = { ...t, status: nextStatus, updatedAt: Date.now() };
        handleUpdateTasksList(tasks.map(item => item.id === taskId ? updated : item), updated);
        return updated;
      }
      return t;
    });
  };

  // Cycle Priority (Update)
  const handleCyclePriority = (taskId: string, currentPriority: Task['priority']) => {
    const priorities: Task['priority'][] = ['low', 'medium', 'high'];
    const nextIdx = (priorities.indexOf(currentPriority) + 1) % priorities.length;
    const nextPriority = priorities[nextIdx];

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const updated = { ...t, priority: nextPriority, updatedAt: Date.now() };
        handleUpdateTasksList(tasks.map(item => item.id === taskId ? updated : item), updated);
        return updated;
      }
      return t;
    });
  };

  // Edit Task Title (Update)
  const handleEditTitle = (taskId: string, nextTitle: string) => {
    if (!nextTitle.trim()) return;
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const updated = { ...t, title: nextTitle.trim(), updatedAt: Date.now() };
        handleUpdateTasksList(tasks.map(item => item.id === taskId ? updated : item), updated);
        return updated;
      }
      return t;
    });
  };

  // Delete Task (Delete)
  const handleDeleteTask = async (taskId: string) => {
    const filtered = tasks.filter((t) => t.id !== taskId);
    await handleUpdateTasksList(filtered, undefined, taskId);
  };

  // AI Productivity Analyzer Integration
  const handleRunAIAnalysis = async () => {
    setIsAIAnalyzing(true);
    setAiAnalysisResult(null);
    setShowAIModal(true);

    const taskDataStr = tasks
      .map(
        (t) =>
          `- [${t.status === 'completed' ? 'X' : ' '}] ${t.title} (${t.category}, Priority: ${t.priority}, Date: ${t.date})`
      )
      .join('\n');

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Analyze tasks and provide productivity optimization insights.',
          blockContent: taskDataStr || 'No tasks created yet.',
          action: 'analyze-tasks',
        }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const result = await response.json();
      setAiAnalysisResult(result.text);
    } catch (err) {
      console.error('Error in task analyzer AI:', err);
      setAiAnalysisResult(
        "### Core Nodes Synced\nI encountered an issue connecting to my Gemini analysis model. Please verify your `GEMINI_API_KEY` is configured in the AI Studio settings and try again."
      );
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  // AI Smart Scheduling Execution
  const handleAISchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiScheduleInput.trim()) return;

    setIsAiScheduling(true);
    setAiScheduleFeedback(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiScheduleInput.trim(),
          action: 'schedule-task',
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to Gemini Smart Scheduler');

      const data = await response.json();
      if (data.task) {
        const generated = data.task;
        const newTask: Task = {
          id: Math.random().toString(36).substring(7),
          title: generated.title || aiScheduleInput.trim(),
          status: 'todo',
          priority: generated.priority || 'medium',
          category: generated.category || 'work',
          date: generated.date || new Date().toISOString().split('T')[0],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const updatedTasks = [newTask, ...tasks];
        await handleUpdateTasksList(updatedTasks, newTask);
        
        // Also trigger background sync with Google Calendar
        try {
          await fetch('/api/tasks/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task: newTask,
              syncCalendar: true,
              sendNotification: false,
            }),
          });
        } catch (syncErr) {
          console.warn('Google Workspace background sync failed or bypassed', syncErr);
        }

        // Trigger local storage event to alert other components (like App/Calendar)
        localStorage.setItem('clutch-tasks-cache', JSON.stringify(updatedTasks));
        window.dispatchEvent(new Event('storage'));

        setAiScheduleFeedback({
          text: `✨ Auto-Scheduled task: "${newTask.title}" (${newTask.category.toUpperCase()}, Priority: ${newTask.priority.toUpperCase()}) for ${newTask.date}`,
          type: 'success'
        });
        setAiScheduleInput('');
      } else {
        throw new Error('Parsed scheduled task response was invalid');
      }
    } catch (err: any) {
      console.error('Error in AI Smart Scheduler:', err);
      setAiScheduleFeedback({
        text: err.message || 'Failed to analyze and schedule task.',
        type: 'error'
      });
    } finally {
      setIsAiScheduling(false);
    }
  };

  // Filter Logic
  const getFilteredTasks = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get start of week
    const today = new Date();
    const first = today.getDate() - today.getDay();
    const startOfWeek = new Date(today.setDate(first));
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    return tasks.filter((t) => {
      // Search
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

      // Priority
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

      // Category
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      // Date Range
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = t.date === todayStr;
      } else if (dateFilter === 'week') {
        matchesDate = t.date >= startOfWeekStr && t.date <= todayStr;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
    });
  };

  const filteredTasks = getFilteredTasks();

  // Statistical Calculations
  const stats = (() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter((t) => t.date === todayStr);
    const todayTotal = todayTasks.length;
    const todayCompleted = todayTasks.filter((t) => t.status === 'completed').length;
    const todayRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // Status distributions
    const statusCounts = {
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      backlog: tasks.filter((t) => t.status === 'backlog').length,
    };

    // Priority distributions
    const priorityCounts = {
      low: tasks.filter((t) => t.priority === 'low').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      high: tasks.filter((t) => t.priority === 'high').length,
    };

    // Category distributions
    const categoryCounts = {
      work: tasks.filter((t) => t.category === 'work').length,
      personal: tasks.filter((t) => t.category === 'personal').length,
      health: tasks.filter((t) => t.category === 'health').length,
      finance: tasks.filter((t) => t.category === 'finance').length,
      learning: tasks.filter((t) => t.category === 'learning').length,
      other: tasks.filter((t) => t.category === 'other').length,
    };

    return {
      total,
      completed,
      rate,
      todayTotal,
      todayCompleted,
      todayRate,
      statusCounts,
      priorityCounts,
      categoryCounts,
    };
  })();

  // Chart Data formatters
  const statusChartData = [
    { name: 'To Do', value: stats.statusCounts.todo, color: '#3b82f6' },
    { name: 'In Progress', value: stats.statusCounts.in_progress, color: '#eab308' },
    { name: 'Completed', value: stats.statusCounts.completed, color: '#10b981' },
    { name: 'Backlog', value: stats.statusCounts.backlog, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const priorityChartData = [
    { name: 'Low', count: stats.priorityCounts.low, color: '#9ca3af' },
    { name: 'Medium', count: stats.priorityCounts.medium, color: '#f59e0b' },
    { name: 'High', count: stats.priorityCounts.high, color: '#ef4444' },
  ];

  const categoryChartData = [
    { name: 'Work', value: stats.categoryCounts.work, color: '#6366f1' },
    { name: 'Personal', value: stats.categoryCounts.personal, color: '#ec4899' },
    { name: 'Health', value: stats.categoryCounts.health, color: '#14b8a6' },
    { name: 'Finance', value: stats.categoryCounts.finance, color: '#f59e0b' },
    { name: 'Learning', value: stats.categoryCounts.learning, color: '#a855f7' },
    { name: 'Other', value: stats.categoryCounts.other, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Simple Markdown Parsing Renderer for AI results
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('### ')) {
        return <h4 key={idx} className="text-[15px] font-bold text-[#37352f] dark:text-[#ebebea] mt-4 mb-1.5">{cleanLine.replace('### ', '')}</h4>;
      }
      if (cleanLine.startsWith('## ')) {
        return <h3 key={idx} className="text-[17px] font-bold text-[#37352f] dark:text-[#ebebea] mt-5 mb-2 border-b border-[#e9e9e7] dark:border-[#2c2c2c] pb-1">{cleanLine.replace('## ', '')}</h3>;
      }
      if (cleanLine.startsWith('# ')) {
        return <h2 key={idx} className="text-[20px] font-bold text-[#37352f] dark:text-[#ebebea] mt-6 mb-3 tracking-tight">{cleanLine.replace('# ', '')}</h2>;
      }
      if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
        return <li key={idx} className="text-[13px] text-[#37352f] dark:text-[#ebebea] leading-relaxed ml-4 list-disc mt-1">{cleanLine.substring(2)}</li>;
      }
      if (cleanLine.match(/^\d+\.\s/)) {
        return <li key={idx} className="text-[13px] text-[#37352f] dark:text-[#ebebea] leading-relaxed ml-4 list-decimal mt-1">{cleanLine.replace(/^\d+\.\s/, '')}</li>;
      }
      if (cleanLine === '') {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-[13.5px] text-[#4f4e4a] dark:text-[#cac9c5] leading-relaxed mt-1.5">{line}</p>;
    });
  };

  const getCategoryIcon = (cat: Task['category']) => {
    switch (cat) {
      case 'work': return <Briefcase className="w-3.5 h-3.5" />;
      case 'personal': return <User className="w-3.5 h-3.5" />;
      case 'health': return <HeartPulse className="w-3.5 h-3.5" />;
      case 'finance': return <DollarSign className="w-3.5 h-3.5" />;
      case 'learning': return <GraduationCap className="w-3.5 h-3.5" />;
      default: return <Tag className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent px-6 lg:px-12 py-8 custom-scrollbar relative z-10">
      {/* Landing Dashboard Header */}
      <div className="max-w-5xl mx-auto flex flex-col gap-8 animate-fade-in pb-16">
        
        {/* Cover decoration banner */}
        <div className="w-full h-[140px] rounded-lg overflow-hidden bg-gradient-to-r from-emerald-500/20 via-teal-500/25 to-indigo-600/35 border border-zinc-200 dark:border-white/10 shadow-lg flex items-end p-6 select-none relative backdrop-blur-md">
          <div className="absolute inset-0 bg-black/5 dark:bg-black/20" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/30 dark:bg-white/10 backdrop-blur rounded-lg flex items-center justify-center text-white text-2xl font-bold border border-white/20">
              📈
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#37352f] dark:text-white tracking-tight">Daily Task Analyser</h1>
              <p className="text-xs text-[#787774] dark:text-zinc-300 font-medium mt-0.5">High-fidelity productivity tracking and AI-powered performance analysis</p>
            </div>
          </div>
          <button
            id="run-ai-task-coach"
            onClick={handleRunAIAnalysis}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 active:scale-95 text-zinc-800 dark:text-white text-xs font-bold rounded-md border border-zinc-200 dark:border-white/10 backdrop-blur transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-300 animate-pulse" />
            <span>AI Coach Insights</span>
          </button>
        </div>

        {/* AI Smart Scheduler Bar */}
        <div className="p-5 glass-panel rounded-xl flex flex-col gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#37352f] dark:text-[#ebebea] uppercase tracking-wider flex items-center gap-1.5">
                AI Smart Scheduler
              </h3>
              <p className="text-[10px] text-[#787774] dark:text-[#9b9a97] leading-none mt-0.5 select-none font-medium">Let Gemini instantly schedule, categorize, and prioritize your objectives</p>
            </div>
          </div>
          <form
            onSubmit={handleAISchedule}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              placeholder="e.g., Schedule a high-priority financial review next Friday"
              value={aiScheduleInput}
              onChange={(e) => setAiScheduleInput(e.target.value)}
              disabled={isAiScheduling}
              className="flex-1 bg-white dark:bg-[#191919] border border-zinc-200 dark:border-[#2c2c2c] rounded-lg px-3.5 py-2 text-xs text-[#37352f] dark:text-[#ebebea] placeholder-[#91918e] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 font-medium"
            />
            <button
              type="submit"
              disabled={isAiScheduling || !aiScheduleInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#efefee] dark:disabled:bg-[#2f2f2f] disabled:text-[#91918e] text-white text-xs font-bold rounded-lg transition-all active:scale-[0.98] shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              {isAiScheduling ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <span>Schedule with AI</span>
                </>
              )}
            </button>
          </form>
          {aiScheduleFeedback && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[11px] font-semibold ${aiScheduleFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
            >
              {aiScheduleFeedback.text}
            </motion.p>
          )}
        </div>

        {/* Critical Alerts & Coming Deadlines */}
        {(() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          const alerts: { task: Task; type: 'overdue' | 'today' | 'upcoming'; label: string; color: string }[] = [];

          tasks.forEach((t) => {
            if (t.status === 'completed' || !t.date) return;

            if (t.date < todayStr) {
              alerts.push({
                task: t,
                type: 'overdue',
                label: 'OVERDUE',
                color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40',
              });
            } else if (t.date === todayStr) {
              alerts.push({
                task: t,
                type: 'today',
                label: 'DUE TODAY',
                color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
              });
            } else if (t.date === tomorrowStr) {
              alerts.push({
                task: t,
                type: 'upcoming',
                label: 'DUE TOMORROW',
                color: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40',
              });
            }
          });

          const activeAlerts = alerts.sort((a, b) => {
            const order = { overdue: 0, today: 1, upcoming: 2 };
            return order[a.type] - order[b.type] || a.task.date.localeCompare(b.task.date);
          });

          if (activeAlerts.length === 0) return null;

          return (
            <div className="p-4 bg-amber-50/45 dark:bg-amber-950/5 border border-amber-200/50 dark:border-amber-950/40 rounded-xl flex flex-col gap-2.5 animate-fade-in">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 select-none">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Critical Deadlines & Urgent Alerts ({activeAlerts.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeAlerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold leading-normal ${alert.color}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-black/30 shrink-0 select-none">
                        {alert.label}
                      </span>
                      <span className="truncate font-semibold text-zinc-800 dark:text-zinc-200">{alert.task.title}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/20 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0 select-none">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{alert.task.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
          {/* Completion Score */}
          <div className="p-4 glass-panel rounded-xl flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">Overall Completion</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#37352f] dark:text-[#ebebea]">{stats.rate}%</span>
                <span className="text-[11px] text-[#787774] dark:text-[#9b9a97] font-semibold">({stats.completed}/{stats.total} Tasks)</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }} />
              </div>
            </div>
          </div>

          {/* Today Score */}
          <div className="p-4 glass-panel rounded-xl flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">Today's Focus</span>
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#37352f] dark:text-[#ebebea]">{stats.todayRate}%</span>
                <span className="text-[11px] text-[#787774] dark:text-[#9b9a97] font-semibold">({stats.todayCompleted}/{stats.todayTotal} Tasks)</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.todayRate}%` }} />
              </div>
            </div>
          </div>

          {/* Productivity Velocity */}
          <div className="p-4 glass-panel rounded-xl flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">High Priorities</span>
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-red-500">{stats.priorityCounts.high}</span>
                <span className="text-[11px] text-[#787774] dark:text-[#9b9a97] font-semibold">Critical Tasks Listed</span>
              </div>
              <p className="text-[10px] text-[#787774] dark:text-[#9b9a97] mt-1.5 font-medium">Require immediate tactical execution</p>
            </div>
          </div>

          {/* Active Workload */}
          <div className="p-4 glass-panel rounded-xl flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">Active In Progress</span>
              <Activity className="w-3.5 h-3.5 text-yellow-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-yellow-500">{stats.statusCounts.in_progress}</span>
                <span className="text-[11px] text-[#787774] dark:text-[#9b9a97] font-semibold">Tasks in execution</span>
              </div>
              <p className="text-[10px] text-[#787774] dark:text-[#9b9a97] mt-1.5 font-medium">Currently building or designing</p>
            </div>
          </div>
        </div>

        {/* Analytical Visualization Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Priority Workload Distribution Chart */}
          <div className="p-5 glass-panel rounded-xl flex flex-col shadow-md">
            <div className="flex items-center gap-1.5 mb-4 select-none">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-[#37352f] dark:text-[#ebebea] uppercase tracking-wider">Priority Load Breakdown</h3>
            </div>
            <div className="h-[200px] w-full">
              {stats.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#91918e] text-xs">
                  No active task data to plot
                </div>
              )}
            </div>
          </div>

          {/* Category Distribution Chart */}
          <div className="p-5 glass-panel rounded-xl flex flex-col shadow-md">
            <div className="flex items-center gap-1.5 mb-4 select-none">
              <PieChartIcon className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-[#37352f] dark:text-[#ebebea] uppercase tracking-wider">Category Balanced Allocation</h3>
            </div>
            <div className="h-[200px] w-full flex items-center justify-center">
              {categoryChartData.length > 0 ? (
                <div className="w-full h-full flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-[50%] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[#5f5e5b] dark:text-[#9b9a97] w-full sm:w-[50%]">
                    {categoryChartData.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="truncate capitalize">{c.name} ({c.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[#91918e] text-xs">
                  No category data mapped yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters and List view (CRUD Read, Update, Delete) */}
        <div className="flex flex-col gap-4 mt-2">
          
          {/* Filtering controls */}
          <div className="flex flex-col gap-3 p-4 glass-panel rounded-xl select-none shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#37352f] dark:text-[#ebebea] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-500" /> Tactical Filtering
              </span>
              <button
                id="btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                  setDateFilter('today');
                }}
                className="text-[10px] font-bold text-[#787774] dark:text-[#9b9a97] hover:text-indigo-500 cursor-pointer transition-colors"
              >
                Reset Filters
              </button>
            </div>

            {/* Row 1: Search & Date Range */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#91918e]" />
                <input
                  id="task-search-input"
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/8 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex gap-1 bg-white/40 dark:bg-black/15 p-0.5 rounded-lg border border-zinc-200 dark:border-white/8 self-start sm:self-auto">
                <button
                  id="filter-date-today"
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    dateFilter === 'today'
                      ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-[#ebebea] shadow-xs'
                      : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#ebebea]'
                  }`}
                >
                  Today
                </button>
                <button
                  id="filter-date-week"
                  onClick={() => setDateFilter('week')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    dateFilter === 'week'
                      ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-[#ebebea] shadow-xs'
                      : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#ebebea]'
                  }`}
                >
                  This Week
                </button>
                <button
                  id="filter-date-all"
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    dateFilter === 'all'
                      ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-[#ebebea] shadow-xs'
                      : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#ebebea]'
                  }`}
                >
                  All History
                </button>
              </div>
            </div>

            {/* Row 2: Status, Priority, Category Select filters */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <select
                  id="filter-status-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-2 py-1 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/8 rounded-lg text-[11px] text-[#37352f] dark:text-[#ebebea] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="backlog">Backlog</option>
                </select>
              </div>

              <div>
                <select
                  id="filter-priority-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="w-full px-2 py-1 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/8 rounded-lg text-[11px] text-[#37352f] dark:text-[#ebebea] focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <select
                  id="filter-category-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full px-2 py-1 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/8 rounded-lg text-[11px] text-[#37352f] dark:text-[#ebebea] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="health">Health</option>
                  <option value="finance">Finance</option>
                  <option value="learning">Learning</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Tasks Grid/List */}
          <div className="flex flex-col gap-2.5">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const isCompleted = task.status === 'completed';

                return (
                  <motion.div
                    key={task.id}
                    animate={celebratingTasks[task.id] ? {
                      scale: [1, 1.02, 1],
                      boxShadow: ['0px 0px 0px rgba(16, 185, 129, 0)', '0px 4px 20px rgba(16, 185, 129, 0.15)', '0px 0px 0px rgba(16, 185, 129, 0)']
                    } : {}}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all backdrop-blur-md ${
                      isCompleted
                        ? 'bg-zinc-100/40 dark:bg-black/10 border-zinc-200/50 dark:border-white/5 opacity-60 shadow-xs'
                        : 'bg-white/60 dark:bg-[#121216]/50 border-zinc-200 dark:border-white/8 shadow-sm hover:shadow-md hover:bg-white/70 dark:hover:bg-[#121216]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkmark completed box */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <motion.button
                          id={`task-check-${task.id}`}
                          onClick={() => handleToggleTaskComplete(task.id)}
                          className="text-[#787774] hover:text-indigo-600 transition-colors shrink-0 focus:outline-none relative z-20"
                          whileTap={{ scale: 0.8 }}
                          animate={isCompleted && celebratingTasks[task.id] ? { scale: [1, 1.35, 1] } : {}}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </motion.button>
                        
                        <ConfettiBurst active={!!celebratingTasks[task.id]} />
                      </div>

                      {/* Title editable area */}
                      <input
                        id={`task-title-edit-${task.id}`}
                        type="text"
                        value={task.title}
                        onChange={(e) => handleEditTitle(task.id, e.target.value)}
                        className={`w-full bg-transparent border-none outline-none text-sm text-[#37352f] dark:text-[#ebebea] font-medium leading-normal ${
                          isCompleted ? 'line-through text-[#91918e]' : ''
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 select-none ml-4">
                      {/* Category Badge */}
                      <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-tight bg-[#f1f1ef] dark:bg-[#2c2c2a] text-[#5f5e5b] dark:text-[#9b9a97] capitalize"
                        title="Task category"
                      >
                        {getCategoryIcon(task.category)}
                        <span>{task.category}</span>
                      </div>

                      {/* Priority cycling badge */}
                      <button
                        id={`task-priority-cycle-${task.id}`}
                        onClick={() => handleCyclePriority(task.id, task.priority)}
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                          task.priority === 'high'
                            ? 'bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20'
                            : task.priority === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20'
                            : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100'
                        }`}
                        title="Click to change Priority"
                      >
                        {task.priority}
                      </button>

                      {/* Status cycling badge */}
                      <button
                        id={`task-status-cycle-${task.id}`}
                        onClick={() => handleCycleStatus(task.id, task.status)}
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                          task.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 hover:bg-emerald-100'
                            : task.status === 'in_progress'
                            ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-500 hover:bg-yellow-100'
                            : task.status === 'backlog'
                            ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'
                            : 'bg-blue-50 dark:bg-blue-900/10 text-blue-500 hover:bg-blue-100'
                        }`}
                        title="Click to change Status"
                      >
                        {task.status.replace('_', ' ')}
                      </button>

                      {/* Due Date Indicator */}
                      <div className={`flex items-center gap-1 text-[10px] font-bold transition-all ${
                        task.status !== 'completed' && task.date < new Date().toISOString().split('T')[0]
                          ? 'text-red-500 animate-pulse'
                          : task.status !== 'completed' && task.date === new Date().toISOString().split('T')[0]
                          ? 'text-amber-500 font-semibold'
                          : 'text-[#787774] dark:text-[#9b9a97]'
                      }`}>
                        {task.status !== 'completed' && task.date < new Date().toISOString().split('T')[0] ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        ) : (
                          <Calendar className="w-3 h-3 shrink-0" />
                        )}
                        <span>{task.date}</span>
                      </div>

                      {/* Delete button */}
                      <button
                        id={`task-delete-btn-${task.id}`}
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-[#787774] hover:text-red-500 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] transition-colors focus:outline-none"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-[#fbfbfa] dark:bg-[#202020] border border-dashed border-[#e9e9e7] dark:border-[#2c2c2c] rounded-lg select-none">
                <ClipboardList className="w-9 h-9 text-[#91918e] mb-1.5" />
                <h4 className="text-xs font-bold text-[#37352f] dark:text-[#ebebea]">No match found</h4>
                <p className="text-[11px] text-[#91918e] mt-0.5">Adjust your filters or register a new task above.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* AI Task Coach Modal Overlay */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1c] border border-[#e9e9e7] dark:border-[#2c2c2c] w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden select-text animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2c2c2c] bg-[#fbfbfa] dark:bg-[#202020]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
                <span className="text-sm font-bold text-[#37352f] dark:text-[#ebebea]">Gemini AI Productivity Analyser</span>
              </div>
              <button
                id="close-ai-modal"
                onClick={() => setShowAIModal(false)}
                className="p-1 rounded-md text-[#787774] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-left">
              {isAIAnalyzing ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <Sparkles className="absolute w-4.5 h-4.5 text-yellow-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-[#37352f] dark:text-[#ebebea]">Synthesizing Productivity Patterns...</span>
                    <p className="text-[10px] text-[#91918e] mt-1">Cross-referencing active workloads and priority balance</p>
                  </div>
                </div>
              ) : aiAnalysisResult ? (
                <div className="prose dark:prose-invert max-w-none text-left select-text">
                  {renderMarkdown(aiAnalysisResult)}
                </div>
              ) : (
                <div className="text-[#91918e] text-xs text-center py-8">
                  Initiating task data extraction...
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-[#e9e9e7] dark:border-[#2c2c2c] bg-[#fbfbfa] dark:bg-[#202020] flex justify-end">
              <button
                id="btn-close-ai-modal-foot"
                onClick={() => setShowAIModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
              >
                Acknowledge Insights
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
