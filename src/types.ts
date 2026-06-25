export type BlockType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'number'
  | 'code'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'image';

export interface BlockProperties {
  checked?: boolean;
  language?: string;
  imageUrl?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: BlockProperties;
}

export interface Page {
  id: string;
  title: string;
  icon: string | null;
  coverImage: string | null;
  blocks: Block[];
  parentId: string | null;
  isFavorite: boolean;
  isTrash: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  logo: string | null;
}

export interface AIResponse {
  content: string;
  blocks?: Block[];
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'backlog';
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'health' | 'finance' | 'learning' | 'other';
  date: string; // YYYY-MM-DD format
  createdAt: number;
  updatedAt: number;
}

