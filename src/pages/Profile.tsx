
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
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("Profile component mounted, user:", user?.id || "No user");
    
    if (!user) {
      console.log("No user found, redirecting to auth page");
      navigate('/auth');
      return;
    }
    
    const loadProfileData = async () => {
      try {
        setLoading(true);
        await fetchProfile();
        await fetchUserBoards();
      } catch (err) {
        console.error("Error loading profile data:", err);
        setError("Failed to load profile data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) {
      console.log("Cannot fetch profile: No user");
      return;
    }
    
    try {
      console.log("Fetching profile for user ID:", user.id);
      console.log("User metadata:", user.user_metadata);
      
      // First check if the profile exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        if (error.code !== 'PGRST116') {
          throw error;
        } else {
          console.log("Profile not found, will create a new one");
        }
      }
      
      if (data) {
        console.log("Profile found:", data);
        setProfile(data);
      } else {
        // Create a profile if it doesn't exist
        console.log("Creating new profile for user:", user.id);
        
        // Get user metadata for potential profile info
        const userMeta = user.user_metadata;
        console.log("User metadata for profile creation:", userMeta);
        
        const newProfile = {
          id: user.id,
          username: user.email?.split('@')[0] || '',
          full_name: userMeta?.full_name || userMeta?.name || '',
          avatar_url: userMeta?.avatar_url || null,
          updated_at: new Date().toISOString(),
        };
        
        console.log("New profile to be created:", newProfile);
        
        const { error: insertError, data: insertedProfile } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select('*')
          .single();
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
          toast({
            title: 'Error',
            description: 'Could not create profile: ' + insertError.message,
            variant: 'destructive',
          });
        } else {
          console.log("New profile created:", insertedProfile);
          setProfile(insertedProfile || newProfile);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchProfile:', error);
      toast({
        title: 'Error fetching profile',
        description: 'Unable to load your profile information: ' + error.message,
        variant: 'destructive',
      });
      throw error; // Re-throw so the outer try-catch can handle it
    }
  };

  const fetchUserBoards = async () => {
    if (!user) {
      console.log("Cannot fetch boards: No user");
      return;
    }
    
    try {
      console.log("Fetching boards for user ID:", user.id);
      setLoadingBoards(true);
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching boards:", error);
        throw error;
      }
      
      console.log("Boards fetched:", data);
      setBoards(data || []);
    } catch (error: any) {
      console.error('Error in fetchUserBoards:', error);
      toast({
        title: 'Error loading boards',
        description: 'Unable to load your boards: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingBoards(false);
    }
  };

  const createNewBoard = async () => {
    if (!user) {
      console.log("Cannot create board: No user");
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create a board.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    
    try {
      setCreatingBoard(true);
      console.log("Creating new board for user:", user.id);
      
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
      
      if (error) {
        console.error("Error creating board:", error);
        throw error;
      }
      
      console.log("New board created:", data);
      if (data) {
        setBoards(prevBoards => [data as Board, ...prevBoards]);
        toast({
          title: 'Board created',
          description: 'Your new board has been created successfully.',
        });
        // Navigate to the new board after creation
        navigate(`/board/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error in createNewBoard:', error);
      toast({
        title: 'Error creating board',
        description: `Unable to create a new board: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setCreatingBoard(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Header />
        <div className="container mx-auto max-w-5xl py-12 px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-500">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      <div className="container mx-auto max-w-5xl py-6 px-4">
        {!user ? (
          <Card className="my-8">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to view your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </CardContent>
          </Card>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default Profile;
