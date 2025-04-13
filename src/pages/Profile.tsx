import { useState, useEffect, useRef } from 'react';
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
  
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    console.log("Profile component mounted, user:", user?.id || "No user");
    
    if (!user) {
      console.log("No user found, redirecting to auth page");
      navigate('/auth');
      return;
    }
    
    const loadProfileData = async () => {
      if (!isMounted.current) return;
      
      try {
        setLoading(true);
        await fetchProfile();
        await fetchUserBoards();
      } catch (err) {
        console.error("Error loading profile data:", err);
        if (isMounted.current) {
          setError("Failed to load profile data. Please try refreshing the page.");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadProfileData();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user || !isMounted.current) {
      console.log("Cannot fetch profile: No user or component unmounted");
      return;
    }
    
    try {
      console.log("Fetching profile for user ID:", user.id);
      
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
        if (isMounted.current) {
          setProfile(data);
        }
      } else {
        // Create a profile if it doesn't exist
        console.log("Creating new profile for user:", user.id);
        
        // Get user metadata for potential profile info
        const userMeta = user.user_metadata;
        
        // For Google auth, check both possible name fields
        let fullName = '';
        if (userMeta?.full_name) {
          fullName = userMeta.full_name;
        } else if (userMeta?.name) {
          fullName = userMeta.name;
        }
        
        // For Google auth, check avatar_url
        let avatarUrl = null;
        if (userMeta?.avatar_url) {
          avatarUrl = userMeta.avatar_url;
        } else if (userMeta?.picture) {
          avatarUrl = userMeta.picture;
        }
        
        const newProfile = {
          id: user.id,
          username: user.email?.split('@')[0] || '',
          full_name: fullName,
          avatar_url: avatarUrl,
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
          if (isMounted.current) {
            toast({
              title: 'Error',
              description: 'Could not create profile: ' + insertError.message,
              variant: 'destructive',
            });
          }
        } else {
          console.log("New profile created:", insertedProfile);
          if (isMounted.current) {
            setProfile(insertedProfile || null);
          }
          
          if (!insertedProfile) {
            console.error("Inserted profile is null or undefined");
            
            // Try to fetch profile again if insert succeeded but returned no data
            const { data: refetchedProfile, error: refetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (refetchError) {
              console.error("Error refetching profile:", refetchError);
            } else {
              console.log("Refetched profile:", refetchedProfile);
              if (isMounted.current) {
                setProfile(refetchedProfile);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error in fetchProfile:', error);
      if (isMounted.current) {
        toast({
          title: 'Error fetching profile',
          description: 'Unable to load your profile information: ' + error.message,
          variant: 'destructive',
        });
      }
      throw error; // Re-throw so the outer try-catch can handle it
    }
  };

  const fetchUserBoards = async () => {
    if (!user || !isMounted.current) {
      console.log("Cannot fetch boards: No user or component unmounted");
      return;
    }
    
    try {
      console.log("Fetching boards for user ID:", user.id);
      setLoadingBoards(true);
      
      // Get boards where user is owner
      const { data: ownedBoards, error: ownedError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (ownedError) {
        console.error("Error fetching owned boards:", ownedError);
        throw ownedError;
      }
      
      // Get boards shared with the user (user is a member)
      const { data: memberBoards, error: memberError } = await supabase
        .from('board_members')
        .select('board_id, boards:board_id(*)')
        .eq('user_id', user.id)
        .neq('role', 'owner')
        .order('created_at', { ascending: false });
      
      if (memberError) {
        console.error("Error fetching shared boards:", memberError);
        throw memberError;
      }
      
      // Format shared boards data
      const formattedSharedBoards = memberBoards?.map((item: any) => ({
        id: item.boards.id,
        name: item.boards.name,
        description: item.boards.description,
        created_at: item.boards.created_at,
        updated_at: item.boards.updated_at,
      })) || [];
      
      // Combine owned and shared boards
      const allBoards = [...(ownedBoards || []), ...formattedSharedBoards];
      
      console.log("All boards fetched:", allBoards);
      if (isMounted.current) {
        setBoards(allBoards);
      }
    } catch (error: any) {
      console.error('Error in fetchUserBoards:', error);
      if (isMounted.current) {
        toast({
          title: 'Error loading boards',
          description: 'Unable to load your boards: ' + error.message,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoadingBoards(false);
      }
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
      if (data && isMounted.current) {
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
      if (isMounted.current) {
        toast({
          title: 'Error creating board',
          description: `Unable to create a new board: ${error.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setCreatingBoard(false);
      }
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
