
import { createContext, useContext, useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, KanbanColumn } from '@/types/kanban';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type KanbanContextType = {
  columns: KanbanColumn[];
  loading: boolean;
  addTask: (title: string, description: string, status: TaskStatus, priority: TaskPriority, dueDate: Date) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateTaskDetails: (id: string, title: string, description: string, priority: TaskPriority, dueDate: Date) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, newStatus: TaskStatus) => Promise<void>;
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

// When mapping tasks from Supabase, ensure we handle the due_date field properly
const mapTaskFromSupabase = (task: any): Task => {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    createdAt: new Date(task.created_at),
    owner: task.owner || null,
    dueDate: task.due_date ? new Date(task.due_date) : new Date(Date.now() + 86400000), // Default to tomorrow if not set
  };
};

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'backlog', title: 'Backlog', tasks: [] },
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in-progress', title: 'In Progress', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) {
      console.log('No user found, skipping task fetch');
      setColumns([
        { id: 'backlog', title: 'Backlog', tasks: [] },
        { id: 'todo', title: 'To Do', tasks: [] },
        { id: 'in-progress', title: 'In Progress', tasks: [] },
        { id: 'done', title: 'Done', tasks: [] },
      ]);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching tasks for user:', user.id);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('Tasks fetched:', data?.length || 0);
      
      // Group tasks by status
      const backlogTasks = data
        ?.filter(task => task.status === 'backlog')
        .map(mapTaskFromSupabase) || [];
      
      const todoTasks = data
        ?.filter(task => task.status === 'todo')
        .map(mapTaskFromSupabase) || [];
      
      const inProgressTasks = data
        ?.filter(task => task.status === 'in-progress')
        .map(mapTaskFromSupabase) || [];
      
      const doneTasks = data
        ?.filter(task => task.status === 'done')
        .map(mapTaskFromSupabase) || [];
      
      setColumns([
        { id: 'backlog', title: 'Backlog', tasks: backlogTasks },
        { id: 'todo', title: 'To Do', tasks: todoTasks },
        { id: 'in-progress', title: 'In Progress', tasks: inProgressTasks },
        { id: 'done', title: 'Done', tasks: doneTasks },
      ]);
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (title: string, description: string, status: TaskStatus, priority: TaskPriority, dueDate: Date) => {
    if (!user) {
      console.error('Cannot add task: No user logged in.');
      return;
    }

    const newTask = {
      id: uuidv4(),
      title,
      description,
      status,
      priority,
      created_at: new Date(),
      user_id: user.id,
      due_date: dueDate,
    };

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([
          {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            status: newTask.status,
            priority: newTask.priority,
            created_at: newTask.created_at.toISOString(),
            user_id: newTask.user_id,
            due_date: newTask.due_date.toISOString(),
            owner: user.email || user.id
          },
        ]);

      if (error) throw error;

      setColumns(prevColumns => {
        const updatedColumns = prevColumns.map(column => {
          if (column.id === status) {
            return { ...column, tasks: [...column.tasks, {
              id: newTask.id,
              title: newTask.title,
              description: newTask.description,
              status: newTask.status,
              priority: newTask.priority,
              createdAt: newTask.created_at,
              owner: user.email || user.id,
              dueDate: newTask.due_date,
            }] };
          } else {
            return column;
          }
        });
        return updatedColumns;
      });
    } catch (error: any) {
      console.error('Error adding task:', error.message);
    }
  };

  const updateTaskStatus = async (id: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setColumns(prevColumns => {
        const updatedColumns = prevColumns.map(column => ({
          ...column,
          tasks: column.tasks.filter(task => task.id !== id),
        })).map(column => {
          if (column.id === newStatus) {
            const taskToUpdate = prevColumns
              .flatMap(col => col.tasks)
              .find(task => task.id === id);
            
            if (taskToUpdate) {
              return { ...column, tasks: [...column.tasks, { ...taskToUpdate, status: newStatus }] };
            }
          }
          return column;
        });
        return updatedColumns;
      });
    } catch (error: any) {
      console.error('Error updating task status:', error.message);
    }
  };

  const updateTaskDetails = async (id: string, title: string, description: string, priority: TaskPriority, dueDate: Date) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title, description, priority, due_date: dueDate.toISOString() })
        .eq('id', id);
  
      if (error) throw error;
  
      setColumns(prevColumns => {
        const updatedColumns = prevColumns.map(column => ({
          ...column,
          tasks: column.tasks.map(task => {
            if (task.id === id) {
              return { ...task, title, description, priority, dueDate };
            }
            return task;
          }),
        }));
        return updatedColumns;
      });
    } catch (error: any) {
      console.error('Error updating task details:', error.message);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setColumns(prevColumns => {
        const updatedColumns = prevColumns.map(column => ({
          ...column,
          tasks: column.tasks.filter(task => task.id !== id),
        }));
        return updatedColumns;
      });
    } catch (error: any) {
      console.error('Error deleting task:', error.message);
    }
  };
  
  // Add the moveTask function that was missing
  const moveTask = async (id: string, newStatus: TaskStatus) => {
    // This is essentially an alias for updateTaskStatus for drag and drop functionality
    await updateTaskStatus(id, newStatus);
  };

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
