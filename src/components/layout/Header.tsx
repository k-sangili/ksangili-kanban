
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { HeaderMenu } from './HeaderMenu';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Simplified function to navigate to the user's board
  const goToUserBoard = async () => {
    if (!user) {
      // If user is not authenticated, redirect to auth page
      toast({
        title: 'Authentication required',
        description: 'Please sign in to access your board.',
      });
      navigate('/auth');
      return;
    }
    
    try {
      // Get the user's board or create one if it doesn't exist
      const { data: existingBoards, error: fetchError } = await supabase
        .from('boards')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (existingBoards && existingBoards.length > 0) {
        // Navigate to the existing board
        navigate(`/board/${existingBoards[0].id}`);
      } else {
        // Create a board if none exists
        setIsCreatingBoard(true);
        const newBoard = {
          user_id: user.id,
          name: 'My Board',
          description: 'Your personal kanban board',
        };
        
        const { data, error } = await supabase
          .from('boards')
          .insert(newBoard)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        toast({
          title: 'Board created',
          description: 'Your board has been created successfully.',
        });
        
        if (data) {
          navigate(`/board/${data.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error accessing board:', error);
      toast({
        title: 'Error',
        description: `Unable to access your board: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBoard(false);
    }
  };

  return (
    <header className="border-b bg-white z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-lg font-bold text-primary">
          Kanban Board
        </Link>

        {user && (
          <div className="flex items-center gap-2 z-20">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={goToUserBoard}
              disabled={isCreatingBoard}
            >
              {isCreatingBoard ? 'Creating...' : 'My Board'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <HeaderMenu />
          </div>
        )}
      </div>
    </header>
  );
}
