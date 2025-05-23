
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    console.log("AuthContext: Initializing auth state...");
    
    // Set isMounted to true when the component mounts
    isMounted.current = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("AuthContext state change:", event, "User ID:", currentSession?.user?.id);
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
          
          if (event === 'SIGNED_IN') {
            console.log("User signed in:", currentSession?.user?.id);
            toast({
              title: "Signed in successfully",
              description: `Welcome${currentSession?.user?.email ? ` ${currentSession.user.email}` : ''}!`,
            });
          } else if (event === 'SIGNED_OUT') {
            console.log("User signed out");
            toast({
              title: "Signed out",
              description: "You have been signed out",
            });
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("AuthContext initial session:", currentSession?.user?.id || "No session");
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      // Mark component as unmounted on cleanup
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out user...");
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      if (isMounted.current) {
        toast({
          title: "Error signing out",
          description: "There was a problem signing out",
          variant: "destructive",
        });
      }
    }
  };

  const value = {
    session,
    user,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
