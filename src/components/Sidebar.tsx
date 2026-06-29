import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Settings,
  Search,
  Sparkles,
  Star,
  FolderOpen,
  Maximize2,
  Minimize2,
  Trash,
  RotateCcw,
  FileText,
  User,
  PanelLeftClose,
  Menu,
  Command,
  ClipboardList,
  Calendar,
  LogIn
} from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  pages: Page[];
  activePageId: string | null | 'calendar' | 'profile';
  onSelectPage: (id: string | null | 'calendar' | 'profile') => void;
  onCreatePage: (title: string, parentId?: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onRestoreFromTrash: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onTriggerSearch: () => void;
  onTriggerAI: () => void;
  onLaunchTask?: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentUser: any;
  onLogin: () => void;
}

export default function Sidebar({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onToggleFavorite,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onTriggerSearch,
  onTriggerAI,
  onLaunchTask,
  isOpen,
  setIsOpen,
  currentUser,
  onLogin,
}: SidebarProps) {
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [showTrash, setShowTrash] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectPage = (id: string | null | 'calendar' | 'profile') => {
    onSelectPage(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSubPages = (parentId: string | null) => {
    return pages.filter(p => p.parentId === parentId && !p.isTrash);
  };

  const favorites = pages.filter(p => p.isFavorite && !p.isTrash);
  const trashPages = pages.filter(p => p.isTrash);

  // Render subpage recursion
  const renderPageRow = (page: Page, level = 0) => {
    const subPages = getSubPages(page.id);
    const isExpanded = !!expandedPages[page.id];
    const isActive = activePageId === page.id;

    return (
      <div key={page.id} className="group/row">
        <div
          id={`sidebar-page-${page.id}`}
          role="button"
          tabIndex={0}
          onClick={() => selectPage(page.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectPage(page.id);
            }
          }}
          className={`w-full flex items-center justify-between py-1 px-2 rounded-md text-left transition-all text-[13px] cursor-pointer select-none ${
            isActive
              ? 'bg-zinc-100 dark:bg-white/10 text-indigo-600 dark:text-white font-semibold border-l-2 border-indigo-500 rounded-l-none'
              : 'text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-[#37352f] dark:hover:text-white'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            {/* Arrow expand toggle */}
            <span
              onClick={(e) => toggleExpand(page.id, e)}
              className="p-0.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] shrink-0"
            >
              {subPages.length > 0 ? (
                isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )
              ) : (
                <div className="w-3.5 h-3.5 flex items-center justify-center">
                  <div className="w-1 h-1 bg-[#e9e9e7] dark:bg-[#2c2c2c] rounded-full" />
                </div>
              )}
            </span>

            {/* Icon */}
            <span className="text-base shrink-0 select-none">
              {page.icon || '📄'}
            </span>

            {/* Title */}
            <span className="truncate">{page.title || 'Untitled Page'}</span>
          </div>

          {/* Quick inline action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <button
              id={`sidebar-action-fav-${page.id}`}
              title="Add to Favorites"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(page.id);
              }}
              className={`p-0.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-all ${
                page.isFavorite ? 'text-amber-500 opacity-100' : ''
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${page.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
            <button
              id={`sidebar-action-sub-${page.id}`}
              title="Add Subpage"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedPages(prev => ({ ...prev, [page.id]: true }));
                onCreatePage('Untitled Subpage', page.id);
              }}
              className="p-0.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              id={`sidebar-action-trash-${page.id}`}
              title="Move to Trash"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToTrash(page.id);
              }}
              className="p-0.5 rounded hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#91918e] hover:text-red-600 dark:hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subpages recursively */}
        {isExpanded && subPages.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            {subPages.map(subPage => renderPageRow(subPage, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootPages = pages.filter(p => p.parentId === null && !p.isTrash);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/45 dark:bg-black/75 z-35 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <div
        id="sidebar-panel"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#fbfbfa]/90 dark:bg-[#0c0c10]/60 border-r border-[#e9e9e7] dark:border-white/8 backdrop-blur-xl flex flex-col transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 shrink-0`}
      >
        {/* Workspace Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e9e9e7] dark:border-white/8">
          <button
            id="sidebar-workspace-header"
            onClick={() => selectPage(null)}
            className="flex items-center gap-2 hover:opacity-80 active:opacity-60 transition-opacity text-left cursor-pointer focus:outline-none"
            style={{ height: '35px' }}
            title="Go to Workspace Landing Page"
          >
            <svg 
              className="select-none shrink-0" 
              style={{ fontSize: '30px', width: '30px', height: '33px' }} 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 80,35 A 38,38 0 1,1 65,18 A 33,33 0 1,0 80,35 Z"
                fill="#20b5be"
              />
              <path
                d="M 38,52 L 49,63 L 66,42"
                stroke="#20b5be"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div>
              <h2 
                className="font-bold text-[#37352f] dark:text-[#ebebea] tracking-tight leading-tight"
                style={{
                  height: '23.5px',
                  width: '57.7125px',
                  fontSize: '22px',
                  textAlign: 'center',
                  fontStyle: 'normal'
                }}
              >
                Clutch
              </h2>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              id="sidebar-btn-ai"
              onClick={onTriggerAI}
              className="p-1.5 rounded-md hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
              title="Clutch AI Assistant"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              id="sidebar-toggle-close"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] lg:hidden transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global actions */}
        <div className="px-3 py-2.5 space-y-1">
          {/* Quick search */}
          <button
            id="sidebar-btn-search"
            onClick={onTriggerSearch}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-left transition-colors"
          >
            <div className="flex items-center gap-2 text-xs">
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </div>
            <div className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 bg-[#efefee] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#2c2c2c] text-[#91918e] rounded">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </button>

          {/* New Page Button */}
          <button
            id="sidebar-btn-new-root-page"
            onClick={() => onCreatePage('Untitled Page')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-xs font-semibold text-left transition-colors"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 text-[#91918e]" />
            <span>New Page</span>
          </button>

          {/* Launch New Task Button */}
          {onLaunchTask && (
            <button
              id="sidebar-btn-launch-task"
              onClick={onLaunchTask}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-xs font-semibold text-left transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span>Launch New Task</span>
            </button>
          )}

          {/* Weekly Calendar Button */}
          <button
            id="sidebar-btn-calendar-view"
            onClick={() => selectPage('calendar')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${
              activePageId === 'calendar'
                ? 'bg-[#efefee] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#ebebea] font-bold'
                : 'text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] hover:text-[#37352f] dark:hover:text-[#ebebea]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Weekly Calendar</span>
            </div>
            <div className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
              Live
            </div>
          </button>
        </div>

        {/* Main Content Areas */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar pb-6">
          {/* Favorites List */}
          {favorites.length > 0 && (
            <div>
              <div className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#91918e] dark:text-[#7c7b77] uppercase">
                <span>Favorites</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {favorites.map(page => (
                  <button
                    key={`fav-${page.id}`}
                    id={`sidebar-fav-${page.id}`}
                    onClick={() => selectPage(page.id)}
                    className={`w-full flex items-center justify-between py-1 px-2.5 rounded-md text-left text-[13px] transition-colors ${
                      activePageId === page.id
                        ? 'bg-[#efefee] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#ebebea] font-semibold'
                        : 'text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] hover:text-[#37352f] dark:hover:text-[#ebebea]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{page.icon || '📄'}</span>
                      <span className="truncate">{page.title || 'Untitled Page'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Root Pages List */}
          <div>
            <div className="px-2.5 py-1 flex items-center gap-1 text-[11px] font-bold tracking-wider text-[#91918e] dark:text-[#7c7b77] uppercase">
              <span>Pages</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {rootPages.length > 0 ? (
                rootPages.map(page => renderPageRow(page))
              ) : (
                <div className="px-2.5 py-2 text-center text-[12px] text-[#91918e] border border-dashed border-[#e9e9e7] dark:border-[#2c2c2c] rounded-lg">
                  No pages yet.
                </div>
              )}
            </div>
          </div>

          {/* Trash Toggle & Panel */}
          <div>
            <button
              id="sidebar-toggle-trash"
              onClick={() => setShowTrash(!showTrash)}
              className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-[#91918e] dark:text-[#7c7b77] uppercase hover:text-[#37352f] dark:hover:text-[#ebebea] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Trash className="w-3 h-3 text-[#91918e]" />
                <span>Trash ({trashPages.length})</span>
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform ${showTrash ? 'rotate-180' : ''}`} />
            </button>

            {showTrash && (
              <div className="mt-1.5 px-1 space-y-1 bg-[#efefee]/40 dark:bg-[#2f2f2f]/30 border border-[#e9e9e7] dark:border-[#2c2c2c] rounded-lg p-1.5">
                {trashPages.length > 0 ? (
                  trashPages.map(page => (
                    <div
                      key={`trash-${page.id}`}
                      id={`sidebar-trash-item-${page.id}`}
                      className="group flex items-center justify-between py-1 px-1.5 rounded-md text-[#5f5e5b] dark:text-[#9b9a97] hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] text-[12px] transition-colors"
                    >
                      <button
                        onClick={() => selectPage(page.id)}
                        className="flex-1 text-left truncate flex items-center gap-1.5"
                      >
                        <span className="shrink-0">{page.icon || '📄'}</span>
                        <span className="truncate">{page.title || 'Untitled'}</span>
                      </button>
                      {confirmDeleteId === page.id ? (
                        <div className="flex items-center gap-1 shrink-0 animate-fade-in z-30">
                          <button
                            id={`sidebar-trash-delete-confirm-yes-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPermanentDelete(page.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold"
                          >
                            Delete
                          </button>
                          <button
                            id={`sidebar-trash-delete-confirm-no-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 bg-zinc-200 dark:bg-[#3f3f3f] text-[#37352f] dark:text-[#ebebea] hover:bg-zinc-300 rounded text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`sidebar-trash-restore-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreFromTrash(page.id);
                            }}
                            className="p-1 text-[#91918e] hover:text-emerald-500 hover:bg-white dark:hover:bg-[#2f2f2f] rounded transition-colors"
                            title="Restore Page"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`sidebar-trash-delete-${page.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(page.id);
                            }}
                            className="p-1 text-[#91918e] hover:text-red-500 hover:bg-white dark:hover:bg-[#2f2f2f] rounded transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-[11px] text-[#91918e] italic">
                    Trash is empty
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User / Settings Profile Footer */}
        {currentUser ? (
          <div 
            id="sidebar-profile-footer"
            onClick={() => selectPage('profile')}
            className={`p-3 bg-[#fbfbfa] dark:bg-[#202020] border-t border-[#e9e9e7] dark:border-[#2c2c2c] flex items-center justify-between cursor-pointer hover:bg-[#efefee] dark:hover:bg-[#292929] transition-colors group ${
              activePageId === 'profile' ? 'bg-[#efefee] dark:bg-[#2c2c2c]' : ''
            }`}
            title="View Profile Details"
          >
            <div className="flex items-center gap-2 truncate">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-200/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="truncate">
                <div className="text-xs font-semibold text-[#37352f] dark:text-[#ebebea] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {currentUser.displayName || 'Clutch User'}
                </div>
                <div className="text-[10px] text-[#91918e] dark:text-[#7c7b77] truncate">
                  {currentUser.email || ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Settings className="w-3.5 h-3.5 text-[#91918e] group-hover:text-[#37352f] dark:group-hover:text-[#ebebea] transition-colors" />
            </div>
          </div>
        ) : (
          <div 
            id="sidebar-profile-footer"
            onClick={() => selectPage('profile')}
            className={`p-3 bg-[#fbfbfa] dark:bg-[#202020] border-t border-[#e9e9e7] dark:border-[#2c2c2c] flex items-center justify-between cursor-pointer hover:bg-[#efefee] dark:hover:bg-[#292929] transition-colors group ${
              activePageId === 'profile' ? 'bg-[#efefee] dark:bg-[#2c2c2c]' : ''
            }`}
            title="Using as Guest - View Profile Options"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                G
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-[#37352f] dark:text-[#ebebea] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Guest
                </div>
                <div className="text-[10px] text-[#91918e] dark:text-[#7c7b77] truncate">
                  Use as guest
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <LogIn className="w-3.5 h-3.5 text-[#91918e] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
