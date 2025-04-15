
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { HeaderMenu } from './HeaderMenu';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b bg-white z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-lg font-bold text-primary">
          Kanban Board
        </Link>

        {user && (
          <div className="flex items-center gap-2 z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <HeaderMenu />
          </div>
        )}
      </div>
    </header>
  );
}
