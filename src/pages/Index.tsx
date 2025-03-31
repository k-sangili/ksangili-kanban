
import { KanbanProvider } from '@/contexts/KanbanContext';
import KanbanBoard from '@/components/kanban/KanbanBoard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <KanbanProvider>
        <div className="container mx-auto py-6">
          <KanbanBoard />
        </div>
      </KanbanProvider>
    </div>
  );
};

export default Index;
