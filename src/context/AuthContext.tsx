// src/context/AuthContext.tsx
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

  // جلب بيانات المستخدم الكاملة من جدول users مع school_id
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*, school:schools(*)')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      return {
        ...supabaseUser,
        school_id: profile?.school_id,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
        school: profile?.school,
      } as CustomUser;
    } catch {
      return supabaseUser as CustomUser;
    }
  };

  // جلب أدوار المستخدم في المدارس
  const fetchUserRoles = async (userId: string): Promise<UserSchoolRole[]> => {
    try {
      const { data } = await supabase
        .from('user_school_roles')
        .select('*, school:schools(*)')
        .eq('user_id', userId);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  // تحديد المدرسة الحالية
  const getCurrentSchool = async (userId: string, roles: UserSchoolRole[]) => {
    // 1. نجيب المدرسة المحفوظة في localStorage
    const savedSchoolId = localStorage.getItem(`current_school_${userId}`);
    
    if (savedSchoolId) {
      const role = roles.find(r => r.school_id === savedSchoolId);
      if (role) {
        return { school: role.school, role: role.role };
      }
    }
    
    // 2. نجيب المدرسة الأساسية (is_primary = true)
    const primaryRole = roles.find(r => r.is_primary);
    if (primaryRole) {
      return { school: primaryRole.school, role: primaryRole.role };
    }
    
    // 3. أول مدرسة في القائمة
    if (roles[0]) {
      return { school: roles[0].school, role: roles[0].role };
    }
    
    return { school: null, role: null };
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // 1. جلب المستخدم من Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
          
          // جلب الأدوار
          const roles = await fetchUserRoles(session.user.id);
          setUserRoles(roles);
          
          // تحديد المدرسة الحالية
          const { school, role } = await getCurrentSchool(session.user.id, roles);
          setCurrentSchool(school);
          setCurrentRole(role);
          
          // حفظ المدرسة الحالية
          if (school) {
            localStorage.setItem(`current_school_${session.user.id}`, school.id);
          }
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // الاستماع لتغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
          
          const roles = await fetchUserRoles(session.user.id);
          setUserRoles(roles);
          
          const { school, role } = await getCurrentSchool(session.user.id, roles);
          setCurrentSchool(school);
          setCurrentRole(role);
          
          if (school) {
            localStorage.setItem(`current_school_${session.user.id}`, school.id);
          }
        } else {
          setUser(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
      
      const roles = await fetchUserRoles(data.user.id);
      setUserRoles(roles);
      
      const { school, role } = await getCurrentSchool(data.user.id, roles);
      setCurrentSchool(school);
      setCurrentRole(role);
      
      if (school) {
        localStorage.setItem(`current_school_${data.user.id}`, school.id);
      }
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
    setUserRoles([]);
    setCurrentSchool(null);
    setCurrentRole(null);
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find(r => r.school_id === schoolId);
    if (role && user) {
      setCurrentSchool(role.school || null);
      setCurrentRole(role.role);
      localStorage.setItem(`current_school_${user.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Admin لديه كل الصلاحيات
    if (currentRole === 'admin') return true;
    
    // صلاحيات خاصة لكل دور
    const rolePermissions: Record<string, string[]> = {
      accountant: ['view_financials', 'manage_fees', 'manage_expenses', 'view_reports'],
      moderator: ['view_students', 'view_teachers', 'edit_students', 'edit_teachers'],
    };
    
    const permissions = rolePermissions[currentRole || ''] || [];
    return permissions.includes(permission);
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