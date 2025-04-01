
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, TaskStatus, KanbanColumn } from '@/types/kanban';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface KanbanContextType {
  columns: KanbanColumn[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (taskId: string, updatedTask: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  loading: boolean;
}

const defaultColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tasks: [],
  },
  {
    id: 'todo',
    title: 'To Do',
    tasks: [],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    tasks: [],
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [],
  },
];

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch tasks from Supabase when component mounts or user changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setLoading(false);
        // Reset columns to default empty state when no user is logged in
        setColumns(defaultColumns.map(col => ({ ...col, tasks: [] })));
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tasks:', error);
          toast({
            title: 'Error fetching tasks',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        console.log('Fetched tasks from Supabase:', data);

        // Transform the data to match our Task type
        const fetchedTasks: Task[] = data.map((task: any) => ({
          id: task.id.toString(),
          title: task.title,
          description: task.description,
          status: task.status as TaskStatus,
          priority: task.priority || 'medium', // Default to medium if not provided
          createdAt: new Date(task.created_at),
        }));

        // Create fresh columns with empty task arrays
        const newColumns = defaultColumns.map(col => ({ ...col, tasks: [] }));
        
        // Now populate tasks into the appropriate columns
        fetchedTasks.forEach(task => {
          const column = newColumns.find(c => c.id === task.status);
          if (column) {
            column.tasks.push(task);
          }
        });

        setColumns(newColumns);
      } catch (error) {
        console.error('Unexpected error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to add tasks',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority
          }
        ])
        .select();

      if (error) {
        console.error('Error adding task:', error);
        toast({
          title: 'Error adding task',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const newTask: Task = {
        id: data[0].id.toString(),
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: new Date(data[0].created_at),
      };

      setColumns(prev => {
        return prev.map(column => {
          if (column.id === task.status) {
            // Add at the beginning of the array to show newest first
            return {
              ...column,
              tasks: [newTask, ...column.tasks],
            };
          }
          return column;
        });
      });

      toast({
        title: 'Task added',
        description: `"${task.title}" has been added to ${task.status}`,
      });
    } catch (error) {
      console.error('Unexpected error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateTask = async (taskId: string, updatedTask: Partial<Omit<Task, 'id'>>) => {
    if (!user) return;

    try {
      // Convert string ID to number for Supabase query
      const numericId = parseInt(taskId, 10);
      
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority
        })
        .eq('id', numericId);

      if (error) {
        console.error('Error updating task:', error);
        toast({
          title: 'Error updating task',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setColumns(prev => {
        return prev.map(column => {
          const taskIndex = column.tasks.findIndex(t => t.id === taskId);
          
          if (taskIndex >= 0) {
            const tasks = [...column.tasks];
            tasks[taskIndex] = {
              ...tasks[taskIndex],
              ...updatedTask,
            };
            
            // If status changed, move the task to the new column
            if (updatedTask.status && updatedTask.status !== column.id) {
              // Remove from current column
              const taskToMove = tasks.splice(taskIndex, 1)[0];
              
              // Find new column and update it separately
              const newColumn = prev.find(c => c.id === updatedTask.status);
              if (newColumn) {
                newColumn.tasks.push({
                  ...taskToMove,
                  ...updatedTask,
                });
              }
              
              return {
                ...column,
                tasks,
              };
            }
            
            return {
              ...column,
              tasks,
            };
          }
          
          return column;
        });
      });

      toast({
        title: 'Task updated',
        description: 'The task has been updated successfully',
      });
    } catch (error) {
      console.error('Unexpected error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    
    let deletedTaskTitle = '';
    
    // Find the task title before deleting
    for (const column of columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) {
        deletedTaskTitle = task.title;
        break;
      }
    }

    try {
      // Convert string ID to number for Supabase query
      const numericId = parseInt(taskId, 10);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', numericId);

      if (error) {
        console.error('Error deleting task:', error);
        toast({
          title: 'Error deleting task',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setColumns(prev => {
        return prev.map(column => {
          const taskIndex = column.tasks.findIndex(t => t.id === taskId);
          
          if (taskIndex >= 0) {
            const tasks = [...column.tasks];
            tasks.splice(taskIndex, 1);
            
            return {
              ...column,
              tasks,
            };
          }
          
          return column;
        });
      });

      if (deletedTaskTitle) {
        toast({
          title: 'Task deleted',
          description: `"${deletedTaskTitle}" has been deleted`,
        });
      }
    } catch (error) {
      console.error('Unexpected error deleting task:', error);
    }
  };

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    if (!user) return;
    
    let movedTask: Task | null = null;
    let sourceColumn = '';
    
    // Find the task before updating
    for (const column of columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) {
        movedTask = task;
        sourceColumn = column.title;
        break;
      }
    }

    if (!movedTask) return;

    try {
      // Convert string ID to number for Supabase query
      const numericId = parseInt(taskId, 10);
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', numericId);

      if (error) {
        console.error('Error moving task:', error);
        toast({
          title: 'Error moving task',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setColumns(prev => {
        let updatedColumns = [...prev];
        
        // Find and remove the task from its current column
        for (const column of updatedColumns) {
          const taskIndex = column.tasks.findIndex(t => t.id === taskId);
          
          if (taskIndex >= 0) {
            movedTask = { ...column.tasks[taskIndex], status: newStatus };
            column.tasks = column.tasks.filter(t => t.id !== taskId);
            break;
          }
        }
        
        // Add the task to the new column
        if (movedTask) {
          const targetColumn = updatedColumns.find(c => c.id === newStatus);
          if (targetColumn) {
            targetColumn.tasks.push(movedTask);
          }
        }
        
        return updatedColumns;
      });

      if (movedTask) {
        const targetColumn = columns.find(c => c.id === newStatus)?.title;
        
        toast({
          title: 'Task moved',
          description: `"${movedTask.title}" moved from ${sourceColumn} to ${targetColumn}`,
        });
      }
    } catch (error) {
      console.error('Unexpected error moving task:', error);
    }
  };

  return (
    <KanbanContext.Provider value={{ columns, addTask, updateTask, deleteTask, moveTask, loading }}>
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanban = () => {
  const context = useContext(KanbanContext);
  if (context === undefined) {
    throw new Error('useKanban must be used within a KanbanProvider');
  }
  return context;
};
