
import { createContext, useContext, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, KanbanColumn } from '@/types/kanban';
import { useAuth } from './AuthContext';
import { useParams } from 'react-router-dom';
import { useKanbanTasks } from '@/hooks/useKanbanTasks';

type KanbanContextType = {
  columns: KanbanColumn[];
  loading: boolean;
  addTask: (title: string, description: string, status: TaskStatus, priority: TaskPriority, dueDate: Date, owner: string | null) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateTaskDetails: (id: string, title: string, description: string, priority: TaskPriority, dueDate: Date, owner: string | null) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, newStatus: TaskStatus) => Promise<void>;
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export function KanbanProvider({ children, boardId }: { children: React.ReactNode, boardId?: string }) {
  const { user } = useAuth();
  const params = useParams();
  // Use boardId prop if provided, otherwise try to get from URL params
  const currentBoardId = boardId || params.boardId;

  const {
    columns,
    loading,
    fetchTasks,
    addTask,
    updateTaskStatus,
    updateTaskDetails,
    deleteTask,
    moveTask,
  } = useKanbanTasks(user?.id, currentBoardId);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, currentBoardId]);

  const value = {
    columns,
    loading,
    addTask,
    updateTaskStatus,
    updateTaskDetails,
    deleteTask,
    moveTask,
  };

  return (
    <KanbanContext.Provider value={value}>
      {children}
    </KanbanContext.Provider>
  );
}

export const useKanban = () => {
  const context = useContext(KanbanContext);
  if (context === undefined) {
    throw new Error('useKanban must be used within a KanbanProvider');
  }
  return context;
};
