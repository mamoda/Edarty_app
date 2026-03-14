// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { CustomUser } from '../types/user';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  // دالة لجلب بيانات إضافية للمستخدم من جدول users
  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<CustomUser> => {
    try {
      // جلب البيانات الإضافية من جدول users
      const { data: profile, error } = await supabase
        .from('users')
        .select('school_name, school_address, school_phone, tax_number, full_name')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return supabaseUser as CustomUser;
      }

      // دمج بيانات supabase مع البيانات الإضافية
      return {
        ...supabaseUser,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
        full_name: profile?.full_name,
      } as CustomUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return supabaseUser as CustomUser;
    }
  };

  // دالة لتحديث بيانات المستخدم
  const refreshUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const enhancedUser = await fetchUserProfile(session.user);
      setUser(enhancedUser);
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const enhancedUser = await fetchUserProfile(session.user);
        setUser(enhancedUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (data.user) {
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    // بعد التسجيل، قم بإنشاء سجل في جدول users
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          { 
            id: data.user.id, 
            email: email,
            created_at: new Date().toISOString()
          }
        ]);
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
      
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}