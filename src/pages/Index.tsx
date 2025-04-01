
import { KanbanProvider } from '@/contexts/KanbanContext';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const Index = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="container mx-auto py-4 px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-sm text-gray-600">
              {user.email}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>
      <KanbanProvider>
        <div className="container mx-auto py-6">
          <KanbanBoard />
        </div>
      </KanbanProvider>
    </div>
  );
};

export default Index;
