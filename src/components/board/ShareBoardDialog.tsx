
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, UserPlus, UserX } from 'lucide-react';

interface ShareBoardDialogProps {
  boardId: string;
  boardName: string;
}

export function ShareBoardDialog({ boardId, boardName }: ShareBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);

  const fetchBoardMembers = async () => {
    if (!open) return;

    setIsFetchingMembers(true);
    try {
      const { data, error } = await (supabase as any)
        .from('board_members')
        .select(`
          id,
          role,
          user_id,
          profiles:user_id (
            username,
            full_name,
            email:id(email)
          )
        `)
        .eq('board_id', boardId);

      if (error) throw error;

      // Transform the data to a more usable format
      const membersData = data?.map((member: any) => ({
        id: member.id,
        role: member.role,
        userId: member.user_id,
        username: member.profiles?.username || 'Unknown',
        fullName: member.profiles?.full_name || 'Unknown User',
        email: member.profiles?.email?.email || 'No email',
      })) || [];

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching board members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load board members',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingMembers(false);
    }
  };

  useEffect(() => {
    fetchBoardMembers();
  }, [open, boardId]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // First, get the user ID from the email
      const { data: userData, error: userError } = await supabase
        .from('auth')
        .select('id')
        .eq('email', email.trim())
        .single();

      if (userError) {
        toast({
          title: 'User not found',
          description: 'No user found with this email address.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const userId = userData.id;

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await (supabase as any)
        .from('board_members')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        toast({
          title: 'Already a member',
          description: 'This user is already a member of this board.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Add the user as a board member
      const { error: insertError } = await (supabase as any)
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: userId,
          role,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Board shared',
        description: `Board has been shared with ${email}`,
      });

      setEmail('');
      fetchBoardMembers();
    } catch (error) {
      console.error('Error sharing board:', error);
      toast({
        title: 'Error sharing board',
        description: 'Failed to share the board. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('board_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Member removed',
        description: 'User has been removed from the board',
      });

      // Update the members list
      setMembers(members.filter(member => member.id !== memberId));
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user from the board',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
          <DialogDescription>
            Share "{boardName}" with other users
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleShare} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex w-full items-center space-x-2">
              <Input
                id="email"
                placeholder="user@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Select
                value={role}
                onValueChange={setRole}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button type="submit" disabled={loading}>
              {loading ? 'Sharing...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> 
                  Add User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-2">Board Members</h4>
          {isFetchingMembers ? (
            <div className="py-4 text-center">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : members.length > 0 ? (
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{member.fullName || member.username}</div>
                    <div className="text-xs text-gray-500">{member.email}</div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded inline-block mt-1">
                      {member.role}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)}>
                    <UserX className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-2">No other members</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
