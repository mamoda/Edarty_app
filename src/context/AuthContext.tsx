import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CustomUser } from '../types/database'; // 👈 CustomUser فقط (User غير مستخدم هنا)

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

  // دالة لجلب بيانات المستخدم الإضافية من جدول users
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // إنشاء كائن CustomUser مع دمج البيانات
      const customUser: CustomUser = {
        ...supabaseUser,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
      };

      return customUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return supabaseUser as CustomUser;
    }
  };

  // تهيئة المصادقة عند تحميل التطبيق
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // محاولة استرجاع الجلسة الحالية
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
        }

        if (session?.user && mounted) {
          console.log('User found in session:', session.user.email);
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          console.log('No active session');
          setUser(null);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        setError(err?.message || 'Unknown error');
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('Auth initialization complete, loading:', false);
        }
      }
    };

    initializeAuth();

    // الاستماع لتغييرات المصادقة (تسجيل الدخول، تسجيل الخروج، تحديث التوكن)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (session?.user) {
  console.log('🆔 User ID:', session.user.id);
  
  // جرب جلب البيانات مباشرة من Supabase
  supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .then(({ data, error }) => {
      console.log('📊 Profile query result:', { data, error });
      
      if (error) {
        console.error('❌ Profile error:', error);
      } else if (!data || data.length === 0) {
        console.log('⚠️ No profile found for user:', session.user.email);
      } else {
        console.log('✅ Profile found:', data[0]);
      }
    });
}
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const enhancedUser = await fetchUserProfile(session.user);
            setUser(enhancedUser);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // تنظيف الاشتراك عند إلغاء تحميل المكون
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // دالة تسجيل الدخول
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      console.log('Sign in successful:', data.user?.email);
      
      // تحديث بيانات المستخدم بعد تسجيل الدخول
      if (data.user) {
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      return { error };
    }
  };

  // دالة إنشاء حساب جديد
  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setError(null);
      console.log('Attempting sign up for:', email);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }
      
      console.log('Sign up successful:', data.user?.email);
      
      // إنشاء سجل في جدول users بعد التسجيل الناجح
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert([{ 
            id: data.user.id, 
            email, 
            full_name: fullName,
            created_at: new Date().toISOString()
          }], { onConflict: 'id' });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        } else {
          console.log('User profile created successfully');
        }
        
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      return { error };
    }
  };

  // دالة تسجيل الخروج
  const signOut = async () => {
    try {
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Signed out successfully');
      }
      setUser(null);
    } catch (error) {
      console.error('Sign out exception:', error);
    }
  };

  // دالة تحديث بيانات المستخدم
  const refreshUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('Refreshing user data for:', session.user.email);
        const enhancedUser = await fetchUserProfile(session.user);
        setUser(enhancedUser);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
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