
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, TaskStatus, KanbanColumn } from '@/types/kanban';
import { toast } from '@/components/ui/use-toast';

interface KanbanContextType {
  columns: KanbanColumn[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (taskId: string, updatedTask: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
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

// Sample initial tasks
const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Research competitors',
    description: 'Look into what similar products are doing',
    status: 'todo',
    priority: 'medium',
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Design homepage',
    description: 'Create wireframes for the homepage',
    status: 'in-progress',
    priority: 'high',
    createdAt: new Date(),
  },
  {
    id: '3',
    title: 'Set up analytics',
    description: 'Implement Google Analytics',
    status: 'done',
    priority: 'low',
    createdAt: new Date(),
  },
  {
    id: '4',
    title: 'Brainstorm feature ideas',
    description: 'Come up with new features for the next sprint',
    status: 'backlog',
    priority: 'medium',
    createdAt: new Date(),
  },
];

// Initialize columns with sample tasks
const initializeColumns = (): KanbanColumn[] => {
  const columns = [...defaultColumns];
  
  initialTasks.forEach(task => {
    const column = columns.find(c => c.id === task.status);
    if (column) {
      column.tasks.push(task);
    }
  });
  
  return columns;
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>(initializeColumns());

  // Save to localStorage whenever columns change
  useEffect(() => {
    try {
      localStorage.setItem('kanbanColumns', JSON.stringify(columns));
    } catch (error) {
      console.error('Failed to save kanban state to localStorage', error);
    }
  }, [columns]);

  // Load from localStorage on initial render
  useEffect(() => {
    try {
      const savedColumns = localStorage.getItem('kanbanColumns');
      if (savedColumns) {
        // Parse dates correctly
        const parsed = JSON.parse(savedColumns, (key, value) => {
          if (key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        setColumns(parsed);
      }
    } catch (error) {
      console.error('Failed to load kanban state from localStorage', error);
    }
  }, []);

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    setColumns(prev => {
      return prev.map(column => {
        if (column.id === task.status) {
          return {
            ...column,
            tasks: [...column.tasks, newTask],
          };
        }
        return column;
      });
    });

    toast({
      title: 'Task added',
      description: `"${task.title}" has been added to ${task.status}`,
    });
  };

  const updateTask = (taskId: string, updatedTask: Partial<Omit<Task, 'id'>>) => {
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
  };

  const deleteTask = (taskId: string) => {
    let deletedTaskTitle = '';
    
    setColumns(prev => {
      return prev.map(column => {
        const taskIndex = column.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex >= 0) {
          deletedTaskTitle = column.tasks[taskIndex].title;
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
  };

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    let movedTask: Task | null = null;
    let sourceColumn = '';
    
    setColumns(prev => {
      let updatedColumns = [...prev];
      
      // Find and remove the task from its current column
      for (const column of updatedColumns) {
        const taskIndex = column.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex >= 0) {
          movedTask = { ...column.tasks[taskIndex], status: newStatus };
          sourceColumn = column.title;
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
  };

  return (
    <KanbanContext.Provider value={{ columns, addTask, updateTask, deleteTask, moveTask }}>
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
