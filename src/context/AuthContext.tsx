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

  // دالة لاستخراج المستخدم من localStorage مباشرة
  const getUserFromStorage = (): SupabaseUser | null => {
    try {
      // البحث عن مفتاح الجلسة في localStorage
      const storageKey = Object.keys(localStorage).find(key => 
        key.startsWith('sb-') && key.includes('-auth-token')
      );
      
      if (!storageKey) return null;
      
      const sessionStr = localStorage.getItem(storageKey);
      if (!sessionStr) return null;
      
      const sessionData = JSON.parse(sessionStr);
      return sessionData?.user || null;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  };

  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<CustomUser> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      return {
        ...supabaseUser,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
      } as CustomUser;
    } catch {
      return supabaseUser as CustomUser;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // 1. أولاً: حاول استرجاع المستخدم من localStorage مباشرة
        const storedUser = getUserFromStorage();
        
        if (storedUser && mounted) {
          console.log('📦 User found in localStorage:', storedUser.email);
          const enhancedUser = await fetchUserProfile(storedUser);
          setUser(enhancedUser);
          setLoading(false);
          return;
        }
        
        // 2. إذا لم نجد في localStorage، حاول من Supabase
        console.log('🔍 No user in localStorage, checking Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('❌ Auth error:', err);
        setError(err?.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // استمع لتغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (!mounted) return;

        if (session?.user) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          setUser(null);
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
      setError(null);
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
      setError(null);
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
    // تنظيف localStorage
    const storageKey = Object.keys(localStorage).find(key => 
      key.startsWith('sb-') && key.includes('-auth-token')
    );
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const refreshUserData = async () => {
    const storedUser = getUserFromStorage();
    if (storedUser) {
      const enhancedUser = await fetchUserProfile(storedUser);
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}