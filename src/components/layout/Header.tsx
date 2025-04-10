
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Plus, Settings, FolderPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function Header() {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);
  const [sharedBoards, setSharedBoards] = useState<any[]>([]);
  const [showAllBoards, setShowAllBoards] = useState(false);

  // Fetch user's boards when dropdown opens
  const handleDropdownOpen = async (open: boolean) => {
    if (open && user) {
      setIsLoading(true);
      try {
        // Fetch boards owned by the user
        const { data: ownedBoards, error: ownedError } = await (supabase as any)
          .from('boards')
          .select('id, name')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (ownedError) throw ownedError;
        
        // Fetch boards shared with the user (where user is a member but not owner)
        const { data: memberBoards, error: memberError } = await (supabase as any)
          .from('board_members')
          .select('board_id, boards:board_id(id, name)')
          .eq('user_id', user.id)
          .neq('role', 'owner')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (memberError) throw memberError;

        // Format shared boards data
        const formattedSharedBoards = memberBoards?.map((item: any) => ({
          id: item.boards.id,
          name: item.boards.name,
        })) || [];

        setBoards(ownedBoards || []);
        setSharedBoards(formattedSharedBoards);
      } catch (error) {
        console.error('Error fetching boards:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your boards',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const createNewBoard = async () => {
    if (!user) return;
    
    try {
      const newBoard = {
        user_id: user.id,
        name: 'New Board',
        description: 'Click to edit this board',
      };
      
      const { data, error } = await (supabase as any)
        .from('boards')
        .insert(newBoard)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: 'Board created',
        description: 'Your new board has been created successfully.',
      });
      
      // Navigate to the new board
      window.location.href = `/board/${data.id}`;
    } catch (error) {
      console.error('Error creating board:', error);
      toast({
        title: 'Error creating board',
        description: 'Unable to create a new board. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-lg font-bold text-primary">
          Kanban Board
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            <DropdownMenu onOpenChange={handleDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">My Boards</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>My Boards</DropdownMenuLabel>
                {isLoading ? (
                  <div className="py-2 px-2 text-center">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : (
                  <>
                    {boards.length > 0 ? (
                      <DropdownMenuGroup>
                        {boards.slice(0, showAllBoards ? undefined : 5).map(board => (
                          <DropdownMenuItem key={board.id} asChild>
                            <Link to={`/board/${board.id}`} className="cursor-pointer">
                              {board.name}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        {boards.length > 5 && !showAllBoards && (
                          <DropdownMenuItem onClick={() => setShowAllBoards(true)}>
                            Show all boards...
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    ) : (
                      <div className="py-2 px-2 text-sm text-gray-500">No personal boards</div>
                    )}

                    {sharedBoards.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Shared with me</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          {sharedBoards.map(board => (
                            <DropdownMenuItem key={board.id} asChild>
                              <Link to={`/board/${board.id}`} className="cursor-pointer">
                                {board.name}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={createNewBoard}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Board
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage All Boards
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
