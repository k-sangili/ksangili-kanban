
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [board, setBoard] = useState<Board | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
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
        await fetchUserBoard();
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

  const fetchUserBoard = async () => {
    if (!user || !isMounted.current) {
      console.log("Cannot fetch board: No user or component unmounted");
      return;
    }
    
    try {
      console.log("Fetching board for user ID:", user.id);
      setLoadingBoard(true);
      
      // Get the user's board
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No board found, that's ok
          console.log("No board found for user");
          if (isMounted.current) {
            setBoard(null);
          }
        } else {
          console.error("Error fetching board:", error);
          throw error;
        }
      } else {
        console.log("Board fetched:", data);
        if (isMounted.current) {
          setBoard(data);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchUserBoard:', error);
      if (isMounted.current) {
        toast({
          title: 'Error loading board',
          description: 'Unable to load your board: ' + error.message,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoadingBoard(false);
      }
    }
  };

  const createUserBoard = async () => {
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
      console.log("Creating board for user:", user.id);
      
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
        console.error("Error creating board:", error);
        throw error;
      }
      
      console.log("Board created:", data);
      if (data && isMounted.current) {
        setBoard(data as Board);
        toast({
          title: 'Board created',
          description: 'Your board has been created successfully.',
        });
      }
    } catch (error: any) {
      console.error('Error in createUserBoard:', error);
      if (isMounted.current) {
        toast({
          title: 'Error creating board',
          description: `Unable to create a board: ${error.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setCreatingBoard(false);
      }
    }
  };

  const updateBoard = async (name: string, description: string) => {
    if (!user || !board) return;
    
    try {
      const updates = {
        name,
        description,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', board.id);
        
      if (error) throw error;
      
      // Update local board state
      if (isMounted.current) {
        setBoard(prev => prev ? { ...prev, ...updates } : null);
      }
      
      toast({
        title: 'Board updated',
        description: 'Your board has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error updating board:', error);
      toast({
        title: 'Error updating board',
        description: 'Unable to update the board. Please try again.',
        variant: 'destructive',
      });
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
            
            {/* Board Section */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">My Board</CardTitle>
                  <CardDescription>
                    Manage your personal kanban board
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingBoard ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : board ? (
                    <div className="space-y-4">
                      <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div>
                            <h3 className="text-lg font-semibold">{board.name}</h3>
                            {board.description && (
                              <p className="text-gray-500 text-sm mt-1">{board.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Last updated: {new Date(board.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                        <div className="p-4 bg-gray-50 flex justify-end">
                          <Button asChild>
                            <a href={`/board/${board.id}`}>Open Board</a>
                          </Button>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-md">
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No board yet</h3>
                      <p className="text-gray-500 mb-4">Create your board to get started</p>
                      <Button 
                        onClick={createUserBoard} 
                        disabled={creatingBoard}
                      >
                        {creatingBoard ? 'Creating...' : 'Create Board'}
                      </Button>
                    </div>
                  )}
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
