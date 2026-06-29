import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  Menu,
  CheckSquare,
  Square,
  List,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Terminal,
  Columns,
  Image as ImageIcon,
  Smile,
  ChevronsUpDown,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Languages,
  Check,
  RefreshCw,
  Eye,
  Settings,
  HelpCircle,
  FileText,
  AlertTriangle,
  RotateCcw,
  GripVertical,
  Filter,
  SlidersHorizontal,
  Crown,
  Flower,
  Award
} from 'lucide-react';
import { Page, Block, BlockType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import CoverImageSelector from './CoverImageSelector';
import { db, doc, setDoc, deleteDoc, onSnapshot, collection } from '../lib/firebase';

interface EditorProps {
  page: Page;
  onUpdatePage: (updatedPage: Page) => void;
  onPageCreate: (title: string, parentId?: string | null) => void;
  allPages: Page[];
  onRestoreFromTrash?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
}

const LANGUAGES = ['typescript', 'javascript', 'python', 'html', 'css', 'json', 'sql', 'bash'];

const EMOJIS = ['📄', '✨', '💡', '🚀', '🎯', '📝', '💼', '🏡', '📚', '🎨', '🔥', '⚙️', '💻', '🌱', '🌍'];

const COLLABORATOR_NAMES = [
  'Creative Cheetah', 'Artistic Axolotl', 'Bright Badger', 'Dynamic Dolphin',
  'Eager Elephant', 'Friendly Fox', 'Gentle Giraffe', 'Happy Hedgehog',
  'Clever Koala', 'Mindful Monkey', 'Noble Owl', 'Patient Penguin'
];

const COLLABORATOR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'
];

function getOrCreateCollaborator() {
  if (typeof window === 'undefined') return { id: 'collab_temp', name: 'Guest', color: '#3b82f6' };
  const cached = sessionStorage.getItem('clutch-collaborator');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  const name = COLLABORATOR_NAMES[Math.floor(Math.random() * COLLABORATOR_NAMES.length)];
  const color = COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
  const id = 'collab_' + Math.random().toString(36).substring(7);
  const collab = { id, name, color };
  sessionStorage.setItem('clutch-collaborator', JSON.stringify(collab));
  return collab;
}

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

