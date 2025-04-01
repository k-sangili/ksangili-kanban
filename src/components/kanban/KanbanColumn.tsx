
import React from 'react';
import { KanbanColumn as KanbanColumnType, TaskStatus } from '@/types/kanban';
import TaskCard from './TaskCard';
import { useKanban } from '@/contexts/KanbanContext';
import { Task } from '@/types/kanban';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
  backlog: 'bg-gray-200',
  todo: 'bg-blue-200',
  'in-progress': 'bg-purple-200',
  done: 'bg-green-200',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column,
  onAddTask,
  onEditTask
}) => {
  const { moveTask } = useKanban();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const taskId = e.dataTransfer.getData('taskId');
    moveTask(taskId, column.id as TaskStatus);
  };

  return (
    <div 
      className="kanban-column flex flex-col bg-gray-50 rounded-lg p-2"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`column-header flex items-center justify-between p-2 mb-2 rounded-md ${statusColors[column.id as TaskStatus]}`}>
        <h2 className="font-medium">
          {column.title} <span className="text-sm ml-1 text-gray-600">({column.tasks.length})</span>
        </h2>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={() => onAddTask(column.id as TaskStatus)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {column.tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            onEdit={() => onEditTask(task)}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
