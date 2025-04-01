
export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  owner: string | null;
  dueDate: Date;
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}
