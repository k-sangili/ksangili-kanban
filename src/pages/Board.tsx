
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { User, ArrowLeft, Settings } from 'lucide-react';

// This is a placeholder Board view - in a real application, this would be a full Kanban board for a specific board ID
const Board = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchBoard = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setBoard(data);
        } else {
          // Board not found or doesn't belong to user
          toast({
            title: 'Board not found',
            description: 'The board you requested could not be found or you do not have access to it.',
            variant: 'destructive',
          });
          navigate('/profile');
        }
      } catch (error) {
        console.error('Error fetching board:', error);
        toast({
          title: 'Error loading board',
          description: 'There was a problem loading the board. Please try again.',
          variant: 'destructive',
        });
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [boardId, user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-4">
      <div className="container mx-auto max-w-6xl py-6">
        <div className="flex justify-between items-center mb-6">
          <Link to="/profile" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/profile">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Board Settings
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{board.name}</h1>
          {board.description && (
            <p className="text-gray-600">{board.description}</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Board View Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              This is a placeholder for the full Kanban board view. 
              In a real application, this would display the tasks and columns specific to this board.
            </p>
            <Button asChild>
              <Link to="/profile">Return to Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
