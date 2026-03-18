import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CustomUser } from '../types/database';

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

  // دالة لجلب المستخدم من localStorage مباشرة (أسرع طريقة)
  const getUserFromStorage = (): CustomUser | null => {
    try {
      // البحث عن مفتاح الجلسة في localStorage
      const storageKey = Object.keys(localStorage).find(key => 
        key.startsWith('sb-') && key.includes('-auth-token')
      );
      
      if (!storageKey) return null;
      
      const sessionStr = localStorage.getItem(storageKey);
      if (!sessionStr) return null;
      
      const sessionData = JSON.parse(sessionStr);
      const supabaseUser = sessionData?.user;
      
      if (!supabaseUser) return null;

      // إرجاع المستخدم مباشرة بدون الانتظار
      return {
        ...supabaseUser,
        schoolName: 'مدرستي',
        full_name: supabaseUser.email?.split('@')[0],
      } as CustomUser;
      
    } catch (e) {
      return null;
    }
  };

  // دالة لجلب بيانات المستخدم الكاملة من جدول users
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
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

  useEffect(() => {
    // 1. أول حاجة: جرب تجيب المستخدم من localStorage (سريع جداً)
    const storedUser = getUserFromStorage();
    
    if (storedUser) {
      console.log('✅ User from localStorage:', storedUser.email);
      setUser(storedUser);
      setLoading(false);
      
      // 2. بعدين في الخلفية، حدث البيانات من Supabase
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        }
      });
      
      return;
    }

    // 3. إذا ما لقيناش في localStorage، نستنى Supabase
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const enhancedUser = await fetchUserProfile(session.user);
        setUser(enhancedUser);
      }
      setLoading(false);
    });

    // الاستماع لتغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    });
    
    if (!error && data.user) {
      // إنشاء حساب في جدول users
      await supabase
        .from('users')
        .upsert([{ 
          id: data.user.id, 
          email, 
          full_name: fullName,
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });
      
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