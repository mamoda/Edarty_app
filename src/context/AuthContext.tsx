// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { CustomUser } from '../types/user';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<CustomUser> => {
    try {
      console.log('🔍 Fetching profile for user:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return supabaseUser as CustomUser;
      }

      console.log('✅ Profile fetched:', profile);

      return {
        ...supabaseUser,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
      } as CustomUser;
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      return supabaseUser as CustomUser;
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('❌ Session refresh error:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing Auth...');
        setLoading(true);
        setError(null);

        // 1. Try to get existing session
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          
          // 2. If error, try to refresh token from localStorage
          const storedSession = localStorage.getItem('supabase.auth.token');
          if (storedSession && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔄 Retry ${retryCount}: Attempting to restore session...`);
            
            session = await refreshSession();
          }
          
          if (!session) {
            setError(sessionError.message);
            setLoading(false);
            return;
          }
        }

        console.log('📦 Session:', session);

        if (session?.user && mounted) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
          
          // Save session to localStorage manually
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at
          }));
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('❌ Auth initialization error:', err);
        setError(err?.message || 'Unknown error');
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ Auth initialized, loading:', false);
        }
      }
    };

    initializeAuth();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const enhancedUser = await fetchUserProfile(session.user);
            setUser(enhancedUser);
            
            // Save session to localStorage
            localStorage.setItem('supabase.auth.token', JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at
            }));
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('supabase.auth.token');
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
      console.log('🔐 Attempting sign in...');
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { error };
      }
      
      console.log('✅ Sign in successful:', data.user?.email);
      
      if (data.user) {
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
        
        // Save session to localStorage
        if (data.session) {
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
          }));
        }
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('📝 Attempting sign up...');
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
        return { error };
      }
      
      console.log('✅ Sign up successful:', data.user?.email);
      
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert([{ 
            id: data.user.id, 
            email, 
            full_name: fullName,
            created_at: new Date().toISOString()
          }]);
        
        if (profileError) {
          console.error('⚠️ Profile creation error:', profileError);
        }
        
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
        
        // Save session to localStorage
        if (data.session) {
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
          }));
        }
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign up exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('supabase.auth.token');
      console.log('✅ Signed out');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const refreshUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const enhancedUser = await fetchUserProfile(session.user);
      setUser(enhancedUser);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}