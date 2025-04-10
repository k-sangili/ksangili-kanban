import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { SaveIcon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserBoards } from '@/components/profile/UserBoards';
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
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  
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
        setUsername(data.username || '');
        setFullName(data.full_name || '');
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
        setUsername(newProfile.username || '');
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
      // Using "any" type to bypass the strict typing temporarily
      const { data, error } = await (supabase as any)
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

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setUpdating(true);
      
      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(updates);
        
      if (error) throw error;
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      
      setProfile({
        ...profile!,
        username,
        full_name: fullName,
        updated_at: updates.updated_at,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error updating profile',
        description: 'Unable to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
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
      
      // Using "any" type to bypass the strict typing temporarily
      const { data, error } = await (supabase as any)
        .from('boards')
        .insert(newBoard)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setBoards([data as Board, ...boards]);
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      <div className="container mx-auto max-w-5xl py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl font-bold">User Profile</CardTitle>
              <CardDescription>
                View and edit your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <form onSubmit={updateProfile} className="space-y-6">
                  <div className="flex flex-col gap-4 items-center">
                    <Avatar className="h-24 w-24 border-2 border-gray-200">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={username || user?.email || ''} />
                      ) : (
                        <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                          {(username?.[0] || user?.email?.[0] || '').toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="space-y-1 text-center flex-1">
                      <h3 className="text-xl font-medium">{fullName || 'Set your name'}</h3>
                      <p className="text-gray-500">{user?.email}</p>
                      <p className="text-sm text-gray-400">
                        Account created: {new Date(user?.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                      />
                      <p className="text-sm text-gray-500">
                        Your email cannot be changed
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updating} className="w-full">
                    {updating ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <SaveIcon className="h-4 w-4 mr-2" />
                        Save Profile
                      </div>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="border-t bg-gray-50 flex justify-between">
              <div className="text-sm text-gray-500">
                Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : 'Never'}
              </div>
            </CardFooter>
          </Card>
          
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
                <Button onClick={createNewBoard} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Board
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
