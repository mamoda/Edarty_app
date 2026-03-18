import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CustomUser, UserRole } from '../types/database';
import { permissionService } from '../services/permissionService';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  userRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // دوال التحقق من الصلاحيات - تعتمد على user.permissions
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // الأدمن عنده كل الصلاحيات
    return user.permissions?.[permission] || false;
  };

  const userRole = user?.role as UserRole || null;

  // تحميل الصلاحيات وتحديث user
  const loadUserPermissions = async (userId: string) => {
    try {
      const permissions = await permissionService.getUserPermissions(userId);
      // تحديث user مع الصلاحيات الجديدة
      setUser(prev => prev ? { ...prev, permissions } : null);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  // دالة لجلب بيانات المستخدم الإضافية - المعدلة
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
    try {
      console.log('🔍 Fetching profile for user:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.log('⚠️ Error fetching profile, using defaults:', error);
      }

      // إذا مفيش بروفايل، نستخدم القيم الافتراضية
      if (!profile) {
        console.log('🆕 No profile found, creating default for:', supabaseUser.email);
        
        // محاولة إنشاء بروفايل جديد
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '',
            role: 'user',
            school_name: supabaseUser.email?.split('@')[0] || 'مدرستي',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (insertError) {
          console.error('❌ Failed to create profile:', insertError);
        } else {
          console.log('✅ Profile created successfully');
        }
      }

      // تجهيز الكائن النهائي
      const schoolName = profile?.school_name || supabaseUser.email?.split('@')[0] || 'مدرستي';
      
      console.log('🏫 School name set to:', schoolName);

      return {
        ...supabaseUser,
        schoolName: schoolName,
        schoolAddress: profile?.school_address || '',
        schoolPhone: profile?.school_phone || '',
        taxNumber: profile?.tax_number || '',
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '',
        role: profile?.role || 'user',
        permissions: {},
      } as CustomUser;
      
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      // في حالة الخطأ، نرجع المستخدم بقيم افتراضية
      return {
        ...supabaseUser,
        schoolName: supabaseUser.email?.split('@')[0] || 'مدرستي',
        schoolAddress: '',
        schoolPhone: '',
        taxNumber: '',
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '',
        role: 'user',
        permissions: {},
      } as CustomUser;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 Initializing Auth...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
        }

        if (session?.user && mounted) {
          console.log('✅ User found in session:', session.user.email);
          const enhancedUser = await fetchUserProfile(session.user);
          
          // التأكد من حفظ المستخدم في جدول users
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: enhancedUser.id,
              email: enhancedUser.email,
              full_name: enhancedUser.full_name,
              role: enhancedUser.role,
              school_name: enhancedUser.schoolName,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            
          if (upsertError) {
            console.error('Error upserting user:', upsertError);
          }
          
          setUser(enhancedUser);
          await loadUserPermissions(enhancedUser.id); // تحميل الصلاحيات
        } else {
          console.log('ℹ️ No active session');
          setUser(null);
        }
      } catch (err: any) {
        console.error('❌ Auth initialization error:', err);
        setError(err?.message || 'Unknown error');
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ Auth initialization complete, loading:', false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log('👤 User signed in, fetching profile...');
            const enhancedUser = await fetchUserProfile(session.user);
            
            // تحديث بيانات المستخدم في كل مرة
            const { error: upsertError } = await supabase
              .from('users')
              .upsert({
                id: enhancedUser.id,
                email: enhancedUser.email,
                full_name: enhancedUser.full_name,
                role: enhancedUser.role,
                school_name: enhancedUser.schoolName,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
              
            if (upsertError) {
              console.error('Error upserting user:', upsertError);
            }
            
            setUser(enhancedUser);
            await loadUserPermissions(enhancedUser.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
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
      console.log('🔐 Attempting sign in for:', email);
      
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
        await loadUserPermissions(enhancedUser.id);
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setError(null);
      console.log('📝 Attempting sign up for:', email);
      
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
        // إنشاء حساب في جدول users
        const { error: profileError } = await supabase
          .from('users')
          .upsert([{ 
            id: data.user.id, 
            email, 
            full_name: fullName || email.split('@')[0],
            role: 'user',
            school_name: email.split('@')[0] || 'مدرستي',
            created_at: new Date().toISOString()
          }], { onConflict: 'id' });
        
        if (profileError) {
          console.error('⚠️ Profile creation error:', profileError);
        } else {
          console.log('✅ User profile created successfully');
        }
        
        const enhancedUser = await fetchUserProfile(data.user);
        setUser(enhancedUser);
        await loadUserPermissions(enhancedUser.id);
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Signed out successfully');
      }
      setUser(null);
    } catch (error) {
      console.error('❌ Sign out exception:', error);
    }
  };

  const refreshUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('🔄 Refreshing user data for:', session.user.email);
        const enhancedUser = await fetchUserProfile(session.user);
        setUser(enhancedUser);
        await loadUserPermissions(enhancedUser.id);
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
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
    hasPermission, 
    userRole,      
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