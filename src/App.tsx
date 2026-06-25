import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Command,
  Sun,
  Moon,
  Plus,
  Trash2,
  FolderOpen,
  PanelLeftClose,
  Menu,
  ChevronRight,
  ChevronDown,
  CloudLightning,
  Cloud,
  User as UserIcon,
  LogIn,
  Bell,
  AlertCircle,
  Calendar
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AIPanel from './components/AIPanel';
import SearchModal from './components/SearchModal';
import Dashboard from './components/Dashboard';
import QuickAdd from './components/QuickAdd';
import LaunchTaskModal from './components/LaunchTaskModal';
import CalendarView from './components/CalendarView';
import PersonalDetails from './components/PersonalDetails';
import { Page, Block, Task } from './types';
import { getInitialTemplates } from './templates';
import {
  db,
  pagesCol,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from './lib/firebase';

export default function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null | 'calendar' | 'profile'>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isLaunchTaskOpen, setIsLaunchTaskOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchGlobalTasks = () => {
    const cached = localStorage.getItem('clutch-tasks-cache');
    if (cached) {
      try {
        setGlobalTasks(JSON.parse(cached));
      } catch (e) {}
    }
    fetch('/api/tasks')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data && Array.isArray(data)) {
          setGlobalTasks(data);
          localStorage.setItem('clutch-tasks-cache', JSON.stringify(data));
        }
      })
      .catch(err => console.error('Error fetching global tasks', err));
  };

  useEffect(() => {
    fetchGlobalTasks();
    const interval = setInterval(fetchGlobalTasks, 8000);
    return () => clearInterval(interval);
  }, [activePageId]);

  // Monitor Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setActivePageId('profile');
    } catch (err) {
      console.error('Failed login with Google auth provider', err);
    }
  };

  // Initialize Dark Mode based on preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('clutch-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(darkActive);
    if (darkActive) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Global click listener to close notifications popup
  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleOutsideClick = () => {
      setIsNotificationsOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isNotificationsOpen]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('clutch-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('clutch-theme', 'light');
    }
  };

  // Syncing with Firestore & fallback to localStorage
  useEffect(() => {
    const q = query(pagesCol, orderBy('createdAt', 'asc'));
    
    // Helper to check if a page matches any of the deleted target pages
    const isTargetForRemoval = (p: Page) => {
      const title = (p.title || '').toLowerCase();
      const matchesTitle = title.includes('welcome to clutch') || 
                           title.includes('weekly sprint') || 
                           title.includes('product brainstorming');
      const matchesId = p.id === 'welcome-page' || p.id === 'planner-page' || p.id === 'notes-page';
      return matchesTitle || matchesId;
    };

    // Attempt Firestore subscribe
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPages: Page[] = [];
        snapshot.forEach((docSnap) => {
          fetchedPages.push({ id: docSnap.id, ...docSnap.data() } as Page);
        });

        if (fetchedPages.length > 0) {
          // Filter out the unwanted target pages
          const filtered = fetchedPages.filter(p => !isTargetForRemoval(p));
          setPages(filtered);
          setIsCloudSynced(true);
          // Sync to localStorage as cache backup
          localStorage.setItem('clutch-pages-cache', JSON.stringify(filtered));

          // Clean up the deleted target pages from Firestore DB
          fetchedPages.forEach(async (p) => {
            if (isTargetForRemoval(p)) {
              try {
                await deleteDoc(doc(pagesCol, p.id));
              } catch (err) {
                console.error('Failed to clear target page from firestore', err);
              }
            }
          });
        } else {
          // Empty DB -> Seed with initial templates
          const seeds = getInitialTemplates();
          seeds.forEach(async (seed) => {
            await setDoc(doc(pagesCol, seed.id), seed);
          });
        }
      },
      (error) => {
        console.warn('Firestore subscription failed, falling back to offline LocalStorage mode.', error);
        setIsCloudSynced(false);
        
        // Falling back to LocalStorage
        const cached = localStorage.getItem('clutch-pages-cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Page[];
            const filtered = parsed.filter(p => !isTargetForRemoval(p));
            setPages(filtered);
            localStorage.setItem('clutch-pages-cache', JSON.stringify(filtered));
          } catch (err) {
            console.error('Failed to parse cached local pages', err);
          }
        } else {
          // Initialize empty local storage with templates
          const seeds = getInitialTemplates();
          setPages(seeds);
          localStorage.setItem('clutch-pages-cache', JSON.stringify(seeds));
        }
      }
    );

    return () => unsubscribe();
  }, [activePageId]);

  // Command palette shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save/Update Page Action helper
  const handleUpdatePage = async (updatedPage: Page) => {
    // 1. Update React local state for speedy UI update
    setPages((prev) => prev.map((p) => (p.id === updatedPage.id ? updatedPage : p)));

    // 2. Write to Firestore if connected
    if (isCloudSynced) {
      try {
        const pageRef = doc(pagesCol, updatedPage.id);
        await setDoc(pageRef, updatedPage);
      } catch (err) {
        console.error('Failed to update Firestore page', err);
      }
    }

    // 3. Write to LocalStorage backup cache
    const updatedPages = pages.map((p) => (p.id === updatedPage.id ? updatedPage : p));
    localStorage.setItem('clutch-pages-cache', JSON.stringify(updatedPages));
  };

  // Create Page Action
  const handleCreatePage = async (title: string, parentId: string | null = null) => {
    const newId = Math.random().toString(36).substring(7);
    const newPage: Page = {
      id: newId,
      title: title || 'Untitled Page',
      icon: '📄',
      coverImage: null,
      parentId,
      isFavorite: false,
      isTrash: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blocks: [
        { id: Math.random().toString(36).substring(7), type: 'text', content: '' }
      ],
    };

    // 1. Update React State
    const nextPages = [...pages, newPage];
    setPages(nextPages);
    setActivePageId(newId);

    // 2. Sync to Firestore
    if (isCloudSynced) {
      try {
        await setDoc(doc(pagesCol, newId), newPage);
      } catch (err) {
        console.error('Failed to create page on Firestore', err);
      }
    }

    // 3. Save to localStorage
    localStorage.setItem('clutch-pages-cache', JSON.stringify(nextPages));
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    const pageToToggle = pages.find((p) => p.id === id);
    if (pageToToggle) {
      handleUpdatePage({
        ...pageToToggle,
        isFavorite: !pageToToggle.isFavorite,
        updatedAt: Date.now(),
      });
    }
  };

  // Move to Trash
  const handleMoveToTrash = (id: string) => {
    const pageToTrash = pages.find((p) => p.id === id);
    if (pageToTrash) {
      const updated = {
        ...pageToTrash,
        isTrash: true,
        isFavorite: false, // Remove from favorites on trash
        updatedAt: Date.now(),
      };
      handleUpdatePage(updated);

      // If active page was trashed, shift to next available page
      if (activePageId === id) {
        const nextActive = pages.find((p) => p.id !== id && !p.isTrash);
        setActivePageId(nextActive ? nextActive.id : null);
      }
    }
  };

  // Restore from Trash
  const handleRestoreFromTrash = (id: string) => {
    const pageToRestore = pages.find((p) => p.id === id);
    if (pageToRestore) {
      const updated = {
        ...pageToRestore,
        isTrash: false,
        updatedAt: Date.now(),
      };
      handleUpdatePage(updated);
      setActivePageId(id);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string) => {
    // 1. Filter local state
    const nextPages = pages.filter((p) => p.id !== id);
    setPages(nextPages);

    if (activePageId === id) {
      const nextActive = nextPages.find((p) => !p.isTrash);
      setActivePageId(nextActive ? nextActive.id : null);
    }

    // 2. Firestore Delete
    if (isCloudSynced) {
      try {
        await deleteDoc(doc(pagesCol, id));
      } catch (err) {
        console.error('Failed to delete from firestore', err);
      }
    }

    // 3. Save to localStorage
    localStorage.setItem('clutch-pages-cache', JSON.stringify(nextPages));
  };

  // Append AI Blocks to Current Page
  const handleImportBlocks = (newBlocks: Block[]) => {
    const activePage = pages.find((p) => p.id === activePageId);
    if (activePage) {
      // Clean empty lines at bottom before appending
      const currentBlocks = [...activePage.blocks];
      const filtered = currentBlocks.filter(b => b.content.trim() !== '');
      
      const updatedPage = {
        ...activePage,
        blocks: [...filtered, ...newBlocks],
        updatedAt: Date.now(),
      };
      handleUpdatePage(updatedPage);
    }
  };

  // Import AI draft as new page
  const handleImportAsNewPage = async (title: string, newBlocks: Block[]) => {
    const newId = Math.random().toString(36).substring(7);
    const newPage: Page = {
      id: newId,
      title: title || 'Clutch AI Draft',
      icon: '✨',
      coverImage: 'linear-gradient(135deg, #c084fc, #818cf8, #4f46e5)', // Cosmic cover default for AI drafts
      parentId: null,
      isFavorite: false,
      isTrash: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blocks: newBlocks,
    };

    const nextPages = [...pages, newPage];
    setPages(nextPages);
    setActivePageId(newId);

    if (isCloudSynced) {
      try {
        await setDoc(doc(pagesCol, newId), newPage);
      } catch (err) {
        console.error('Failed to save draft page to cloud', err);
      }
    }

    localStorage.setItem('clutch-pages-cache', JSON.stringify(nextPages));
    setIsAIPanelOpen(false); // Close AI panel on import
  };

  const computePriority = (dateStr?: string): 'low' | 'medium' | 'high' => {
    if (!dateStr) return 'low';
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr <= todayStr) return 'high';
    
    const today = new Date(todayStr);
    const due = new Date(dateStr);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 3) return 'medium';
    return 'low';
  };

  const handleQuickAddTask = async (content: string, dueDate?: string) => {
    const generalTasksPage = pages.find((p) => p.title === 'General Tasks' && !p.isTrash);
    const calculatedPriority = computePriority(dueDate);
    const newBlock: Block = {
      id: Math.random().toString(36).substring(7),
      type: 'todo',
      content: content.trim(),
      properties: {
        checked: false,
        dueDate: dueDate || undefined,
        priority: calculatedPriority
      }
    };

    let nextPages: Page[];

    if (generalTasksPage) {
      let updatedBlocks = [...generalTasksPage.blocks];
      if (updatedBlocks.length === 1 && updatedBlocks[0].type === 'text' && updatedBlocks[0].content === '') {
        updatedBlocks = [newBlock];
      } else {
        updatedBlocks.push(newBlock);
      }

      const updatedPage = {
        ...generalTasksPage,
        blocks: updatedBlocks,
        updatedAt: Date.now()
      };

      nextPages = pages.map((p) => (p.id === updatedPage.id ? updatedPage : p));

      if (isCloudSynced) {
        try {
          await setDoc(doc(pagesCol, updatedPage.id), updatedPage);
        } catch (err) {
          console.error('Failed to update Firestore page', err);
        }
      }
    } else {
      const newId = Math.random().toString(36).substring(7);
      const newPage: Page = {
        id: newId,
        title: 'General Tasks',
        icon: '📝',
        coverImage: null,
        parentId: null,
        isFavorite: false,
        isTrash: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        blocks: [newBlock],
      };

      nextPages = [...pages, newPage];

      if (isCloudSynced) {
        try {
          await setDoc(doc(pagesCol, newId), newPage);
        } catch (err) {
          console.error('Failed to create page on Firestore', err);
        }
      }
    }

    setPages(nextPages);
    localStorage.setItem('clutch-pages-cache', JSON.stringify(nextPages));
  };

  const activePage = pages.find((p) => p.id === activePageId) || null;

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#ffffff] dark:bg-[#09090d] text-zinc-900 dark:text-zinc-100 transition-colors duration-200 relative">
      
      {/* Vibrant Ambient Background Glows for Dark Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden dark:block">
        <div className="absolute -top-40 -left-40 w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[130px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-40 -right-40 w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[130px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-950/20 blur-[110px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[20%] left-[20%] w-[35%] h-[35%] rounded-full bg-emerald-950/15 blur-[100px]" />
      </div>

      {/* Subtle Ambient Background Glows for Light Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 block dark:hidden">
        <div className="absolute -top-40 -left-40 w-[50%] h-[50%] rounded-full bg-violet-100/30 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[55%] h-[55%] rounded-full bg-sky-100/30 blur-[110px]" />
      </div>

      {/* Search Command Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        pages={pages}
        onSelectPage={(id) => setActivePageId(id)}
        onCreatePage={(title) => handleCreatePage(title)}
      />

      {/* Hierarchical Workspace Sidebar */}
      <Sidebar
        pages={pages}
        activePageId={activePageId}
        onSelectPage={(id) => setActivePageId(id)}
        onCreatePage={handleCreatePage}
        onToggleFavorite={handleToggleFavorite}
        onMoveToTrash={handleMoveToTrash}
        onRestoreFromTrash={handleRestoreFromTrash}
        onPermanentDelete={handlePermanentDelete}
        onTriggerSearch={() => setIsSearchOpen(true)}
        onTriggerAI={() => setIsAIPanelOpen(!isAIPanelOpen)}
        onLaunchTask={() => setIsLaunchTaskOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentUser={currentUser}
        onLogin={handleGoogleLogin}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Page Top Header controls */}
        <header className="h-[45px] px-6 border-b border-[#e9e9e7] dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-[#0c0c10]/60 backdrop-blur-md shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle for large screens */}
            {!isSidebarOpen && (
              <button
                id="header-toggle-sidebar"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#787774] dark:text-[#9b9a97]"
                title="Open Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            
            {/* Breadcrumb path tracking */}
            <div className="flex items-center gap-2 text-sm text-[#787774] dark:text-[#9b9a97] font-medium select-none">
              <button
                id="header-breadcrumb-workspace"
                onClick={() => setActivePageId(null)}
                className="hover:text-[#37352f] dark:hover:text-[#ebebea] cursor-pointer transition-colors focus:outline-none"
                title="Go to Workspace Landing Page"
              >
                Workspace
              </button>
              {activePage && (
                <>
                  <span className="text-[#e9e9e7] dark:text-[#2c2c2c] select-none font-normal">/</span>
                  <span className="text-[#37352f] dark:text-[#ebebea] font-semibold truncate max-w-[180px]">
                    {activePage.icon ? <span className="mr-1">{activePage.icon}</span> : '📄'} {activePage.title || 'Untitled'}
                  </span>
                </>
              )}
              {activePageId === 'calendar' && (
                <>
                  <span className="text-[#e9e9e7] dark:text-[#2c2c2c] select-none font-normal">/</span>
                  <span className="text-[#37352f] dark:text-[#ebebea] font-semibold truncate max-w-[180px] flex items-center gap-1.5">
                    📅 Weekly Calendar
                  </span>
                </>
              )}
              {activePageId === 'profile' && (
                <>
                  <span className="text-[#e9e9e7] dark:text-[#2c2c2c] select-none font-normal">/</span>
                  <span className="text-[#37352f] dark:text-[#ebebea] font-semibold truncate max-w-[180px] flex items-center gap-1.5">
                    👤 Personal Profile
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {/* Sync connection status indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider select-none transition-all ${
                isCloudSynced
                  ? 'bg-[#edf3ec] text-[#1c5a27]'
                  : 'bg-[#fbf3db] text-[#603b2c]'
              }`}
              title={isCloudSynced ? 'Synced live with Google Cloud Firestore' : 'Offline Mode: Saved to Local Cache'}
            >
              {isCloudSynced ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#1c5a27] shrink-0" />
                  <span>Cloud Synced</span>
                </>
              ) : (
                <>
                  <CloudLightning className="w-3.5 h-3.5 text-[#603b2c] shrink-0" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Quick AI Trigger */}
            <button
              id="header-btn-ai-toggle"
              onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
              className={`p-1.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] transition-colors ${
                isAIPanelOpen ? 'text-[#37352f] bg-[#efefee] dark:text-[#ebebea] dark:bg-[#2f2f2f]' : 'text-[#787774] dark:text-[#9b9a97]'
              }`}
              title="Toggle Clutch AI Panel"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Urgent Deadlines Notification Bell */}
            <div className="relative">
              <button
                id="header-btn-notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen(!isNotificationsOpen);
                }}
                className={`p-1.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] transition-colors relative ${
                  isNotificationsOpen ? 'text-[#37352f] bg-[#efefee] dark:text-[#ebebea] dark:bg-[#2f2f2f]' : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
                title="View Approaching Deadlines & Alerts"
              >
                <Bell className="w-4 h-4" />
                {(globalTasks.filter(t => t.status !== 'completed' && t.date && t.date < new Date().toISOString().split('T')[0]).length +
                  globalTasks.filter(t => t.status !== 'completed' && t.date && t.date === new Date().toISOString().split('T')[0]).length) > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {globalTasks.filter(t => t.status !== 'completed' && t.date && t.date < new Date().toISOString().split('T')[0]).length +
                     globalTasks.filter(t => t.status !== 'completed' && t.date && t.date === new Date().toISOString().split('T')[0]).length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Overlay */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1c1c1c] border border-[#e9e9e7] dark:border-[#2c2c2c] rounded-lg shadow-xl py-2.5 z-50 overflow-hidden font-sans text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-1.5 border-b border-[#e9e9e7] dark:border-[#2c2c2c] flex items-center justify-between select-none">
                      <span className="text-[11px] font-bold text-[#37352f] dark:text-[#ebebea] uppercase tracking-wider">
                        Alerts & Deadlines
                      </span>
                      {(globalTasks.filter(t => t.status !== 'completed' && t.date && t.date < new Date().toISOString().split('T')[0]).length +
                        globalTasks.filter(t => t.status !== 'completed' && t.date && t.date === new Date().toISOString().split('T')[0]).length) > 0 && (
                        <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded-full">
                          {globalTasks.filter(t => t.status !== 'completed' && t.date && t.date < new Date().toISOString().split('T')[0]).length +
                           globalTasks.filter(t => t.status !== 'completed' && t.date && t.date === new Date().toISOString().split('T')[0]).length} Urgent
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar px-2 py-1 space-y-1">
                      {(globalTasks.filter(t => t.status !== 'completed' && t.date && t.date < new Date().toISOString().split('T')[0]).length +
                        globalTasks.filter(t => t.status !== 'completed' && t.date && t.date === new Date().toISOString().split('T')[0]).length) === 0 ? (
                        <div className="py-8 text-center text-[#91918e] text-xs flex flex-col items-center gap-1.5 select-none">
                          <span className="text-xl">🎉</span>
                          <span className="font-semibold text-zinc-500">All caught up! No pending deadlines.</span>
                        </div>
                      ) : (
                        <>
                          {globalTasks.filter(t => t.status !== 'completed' && t.date && t.date < new Date().toISOString().split('T')[0]).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-start justify-between p-2 rounded-md hover:bg-[#fbfbfa] dark:hover:bg-[#202020] transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-bold text-red-500 truncate flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> OVERDUE
                                </p>
                                <p className="text-xs text-[#37352f] dark:text-[#ebebea] font-semibold truncate mt-0.5">{task.title}</p>
                              </div>
                              <span className="text-[10px] text-red-500/80 font-bold shrink-0">{task.date}</span>
                            </div>
                          ))}
                          {globalTasks.filter(t => t.status !== 'completed' && t.date && t.date === new Date().toISOString().split('T')[0]).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-start justify-between p-2 rounded-md hover:bg-[#fbfbfa] dark:hover:bg-[#202020] transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-bold text-amber-500 truncate flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" /> DUE TODAY
                                </p>
                                <p className="text-xs text-[#37352f] dark:text-[#ebebea] font-semibold truncate mt-0.5">{task.title}</p>
                              </div>
                              <span className="text-[10px] text-amber-500/80 font-bold shrink-0">Today</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              id="header-btn-theme"
              onClick={toggleDarkMode}
              className="p-1.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Google Authentication / Profile Button */}
            {currentUser ? (
              <button
                id="header-btn-profile"
                onClick={() => setActivePageId('profile')}
                className="flex items-center gap-1.5 p-1 pl-1 pr-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] text-[#37352f] dark:text-[#ebebea] transition-all border border-zinc-200 dark:border-zinc-800 shrink-0 cursor-pointer"
                title="View Personal Details"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Profile'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-200/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <span className="text-xs font-semibold max-w-[85px] truncate hidden sm:inline">
                  {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Profile'}
                </span>
              </button>
            ) : (
              <button
                id="header-btn-login"
                onClick={handleGoogleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer"
                title="Sign In with Google"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connect Google</span>
              </button>
            )}
          </div>
        </header>

        {/* Editor Body container */}
        <div className="flex-1 flex overflow-hidden">
          {activePage ? (
            <Editor
              page={activePage}
              onUpdatePage={handleUpdatePage}
              onPageCreate={handleCreatePage}
              allPages={pages}
              onRestoreFromTrash={handleRestoreFromTrash}
              onPermanentDelete={handlePermanentDelete}
            />
          ) : activePageId === 'calendar' ? (
            <CalendarView
              pages={pages}
              onUpdatePage={handleUpdatePage}
              onSelectPage={(id) => setActivePageId(id)}
              onLaunchTask={() => setIsLaunchTaskOpen(true)}
            />
          ) : activePageId === 'profile' ? (
            <PersonalDetails
              onBack={() => setActivePageId(null)}
            />
          ) : (
            <Dashboard onSelectPage={(id) => setActivePageId(id)} />
          )}

          {/* Integrated Workspace AIPanel */}
          <AIPanel
            isOpen={isAIPanelOpen}
            onClose={() => setIsAIPanelOpen(false)}
            currentPage={activePage}
            onImportBlocks={handleImportBlocks}
            onImportAsNewPage={handleImportAsNewPage}
          />
        </div>
      </div>

      {/* Global Quick Add Task Button */}
      <QuickAdd onAddTask={handleQuickAddTask} />

      {/* Launch Task Modal */}
      <LaunchTaskModal
        isOpen={isLaunchTaskOpen}
        onClose={() => setIsLaunchTaskOpen(false)}
      />
    </div>
  );
}
