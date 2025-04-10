
import { KanbanProvider } from '@/contexts/KanbanContext';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { Header } from '@/components/layout/Header';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4">
        <KanbanProvider>
          <KanbanBoard />
        </KanbanProvider>
      </div>
    </div>
  );
};

export default Index;