export default function Editor({
  page,
  onUpdatePage,
  onPageCreate,
  allPages,
  onRestoreFromTrash,
  onPermanentDelete
}: EditorProps) {
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDeleteEditor, setConfirmDeleteEditor] = useState(false);
  const [activeSlashBlockId, setActiveSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);
  const [inlineAIBlockId, setInlineAIBlockId] = useState<string | null>(null);
  const [inlineAIPrompt, setInlineAIPrompt] = useState('');
  const [inlineAILoading, setInlineAILoading] = useState(false);
  const [inlineAIAction, setInlineAIAction] = useState<string | null>(null);

  // Drag and Drop States
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [draggableBlockId, setDraggableBlockId] = useState<string | null>(null);
  const [isDragOverTrash, setIsDragOverTrash] = useState(false);

  // Filter and Sort States
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortPriority, setSortPriority] = useState<'none' | 'desc' | 'asc'>('none');

  // Celebration States
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedTaskTitle, setCelebratedTaskTitle] = useState('');

  const blockRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const blockMenuRef = useRef<HTMLDivElement>(null);

  // Collaborative Presence & Blocks
  const [collaborator] = useState(() => getOrCreateCollaborator());
  const [activeCollaborators, setActiveCollaborators] = useState<any[]>([]);
  const [collaborativeBlocks, setCollaborativeBlocks] = useState<Record<string, Block>>({});
  const [activeFocusedBlockId, setActiveFocusedBlockId] = useState<string | null>(null);
  const currentFocusedBlockIdRef = useRef<string | null>(null);
  const pendingWrites = useRef<Record<string, any>>({});
  const upgradedPages = useRef<Record<string, boolean>>({});

  // 1. Subscribe to Live Presence
  useEffect(() => {
    if (!page.id || !db) return;

    // Set initial presence document
    const presenceRef = doc(db, 'pages', page.id, 'presence', collaborator.id);
    setDoc(presenceRef, {
      id: collaborator.id,
      name: collaborator.name,
      color: collaborator.color,
      activeBlockId: null,
      updatedAt: Date.now()
    }).catch(err => console.error('Failed to set initial presence', err));

    // Keep-alive heartbeat interval every 5s
    const keepAlive = setInterval(() => {
      setDoc(presenceRef, {
        id: collaborator.id,
        name: collaborator.name,
        color: collaborator.color,
        activeBlockId: currentFocusedBlockIdRef.current,
        updatedAt: Date.now()
      }).catch(() => {});
    }, 5000);

    // Subscribe to all presence docs in this page's subcollection
    const presenceCol = collection(db, 'pages', page.id, 'presence');
    const unsubPresence = onSnapshot(
      presenceCol,
      (snapshot) => {
        const list: any[] = [];
        const now = Date.now();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Clear stale presences (older than 15s) and ignore self
          if (data.id !== collaborator.id && (now - (data.updatedAt || 0)) < 15000) {
            list.push(data);
          }
        });
        setActiveCollaborators(list);
      },
      (error) => {
        console.warn('Presence subscription failed (offline/permission issue):', error);
      }
    );

    return () => {
      clearInterval(keepAlive);
      unsubPresence();
      // Clean up presence on unmount/page change
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [page.id, collaborator.id]);

  // 2. Subscribe to Collaborative Content Blocks subcollection
  useEffect(() => {
    if (!page.id || !db) return;

    const blocksCol = collection(db, 'pages', page.id, 'blocks');
    const unsubBlocks = onSnapshot(
      blocksCol,
      async (snapshot) => {
        // Upgrade existing pages to subcollection model on first view
        if (snapshot.empty && page.blocks && page.blocks.length > 0 && !upgradedPages.current[page.id]) {
          upgradedPages.current[page.id] = true;
          console.log(`Upgrading page ${page.id} to collaborative subcollection blocks...`);
          try {
            for (const block of page.blocks) {
              const blockRef = doc(db, 'pages', page.id, 'blocks', block.id);
              await setDoc(blockRef, block);
            }
          } catch (err) {
            console.error('Failed to upgrade blocks to subcollection', err);
          }
          return;
        }

        const blocksMap: Record<string, Block> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Block;
          blocksMap[docSnap.id] = data;
        });
        setCollaborativeBlocks(blocksMap);
      },
      (error) => {
        console.warn('Blocks subscription failed (offline/permission issue):', error);
      }
    );

    return () => unsubBlocks();
  }, [page.id]);

  // Help function to update block immediately on Firestore and local cache
  const updateBlockImmediate = async (blockId: string, type: BlockType, content: string, properties?: any) => {
    // 1. Update React parent state
    const updatedBlocks = page.blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, type, content, properties: properties || b.properties };
      }
      return b;
    });
    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now()
    });

    // 2. Set subcollection block doc
    try {
      const blockRef = doc(db, 'pages', page.id, 'blocks', blockId);
      await setDoc(blockRef, {
        id: blockId,
        type,
        content,
        properties: properties || null,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Failed to update block immediately', err);
    }
  };

  // Debounced write helper for smooth keypress typing response
  const debounceBlockWrite = (blockId: string, type: string, content: string, properties?: any) => {
    if (pendingWrites.current[blockId]) {
      clearTimeout(pendingWrites.current[blockId]);
    }

    pendingWrites.current[blockId] = setTimeout(async () => {
      try {
        const blockRef = doc(db, 'pages', page.id, 'blocks', blockId);
        await setDoc(blockRef, {
          id: blockId,
          type,
          content,
          properties: properties || null,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error('Failed debounced write', err);
      }
      delete pendingWrites.current[blockId];
    }, 400); // 400ms is perfectly snappy
  };

  // Helper to read current block content with collaboration override
  const getBlockType = (b: Block) => {
    return collaborativeBlocks[b.id]?.type || b.type;
  };

  const getBlockContent = (b: Block) => {
    const colBlock = collaborativeBlocks[b.id];
    // If we are actively editing this block, use local cache to avoid cursor jump/flicker
    if (activeFocusedBlockId === b.id) {
      return b.content;
    }
    return colBlock ? colBlock.content : b.content;
  };

  const getBlockProperties = (b: Block) => {
    return collaborativeBlocks[b.id]?.properties || b.properties;
  };

  // Initialize a page with at least one text block if it is empty
  useEffect(() => {
    if (!page.blocks || page.blocks.length === 0) {
      onUpdatePage({
        ...page,
        blocks: [{ id: Math.random().toString(36).substring(7), type: 'text', content: '' }],
      });
    }
  }, [page, onUpdatePage]);

  // Handle outside click for slash menu and block menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setActiveSlashBlockId(null);
      }
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target as Node)) {
        setActiveMenuBlockId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update Page Title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdatePage({
      ...page,
      title: e.target.value,
      updatedAt: Date.now(),
    });
  };

  // Update specific block text
  const handleBlockContentChange = (blockId: string, content: string) => {
    const updatedBlocks = page.blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, content };
      }
      return b;
    });

    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    const changedBlock = page.blocks.find(b => b.id === blockId);
    if (changedBlock) {
      debounceBlockWrite(blockId, changedBlock.type, content, changedBlock.properties);
    }

    // Handle inline slash commands "/" trigger
    if (content.endsWith('/')) {
      setActiveSlashBlockId(blockId);
      setSlashQuery('');
    } else if (activeSlashBlockId === blockId) {
      const slashIndex = content.lastIndexOf('/');
      if (slashIndex !== -1) {
        setSlashQuery(content.substring(slashIndex + 1));
      } else {
        setActiveSlashBlockId(null);
      }
    }
  };

  // Create new block on pressing Enter
  const handleKeyDown = (e: React.KeyboardEvent, index: number, block: Block) => {
    if (e.key === 'Enter' && !e.shiftKey && activeSlashBlockId === null) {
      e.preventDefault();
      
      const newBlock: Block = {
        id: Math.random().toString(36).substring(7),
        type: 'text',
        content: '',
      };

      const updatedBlocks = [...page.blocks];
      updatedBlocks.splice(index + 1, 0, newBlock);

      onUpdatePage({
        ...page,
        blocks: updatedBlocks,
        updatedAt: Date.now(),
      });

      // Instantly save to cooperative blocks subcollection
      setDoc(doc(db, 'pages', page.id, 'blocks', newBlock.id), newBlock).catch(() => {});

      // Focus on the newly created block in next paint cycle
      setTimeout(() => {
        blockRefs.current[newBlock.id]?.focus();
      }, 30);
    }

    // Backspace to remove empty blocks or reset custom block back to 'text'
    if (e.key === 'Backspace' && block.content === '') {
      if (block.type !== 'text') {
        e.preventDefault();
        changeBlockType(block.id, 'text');
      } else if (page.blocks.length > 1) {
        e.preventDefault();
        const updatedBlocks = page.blocks.filter(b => b.id !== block.id);
        
        // Focus the previous block
        const prevBlock = page.blocks[index - 1];
        if (prevBlock) {
          setTimeout(() => {
            const el = blockRefs.current[prevBlock.id];
            if (el) {
              el.focus();
              // Position cursor at end
              if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                el.setSelectionRange(el.value.length, el.value.length);
              }
            }
          }, 10);
        }

        onUpdatePage({
          ...page,
          blocks: updatedBlocks,
          updatedAt: Date.now(),
        });

        // Delete from cooperative blocks subcollection
        deleteDoc(doc(db, 'pages', page.id, 'blocks', block.id)).catch(() => {});
      }
    }

    // Arrow Up/Down navigation between blocks
    if (e.key === 'ArrowUp' && index > 0) {
      const prevBlock = page.blocks[index - 1];
      if (prevBlock) {
        e.preventDefault();
        blockRefs.current[prevBlock.id]?.focus();
      }
    }
    if (e.key === 'ArrowDown' && index < page.blocks.length - 1) {
      const nextBlock = page.blocks[index + 1];
      if (nextBlock) {
        e.preventDefault();
        blockRefs.current[nextBlock.id]?.focus();
      }
    }
  };

  // Change block type from slash menu or block settings
  const changeBlockType = (blockId: string, newType: BlockType) => {
    const targetBlock = page.blocks.find(b => b.id === blockId);
    let cleanContent = targetBlock ? targetBlock.content : '';
    if (cleanContent.endsWith('/')) {
      cleanContent = cleanContent.slice(0, -1);
    } else {
      const lastSlash = cleanContent.lastIndexOf('/');
      if (lastSlash !== -1) {
        cleanContent = cleanContent.substring(0, lastSlash);
      }
    }

    const targetProperties = newType === 'todo' ? { checked: false } : newType === 'code' ? { language: 'javascript' } : (targetBlock?.properties || null);

    const updatedBlocks = page.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          type: newType,
          content: cleanContent,
          properties: targetProperties,
        };
      }
      return b;
    });

    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    // Save directly to Firestore blocks subcollection
    setDoc(doc(db, 'pages', page.id, 'blocks', blockId), {
      id: blockId,
      type: newType,
      content: cleanContent,
      properties: targetProperties,
      updatedAt: Date.now()
    }).catch(() => {});

    setActiveSlashBlockId(null);
    setActiveMenuBlockId(null);

    // Refocus on changed block
    setTimeout(() => {
      blockRefs.current[blockId]?.focus();
    }, 30);
  };

  // Toggle todo item completion state
  const handleToggleTodo = (blockId: string, currentChecked: boolean) => {
    const targetBlock = page.blocks.find(b => b.id === blockId);
    const targetProperties = {
      ...(targetBlock?.properties || {}),
      checked: !currentChecked,
    };

    if (!currentChecked && targetBlock) {
      setCelebratedTaskTitle(targetBlock.content || 'Untitled Task');
      setShowCelebration(true);
    }

    const updatedBlocks = page.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          properties: targetProperties,
        };
      }
      return b;
    });

    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    if (targetBlock) {
      setDoc(doc(db, 'pages', page.id, 'blocks', blockId), {
        id: blockId,
        type: targetBlock.type,
        content: targetBlock.content,
        properties: targetProperties,
        updatedAt: Date.now()
      }).catch(() => {});
    }
  };

  // Set todo item due date
  const handleBlockDueDateChange = (blockId: string, dueDate: string) => {
    const targetBlock = page.blocks.find(b => b.id === blockId);
    const targetProperties = {
      ...(targetBlock?.properties || {}),
      dueDate: dueDate || undefined,
    };

    const updatedBlocks = page.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          properties: targetProperties,
        };
      }
      return b;
    });

    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    if (targetBlock) {
      setDoc(doc(db, 'pages', page.id, 'blocks', blockId), {
        id: blockId,
        type: targetBlock.type,
        content: targetBlock.content,
        properties: targetProperties,
        updatedAt: Date.now()
      }).catch(() => {});
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
  };

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    if (draggedBlockId !== blockId) {
      setDragOverBlockId(blockId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, blockId: string) => {
    if (dragOverBlockId === blockId) {
      setDragOverBlockId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    const sourceBlockId = e.dataTransfer.getData('text/plain') || draggedBlockId;
    if (!sourceBlockId || sourceBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const sourceIndex = page.blocks.findIndex(b => b.id === sourceBlockId);
    const targetIndex = page.blocks.findIndex(b => b.id === targetBlockId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updatedBlocks = [...page.blocks];
      const [movedBlock] = updatedBlocks.splice(sourceIndex, 1);
      updatedBlocks.splice(targetIndex, 0, movedBlock);

      onUpdatePage({
        ...page,
        blocks: updatedBlocks,
        updatedAt: Date.now()
      });
    }

    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDraggableBlockId(null);
    setIsDragOverTrash(false);
  };

  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (page.blocks.length > 1) {
      setIsDragOverTrash(true);
    }
  };

  const handleTrashDragLeave = () => {
    setIsDragOverTrash(false);
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceBlockId = e.dataTransfer.getData('text/plain') || draggedBlockId;
    if (sourceBlockId && page.blocks.length > 1) {
      deleteBlock(sourceBlockId);
    }
    setDraggedBlockId(null);
    setIsDragOverTrash(false);
  };

  const getPriorityScore = (block: Block): number => {
    const priority = computePriority(block.properties?.dueDate);
    if (priority === 'high') return 3;
    if (priority === 'medium') return 2;
    return 1;
  };

  const getRenderedBlocks = () => {
    if (!page.blocks) return [];
    let blocksWithIndices = page.blocks.map((block, index) => ({ block, originalIndex: index }));

    // Apply filtering on todo blocks
    if (filterPriority !== 'all') {
      blocksWithIndices = blocksWithIndices.filter(item => {
        if (item.block.type !== 'todo') return true;
        const blockPriority = computePriority(item.block.properties?.dueDate);
        return blockPriority === filterPriority;
      });
    }

    // Apply sorting on todo blocks in-place of their relative layout positions
    if (sortPriority !== 'none') {
      const todoIndices: number[] = [];
      const todoBlocks: Block[] = [];
      
      blocksWithIndices.forEach((item, idx) => {
        if (item.block.type === 'todo') {
          todoIndices.push(idx);
          todoBlocks.push(item.block);
        }
      });

      // Sort the todo blocks
      todoBlocks.sort((a, b) => {
        const scoreA = getPriorityScore(a);
        const scoreB = getPriorityScore(b);
        if (sortPriority === 'desc') {
          return scoreB - scoreA;
        } else {
          return scoreA - scoreB;
        }
      });

      // Put them back at the positions
      todoIndices.forEach((targetIdx, i) => {
        blocksWithIndices[targetIdx] = {
          ...blocksWithIndices[targetIdx],
          block: todoBlocks[i]
        };
      });
    }

    return blocksWithIndices;
  };

  // Set code block programming language
  const handleCodeLanguageChange = (blockId: string, language: string) => {
    const targetBlock = page.blocks.find(b => b.id === blockId);
    const targetProperties = {
      ...(targetBlock?.properties || {}),
      language,
    };

    const updatedBlocks = page.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          properties: targetProperties,
        };
      }
      return b;
    });

    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    if (targetBlock) {
      setDoc(doc(db, 'pages', page.id, 'blocks', blockId), {
        id: blockId,
        type: targetBlock.type,
        content: targetBlock.content,
        properties: targetProperties,
        updatedAt: Date.now()
      }).catch(() => {});
    }
  };

  // Move a block index up or down
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === page.blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedBlocks = [...page.blocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[targetIndex];
    updatedBlocks[targetIndex] = temp;

    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    setActiveMenuBlockId(null);
  };

  // Delete specific block
  const deleteBlock = (blockId: string) => {
    if (page.blocks.length === 1) return; // Must keep at least one block

    const updatedBlocks = page.blocks.filter(b => b.id !== blockId);
    onUpdatePage({
      ...page,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    // Delete from cooperative subcollection
    deleteDoc(doc(db, 'pages', page.id, 'blocks', blockId)).catch(() => {});

    setActiveMenuBlockId(null);
  };

  // Handle inline AI actions (summarize, expand, short, translate, etc)
  const handleInlineAIAction = async (blockId: string, actionName: string, targetLang?: string) => {
    const blockToProcess = page.blocks.find(b => b.id === blockId);
    if (!blockToProcess || !blockToProcess.content.trim()) return;

    setInlineAIBlockId(blockId);
    setInlineAIAction(actionName);
    setInlineAILoading(true);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inlineAIPrompt,
          blockContent: blockToProcess.content,
          pageTitle: page.title,
          action: actionName,
          targetLang,
        }),
      });

      if (!response.ok) throw new Error('AI Error');
      const data = await response.json();

      if (data.text) {
        // Update the block content with the generated AI content
        const updatedBlocks = page.blocks.map(b => {
          if (b.id === blockId) {
            return { ...b, content: data.text.trim() };
          }
          return b;
        });

        onUpdatePage({
          ...page,
          blocks: updatedBlocks,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Inline AI error:', err);
    } finally {
      setInlineAIBlockId(null);
      setInlineAIAction(null);
      setInlineAILoading(false);
      setInlineAIPrompt('');
    }
  };

  // Filter slash commands
  const SLASH_COMMANDS = [
    { type: 'text', label: 'Text', desc: 'Plain writing block', icon: FileText },
    { type: 'h1', label: 'Heading 1', desc: 'Large title section', icon: Heading1 },
    { type: 'h2', label: 'Heading 2', desc: 'Medium section', icon: Heading2 },
    { type: 'h3', label: 'Heading 3', desc: 'Small sub-heading', icon: Heading3 },
    { type: 'todo', label: 'To-do List', desc: 'Checkbox item list', icon: CheckSquare },
    { type: 'bullet', label: 'Bullet List', desc: 'Unordered point list', icon: List },
    { type: 'quote', label: 'Quote', desc: 'Stylized quotation block', icon: Quote },
    { type: 'callout', label: 'Callout', desc: 'Icon background tip card', icon: Smile },
    { type: 'code', label: 'Code Block', desc: 'Syntactical monospace area', icon: Terminal },
    { type: 'divider', label: 'Divider', desc: 'Thin horizontal rule', icon: MoreHorizontal },
    { type: 'image', label: 'Image', desc: 'Embed an image from URL', icon: ImageIcon },
  ];

  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(slashQuery.toLowerCase())
  );

  // Calculate todo list progress
  const pageTodoBlocks = (page.blocks || []).filter(b => b.type === 'todo');
  const pageTotalTodos = pageTodoBlocks.length;
  const pageCheckedTodos = pageTodoBlocks.filter(b => !!b.properties?.checked).length;
  const pageProgressPercent = pageTotalTodos > 0 ? Math.round((pageCheckedTodos / pageTotalTodos) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto h-full flex flex-col items-stretch custom-scrollbar relative bg-transparent pb-20 pt-6">
      {/* Trash Warning Banner */}
      {page.isTrash && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40 py-2.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-450 shrink-0 select-none mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
            <span>This page is currently in the Trash bin. You are viewing it in read-only mode.</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onRestoreFromTrash && (
              <button
                id="editor-btn-restore-page"
                onClick={() => onRestoreFromTrash(page.id)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#202020] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 rounded text-[11px] font-bold transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-spin-reverse" />
                <span>Restore Page</span>
              </button>
            )}
            {onPermanentDelete && (
              <button
                id="editor-btn-delete-page"
                onClick={() => {
                  if (confirmDeleteEditor) {
                    onPermanentDelete(page.id);
                    setConfirmDeleteEditor(false);
                  } else {
                    setConfirmDeleteEditor(true);
                  }
                }}
                onMouseLeave={() => setConfirmDeleteEditor(false)}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded text-[11px] font-bold transition-all shadow-sm shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{confirmDeleteEditor ? 'Click again to confirm' : 'Delete Permanently'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-3.5 sm:px-6 lg:px-12 mt-4 relative z-10 flex flex-col">
        
        {/* Live Collaborators Presence */}
        {activeCollaborators.length > 0 && (
          <div className="flex items-center gap-1.5 self-end mb-4 bg-white/50 dark:bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm select-none animate-fade-in z-30">
            <span className="text-[10px] text-[#787774] dark:text-[#9b9a97] font-semibold mr-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>Active Collaborators ({activeCollaborators.length}):</span>
            </span>
            <div className="flex -space-x-1.5">
              {activeCollaborators.map((collab) => {
                const initial = collab.name ? collab.name.split(' ').map((w: string) => w[0]).join('') : '?';
                return (
                  <div
                    key={collab.id}
                    title={collab.name}
                    className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white dark:border-[#191919] cursor-default transition-all hover:scale-110 hover:z-10 shadow-sm"
                    style={{ backgroundColor: collab.color }}
                  >
                    {initial}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Page Icon Emoji */}
        <div className="relative inline-block mb-3 select-none self-start">
          <button
            id="editor-page-icon"
            onClick={() => !page.isTrash && setShowEmojiPicker(!showEmojiPicker)}
            disabled={page.isTrash}
            className={`w-16 h-16 rounded flex items-center justify-center text-[72px] transition-all bg-transparent border-none ${
              page.isTrash ? 'opacity-80' : 'hover:scale-105 active:scale-95'
            }`}
          >
            {page.icon || '📄'}
          </button>

          {/* Inline Emoji Selector Popover */}
          {showEmojiPicker && (
            <div className="absolute top-16 left-0 z-40 glass-panel-heavy rounded-2xl shadow-2xl p-2.5 grid grid-cols-5 gap-1.5 w-48 animate-fade-in">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  id={`emoji-picker-${emoji}`}
                  onClick={() => {
                    onUpdatePage({ ...page, icon: emoji, updatedAt: Date.now() });
                    setShowEmojiPicker(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-[#efefee]/80 dark:hover:bg-white/5 rounded-lg text-lg transition-all"
                >
                  {emoji}
                </button>
              ))}
              <button
                id="emoji-picker-remove"
                onClick={() => {
                  onUpdatePage({ ...page, icon: null, updatedAt: Date.now() });
                  setShowEmojiPicker(false);
                }}
                className="col-span-5 py-1 text-[10px] text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] font-bold border-t border-zinc-200/80 dark:border-white/10 mt-1"
              >
                Remove Icon
              </button>
            </div>
          )}
        </div>

        {/* Page Title */}
        <div className="mb-6 shrink-0">
          <input
            id="editor-page-title-input"
            type="text"
            value={page.title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            disabled={page.isTrash}
            className="w-full bg-transparent border-none outline-none font-sans font-bold text-[40px] text-[#37352f] dark:text-[#ebebea] placeholder-[#e9e9e7] dark:placeholder-[#2c2c2c] tracking-tight py-2 disabled:opacity-85"
          />
        </div>

        {/* Dynamic Todo Progress Bar */}
        {pageTotalTodos > 0 && (
          <div
            id="editor-todo-progress-container"
            className="mb-6 p-5 glass-panel rounded-2xl flex flex-col gap-2.5 shadow-md select-none animate-fade-in shrink-0"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                  🎯
                </span>
                <span>Task Block Progress</span>
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full text-[11px]">
                {pageCheckedTodos} of {pageTotalTodos} completed ({pageProgressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden relative">
              <motion.div
                id="editor-todo-progress-fill"
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pageProgressPercent}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Editor Toolbar with Priority Filtering/Sorting */}
        {!page.isTrash && (
          <div
            id="editor-priority-toolbar"
            className="mb-4 py-2 px-4 bg-white/40 dark:bg-black/15 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none animate-fade-in"
          >
            <div className="flex items-center gap-4 flex-wrap">
              {/* Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Filter Todo:</span>
                <select
                  id="editor-filter-priority-select"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                  className="bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-md px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High Only</option>
                  <option value="medium">🟡 Medium Only</option>
                  <option value="low">🟢 Low Only</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Sort Todo:</span>
                <select
                  id="editor-sort-priority-select"
                  value={sortPriority}
                  onChange={(e) => setSortPriority(e.target.value as 'none' | 'desc' | 'asc')}
                  className="bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-md px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <option value="none">Default Order</option>
                  <option value="desc">🔴🔴 High → Low</option>
                  <option value="asc">🟢🟢 Low → High</option>
                </select>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Priority auto-calculates from task due date</span>
            </div>
          </div>
        )}

        {/* Blocks Renderer */}
        <div className="flex-1 space-y-1 pb-16">
          {page.blocks && getRenderedBlocks().map(({ block, originalIndex: index }) => {
            const isMenuOpen = activeMenuBlockId === block.id;
            const isBlockAILoading = inlineAIBlockId === block.id;

            // Compute live collaborative values
            const activeBlockType = getBlockType(block);
            const activeBlockContent = getBlockContent(block);
            const activeBlockProperties = getBlockProperties(block);

            // Choose CSS styles based on block type
            let blockStyles = 'text-[14px] text-[#37352f] dark:text-[#ebebea] leading-[1.5] py-0.5 font-sans ';
            if (activeBlockType === 'h1') blockStyles = 'text-[28px] font-bold text-[#37352f] dark:text-[#ebebea] mt-7 mb-2 border-b border-[#e9e9e7] dark:border-[#2c2c2c] pb-2 tracking-tight ';
            else if (activeBlockType === 'h2') blockStyles = 'text-[22px] font-bold text-[#37352f] dark:text-[#ebebea] mt-6 mb-2 border-b border-[#e9e9e7] dark:border-[#2c2c2c] pb-1 tracking-tight ';
            else if (activeBlockType === 'h3') blockStyles = 'text-[18px] font-semibold text-[#37352f] dark:text-[#ebebea] mt-4 mb-1 tracking-tight ';
            else if (activeBlockType === 'quote') blockStyles = 'pl-4 border-l-3 border-[#37352f] dark:border-[#ebebea] italic text-[#787774] dark:text-[#9b9a97] py-1 my-2 ';
            else if (activeBlockType === 'callout') blockStyles = 'p-4 bg-white/55 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl flex gap-3 items-start my-4 backdrop-blur-md ';
            else if (activeBlockType === 'code') blockStyles = 'my-2 ';

            const isTodoChecked = !!activeBlockProperties?.checked;

            // Presence tracking
            const blockCollaborators = activeCollaborators.filter(c => c.activeBlockId === block.id);
            const hasCollaborator = blockCollaborators.length > 0;

            return (
              <div
                key={block.id}
                id={`block-container-${block.id}`}
                draggable={draggableBlockId === block.id}
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDragLeave={(e) => handleDragLeave(e, block.id)}
                onDrop={(e) => handleDrop(e, block.id)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-start gap-1.5 w-full animate-fade-in rounded px-1 transition-all ${
                  hasCollaborator ? 'ring-1' : ''
                } ${
                  dragOverBlockId === block.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-t-2 border-indigo-500/80 pt-1.5' : 'border-t-2 border-transparent'
                } ${
                  draggedBlockId === block.id ? 'opacity-30 border border-dashed border-zinc-300 dark:border-zinc-700' : ''
                }`}
                style={hasCollaborator ? { ringColor: blockCollaborators[0].color, borderColor: blockCollaborators[0].color } : {}}
              >
                {/* Active Collaborator Cursor Badge */}
                {hasCollaborator && (
                  <div
                    className="absolute right-2 -top-2.5 z-20 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 select-none pointer-events-none animate-bounce"
                    style={{ backgroundColor: blockCollaborators[0].color }}
                  >
                    <span className="w-1 h-1 bg-white rounded-full animate-ping" />
                    <span>{blockCollaborators[0].name}</span>
                  </div>
                )}

                {/* Left Drag/Handle and Add button */}
                {!page.isTrash && (
                  <div className="absolute right-full mr-2 top-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0 z-10">
                    <button
                      id={`block-drag-btn-${block.id}`}
                      onMouseDown={() => setDraggableBlockId(block.id)}
                      onMouseUp={() => setDraggableBlockId(null)}
                      onMouseLeave={() => setDraggableBlockId(null)}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 rounded transition-colors cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`block-add-btn-${block.id}`}
                      onClick={() => {
                        const newBlock: Block = {
                          id: Math.random().toString(36).substring(7),
                          type: 'text',
                          content: '',
                        };
                        const updatedBlocks = [...page.blocks];
                        updatedBlocks.splice(index + 1, 0, newBlock);
                        onUpdatePage({ ...page, blocks: updatedBlocks, updatedAt: Date.now() });
                        
                        // Save to Firestore
                        setDoc(doc(db, 'pages', page.id, 'blocks', newBlock.id), newBlock).catch(() => {});

                        setTimeout(() => blockRefs.current[newBlock.id]?.focus(), 30);
                      }}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 rounded transition-colors"
                      title="Add block below"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`block-menu-btn-${block.id}`}
                      onClick={() => setActiveMenuBlockId(isMenuOpen ? null : block.id)}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 rounded transition-colors"
                      title="Block operations"
                    >
                      <Menu className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Shimmer overlay for loading inline AI */}
                {isBlockAILoading && (
                  <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[0.5px] rounded border border-emerald-500/20 flex items-center justify-center z-10 animate-pulse">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-white dark:bg-zinc-950 px-2 py-1 rounded-md shadow border border-emerald-500/10">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      <span>{inlineAIAction === 'summarize' ? 'Summarizing...' : inlineAIAction === 'translate' ? 'Translating...' : 'Refining block...'}</span>
                    </div>
                  </div>
                )}

                {/* Block Content Container */}
                <div className={`flex-1 flex items-stretch ${blockStyles}`}>
                  
                  {/* Bullet list decoration */}
                  {activeBlockType === 'bullet' && (
                    <div className="w-4 flex items-center justify-center text-[#787774] dark:text-[#9b9a97] mr-1.5 shrink-0 select-none font-bold text-[15px]">•</div>
                  )}

                  {/* To-do checkbox */}
                  {activeBlockType === 'todo' && (
                    <button
                      id={`block-todo-checkbox-${block.id}`}
                      disabled={page.isTrash}
                      onClick={() => handleToggleTodo(block.id, isTodoChecked)}
                      className="mr-2 mt-1 shrink-0 text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-colors"
                    >
                      {isTodoChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#37352f] dark:text-[#ebebea]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {/* Callout Box Icon */}
                  {activeBlockType === 'callout' && (
                    <div className="text-[18px] shrink-0 select-none pt-0.5">
                      💡
                    </div>
                  )}

                  {/* Input Element based on type */}
                  {activeBlockType === 'divider' ? (
                    <div className="w-full py-3 select-none flex items-center">
                      <hr className="w-full border-t border-[#e9e9e7] dark:border-[#2c2c2c]" />
                    </div>
                  ) : activeBlockType === 'image' ? (
                    <div className="w-full flex flex-col gap-2 my-2">
                      {activeBlockProperties?.imageUrl ? (
                        <div className="relative group/image rounded overflow-hidden max-h-[350px] border border-[#e9e9e7] dark:border-[#2c2c2c] w-full">
                          <img
                            src={activeBlockProperties.imageUrl}
                            alt="Clutch Document Embed"
                            className="w-full h-full object-cover rounded"
                            referrerPolicy="no-referrer"
                          />
                          {!page.isTrash && (
                            <button
                              onClick={() => {
                                updateBlockImmediate(block.id, 'image', '', { imageUrl: '' });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded transition-colors text-[10px] font-bold flex items-center gap-1 shadow-sm animate-fade-in"
                            >
                              <Trash2 className="w-3 h-3" /> Remove Image
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full p-5 bg-[#f7f7f5] dark:bg-[#202020] border border-dashed border-[#e9e9e7] dark:border-[#2c2c2c] rounded flex flex-col items-center justify-center text-center">
                          <ImageIcon className="w-7 h-7 text-[#91918e] mb-1.5 animate-pulse" />
                          <span className="text-[11px] text-[#37352f] dark:text-[#ebebea] font-semibold mb-2">Embed a Collaborative Image</span>
                          <input
                            type="text"
                            placeholder="Paste any web image URL (then press Enter)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.currentTarget as HTMLInputElement).value.trim();
                                if (val) {
                                  updateBlockImmediate(block.id, 'image', '', { imageUrl: val });
                                }
                              }
                            }}
                            className="w-full max-w-md px-3 py-1.5 bg-white dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2c2c2c] rounded text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-[#787774] dark:focus:border-[#9b9a97] transition-all"
                          />
                        </div>
                      )}
                    </div>
                  ) : activeBlockType === 'code' ? (
                    <div className="w-full bg-[#f7f7f5] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2c2c2c] rounded-[4px] overflow-hidden p-3 flex flex-col font-mono text-[12.5px]">
                      {/* Language selection bar */}
                      <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-[#91918e] uppercase tracking-wider pb-1.5 border-b border-[#e9e9e7] dark:border-[#2c2c2c] select-none">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#787774] dark:text-[#9b9a97]" />
                          <span>Code editor</span>
                        </div>
                        <select
                          id={`block-code-lang-${block.id}`}
                          disabled={page.isTrash}
                          value={activeBlockProperties?.language || 'javascript'}
                          onChange={(e) => handleCodeLanguageChange(block.id, e.target.value)}
                          className="bg-transparent border-none outline-none cursor-pointer hover:text-[#37352f] dark:hover:text-[#ebebea]"
                        >
                          {LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        id={`block-code-textarea-${block.id}`}
                        ref={el => { blockRefs.current[block.id] = el; }}
                        value={activeBlockContent}
                        disabled={page.isTrash}
                        onFocus={() => {
                          setActiveFocusedBlockId(block.id);
                          currentFocusedBlockIdRef.current = block.id;
                          if (db && page.id) {
                            const presenceRef = doc(db, 'pages', page.id, 'presence', collaborator.id);
                            setDoc(presenceRef, {
                              id: collaborator.id,
                              name: collaborator.name,
                              color: collaborator.color,
                              activeBlockId: block.id,
                              updatedAt: Date.now()
                            }).catch(() => {});
                          }
                        }}
                        onBlur={() => {
                          if (activeFocusedBlockId === block.id) {
                            setActiveFocusedBlockId(null);
                            currentFocusedBlockIdRef.current = null;
                          }
                        }}
                        onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-mono text-[12.5px] text-[#37352f] dark:text-[#ebebea] placeholder-[#91918e] py-1 resize-y custom-scrollbar min-h-[80px]"
                        placeholder="// Type or paste your code here..."
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between gap-2.5 w-full min-w-0 group/todo-item">
                      {/* Priority Badge */}
                      {activeBlockType === 'todo' && (() => {
                        const dueDate = activeBlockProperties?.dueDate;
                        const priority = computePriority(dueDate);
                        let badgeColors = 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-900/40';
                        if (priority === 'high') {
                          badgeColors = 'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/25 dark:text-rose-400 dark:border-rose-900/40';
                        } else if (priority === 'medium') {
                          badgeColors = 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/25 dark:text-amber-400 dark:border-amber-900/40';
                        }
                        return (
                          <span
                            id={`block-priority-badge-${block.id}`}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wide select-none shrink-0 ${badgeColors}`}
                          >
                            {priority}
                          </span>
                        );
                      })()}
                      <input
                        id={`block-input-${block.id}`}
                        ref={el => { blockRefs.current[block.id] = el; }}
                        type="text"
                        value={activeBlockContent}
                        disabled={page.isTrash}
                        onFocus={() => {
                          setActiveFocusedBlockId(block.id);
                          currentFocusedBlockIdRef.current = block.id;
                          if (db && page.id) {
                            const presenceRef = doc(db, 'pages', page.id, 'presence', collaborator.id);
                            setDoc(presenceRef, {
                              id: collaborator.id,
                              name: collaborator.name,
                              color: collaborator.color,
                              activeBlockId: block.id,
                              updatedAt: Date.now()
                            }).catch(() => {});
                          }
                        }}
                        onBlur={() => {
                          if (activeFocusedBlockId === block.id) {
                            setActiveFocusedBlockId(null);
                            currentFocusedBlockIdRef.current = null;
                          }
                        }}
                        onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, block)}
                        placeholder={
                          activeBlockType === 'h1' ? 'Heading 1' :
                          activeBlockType === 'h2' ? 'Heading 2' :
                          activeBlockType === 'h3' ? 'Heading 3' :
                          activeBlockType === 'quote' ? 'Empty quote' :
                          activeBlockType === 'callout' ? 'Empty callout card' :
                          'Type "/" for commands, or write content...'
                        }
                        className={`flex-1 bg-transparent border-none outline-none placeholder-[#e9e9e7] dark:placeholder-[#2c2c2c] disabled:opacity-90 ${
                          isTodoChecked ? 'line-through text-[#91918e] dark:text-[#7c7b77]' : ''
                        }`}
                      />

                      {/* Overdue Check / Date Picker for TODO block */}
                      {activeBlockType === 'todo' && (
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          {(() => {
                            const dueDate = activeBlockProperties?.dueDate;
                            const todayStr = new Date().toISOString().split('T')[0];
                            const isOverdue = dueDate && dueDate < todayStr && !isTodoChecked;
                            
                            return (
                              <div className="flex items-center gap-1">
                                <input
                                  id={`block-todo-date-${block.id}`}
                                  type="date"
                                  value={dueDate || ''}
                                  disabled={page.isTrash}
                                  onChange={(e) => handleBlockDueDateChange(block.id, e.target.value)}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold outline-none border transition-all cursor-pointer ${
                                    isOverdue
                                      ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/30'
                                      : dueDate
                                      ? 'bg-zinc-50 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-300 border-[#e9e9e7] dark:border-[#2c2c2c] hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                      : 'opacity-0 group-hover/todo-item:opacity-100 bg-transparent text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] border-transparent hover:border-[#e9e9e7] dark:hover:border-[#2c2c2c]'
                                  }`}
                                  style={{ colorScheme: 'dark light' }}
                                />
                                {isOverdue && (
                                  <span
                                    id={`block-todo-overdue-warn-${block.id}`}
                                    className="text-[10px] font-extrabold text-red-500 bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 rounded animate-pulse select-none"
                                    title="Overdue task!"
                                  >
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Slash Command Menu */}
                {activeSlashBlockId === block.id && (
                  <div
                    ref={slashMenuRef}
                    className="absolute top-10 left-0 z-50 w-64 glass-panel-heavy rounded-xl shadow-2xl p-1.5 space-y-0.5 animate-fade-in"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#91918e] dark:text-[#7c7b77] uppercase border-b border-zinc-200/80 dark:border-white/10 mb-1">
                      Convert to block
                    </div>
                    {filteredCommands.length > 0 ? (
                      filteredCommands.map((cmd) => {
                        const CmdIcon = cmd.icon;
                        return (
                          <button
                            key={cmd.type}
                            id={`slash-cmd-${cmd.type}`}
                            onClick={() => changeBlockType(block.id, cmd.type as BlockType)}
                            className="w-full flex items-center gap-3 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#efefee]/80 dark:hover:bg-white/5 transition-colors group/cmd"
                          >
                            <div className="w-7 h-7 bg-white/40 dark:bg-black/15 border border-zinc-200 dark:border-white/8 rounded flex items-center justify-center text-[#787774] group-hover/cmd:text-[#37352f] dark:group-hover/cmd:text-[#ebebea] transition-colors">
                              <CmdIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-[12px] font-bold text-[#37352f] dark:text-[#ebebea]">{cmd.label}</div>
                              <div className="text-[10px] text-[#91918e]">{cmd.desc}</div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-2.5 py-3 text-center text-[12px] text-[#91918e] italic">
                        No command matches
                      </div>
                    )}
                  </div>
                )}

                {/* Block Operations Dropdown Menu */}
                {isMenuOpen && (
                  <div
                    ref={blockMenuRef}
                    className="absolute top-10 left-[-160px] z-50 w-48 glass-panel-heavy rounded-xl shadow-2xl p-1.5 space-y-1 select-none animate-fade-in"
                  >
                    {/* Block index change */}
                    <div className="flex items-center gap-1 border-b border-zinc-200/80 dark:border-white/10 pb-1 mb-1">
                      <button
                        id="block-op-move-up"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, 'up')}
                        className="flex-1 py-1.5 flex items-center justify-center gap-1 hover:bg-[#efefee]/80 dark:hover:bg-white/5 rounded-md text-[10px] font-bold text-[#5f5e5b] disabled:opacity-40"
                      >
                        <ArrowUp className="w-3 h-3" /> Up
                      </button>
                      <button
                        id="block-op-move-down"
                        disabled={index === page.blocks.length - 1}
                        onClick={() => moveBlock(index, 'down')}
                        className="flex-1 py-1.5 flex items-center justify-center gap-1 hover:bg-[#efefee]/80 dark:hover:bg-white/5 rounded-md text-[10px] font-bold text-[#5f5e5b] disabled:opacity-40"
                      >
                        <ArrowDown className="w-3 h-3" /> Down
                      </button>
                    </div>

                    {/* Ask AI Submenu */}
                    <div className="px-2 py-1 text-[9px] font-black text-[#91918e] uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                      <span>Clutch AI Tools</span>
                    </div>
                    <button
                      id="block-op-ai-improve"
                      onClick={() => handleInlineAIAction(block.id, 'improve')}
                      className="w-full px-2.5 py-1 text-left text-[11px] rounded-md hover:bg-[#efefee]/80 dark:hover:bg-white/5 text-[#37352f] dark:text-[#ebebea] transition-colors flex items-center gap-1.5"
                    >
                      <span>Improve spelling & style</span>
                    </button>
                    <button
                      id="block-op-ai-summarize"
                      onClick={() => handleInlineAIAction(block.id, 'summarize')}
                      className="w-full px-2.5 py-1 text-left text-[11px] rounded-md hover:bg-[#efefee]/80 dark:hover:bg-white/5 text-[#37352f] dark:text-[#ebebea] transition-colors flex items-center gap-1.5"
                    >
                      <span>Summarize block</span>
                    </button>
                    <button
                      id="block-op-ai-longer"
                      onClick={() => handleInlineAIAction(block.id, 'make-longer')}
                      className="w-full px-2.5 py-1 text-left text-[11px] rounded-md hover:bg-[#efefee]/80 dark:hover:bg-white/5 text-[#37352f] dark:text-[#ebebea] transition-colors flex items-center gap-1.5"
                    >
                      <span>Make longer / Expand</span>
                    </button>
                    <button
                      id="block-op-ai-shorter"
                      onClick={() => handleInlineAIAction(block.id, 'make-shorter')}
                      className="w-full px-2.5 py-1 text-left text-[11px] rounded-md hover:bg-[#efefee]/80 dark:hover:bg-white/5 text-[#37352f] dark:text-[#ebebea] transition-colors flex items-center gap-1.5"
                    >
                      <span>Make shorter / Condense</span>
                    </button>
                    <button
                      id="block-op-ai-translate"
                      onClick={() => handleInlineAIAction(block.id, 'translate')}
                      className="w-full px-2.5 py-1 text-left text-[11px] rounded-md hover:bg-[#efefee]/80 dark:hover:bg-white/5 text-[#37352f] dark:text-[#ebebea] transition-colors flex items-center gap-1.5"
                    >
                      <span>Translate to Spanish</span>
                    </button>

                    {/* Standard actions */}
                    <div className="border-t border-zinc-200/80 dark:border-white/10 mt-1 pt-1" />
                    <button
                      id="block-op-delete"
                      disabled={page.blocks.length === 1}
                      onClick={() => deleteBlock(block.id)}
                      className="w-full px-2.5 py-1 text-left text-[11px] rounded-md hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-450 text-red-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete block</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trash Zone */}
        <AnimatePresence>
          {draggedBlockId && !page.isTrash && (
            <motion.div
              id="editor-trash-zone"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onDragOver={handleTrashDragOver}
              onDragLeave={handleTrashDragLeave}
              onDrop={handleTrashDrop}
              className={`mt-4 mb-8 p-6 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2 select-none ${
                page.blocks.length <= 1
                  ? 'border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  : isDragOverTrash
                  ? 'border-red-500 bg-red-50/80 dark:bg-red-950/20 text-red-600 dark:text-red-400 scale-[1.02] shadow-lg shadow-red-500/5'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-red-400 dark:hover:border-red-900 hover:bg-red-50/20 bg-zinc-50/30 dark:bg-zinc-900/10 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <div className={`p-3 rounded-full transition-all duration-200 ${
                isDragOverTrash ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rotate-12 scale-110' : 'bg-zinc-100 dark:bg-zinc-850'
              }`}>
                <Trash2 className={`w-6 h-6 transition-transform ${isDragOverTrash ? 'animate-bounce' : ''}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold tracking-tight">
                  {page.blocks.length <= 1
                    ? 'Cannot delete the last remaining block'
                    : isDragOverTrash
                    ? 'Release to drop in Trash!'
                    : 'Drag items here to move to Trash'}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {page.blocks.length <= 1
                    ? 'Keep at least one block on the page'
                    : 'Works with tasks and any other blocks'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration Modal Pop-up */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm">
            {/* Backdrop click to dismiss */}
            <div className="absolute inset-0" onClick={() => setShowCelebration(false)} />
            
            <motion.div
              id="task-celebration-popup"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] border-4 border-amber-400 dark:border-amber-500 rounded-2xl shadow-2xl p-6 overflow-hidden text-center flex flex-col items-center select-none"
            >
              {/* Confetti and Flower Particles floating up */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 16 }).map((_, i) => {
                  const x = (i * 25) - 200;
                  const randomDelay = i * 0.12;
                  const rotation = i * 45;
                  const duration = 2.5 + Math.random() * 1.5;
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ y: 250, x: x, opacity: 1, scale: 0.3, rotate: 0 }}
                      animate={{ 
                        y: -300, 
                        x: x + Math.sin(i) * 60,
                        opacity: [0, 1, 1, 0],
                        scale: [0.3, 1.2, 1, 0.5],
                        rotate: rotation + 360
                      }}
                      transition={{ 
                        duration: duration,
                        repeat: Infinity,
                        delay: randomDelay,
                        ease: 'easeOut'
                      }}
                      className="absolute bottom-0 text-xl"
                    >
                      {i % 4 === 0 ? '🌸' : i % 4 === 1 ? '👑' : i % 4 === 2 ? '🌹' : '🌻'}
                    </motion.div>
                  );
                })}
              </div>

              {/* Top Crown Ribbon Badge */}
              <div className="relative mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 dark:from-amber-500 dark:to-yellow-400 flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a1a1a] relative z-10"
                >
                  <Crown className="w-10 h-10 text-amber-950 stroke-[2] drop-shadow-md animate-bounce" />
                </motion.div>
                {/* Double flower accents on the sides of the crown */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: -45 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 text-2xl"
                >
                  🌸
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 45 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 text-2xl"
                >
                  🌸
                </motion.div>
              </div>

              {/* Congratulatory Text */}
              <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400 tracking-tight flex items-center justify-center gap-1.5 font-sans mb-2">
                <span>Task Completed, Your Majesty!</span>
              </h3>
              
              <div className="relative inline-block mb-4 px-4">
                <span className="absolute -left-1 -top-1.5 text-lg">✨</span>
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-[#252525] px-4 py-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 break-words max-w-full italic">
                  "{celebratedTaskTitle}"
                </p>
                <span className="absolute -right-1 -bottom-1.5 text-lg">✨</span>
              </div>

              <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[280px] leading-relaxed mb-6">
                A grand victory! The kingdom blossoms in flower gardens with your noble achievements. 👑🌸
              </p>

              {/* Action Button */}
              <button
                id="celebration-dismiss-btn"
                onClick={() => setShowCelebration(false)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 dark:from-amber-600 dark:to-amber-700 dark:hover:from-amber-500 dark:hover:to-amber-650 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5 border border-amber-300/30"
              >
                <Award className="w-4 h-4 stroke-[2.5]" />
                <span>All Hail!</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
