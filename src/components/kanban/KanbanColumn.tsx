
import React, { useRef, useState } from 'react';
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Calculate the position for insertion
    if (columnRef.current && column.tasks.length > 0) {
      const columnRect = columnRef.current.getBoundingClientRect();
      const taskElements = columnRef.current.querySelectorAll('.task-card');
      
      // Find which task we're hovering over
      let closestIdx = -1;
      let closestDistance = Infinity;
      
      taskElements.forEach((taskEl, idx) => {
        const rect = taskEl.getBoundingClientRect();
        const taskMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(e.clientY - taskMiddle);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIdx = idx;
        }
      });
      
      // If cursor is at the top of the closest task, insert before it
      // If cursor is at the bottom of the closest task, insert after it
      if (closestIdx !== -1) {
        const rect = taskElements[closestIdx].getBoundingClientRect();
        const taskMiddle = rect.top + rect.height / 2;
        
        if (e.clientY < taskMiddle) {
          setDragOverIndex(closestIdx);
        } else {
          setDragOverIndex(closestIdx + 1);
        }
      } else if (e.clientY < columnRect.top + 100) {
        // If cursor is at the top of the column
        setDragOverIndex(0);
      } else {
        // If cursor is at the bottom of the column
        setDragOverIndex(column.tasks.length);
      }
    } else {
      // Empty column or ref not available
      setDragOverIndex(0);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only reset if we're actually leaving the column (not just moving between child elements)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      console.log(`Moving task ${taskId} to ${column.id} at index ${dragOverIndex}`);
      moveTask(taskId, column.id as TaskStatus, dragOverIndex !== null ? dragOverIndex : undefined);
    }
    setDragOverIndex(null);
  };

  return (
    <div 
      className="kanban-column flex flex-col bg-gray-50 rounded-lg p-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={columnRef}
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
        {column.tasks.map((task, index) => (
          <React.Fragment key={task.id}>
            {dragOverIndex === index && (
              <div className="h-1 bg-primary my-2 rounded-full animate-pulse"></div>
            )}
            <TaskCard 
              task={task}
              onEdit={() => onEditTask(task)}
            />
            {dragOverIndex === column.tasks.length && index === column.tasks.length - 1 && (
              <div className="h-1 bg-primary my-2 rounded-full animate-pulse"></div>
            )}
          </React.Fragment>
        ))}
        {column.tasks.length === 0 && dragOverIndex === 0 && (
          <div className="h-1 bg-primary my-2 rounded-full animate-pulse"></div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
