// src/context/AuthContext.tsx - مع timeout
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

  // جلب بيانات المستخدم الكاملة مع timeout
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
    console.log('🔍 fetchUserProfile started for:', supabaseUser.id);
    
    try {
      // إضافة timeout للاستعلام
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching user profile')), 10000)
      );
      
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      
      const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('📊 Profile query result:', { profile, error });

      if (error) {
        console.error('Error fetching profile:', error);
      }

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
      console.error('Error in fetchUserProfile:', error);
      return supabaseUser as CustomUser;
    }
  };

  // جلب أدوار المستخدم مع timeout
  const fetchUserRoles = async (userId: string): Promise<UserSchoolRole[]> => {
    console.log('🔍 fetchUserRoles started for:', userId);
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching user roles')), 10000)
      );
      
      const queryPromise = supabase
        .from('user_school_roles')
        .select('*, school:schools(*)')
        .eq('user_id', userId);
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('📊 Roles query result:', { data: data?.length, error });
      
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

  // تحديد المدرسة الحالية
  const getCurrentSchoolFromRoles = (roles: UserSchoolRole[]) => {
    const primaryRole = roles.find(r => r.is_primary);
    if (primaryRole && primaryRole.school) {
      return { school: primaryRole.school, role: primaryRole.role };
    }
    
    if (roles[0] && roles[0].school) {
      return { school: roles[0].school, role: roles[0].role };
    }
    
    return { school: null, role: null };
  };

  // دالة تحميل جميع البيانات
  const loadUserData = async (supabaseUser: any) => {
    console.log('📥 Loading user data for:', supabaseUser.email);
    
    try {
      const enhancedUser = await fetchUserProfile(supabaseUser);
      setUser(enhancedUser);
      
      const roles = await fetchUserRoles(supabaseUser.id);
      setUserRoles(roles);
      
      const { school, role } = getCurrentSchoolFromRoles(roles);
      setCurrentSchool(school);
      setCurrentRole(role);
      
      console.log('✅ User data loaded:', { 
        school: school?.name, 
        role, 
        rolesCount: roles.length 
      });
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      // حتى في حالة الخطأ، نكمل
      setUser(supabaseUser as CustomUser);
      setCurrentSchool(null);
      setCurrentRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        // جلب الجلسة الحالية
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          await loadUserData(session.user);
        } else {
          console.log('ℹ️ No session found');
        }
        
        if (isMounted) {
          setLoading(false);
          console.log('✅ Loading complete');
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
        
        console.log('🔄 Auth state changed:', _event);
        
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

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      await loadUserData(data.user);
    }
    
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
        .upsert([{ 
          id: data.user.id, 
          email, 
          full_name: fullName,
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });
      
      await loadUserData(data.user);
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