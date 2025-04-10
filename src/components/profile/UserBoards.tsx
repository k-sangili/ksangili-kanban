
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type Board = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

interface UserBoardsProps {
  boards: Board[];
  loading: boolean;
  onBoardsChange: (boards: Board[]) => void;
}

export function UserBoards({ boards, loading, onBoardsChange }: UserBoardsProps) {
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  const handleEdit = (board: Board) => {
    setEditingBoard(board);
    setEditName(board.name);
    setEditDescription(board.description || '');
  };

  const handleUpdate = async () => {
    if (!editingBoard) return;
    
    setIsUpdating(true);
    try {
      const updates = {
        name: editName,
        description: editDescription,
        updated_at: new Date().toISOString(),
      };
      
      // Using "any" type to bypass the strict typing temporarily
      const { error } = await (supabase as any)
        .from('boards')
        .update(updates)
        .eq('id', editingBoard.id);
        
      if (error) throw error;
      
      // Update local boards state
      const updatedBoards = boards.map(board => 
        board.id === editingBoard.id 
          ? { ...board, ...updates } 
          : board
      );
      
      onBoardsChange(updatedBoards);
      setEditingBoard(null);
      
      toast({
        title: 'Board updated',
        description: 'Your board has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating board:', error);
      toast({
        title: 'Error updating board',
        description: 'Unable to update the board. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = (boardId: string) => {
    setBoardToDelete(boardId);
  };

  const handleDelete = async () => {
    if (!boardToDelete) return;
    
    setIsDeleting(true);
    try {
      // Using "any" type to bypass the strict typing temporarily
      const { error } = await (supabase as any)
        .from('boards')
        .delete()
        .eq('id', boardToDelete);
        
      if (error) throw error;
      
      // Update local boards state
      const updatedBoards = boards.filter(board => board.id !== boardToDelete);
      onBoardsChange(updatedBoards);
      setBoardToDelete(null);
      
      toast({
        title: 'Board deleted',
        description: 'Your board has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting board:', error);
      toast({
        title: 'Error deleting board',
        description: 'Unable to delete the board. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <h3 className="text-lg font-medium text-gray-600 mb-2">No boards yet</h3>
        <p className="text-gray-500 mb-4">Create your first board to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {boards.map((board) => (
        <Card key={board.id} className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{board.name}</h3>
                {board.description && (
                  <p className="text-gray-500 text-sm mt-1">{board.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Last updated: {new Date(board.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleEdit(board)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => confirmDelete(board.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-4 flex justify-end">
            <Button asChild>
              <Link to={`/board/${board.id}`}>Open Board</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}

      {/* Edit Board Dialog */}
      <Dialog open={!!editingBoard} onOpenChange={(open) => !open && setEditingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>
              Make changes to your board here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="boardName">Board Name</Label>
              <Input
                id="boardName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="boardDescription">Description (optional)</Label>
              <Input
                id="boardDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!boardToDelete} onOpenChange={(open) => !open && setBoardToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this board? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoardToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
