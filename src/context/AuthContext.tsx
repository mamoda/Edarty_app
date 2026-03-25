// src/context/AuthContext.tsx - إصدار يعتمد فقط على onAuthStateChange
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CustomUser, UserSchoolRole, School } from '../types/database';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  currentSchool: School | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  // دالة تحميل البيانات
  const loadUserData = async (supabaseUser: any) => {
    if (!supabaseUser) return;
    
    console.log('📥 Loading user data for:', supabaseUser.email);
    
    try {
      // جلب بيانات المستخدم
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      
      // جلب أدوار المستخدم
      const { data: roles } = await supabase
        .from('user_school_roles')
        .select('*, school:schools(*)')
        .eq('user_id', supabaseUser.id);
      
      // تعيين المستخدم
      const customUser: CustomUser = {
        ...supabaseUser,
        school_id: profile?.school_id,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
      };
      setUser(customUser);
      
      // تعيين الأدوار
      if (roles && roles.length > 0) {
        setUserRoles(roles);
        
        // تحديد المدرسة الحالية
        const primaryRole = roles.find(r => r.is_primary);
        if (primaryRole?.school) {
          setCurrentSchool(primaryRole.school);
          setCurrentRole(primaryRole.role);
        } else if (roles[0]?.school) {
          setCurrentSchool(roles[0].school);
          setCurrentRole(roles[0].role);
        }
      } else {
        setUserRoles([]);
        setCurrentSchool(null);
        setCurrentRole(null);
      }
      
      console.log('✅ User data loaded');
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(supabaseUser as CustomUser);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // الاستماع لتغييرات المصادقة فقط
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event);
        
        if (!isMounted) return;
        
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          setUser(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentRole(null);
        }
        
        setLoading(false);
      }
    );

    // لا نستدعي getSession() نهائياً
    // نعتمد فقط على onAuthStateChange
    
    // إذا لم يأتِ حدث خلال 3 ثواني، نعتبر أنه لا يوجد مستخدم
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.log('⏰ No auth event received, assuming no user');
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    });
    
    if (!error && data.user) {
      await supabase
        .from('users')
        .insert([{ 
          id: data.user.id, 
          email, 
          full_name: fullName,
          created_at: new Date().toISOString()
        }]);
    }
    
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRoles([]);
    setCurrentSchool(null);
    setCurrentRole(null);
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find(r => r.school_id === schoolId);
    if (role && role.school && user) {
      setCurrentSchool(role.school);
      setCurrentRole(role.role);
      localStorage.setItem(`current_school_${user.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (currentRole === 'admin') return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      currentSchool,
      currentRole,
      userRoles,
      signIn, 
      signUp, 
      signOut,
      switchSchool,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}