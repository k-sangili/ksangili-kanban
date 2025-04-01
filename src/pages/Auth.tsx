
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, ExternalLink } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
      }
    };
    
    checkUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid login credentials",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    try {
      console.log("Starting Google sign-in process...");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        console.error("Google sign-in error:", error);
        
        // Check for specific error conditions
        if (error.message.includes("provider is not enabled")) {
          setGoogleError("The Google provider is not enabled in your Supabase project. Please enable it in your Supabase dashboard under Authentication > Providers > Google.");
        } else if (error.status === 403 || error.message.includes("403")) {
          setGoogleError("Received a 403 Forbidden error. This usually means your Google OAuth credentials (Client ID and Secret) are missing or incorrect in Supabase.");
        } else if (error.message.includes("redirect_uri_mismatch") || error.message.includes("400")) {
          // Specific handler for redirect_uri_mismatch error
          const redirectUrl = window.location.origin;
          setGoogleError(`Error 400: redirect_uri_mismatch. The redirect URL in your Google OAuth configuration doesn't match the URL Supabase is using. Add this exact URL to your Google Cloud Console OAuth credentials as an authorized redirect URI: ${redirectUrl}`);
        }
        
        throw error;
      }
      
      console.log("Google sign-in initiated successfully:", data);
    } catch (error: any) {
      console.error("Google sign-in exception:", error);
      
      // If we haven't set a specific error message above, use a generic one
      if (!googleError) {
        toast({
          title: "Google Sign-In Error",
          description: error.message || "Could not connect to Google",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Kanban Board</CardTitle>
          <CardDescription className="text-center">
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input 
                    id="email-signup" 
                    type="email" 
                    placeholder="your@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input 
                    id="password-signup" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          {googleError && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="text-amber-800">
                <p>{googleError}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <a 
                    href="https://supabase.com/dashboard/project/vzdystnqpizcrdryaqdq/auth/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-800 underline inline-flex items-center"
                  >
                    Configure Supabase Auth Providers
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                  <a 
                    href="https://console.cloud.google.com/apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-800 underline inline-flex items-center"
                  >
                    Google Cloud Console OAuth Credentials
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="mr-2">
              <path fill="#4285F4" d="M15.545 6.558a9.42 9.42 0 0 0-.139-1.626h-7.45v3.078h4.26a3.632 3.632 0 0 1-1.578 2.385v1.982h2.554c1.496-1.378 2.353-3.407 2.353-5.819z"/>
              <path fill="#34A853" d="M8.005 16c2.13 0 3.915-.715 5.218-1.938l-2.554-1.982c-.706.473-1.609.752-2.664.752-2.05 0-3.786-1.385-4.404-3.243H.955v2.048A7.963 7.963 0 0 0 8.005 16z"/>
              <path fill="#FBBC05" d="M3.6 9.589c-.16-.479-.255-.986-.255-1.509s.096-1.03.255-1.51V4.522H.955a7.96 7.96 0 0 0 0 7.136l2.646-2.07z"/>
              <path fill="#EA4335" d="M8.005 3.575a4.32 4.32 0 0 1 3.065 1.197l2.26-2.26A7.683 7.683 0 0 0 8.005.517a7.964 7.964 0 0 0-7.05 4.005l2.646 2.07A4.755 4.755 0 0 1 8.005 3.575z"/>
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
