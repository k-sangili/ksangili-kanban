
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserBoards } from '@/components/profile/UserBoards';
import { ProfileInfo } from '@/components/profile/ProfileInfo';
import { Header } from '@/components/layout/Header';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
};

type Board = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserBoards();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // First check if the profile exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setProfile(data);
      } else {
        // Create a profile if it doesn't exist
        const newProfile = {
          id: user?.id || '',
          username: user?.email?.split('@')[0] || '',
          full_name: '',
          avatar_url: null,
          updated_at: new Date().toISOString(),
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile);
          
        if (insertError) throw insertError;
        
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error fetching profile',
        description: 'Unable to load your profile information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBoards = async () => {
    if (!user) return;
    
    try {
      setLoadingBoards(true);
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast({
        title: 'Error loading boards',
        description: 'Unable to load your boards.',
        variant: 'destructive',
      });
    } finally {
      setLoadingBoards(false);
    }
  };

  const createNewBoard = async () => {
    if (!user) return;
    
    try {
      setCreatingBoard(true);
      const newBoard = {
        user_id: user.id,
        name: 'New Board',
        description: 'Click to edit this board',
      };
      
      const { data, error } = await supabase
        .from('boards')
        .insert(newBoard)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setBoards(prevBoards => [data as Board, ...prevBoards]);
        toast({
          title: 'Board created',
          description: 'Your new board has been created successfully.',
        });
      }
    } catch (error) {
      console.error('Error creating board:', error);
      toast({
        title: 'Error creating board',
        description: 'Unable to create a new board. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingBoard(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      <div className="container mx-auto max-w-5xl py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <ProfileInfo 
              user={user} 
              profile={profile}
              loading={loading}
            />
          </div>
          
          {/* Boards Section */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-xl font-bold">My Boards</CardTitle>
                  <CardDescription>
                    Create and manage your Kanban boards
                  </CardDescription>
                </div>
                <Button onClick={createNewBoard} size="sm" disabled={creatingBoard}>
                  <Plus className="h-4 w-4 mr-2" />
                  {creatingBoard ? 'Creating...' : 'New Board'}
                </Button>
              </CardHeader>
              <CardContent>
                <UserBoards 
                  boards={boards} 
                  loading={loadingBoards} 
                  onBoardsChange={setBoards}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
