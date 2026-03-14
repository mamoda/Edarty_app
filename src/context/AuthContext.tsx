import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface CustomUser extends SupabaseUser {
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  taxNumber?: string;
  full_name?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<CustomUser> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      return {
        ...supabaseUser,
        schoolName: profile?.school_name || 'مدرستي',
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
      } as CustomUser;
    } catch {
      return supabaseUser as CustomUser;
    }
  };

  const clearInvalidSession = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth error:', error);
        clearInvalidSession();
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          clearInvalidSession();
        } else if (session?.user) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      
      if (data.user) {
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
      }
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName } }
      });
      
      if (error) return { error };
      
      if (data.user) {
        await supabase
          .from('users')
          .upsert([{ 
            id: data.user.id, 
            email, 
            full_name: fullName,
            created_at: new Date().toISOString()
          }]);
        
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
      }
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    clearInvalidSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}