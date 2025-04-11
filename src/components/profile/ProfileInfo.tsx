import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { SaveIcon, Mail, Calendar, Clock } from 'lucide-react';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
};

interface ProfileInfoProps {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function ProfileInfo({ user, profile, loading }: ProfileInfoProps) {
  const [updating, setUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Set up mounted ref for cleanup
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Update state when profile changes - in useEffect to avoid render issues
  useEffect(() => {
    if (!isMounted.current) return;
    
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url);
    } else if (user) {
      // Default values if no profile exists yet
      setUsername(user.email?.split('@')[0] || '');
      
      // For Google users, try to get name from user metadata
      const userMeta = user.user_metadata;
      if (userMeta?.full_name) {
        setFullName(userMeta.full_name);
      } else if (userMeta?.name) {
        setFullName(userMeta.name);
      } else {
        setFullName('');
      }
      
      // For Google users, try to get avatar from user metadata
      if (userMeta?.avatar_url) {
        setAvatarUrl(userMeta.avatar_url);
      } else if (userMeta?.picture) {
        setAvatarUrl(userMeta.picture);
      } else {
        setAvatarUrl(null);
      }
    }
  }, [profile, user]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to update your profile.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      if (!isMounted.current) return;
      setUpdating(true);
      
      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(updates);
        
      if (error) {
        throw error;
      }
      
      if (isMounted.current) {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        });
      }
    } catch (error: any) {
      if (isMounted.current) {
        toast({
          title: 'Error updating profile',
          description: 'Unable to update your profile. Please try again. ' + error.message,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setUpdating(false);
      }
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  
  return (
    <Card>
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
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={username || user?.email || ''} />
                ) : (
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {(username?.[0] || user?.email?.[0] || '').toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="space-y-1 text-center flex-1">
                <h3 className="text-xl font-medium">{fullName || 'Set your name'}</h3>
                <p className="text-gray-500">{user?.email}</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="h-4 w-4 mr-1" />
                    {user?.email_confirmed_at ? 'Email verified' : 'Email not verified'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined: {formatDate(user?.created_at)}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    Last sign in: {formatDate(user?.last_sign_in_at)}
                  </div>
                </div>
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
  );
}
