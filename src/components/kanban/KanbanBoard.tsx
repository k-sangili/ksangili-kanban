
import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import TaskDialog from './TaskDialog';
import { useKanban } from '@/contexts/KanbanContext';
import { Task, TaskStatus } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const KanbanBoard: React.FC = () => {
  const { columns, addTask, updateTask } = useKanban();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({
    status: 'todo',
    priority: 'medium',
  });

  const handleAddTask = (status: TaskStatus) => {
    setDialogMode('add');
    setCurrentTask({ status, priority: 'medium' });
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setDialogMode('edit');
    setCurrentTask(task);
    setDialogOpen(true);
  };

  const handleSubmitTask = (values: Omit<Task, 'id' | 'createdAt'>) => {
    if (dialogMode === 'add') {
      addTask(values);
    } else {
      if (currentTask.id) {
        updateTask(currentTask.id, values);
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <Button onClick={() => handleAddTask('todo')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Task
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
          />
        ))}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitTask}
        defaultValues={currentTask}
        mode={dialogMode}
      />
    </div>
  );
};

export default KanbanBoard;
