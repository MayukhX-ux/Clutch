import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Sparkles, Plus, CornerDownLeft, Command, X, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Page } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: Page[];
  onSelectPage: (id: string) => void;
  onCreatePage: (title: string) => void;
}

type SearchResultItem =
  | { type: 'page'; page: Page }
  | { type: 'task'; page: Page; block: any }
  | { type: 'create_page' };

export default function SearchModal({
  isOpen,
  onClose,
  pages,
  onSelectPage,
  onCreatePage,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'overdue'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Global counts for badges
  let totalTasksCount = 0;
  let totalOverdueCount = 0;

  pages.forEach(page => {
    if (page.isTrash) return;
    page.blocks.forEach(block => {
      if (block.type === 'todo') {
        totalTasksCount++;
        const isChecked = !!block.properties?.checked;
        const dueDate = block.properties?.dueDate;
        if (!isChecked && dueDate && dueDate < todayStr) {
          totalOverdueCount++;
        }
      }
    });
  });

  // 1. Gather & Filter All Match Lists
  // Match normal pages
  const matchedPages = pages.filter(page => {
    if (page.isTrash) return false;
    const titleMatch = page.title.toLowerCase().includes(searchQuery.toLowerCase());
    const blockMatch = page.blocks.some(block =>
      block.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return titleMatch || blockMatch;
  });

  // Match all tasks
  const matchedTasks: { page: Page; block: any }[] = [];
  pages.forEach(page => {
    if (page.isTrash) return;
    page.blocks.forEach(block => {
      if (block.type === 'todo') {
        const matchesSearch = block.content.toLowerCase().includes(searchQuery.toLowerCase());
        if (matchesSearch) {
          matchedTasks.push({ page, block });
        }
      }
    });
  });

  // Match overdue tasks
  const matchedOverdue: { page: Page; block: any }[] = [];
  pages.forEach(page => {
    if (page.isTrash) return;
    page.blocks.forEach(block => {
      if (block.type === 'todo') {
        const isChecked = !!block.properties?.checked;
        const dueDate = block.properties?.dueDate;
        const isOverdue = dueDate && dueDate < todayStr;

        if (!isChecked && isOverdue) {
          const matchesSearch = block.content.toLowerCase().includes(searchQuery.toLowerCase());
          if (matchesSearch) {
            matchedOverdue.push({ page, block });
          }
        }
      }
    });
  });

  // 2. Build Computed Selectable Search Items List
  const searchItems: SearchResultItem[] = [];

  if (activeTab === 'all') {
    matchedPages.forEach(page => {
      searchItems.push({ type: 'page', page });
    });
    searchItems.push({ type: 'create_page' });
  } else if (activeTab === 'tasks') {
    matchedTasks.forEach(item => {
      searchItems.push({ type: 'task', page: item.page, block: item.block });
    });
  } else if (activeTab === 'overdue') {
    matchedOverdue.forEach(item => {
      searchItems.push({ type: 'task', page: item.page, block: item.block });
    });
  }

  // Handle outside click
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

  // Focus input & reset state on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setSearchQuery('');
      setActiveTab('all');
    }
  }, [isOpen]);

  // Reset selection index when query or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeTab]);

  // Key handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen || searchItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % searchItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchItems.length) % searchItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = searchItems[selectedIndex];
        if (selectedItem) {
          if (selectedItem.type === 'page' || selectedItem.type === 'task') {
            onSelectPage(selectedItem.page.id);
            onClose();
          } else if (selectedItem.type === 'create_page') {
            onCreatePage(searchQuery || 'Untitled Page');
            onClose();
          }
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchItems, selectedIndex, searchQuery, onSelectPage, onCreatePage, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4 animate-fade-in font-sans">
      <div
        id="search-modal-container"
        ref={modalRef}
        className="w-full max-w-xl bg-[#ffffff] dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2c2c2c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[550px]"
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e9e9e7] dark:border-[#2c2c2c]">
          <Search className="w-5 h-5 text-[#91918e] shrink-0" />
          <input
            id="search-modal-input"
            ref={inputRef}
            type="text"
            placeholder={
              activeTab === 'all'
                ? "Search pages..."
                : activeTab === 'tasks'
                ? "Search tasks..."
                : "Search overdue tasks..."
            }
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
            }}
            className="w-full bg-transparent border-none outline-none text-[15px] text-[#37352f] dark:text-[#ebebea] placeholder-[#91918e]"
          />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#efefee] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#2c2c2c] rounded text-[#91918e] shadow-sm">ESC</span>
          </div>
          <button
            id="search-modal-close"
            onClick={onClose}
            className="p-1 hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] rounded text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters and Tab Navigation */}
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50/50 dark:bg-[#1b1b1b]/35 border-b border-[#e9e9e7] dark:border-[#2c2c2c] overflow-x-auto select-none shrink-0 scrollbar-none">
          <button
            id="search-tab-all"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-white dark:text-zinc-950 dark:border-white shadow-sm'
                : 'bg-white text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Pages</span>
          </button>
          
          <button
            id="search-tab-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-white dark:text-zinc-950 dark:border-white shadow-sm'
                : 'bg-white text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tasks Only</span>
            {totalTasksCount > 0 && (
              <span className={`text-[10px] px-1 rounded font-bold ${
                activeTab === 'tasks'
                  ? 'bg-zinc-700 text-white dark:bg-zinc-200 dark:text-zinc-950'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {totalTasksCount}
              </span>
            )}
          </button>

          <button
            id="search-tab-overdue"
            onClick={() => setActiveTab('overdue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:border-rose-500 shadow-sm'
                : 'bg-white text-rose-600 border-zinc-200 dark:bg-zinc-900 dark:text-rose-400 dark:border-zinc-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Overdue Items</span>
            {totalOverdueCount > 0 && (
              <span className={`text-[10px] px-1 rounded font-bold ${
                activeTab === 'overdue'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              }`}>
                {totalOverdueCount}
              </span>
            )}
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar min-h-[150px]">
          {searchItems.length > 0 ? (
            searchItems.map((item, index) => {
              const isSelected = index === selectedIndex;

              if (item.type === 'page') {
                const { page } = item;
                return (
                  <button
                    key={page.id}
                    id={`search-item-${page.id}`}
                    onClick={() => {
                      onSelectPage(page.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-[#efefee] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#ebebea] font-medium'
                        : 'text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee]/50 dark:hover:bg-[#2f2f2f]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate flex-1">
                      <span className="text-lg shrink-0">{page.icon || '📄'}</span>
                      <div className="truncate flex-1 min-w-0">
                        <div className="text-[14px] font-medium truncate">{page.title || 'Untitled'}</div>
                        {page.blocks && page.blocks.length > 0 && (
                          <div className="text-[11px] text-[#91918e] truncate max-w-sm mt-0.5">
                            {page.blocks.map(b => b.content).filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-[11px] text-[#91918e] shrink-0 ml-2">
                        <span>Open</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              }

              if (item.type === 'task') {
                const { page, block } = item;
                const isChecked = !!block.properties?.checked;
                const dueDate = block.properties?.dueDate;
                const priority = block.properties?.priority || 'low';

                let priorityBadge = null;
                if (priority === 'high') {
                  priorityBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/25 dark:text-rose-400 dark:border-rose-900/40 shrink-0">
                      High
                    </span>
                  );
                } else if (priority === 'medium') {
                  priorityBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/25 dark:text-amber-400 dark:border-amber-900/40 shrink-0">
                      Medium
                    </span>
                  );
                } else if (priority === 'low') {
                  priorityBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-900/40 shrink-0">
                      Low
                    </span>
                  );
                }

                return (
                  <button
                    key={`${page.id}-${block.id}`}
                    id={`search-item-${page.id}-${block.id}`}
                    onClick={() => {
                      onSelectPage(page.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-[#efefee] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#ebebea] font-medium'
                        : 'text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee]/50 dark:hover:bg-[#2f2f2f]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate flex-1 min-w-0">
                      {/* Checkbox circle indicator */}
                      <div className="shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-[#91918e]/55 dark:border-[#91918e]/35" />
                        )}
                      </div>

                      <div className="truncate flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap max-w-full">
                          <span className={`text-[14px] truncate ${isChecked ? 'line-through opacity-50' : 'font-medium text-[#37352f] dark:text-[#ebebea]'}`}>
                            {block.content || 'Untitled task'}
                          </span>
                          {priorityBadge}
                          {dueDate && (
                            <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                              !isChecked && dueDate < todayStr
                                ? 'bg-rose-50 text-rose-600 border-rose-200/50 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                                : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              <span>{dueDate}</span>
                              {!isChecked && dueDate < todayStr && (
                                <span className="font-extrabold text-[8px] text-rose-700 dark:text-rose-400 uppercase tracking-wide ml-0.5">
                                  OVERDUE
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-[#91918e] mt-1 flex items-center gap-1 font-semibold">
                          <span>found in page</span>
                          <span className="text-zinc-650 dark:text-zinc-300 font-bold">{page.icon || '📄'} {page.title || 'Untitled'}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-[11px] text-[#91918e] shrink-0 ml-2">
                        <span>Go to page</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              }

              if (item.type === 'create_page') {
                return (
                  <button
                    key="create_page_option"
                    id="search-modal-create-btn"
                    onClick={() => {
                      onCreatePage(searchQuery || 'Untitled Page');
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-[#efefee] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#ebebea] font-medium'
                        : 'text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee]/50 dark:hover:bg-[#2f2f2f]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-[14px]">
                      <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        Create new page <span className="font-bold text-[#37352f] dark:text-[#ebebea]">"{searchQuery || 'Untitled'}"</span>
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-[11px] text-[#91918e]">
                        <span>Create</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              }

              return null;
            })
          ) : (
            <div className="py-12 text-center text-[#91918e] text-sm font-semibold flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🔍</span>
              <span>No matching results found in this tab</span>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#fbfbfa] dark:bg-[#202020] border-t border-[#e9e9e7] dark:border-[#2c2c2c] flex items-center justify-between text-[11px] text-[#91918e] select-none shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="font-mono bg-[#efefee] dark:bg-[#2f2f2f] px-1 py-0.5 rounded text-[9px] font-bold">↑↓</span> Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono bg-[#efefee] dark:bg-[#2f2f2f] px-1 py-0.5 rounded text-[9px] font-bold">Enter</span> Open
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#37352f] dark:text-[#ebebea] font-semibold">
            <Sparkles className="w-3 h-3 shrink-0 text-indigo-500 animate-pulse" />
            <span>Clutch Task Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}
