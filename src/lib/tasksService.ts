import { Task } from '../types';

export const tasksService = {
  // Fetch tasks
  async getTasks(): Promise<Task[]> {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks from server');
      }
      const data = await response.json();
      localStorage.setItem('clutch-tasks-cache', JSON.stringify(data));
      return data;
    } catch (error) {
      console.warn('tasksService.getTasks failed, loading cache', error);
      const cached = localStorage.getItem('clutch-tasks-cache');
      if (cached) {
        try {
          return JSON.parse(cached) as Task[];
        } catch (e) {
          console.error('Failed to parse cached tasks', e);
        }
      }
      return [];
    }
  },

  // Save or Update task
  async saveTask(task: Task): Promise<boolean> {
    // Save to local cache first for instant feedback
    const cachedStr = localStorage.getItem('clutch-tasks-cache');
    let cachedTasks: Task[] = [];
    if (cachedStr) {
      try {
        cachedTasks = JSON.parse(cachedStr);
      } catch (e) {}
    }
    const exists = cachedTasks.some(t => t.id === task.id);
    if (exists) {
      cachedTasks = cachedTasks.map(t => t.id === task.id ? task : t);
    } else {
      cachedTasks.unshift(task);
    }
    localStorage.setItem('clutch-tasks-cache', JSON.stringify(cachedTasks));

    // Call server API
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      return response.ok;
    } catch (error) {
      console.error('tasksService.saveTask failed', error);
      return false;
    }
  },

  // Delete task
  async deleteTask(id: string): Promise<boolean> {
    // Delete from cache first
    const cachedStr = localStorage.getItem('clutch-tasks-cache');
    if (cachedStr) {
      try {
        const cachedTasks: Task[] = JSON.parse(cachedStr);
        const filtered = cachedTasks.filter(t => t.id !== id);
        localStorage.setItem('clutch-tasks-cache', JSON.stringify(filtered));
      } catch (e) {}
    }

    // Call server API
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('tasksService.deleteTask failed', error);
      return false;
    }
  }
};
