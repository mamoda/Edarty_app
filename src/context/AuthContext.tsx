// src/context/AuthContext.tsx - النسخة النهائية المصححة
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

  // جلب بيانات المستخدم الكاملة من جدول users
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      return {
        ...supabaseUser,
        school_id: profile?.school_id,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
      } as CustomUser;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return supabaseUser as CustomUser;
    }
  };

  // جلب أدوار المستخدم في المدارس
  const fetchUserRoles = async (userId: string): Promise<UserSchoolRole[]> => {
    try {
      const { data, error } = await supabase
        .from('user_school_roles')
        .select('*, school:schools(*)')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return [];
    }
  };

  // تحديد المدرسة الحالية من الأدوار
  const getCurrentSchoolFromRoles = (roles: UserSchoolRole[]) => {
    // 1. نجيب المدرسة الأساسية (is_primary = true)
    const primaryRole = roles.find(r => r.is_primary);
    if (primaryRole && primaryRole.school) {
      return { school: primaryRole.school, role: primaryRole.role };
    }
    
    // 2. أول مدرسة في القائمة
    if (roles[0] && roles[0].school) {
      return { school: roles[0].school, role: roles[0].role };
    }
    
    return { school: null, role: null };
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        // جلب الجلسة الحالية
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
        if (session?.user && isMounted) {
          console.log('✅ User found:', session.user.email);
          
          // جلب بيانات المستخدم
          const enhancedUser = await fetchUserProfile(session.user);
          if (isMounted) setUser(enhancedUser);
          
          // جلب أدوار المستخدم
          const roles = await fetchUserRoles(session.user.id);
          if (isMounted) setUserRoles(roles);
          
          // تحديد المدرسة الحالية
          const { school, role } = getCurrentSchoolFromRoles(roles);
          if (isMounted) {
            setCurrentSchool(school);
            setCurrentRole(role);
            console.log('🏫 Current school:', school?.name || 'No school');
            console.log('👤 Current role:', role || 'No role');
            console.log('📊 Total roles found:', roles.length);
          }
        } else {
          console.log('ℹ️ No user session found');
        }
        
        if (isMounted) {
          setLoading(false);
          console.log('✅ Loading set to false');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
          console.log('✅ Loading set to false after error');
        }
      }
    };

    initializeAuth();

    // الاستماع لتغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        console.log('🔄 Auth state changed:', _event);
        
        if (session?.user) {
          console.log('✅ User logged in:', session.user.email);
          
          const enhancedUser = await fetchUserProfile(session.user);
          if (isMounted) setUser(enhancedUser);
          
          const roles = await fetchUserRoles(session.user.id);
          if (isMounted) setUserRoles(roles);
          
          const { school, role } = getCurrentSchoolFromRoles(roles);
          if (isMounted) {
            setCurrentSchool(school);
            setCurrentRole(role);
          }
        } else {
          console.log('👋 User logged out');
          if (isMounted) {
            setUser(null);
            setUserRoles([]);
            setCurrentSchool(null);
            setCurrentRole(null);
          }
        }
        
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in...');
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      console.log('✅ Sign in successful');
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
      
      const roles = await fetchUserRoles(data.user.id);
      setUserRoles(roles);
      
      const { school, role } = getCurrentSchoolFromRoles(roles);
      setCurrentSchool(school);
      setCurrentRole(role);
    } else if (error) {
      console.error('❌ Sign in error:', error);
    }
    
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('📝 Signing up...');
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    });
    
    if (!error && data.user) {
      console.log('✅ Sign up successful');
      
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
    } else if (error) {
      console.error('❌ Sign up error:', error);
    }
    
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setUserRoles([]);
    setCurrentSchool(null);
    setCurrentRole(null);
    setLoading(false);
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
    
    const rolePermissions: Record<string, string[]> = {
      accountant: ['view_financials', 'manage_fees', 'manage_expenses', 'view_reports', 'add_fees', 'edit_fees', 'delete_fees', 'add_expenses', 'edit_expenses', 'delete_expenses'],
      moderator: ['view_students', 'view_teachers', 'edit_students', 'edit_teachers', 'add_students', 'delete_students'],
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