
import React from 'react';
import { Task, TaskPriority } from '@/types/kanban';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, Calendar, User } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useKanban } from '@/contexts/KanbanContext';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  high: 'bg-red-100 text-red-800 hover:bg-red-200',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  const { deleteTask } = useKanban();
  const createdDate = new Date(task.createdAt).toLocaleDateString();
  const dueDate = task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date';
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Card 
      className="task-card mb-3 shadow-sm hover:shadow-md transition-shadow"
      draggable
      onDragStart={handleDragStart}
    >
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <h3 className="font-medium text-sm">{task.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600" 
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>
        
        {task.owner && (
          <div className="flex items-center text-xs text-gray-500 mb-2">
            <User className="h-3 w-3 mr-1" />
            <span className="truncate">{task.owner}</span>
          </div>
        )}
        
        <div className="flex items-center text-xs mb-2">
          <Calendar className="h-3 w-3 mr-1" />
          <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
            {dueDate} {isOverdue && "(Overdue)"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <Badge variant="outline" className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>
          <span className="text-xs text-gray-400">{createdDate}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
